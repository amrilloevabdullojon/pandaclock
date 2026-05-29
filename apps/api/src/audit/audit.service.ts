import { Injectable } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

export interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditQuery {
  limit?: number;
  cursor?: string;
  entityType?: string;
  userId?: string;
  action?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async list(query: AuditQuery): Promise<{ items: AuditEntry[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const client = await this.tenantDb.getClient();

    const whereParts: string[] = ["1 = 1"];
    const params: unknown[] = [];

    if (query.cursor) {
      params.push(query.cursor);
      whereParts.push(`a.id < $${params.length}::bigint`);
    }
    if (query.entityType) {
      params.push(query.entityType);
      whereParts.push(`a.entity_type = $${params.length}`);
    }
    if (query.userId) {
      params.push(query.userId);
      whereParts.push(`a.user_id = $${params.length}::uuid`);
    }
    if (query.action) {
      params.push(`%${query.action}%`);
      whereParts.push(`a.action ILIKE $${params.length}`);
    }

    interface Row {
      id: bigint;
      user_id: string | null;
      user_name: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      ip_address: string | null;
      user_agent: string | null;
      changes: Record<string, unknown> | null;
      created_at: Date;
    }

    const rows = await client.$queryRawUnsafe<Row[]>(
      `SELECT a.id, a.user_id,
              CASE WHEN u.id IS NULL THEN NULL
                   ELSE u.first_name || ' ' || u.last_name
              END AS user_name,
              a.action, a.entity_type, a.entity_id,
              a.ip_address::text AS ip_address,
              a.user_agent, a.changes, a.created_at
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${whereParts.join(" AND ")}
       ORDER BY a.id DESC
       LIMIT ${limit + 1}`,
      ...params,
    );

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = slice.length > 0 ? slice[slice.length - 1] : undefined;
    const nextCursor = hasMore && lastItem ? lastItem.id.toString() : null;

    return {
      items: slice.map((row) => ({
        id: row.id.toString(),
        userId: row.user_id,
        userName: row.user_name,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        changes: row.changes,
        createdAt: row.created_at.toISOString(),
      })),
      nextCursor,
    };
  }

  /** Список уникальных entity_type'ов для filter UI. */
  async listEntityTypes(): Promise<string[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ entity_type: string }[]>(
      `SELECT DISTINCT entity_type FROM audit_log ORDER BY entity_type`,
    );
    return rows.map((r) => r.entity_type);
  }
}
