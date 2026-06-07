import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { PrismaClient } from "@pandaclock/db";

interface SocketUser {
  userId: string;
  tenantSlug: string;
  email: string;
}

interface JoinPayload {
  channelId: string;
}

interface ChatAttachment {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface SendPayload {
  channelId: string;
  body: string;
  attachments?: ChatAttachment[];
}

interface MessageRow {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  attachments: ChatAttachment[];
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

interface EditPayload {
  channelId: string;
  messageId: string;
  body: string;
}

interface DeletePayload {
  channelId: string;
  messageId: string;
}

/**
 * Realtime-gateway чатов.
 *
 * ⚠️ КРИТИЧНО: gateway НЕ инжектит ChatsService.
 *
 * ChatsService зависит от TenantPrismaService (REQUEST-scoped). Если бы
 * gateway инжектил ChatsService, scope «всплыл» бы — сам gateway стал бы
 * REQUEST-scoped. Для WebSocket-gateway это фатально: нет понятия «request»
 * для долгоживущего сокета, конструктор и DI-поля ведут себя непредсказуемо
 * (this.jwt оказывался undefined → каждое подключение падало в catch и
 * сервер дисконнектил клиента сразу после connect).
 *
 * Поэтому gateway — чистый SINGLETON со своим PrismaClient. Tenant-изоляция
 * через schema-qualified SQL (`"tenant_<slug>".table`) — не требует
 * search_path и работает на любом pooled-соединении.
 */
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
  path: "/socket.io",
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger: Logger;
  private readonly jwt: JwtService;
  private readonly prisma: PrismaClient;
  private readonly expoUrl = "https://exp.host/--/api/v2/push/send";
  private readonly expoAccessToken = process.env.EXPO_ACCESS_TOKEN;

  @WebSocketServer()
  server!: Server;

  constructor() {
    this.logger = new Logger(ChatsGateway.name);
    this.jwt = new JwtService({});
    this.prisma = new PrismaClient();
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new WsException("Missing token");
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        tenant: string;
        email: string;
      }>(token, { secret: process.env.JWT_SECRET });

      const handshakeTenant = String(client.handshake.query.tenant ?? "");
      if (handshakeTenant && handshakeTenant !== payload.tenant) {
        throw new WsException("Tenant mismatch");
      }

      const user: SocketUser = {
        userId: payload.sub,
        tenantSlug: payload.tenant,
        email: payload.email,
      };
      client.data.user = user;
      client.join(`tenant:${user.tenantSlug}:user:${user.userId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`ws auth failed: ${msg}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`ws disconnected: ${client.id}`);
  }

