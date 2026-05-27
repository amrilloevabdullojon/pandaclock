import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import {
  accruedDays,
  countWorkingDays,
  rangesOverlap,
} from "./leave-utils.js";
import type { CreateLeaveRequestDto, LeaveType } from "./dto/leave-request.dto.js";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequestRow {
  id: string;
  userId: string;
  userName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: LeaveStatus;
  approverId: string | null;
  approverName: string | null;
  approverComment: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}

interface RawRow {
  id: string;
  user_id: string;
  user_name: string;
  type: string;
  start_date: Date;
  end_date: Date;
  days_count: number;
  reason: string | null;
  status: string;
  approver_id: string | null;
  approver_name: string | null;
  approver_comment: string | null;
  decided_at: Date | null;
  created_at: Date;
}

const SELECT_REQUEST = `
  r.id, r.user_id, u.first_name || ' ' || u.last_name AS user_name,
  r.type, r.start_date, r.end_date, r.days_count, r.reason, r.status,
  r.approver_id,
  CASE WHEN a.id IS NOT NULL THEN a.first_name || ' ' || a.last_name END AS approver_name,
  r.approver_comment, r.decided_at, r.created_at
`;

@Injectable()
export class RequestsService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(scope: "my" | "team" | "all", currentUserId: string): Promise<LeaveRequestRow[]> {
    const client = await this.tenantDb.getClient();

