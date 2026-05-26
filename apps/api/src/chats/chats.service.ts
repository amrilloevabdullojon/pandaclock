import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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

export interface MessageRow {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date;
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

  async ensureMembership(channelId: string, userId: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ channel_id: string }[]>(
      `SELECT channel_id FROM chat_members WHERE channel_id = $1 AND user_id = $2 LIMIT 1`,
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
      { id: string; channel_id: string; author_id: string; author_name: string; body: string; created_at: Date }[]
    >(
      `SELECT m.id, m.channel_id, m.author_id,
              u.first_name || ' ' || u.last_name AS author_name,
              m.body, m.created_at
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
        body: row.body,
        createdAt: row.created_at,
      }))
      .reverse();
  }

  async sendMessage(channelId: string, authorId: string, body: string): Promise<MessageRow> {
    await this.ensureMembership(channelId, authorId);
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      { id: string; channel_id: string; author_id: string; author_name: string; body: string; created_at: Date }[]
    >(
      `WITH inserted AS (
         INSERT INTO chat_messages (channel_id, author_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, channel_id, author_id, body, created_at
       )
       SELECT i.*, u.first_name || ' ' || u.last_name AS author_name
       FROM inserted i JOIN users u ON u.id = i.author_id`,
      channelId,
      authorId,
      body,
    );
    const row = rows[0];
    if (!row) throw new BadRequestException({ code: "INSERT_FAILED" });

    // Сохраняем pointer прочтения для автора, чтобы своё сообщение не считалось unread.
    await client.$executeRawUnsafe(
      `UPDATE chat_members SET last_read_at = NOW() WHERE channel_id = $1 AND user_id = $2`,
      channelId,
      authorId,
    );

    return {
      id: row.id,
      channelId: row.channel_id,
      authorId: row.author_id,
      authorName: row.author_name,
      body: row.body,
      createdAt: row.created_at,
    };
  }

  async markRead(channelId: string, userId: string): Promise<void> {
    await this.ensureMembership(channelId, userId);
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE chat_members SET last_read_at = NOW() WHERE channel_id = $1 AND user_id = $2`,
      channelId,
      userId,
    );
  }

  async getChannelMemberIds(channelId: string): Promise<string[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ user_id: string }[]>(
      `SELECT user_id FROM chat_members WHERE channel_id = $1`,
      channelId,
    );
    return rows.map((r) => r.user_id);
  }
}
