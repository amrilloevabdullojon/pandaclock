import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

export type ChannelType = "CHANNEL" | "DM";

export interface ChannelRow {
  id: string;
  type: ChannelType;
  name: string | null;
  departmentId: string | null;
  isDefault: boolean;
  lastMessageAt: Date | null;
  unreadCount: number;
}

export interface ChatAttachment {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface MessageRow {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  attachments: ChatAttachment[];
  createdAt: Date;
}

export interface MemberRow {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: "ADMIN" | "MEMBER";
  joinedAt: Date;
}

@Injectable()
export class ChatsService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async listChannels(userId: string): Promise<ChannelRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        type: string;
        name: string | null;
        department_id: string | null;
        is_default: boolean;
        last_message_at: Date | null;
        unread_count: bigint;
      }[]
    >(
      `SELECT c.id, c.type, c.name, c.department_id, c.is_default,
              (SELECT MAX(m.created_at) FROM chat_messages m WHERE m.channel_id = c.id) AS last_message_at,
              (SELECT COUNT(*) FROM chat_messages m
                WHERE m.channel_id = c.id
                  AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at))::bigint AS unread_count
       FROM chat_channels c
       JOIN chat_members cm ON cm.channel_id = c.id AND cm.user_id = $1::uuid
       ORDER BY last_message_at DESC NULLS LAST`,
      userId,
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type as ChannelType,
      name: row.name,
      departmentId: row.department_id,
      isDefault: row.is_default,
      lastMessageAt: row.last_message_at,
      unreadCount: Number(row.unread_count),
    }));
  }

  async createChannel(input: {
    type: ChannelType;
    name?: string;
    departmentId?: string;
    memberIds: string[];
    createdById: string;
  }): Promise<ChannelRow> {
    if (input.type === "CHANNEL" && !input.name) {
      throw new BadRequestException({ code: "CHANNEL_NAME_REQUIRED" });
    }
    if (input.type === "DM" && input.memberIds.length !== 1) {
      throw new BadRequestException({ code: "DM_REQUIRES_ONE_PEER" });
    }

    const client = await this.tenantDb.getClient();
    const inserted = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO chat_channels (type, name, department_id, created_by_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      input.type,
      input.name ?? null,
      input.departmentId ?? null,
      input.createdById,
    );
    const channelId = inserted[0]?.id;
    if (!channelId) throw new BadRequestException({ code: "INSERT_FAILED" });

    const allMembers = Array.from(new Set([input.createdById, ...input.memberIds]));
    for (const userId of allMembers) {
      await client.$executeRawUnsafe(
        `INSERT INTO chat_members (channel_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        channelId,
        userId,
        userId === input.createdById ? "ADMIN" : "MEMBER",
      );
    }

    const channels = await this.listChannels(input.createdById);
    const created = channels.find((c) => c.id === channelId);
    if (!created) throw new NotFoundException({ code: "CHANNEL_NOT_FOUND" });
    return created;
  }

  /** Public-обёртка для controller'а (имя без `ensure`, потому что метод publics уже занят). */
  async assertMembershipPublic(channelId: string, userId: string): Promise<void> {
    return this.ensureMembership(channelId, userId);
  }

  async ensureMembership(channelId: string, userId: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ channel_id: string }[]>(
      `SELECT channel_id FROM chat_members WHERE channel_id = $1::uuid AND user_id = $2 LIMIT 1`,
      channelId,
      userId,
    );
    if (rows.length === 0) {
      throw new ForbiddenException({ code: "NOT_A_MEMBER" });
    }
  }

  async listMessages(channelId: string, userId: string, limit = 50): Promise<MessageRow[]> {
    await this.ensureMembership(channelId, userId);
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
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
      `SELECT m.id, m.channel_id, m.author_id,
              u.first_name || ' ' || u.last_name AS author_name,
              u.avatar_url AS author_avatar_url,
              m.body, m.attachments, m.created_at
       FROM chat_messages m
       JOIN users u ON u.id = m.author_id
       WHERE m.channel_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2::int`,
      channelId,
      limit,
    );
    return rows
      .map((row) => ({
        id: row.id,
        channelId: row.channel_id,
        authorId: row.author_id,
        authorName: row.author_name,
        authorAvatarUrl: row.author_avatar_url,
        body: row.body,
        attachments: parseAttachments(row.attachments),
        createdAt: row.created_at,
      }))
      .reverse();
  }

  async sendMessage(
    channelId: string,
    authorId: string,
    body: string,
    attachments: ChatAttachment[] = [],
  ): Promise<MessageRow> {
    await this.ensureMembership(channelId, authorId);
    if (body.trim().length === 0 && attachments.length === 0) {
      throw new BadRequestException({ code: "EMPTY_MESSAGE" });
    }
    const client = await this.tenantDb.getClient();
    const attachmentsJson = attachments.length > 0 ? JSON.stringify(attachments) : null;
    const rows = await client.$queryRawUnsafe<
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
         INSERT INTO chat_messages (channel_id, author_id, body, attachments)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id, channel_id, author_id, body, attachments, created_at
       )
       SELECT i.*, u.first_name || ' ' || u.last_name AS author_name,
              u.avatar_url AS author_avatar_url
       FROM inserted i JOIN users u ON u.id = i.author_id`,
      channelId,
      authorId,
      body,
      attachmentsJson,
    );
    const row = rows[0];
    if (!row) throw new BadRequestException({ code: "INSERT_FAILED" });

    // Сохраняем pointer прочтения для автора, чтобы своё сообщение не считалось unread.
    await client.$executeRawUnsafe(
      `UPDATE chat_members SET last_read_at = NOW() WHERE channel_id = $1::uuid AND user_id = $2`,
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
    };
  }

  // ===== Members =====

  async listMembers(channelId: string, requesterId: string): Promise<MemberRow[]> {
    await this.ensureMembership(channelId, requesterId);
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        user_id: string;
        first_name: string;
        last_name: string;
        avatar_url: string | null;
        role: string;
        joined_at: Date;
      }[]
    >(
      `SELECT cm.user_id, u.first_name, u.last_name, u.avatar_url,
              cm.role, cm.joined_at
       FROM chat_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.channel_id = $1::uuid AND u.status = 'ACTIVE'
       ORDER BY cm.role DESC, u.first_name, u.last_name`,
      channelId,
    );
    return rows.map((r) => ({
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      avatarUrl: r.avatar_url,
      role: r.role as "ADMIN" | "MEMBER",
      joinedAt: r.joined_at,
    }));
  }

  async addMember(channelId: string, userId: string, requesterId: string): Promise<void> {
    await this.assertChannelAdmin(channelId, requesterId);
    const client = await this.tenantDb.getClient();
    // Проверяем что user существует и активен в этом tenant.
    const userRows = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM users WHERE id = $1::uuid AND status = 'ACTIVE' LIMIT 1`,
      userId,
    );
    if (userRows.length === 0) {
      throw new NotFoundException({ code: "USER_NOT_FOUND" });
    }
    await client.$executeRawUnsafe(
      `INSERT INTO chat_members (channel_id, user_id, role)
       VALUES ($1::uuid, $2::uuid, 'MEMBER')
       ON CONFLICT DO NOTHING`,
      channelId,
      userId,
    );
  }

  async removeMember(channelId: string, userId: string, requesterId: string): Promise<void> {
    // Сам себя из канала может убрать любой; других — только админ.
    if (userId !== requesterId) {
      await this.assertChannelAdmin(channelId, requesterId);
    }
    const client = await this.tenantDb.getClient();
    const result = await client.$executeRawUnsafe(
      `DELETE FROM chat_members WHERE channel_id = $1::uuid AND user_id = $2::uuid`,
      channelId,
      userId,
    );
    if (result === 0) {
      throw new NotFoundException({ code: "MEMBER_NOT_FOUND" });
    }
  }

  private async assertChannelAdmin(channelId: string, userId: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ role: string }[]>(
      `SELECT role FROM chat_members WHERE channel_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
      channelId,
      userId,
    );
    const role = rows[0]?.role;
    if (!role) throw new ForbiddenException({ code: "NOT_A_MEMBER" });
    if (role !== "ADMIN") throw new ForbiddenException({ code: "NOT_CHANNEL_ADMIN" });
  }

  async markRead(channelId: string, userId: string): Promise<void> {
    await this.ensureMembership(channelId, userId);
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE chat_members SET last_read_at = NOW() WHERE channel_id = $1::uuid AND user_id = $2`,
      channelId,
      userId,
    );
  }

  async getChannelMemberIds(channelId: string): Promise<string[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ user_id: string }[]>(
      `SELECT user_id FROM chat_members WHERE channel_id = $1::uuid`,
      channelId,
    );
    return rows.map((r) => r.user_id);
  }
}

/** Безопасный парс JSONB-поля attachments: всегда возвращает массив, фильтрует мусор. */
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
