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
import { ChatsService } from "./chats.service.js";

interface SocketUser {
  userId: string;
  tenantSlug: string;
  email: string;
}

interface JoinPayload {
  channelId: string;
}

interface SendPayload {
  channelId: string;
  body: string;
  attachments?: { url: string; filename: string; size: number; mimeType: string }[];
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
  path: "/socket.io",
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chats: ChatsService,
    private readonly jwt: JwtService,
  ) {}

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
      this.logger.warn({ err: error }, "ws auth failed");
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug({ id: client.id }, "ws disconnected");
  }

  @SubscribeMessage("channel:join")
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) throw new WsException("Unauthenticated");
    await this.chats.ensureMembership(body.channelId, user.userId);
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
    const message = await this.chats.sendMessage(
      body.channelId,
      user.userId,
      body.body,
      body.attachments,
    );
    this.server
      .to(`tenant:${user.tenantSlug}:channel:${body.channelId}`)
      .emit("message:new", message);
    return message;
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
