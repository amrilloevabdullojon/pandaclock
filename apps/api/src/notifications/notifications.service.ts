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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoUrl = "https://exp.host/--/api/v2/push/send";
  private readonly accessToken = process.env.EXPO_ACCESS_TOKEN;

  constructor(private readonly tenantDb: TenantPrismaService) {}

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
}