    const filters: string[] = [];
    const params: unknown[] = [];
    if (scope === "my") {
      params.push(currentUserId);
      filters.push(`r.user_id = $${String(params.length)}::uuid`);
    } else if (scope === "team") {
      params.push(currentUserId);
      filters.push(`(
        r.user_id IN (SELECT id FROM users WHERE manager_id = $${String(params.length)}::uuid)
        OR r.user_id = $${String(params.length)}::uuid
      )`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const rows = await client.$queryRawUnsafe<RawRow[]>(
      `SELECT ${SELECT_REQUEST}
       FROM leave_requests r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN users a ON a.id = r.approver_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT 200`,
      ...params,
    );

    return rows.map(toRow);
  }

  async getById(id: string): Promise<LeaveRequestRow> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawRow[]>(
      `SELECT ${SELECT_REQUEST}
       FROM leave_requests r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN users a ON a.id = r.approver_id
       WHERE r.id = $1::uuid LIMIT 1`,
      id,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "REQUEST_NOT_FOUND" });
    return toRow(row);
  }

  async create(dto: CreateLeaveRequestDto, userId: string): Promise<LeaveRequestRow> {
    const days = countWorkingDays(dto.startDate, dto.endDate);
    if (days === 0) {
      throw new BadRequestException({ code: "ZERO_WORKING_DAYS" });
    }
    await this.assertNoOverlap(userId, dto.startDate, dto.endDate);

    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO leave_requests (user_id, type, start_date, end_date, days_count, reason, status)
       VALUES ($1::uuid, $2, $3::date, $4::date, $5, $6, 'PENDING')
       RETURNING id`,
      userId,
      dto.type,
      dto.startDate,
      dto.endDate,
      days,
      dto.reason ?? null,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });

    const request = await this.getById(id);
    const managerId = await this.findManagerId(userId);
    if (managerId) {
      void this.notifications
        .pushToUsers([managerId], {
          title: `📩 Заявка на ${labelForType(request.type)}`,
          body: `${request.userName}: ${request.startDate} — ${request.endDate}`,
          data: { type: "REQUEST_PENDING", requestId: request.id },
        })
        .catch(() => undefined);
    }
    return request;
  }

  async approve(
    id: string,
    approverId: string,
    comment?: string,
  ): Promise<LeaveRequestRow> {
    return this.decide(id, approverId, "APPROVED", comment);
  }

  async reject(
    id: string,
    approverId: string,
    comment?: string,
  ): Promise<LeaveRequestRow> {
    return this.decide(id, approverId, "REJECTED", comment);
  }

  async cancel(id: string, userId: string): Promise<LeaveRequestRow> {
    const existing = await this.getById(id);
    if (existing.userId !== userId) {
      throw new ForbiddenException({ code: "NOT_OWNER" });
    }
    if (existing.status !== "PENDING") {
      throw new ConflictException({ code: "NOT_PENDING" });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE leave_requests SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1::uuid`,
      id,
    );
    return this.getById(id);
  }

  async balance(userId: string): Promise<{
    used: number;
    accrued: number;
    pending: number;
    remaining: number;
  }> {
    const client = await this.tenantDb.getClient();
    const userRows = await client.$queryRawUnsafe<{ hire_date: Date | null }[]>(
      `SELECT hire_date FROM users WHERE id = $1::uuid LIMIT 1`,
      userId,
    );
    const hireDate = userRows[0]?.hire_date ?? null;
    const hireDateIso = hireDate ? hireDate.toISOString() : null;
    const accrued = accruedDays(hireDateIso);

    const aggregates = await client.$queryRawUnsafe<
      { used: number; pending: number }[]
    >(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'APPROVED' AND type = 'VACATION' THEN days_count ELSE 0 END), 0)::int AS used,
         COALESCE(SUM(CASE WHEN status = 'PENDING' AND type = 'VACATION' THEN days_count ELSE 0 END), 0)::int AS pending
       FROM leave_requests
       WHERE user_id = $1::uuid`,
      userId,
    );
    const { used, pending } = aggregates[0] ?? { used: 0, pending: 0 };
    return {
      used,
      accrued,
      pending,
      remaining: Math.max(0, accrued - used - pending),
    };
  }

  /* --- Helpers --- */

  private async decide(
    id: string,
    approverId: string,
    status: "APPROVED" | "REJECTED",
    comment?: string,
  ): Promise<LeaveRequestRow> {
    const existing = await this.getById(id);
    if (existing.status !== "PENDING") {
      throw new ConflictException({ code: "ALREADY_DECIDED", current: existing.status });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE leave_requests
         SET status = $2, approver_id = $3::uuid, approver_comment = $4,
             decided_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      status,
      approverId,
      comment ?? null,
    );
    const updated = await this.getById(id);
    void this.notifications
      .pushToUsers([updated.userId], {
        title: status === "APPROVED" ? "✅ Заявка утверждена" : "❌ Заявка отклонена",
        body: `${labelForType(updated.type)} ${updated.startDate} — ${updated.endDate}`,
        data: { type: "REQUEST_DECIDED", requestId: updated.id, status },
      })
      .catch(() => undefined);
    return updated;
  }

  private async findManagerId(userId: string): Promise<string | null> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ manager_id: string | null }[]>(
      `SELECT manager_id FROM users WHERE id = $1::uuid LIMIT 1`,
      userId,
    );
    return rows[0]?.manager_id ?? null;
  }

  private async assertNoOverlap(userId: string, start: string, end: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string; start_date: Date; end_date: Date }[]>(
      `SELECT id, start_date, end_date FROM leave_requests
       WHERE user_id = $1::uuid AND status IN ('PENDING', 'APPROVED')`,
      userId,
    );
    for (const row of rows) {
      const rowStart = row.start_date.toISOString();
      const rowEnd = row.end_date.toISOString();
      if (rangesOverlap(start, end, rowStart, rowEnd)) {
        throw new ConflictException({ code: "OVERLAPPING_REQUEST", conflictId: row.id });
      }
    }
  }
}

function labelForType(type: LeaveType): string {
  switch (type) {
    case "VACATION":
      return "отпуск";
    case "SICK":
      return "больничный";
    case "TIME_OFF":
      return "отгул";
    default:
      return "заявку";
  }
}

function toRow(row: RawRow): LeaveRequestRow {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    type: row.type as LeaveType,
    startDate: row.start_date.toISOString().slice(0, 10),
    endDate: row.end_date.toISOString().slice(0, 10),
    daysCount: row.days_count,
    reason: row.reason,
    status: row.status as LeaveStatus,
    approverId: row.approver_id,
    approverName: row.approver_name,
    approverComment: row.approver_comment,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}