  @SubscribeMessage("channel:join")
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) throw new WsException("Unauthenticated");
    const schema = this.schemaFor(user.tenantSlug);
    const isMember = await this.isMember(schema, body.channelId, user.userId);
    if (!isMember) throw new WsException("Not a member");
    await client.join(`tenant:${user.tenantSlug}:channel:${body.channelId}`);
    return { ok: true };
  }

  @SubscribeMessage("channel:leave")
  async onLeave(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) throw new WsException("Unauthenticated");
    await client.leave(`tenant:${user.tenantSlug}:channel:${body.channelId}`);
    return { ok: true };
  }

  @SubscribeMessage("message:send")
  async onSend(@ConnectedSocket() client: Socket, @MessageBody() body: SendPayload) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) throw new WsException("Unauthenticated");
    const schema = this.schemaFor(user.tenantSlug);

    const isMember = await this.isMember(schema, body.channelId, user.userId);
    if (!isMember) throw new WsException("Not a member");

    const text = (body.body ?? "").trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (text.length === 0 && attachments.length === 0) {
      throw new WsException("Empty message");
    }

    const message = await this.insertMessage(
      schema,
      body.channelId,
      user.userId,
      text,
      attachments,
    );

    this.server
      .to(`tenant:${user.tenantSlug}:channel:${body.channelId}`)
      .emit("message:new", message);

    // Push офлайн-участникам (у кого канал не открыт). Fire-and-forget.
    void this.pushToOfflineMembers(schema, user.tenantSlug, body.channelId, user.userId, message);

    return message;
  }

  @SubscribeMessage("message:edit")
  async onEdit(@ConnectedSocket() client: Socket, @MessageBody() body: EditPayload) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) throw new WsException("Unauthenticated");
    const schema = this.schemaFor(user.tenantSlug);

    const text = (body.body ?? "").trim();
    if (text.length === 0) throw new WsException("Empty message");

    const message = await this.editMessage(schema, body.messageId, user.userId, text);
    if (!message) throw new WsException("Not allowed");

    this.server
      .to(`tenant:${user.tenantSlug}:channel:${body.channelId}`)
      .emit("message:edited", message);
    return message;
  }

  @SubscribeMessage("message:delete")
  async onDelete(@ConnectedSocket() client: Socket, @MessageBody() body: DeletePayload) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) throw new WsException("Unauthenticated");
    const schema = this.schemaFor(user.tenantSlug);

    const ok = await this.deleteMessage(schema, body.messageId, user.userId);
    if (!ok) throw new WsException("Not allowed");

    this.server.to(`tenant:${user.tenantSlug}:channel:${body.channelId}`).emit("message:deleted", {
      channelId: body.channelId,
      messageId: body.messageId,
    });
    return { ok: true };
  }

  @SubscribeMessage("typing")
  onTyping(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) return;
    client.to(`tenant:${user.tenantSlug}:channel:${body.channelId}`).emit("typing", {
      channelId: body.channelId,
      userId: user.userId,
    });
  }

  // ===== tenant-scoped DB (schema-qualified, без search_path) =====

  private schemaFor(slug: string): string {
    if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) {
      throw new WsException("Invalid tenant");
    }
    return `tenant_${slug}`;
  }

  private async isMember(schema: string, channelId: string, userId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRawUnsafe<{ ok: number }[]>(
      `SELECT 1 AS ok FROM "${schema}".chat_members
       WHERE channel_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
      channelId,
      userId,
    );
    return rows.length > 0;
  }

  private async insertMessage(
    schema: string,
    channelId: string,
    authorId: string,
    body: string,
    attachments: ChatAttachment[],
  ): Promise<MessageRow> {
    const attachmentsJson = attachments.length > 0 ? JSON.stringify(attachments) : null;
    const rows = await this.prisma.$queryRawUnsafe<
      {
        id: string;
        channel_id: string;
        author_id: string;
        author_name: string;
        author_avatar_url: string | null;
        body: string;
        attachments: unknown;
        created_at: Date;
      }[]
    >(
      `WITH inserted AS (
         INSERT INTO "${schema}".chat_messages (channel_id, author_id, body, attachments)
         VALUES ($1::uuid, $2::uuid, $3, $4::jsonb)
         RETURNING id, channel_id, author_id, body, attachments, created_at
       )
       SELECT i.*,
              u.first_name || ' ' || u.last_name AS author_name,
              u.avatar_url AS author_avatar_url
       FROM inserted i JOIN "${schema}".users u ON u.id = i.author_id`,
      channelId,
      authorId,
      body,
      attachmentsJson,
    );
    const row = rows[0];
    if (!row) throw new WsException("Insert failed");

    // Своё сообщение не должно считаться unread.
    await this.prisma.$executeRawUnsafe(
      `UPDATE "${schema}".chat_members SET last_read_at = NOW()
       WHERE channel_id = $1::uuid AND user_id = $2::uuid`,
      channelId,
      authorId,
    );

    return {
      id: row.id,
      channelId: row.channel_id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatarUrl: row.author_avatar_url,
      body: row.body,
      attachments: parseAttachments(row.attachments),
      createdAt: row.created_at,
      editedAt: null,
      deletedAt: null,
    };
  }

  /**
   * Редактирует текст сообщения. Разрешено только автору и только если оно не
   * удалено. Возвращает обновлённую строку (с author_name) либо null, если
   * правка не разрешена / сообщения нет.
   */
  private async editMessage(
    schema: string,
    messageId: string,
    userId: string,
    body: string,
  ): Promise<MessageRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<
      {
        id: string;
        channel_id: string;
        author_id: string;
        author_name: string;
        author_avatar_url: string | null;
        body: string;
        attachments: unknown;
        created_at: Date;
        edited_at: Date | null;
        deleted_at: Date | null;
      }[]
    >(
      `WITH updated AS (
         UPDATE "${schema}".chat_messages
         SET body = $3, edited_at = NOW()
         WHERE id = $1::uuid AND author_id = $2::uuid AND deleted_at IS NULL
         RETURNING id, channel_id, author_id, body, attachments, created_at, edited_at, deleted_at
       )
       SELECT u2.*,
              u.first_name || ' ' || u.last_name AS author_name,
              u.avatar_url AS author_avatar_url
       FROM updated u2 JOIN "${schema}".users u ON u.id = u2.author_id`,
      messageId,
      userId,
      body,
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      channelId: row.channel_id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatarUrl: row.author_avatar_url,
      body: row.body,
      attachments: parseAttachments(row.attachments),
      createdAt: row.created_at,
      editedAt: row.edited_at,
      deletedAt: row.deleted_at,
    };
  }

  /** Soft-delete: помечает deleted_at. Разрешено только автору. */
  private async deleteMessage(schema: string, messageId: string, userId: string): Promise<boolean> {
    const affected = await this.prisma.$executeRawUnsafe(
      `UPDATE "${schema}".chat_messages SET deleted_at = NOW()
       WHERE id = $1::uuid AND author_id = $2::uuid AND deleted_at IS NULL`,
      messageId,
      userId,
    );
    return affected > 0;
  }

  /**
   * Шлёт Expo push участникам канала, которые СЕЙЧАС не находятся в комнате
   * канала (т.е. не видят сообщение в реальном времени). Best-effort.
   */
  private async pushToOfflineMembers(
    schema: string,
    slug: string,
    channelId: string,
    authorId: string,
    message: MessageRow,
  ): Promise<void> {
    try {
      const members = await this.prisma.$queryRawUnsafe<{ user_id: string }[]>(
        `SELECT user_id FROM "${schema}".chat_members
         WHERE channel_id = $1::uuid AND user_id <> $2::uuid`,
        channelId,
        authorId,
      );
      if (members.length === 0) return;

      // Кто сейчас в комнате канала — им push не нужен (видят онлайн).
      const room = `tenant:${slug}:channel:${channelId}`;
      const sockets = await this.server.in(room).fetchSockets();
      const onlineUserIds = new Set<string>();
      for (const s of sockets) {
        const u = s.data?.user as SocketUser | undefined;
        if (u) onlineUserIds.add(u.userId);
      }

      const offline = members.map((m) => m.user_id).filter((id) => !onlineUserIds.has(id));
      if (offline.length === 0) return;

      const tokens = await this.prisma.$queryRawUnsafe<{ token: string }[]>(
        `SELECT token FROM "${schema}".push_tokens WHERE user_id = ANY($1::uuid[])`,
        offline,
      );
      if (tokens.length === 0) return;

      const channelName = await this.channelTitle(schema, channelId);
      const title = channelName ? `${message.authorName} · ${channelName}` : message.authorName;
      const raw =
        message.body.trim().length > 0
          ? message.body.trim()
          : message.attachments.length > 0
            ? "📎 Вложение"
            : "Новое сообщение";
      const text = raw.length > 140 ? `${raw.slice(0, 137)}…` : raw;

      const payloads = tokens.map((t) => ({
        to: t.token,
        sound: "default",
        title,
        body: text,
        data: { link: `/dashboard/chats/${channelId}`, type: "chat_message", channelId },
      }));

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (this.expoAccessToken) headers.Authorization = `Bearer ${this.expoAccessToken}`;
      await fetch(this.expoUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payloads),
      });
    } catch (err) {
      this.logger.warn(`chat push failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Заголовок канала для push: "#general" для CHANNEL, null для DM. */
  private async channelTitle(schema: string, channelId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRawUnsafe<{ name: string | null; type: string }[]>(
      `SELECT name, type FROM "${schema}".chat_channels WHERE id = $1::uuid LIMIT 1`,
      channelId,
    );
    const row = rows[0];
    if (!row || row.type === "DM") return null;
    return row.name ? `#${row.name}` : null;
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    if (fromAuth) return fromAuth;
    const header = client.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return header.slice(7);
    }
    return null;
  }
}

function parseAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (
      typeof o.url === "string" &&
      typeof o.filename === "string" &&
      typeof o.size === "number" &&
      typeof o.mimeType === "string"
    ) {
      out.push({ url: o.url, filename: o.filename, size: o.size, mimeType: o.mimeType });
    }
  }
  return out;
}
