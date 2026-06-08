import { Injectable, Logger } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface PushTokenRow {
  token: string;
}

interface ExpoSendResult {
  data?: Array<{ status: "ok" | "error"; message?: string; details?: { error?: string } }>;
}

export type NotificationType =
  | "task_assigned"
  | "task_commented"
  | "task_status_changed"
  | "leave_requested"
  | "leave_decided"
  | "shift_assigned"
  | "goal_assigned"
  | "review_received"
  | "hr_document"
  | "trip_submitted"
  | "trip_decided"
  | "expense_decided"
  | "survey_published"
  | "mention"
  | "system";

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  payload?: Record<string, unknown>;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoUrl = "https://exp.host/--/api/v2/push/send";
  private readonly accessToken = process.env.EXPO_ACCESS_TOKEN;

  constructor(private readonly tenantDb: TenantPrismaService) {}

  /* ───────────────────────── Expo push tokens ───────────────────────── */

  async registerToken(userId: string, token: string, platform: string): Promise<void> {
    if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      this.logger.warn({ userId }, "ignoring non-Expo push token");
      return;
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `INSERT INTO push_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, token) DO UPDATE SET last_seen_at = NOW()`,
      userId,
      token,
      platform,
    );
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `DELETE FROM push_tokens WHERE user_id = $1::uuid AND token = $2`,
      userId,
      token,
    );
  }

  /* ───────────────────────── Expo push delivery ───────────────────────── */

  /**
   * Шлёт push указанным пользователям. Fire-and-forget — не блокирует основной flow.
   */
  async pushToUsers(userIds: string[], message: PushMessage): Promise<void> {
    if (userIds.length === 0) return;
    const client = await this.tenantDb.getClient();
    const tokens = await client.$queryRawUnsafe<PushTokenRow[]>(
      `SELECT token FROM push_tokens WHERE user_id = ANY($1::uuid[])`,
      userIds,
    );
    if (tokens.length === 0) return;

    const messages = tokens.map((row) => ({
      to: row.token,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    }));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
      }
      const response = await fetch(this.expoUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(messages),
      });
      const body = (await response.json()) as ExpoSendResult;
      const failures = (body.data ?? []).filter((entry) => entry.status === "error");
      if (failures.length > 0) {
        this.logger.warn({ failures }, "expo push delivery contained failures");
      }
    } catch (error) {
      this.logger.error({ err: error }, "failed to deliver push notifications");
    }
  }

  /* ───────────────────────── In-app notifications ───────────────────────── */

  /**
   * Создаёт одинаковую запись `notifications` для каждого пользователя
   * + отправляет Expo push в фоне (если хотя бы у одного есть токен).
   *
   * Это основной метод, который должны вызывать другие модули:
   *   tasks → "Анвар назначил вам задачу"
   *   leave-requests → "Заявка одобрена"
   *   comments → "Новый комментарий"
   */
  async notify(userIds: string[], input: CreateNotificationInput): Promise<void> {
    if (userIds.length === 0) return;
    const client = await this.tenantDb.getClient();

    // Bulk insert одним запросом
    const valuesSql: string[] = [];
    const params: unknown[] = [];
    userIds.forEach((userId, idx) => {
      const base = idx * 6;
      valuesSql.push(
        `($${base + 1}::uuid, $${base + 2}::varchar, $${base + 3}::text, $${base + 4}::text, $${base + 5}::text, $${base + 6}::jsonb)`,
      );
      params.push(
        userId,
        input.type,
        input.title,
        input.body ?? null,
        input.link ?? null,
        input.payload ? JSON.stringify(input.payload) : null,
      );
    });
    await client.$executeRawUnsafe(
      `INSERT INTO notifications (user_id, type, title, body, link, payload) VALUES ${valuesSql.join(", ")}`,
      ...params,
    );

    // Push в фоне (don't await — fire-and-forget)
    void this.pushToUsers(userIds, {
      title: input.title,
      body: input.body ?? "",
      data: { link: input.link, type: input.type, ...(input.payload ?? {}) },
    });
  }

  async list(
    userId: string,
    opts: { limit?: number; cursor?: string; onlyUnread?: boolean } = {},
  ): Promise<{ items: NotificationRow[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const client = await this.tenantDb.getClient();

    const whereParts: string[] = ["user_id = $1::uuid"];
    const params: unknown[] = [userId];
    if (opts.cursor) {
      params.push(opts.cursor);
      whereParts.push(`created_at < $${params.length}::timestamptz`);
    }
    if (opts.onlyUnread) {
      whereParts.push("read_at IS NULL");
    }

    interface Row {
      id: string;
      type: string;
      title: string;
      body: string | null;
      link: string | null;
      payload: Record<string, unknown> | null;
      read_at: Date | null;
      created_at: Date;
    }

    const rows = await client.$queryRawUnsafe<Row[]>(
      `SELECT id, type, title, body, link, payload, read_at, created_at
       FROM notifications
       WHERE ${whereParts.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT ${limit + 1}`,
      ...params,
    );

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = slice.length > 0 ? slice[slice.length - 1] : undefined;
    const nextCursor = hasMore && lastItem ? lastItem.created_at.toISOString() : null;

    return {
      items: slice.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
        payload: row.payload,
        readAt: row.read_at ? row.read_at.toISOString() : null,
        createdAt: row.created_at.toISOString(),
      })),
      nextCursor,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    const client = await this.tenantDb.getClient();
    interface CountRow {
      count: bigint;
    }
    const rows = await client.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*)::bigint AS count FROM notifications WHERE user_id = $1::uuid AND read_at IS NULL`,
      userId,
    );
    return Number(rows[0]?.count ?? 0);
  }

  async markRead(userId: string, id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE notifications SET read_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid AND read_at IS NULL`,
      id,
      userId,
    );
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const client = await this.tenantDb.getClient();
    interface CountRow {
      count: bigint;
    }
    const rows = await client.$queryRawUnsafe<CountRow[]>(
      `WITH upd AS (
         UPDATE notifications SET read_at = NOW()
         WHERE user_id = $1::uuid AND read_at IS NULL
         RETURNING id
       )
       SELECT COUNT(*)::bigint AS count FROM upd`,
      userId,
    );
    return { updated: Number(rows[0]?.count ?? 0) };
  }
}
