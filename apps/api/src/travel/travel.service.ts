import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { effectiveScope } from "./scope-utils.js";
import type {
  CreateBusinessTripDto,
  CreateExpenseDto,
  UpdateBusinessTripDto,
  UpdateExpenseDto,
} from "./dto/travel.dto.js";

export type Scope = "my" | "team" | "all";

export interface Expense {
  id: string;
  userId: string;
  userName: string;
  tripId: string | null;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  spentAt: string;
  receiptUrl: string | null;
  status: string;
  approverName: string | null;
  approverComment: string | null;
  createdAt: Date;
}

export interface BusinessTrip {
  id: string;
  userId: string;
  userName: string;
  destination: string;
  purpose: string | null;
  startDate: string;
  endDate: string;
  status: string;
  approverName: string | null;
  approverComment: string | null;
  expenseCount: number;
  expenseTotal: number;
  createdAt: Date;
}

export interface BusinessTripDetail extends BusinessTrip {
  expenses: Expense[];
}

interface TripRow {
  id: string;
  user_id: string;
  user_name: string;
  destination: string;
  purpose: string | null;
  start_date: Date;
  end_date: Date;
  status: string;
  approver_name: string | null;
  approver_comment: string | null;
  expense_count: number;
  expense_total: number;
  created_at: Date;
}

interface ExpenseRow {
  id: string;
  user_id: string;
  user_name: string;
  trip_id: string | null;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  spent_at: Date;
  receipt_url: string | null;
  status: string;
  approver_name: string | null;
  approver_comment: string | null;
  created_at: Date;
}

const TRIP_SELECT = `
  t.id, t.user_id, u.first_name || ' ' || u.last_name AS user_name,
  t.destination, t.purpose, t.start_date, t.end_date, t.status,
  CASE WHEN a.id IS NOT NULL THEN a.first_name || ' ' || a.last_name END AS approver_name,
  t.approver_comment, t.created_at,
  COUNT(e.id)::int AS expense_count,
  COALESCE(SUM(e.amount), 0)::float8 AS expense_total
`;

const EXPENSE_SELECT = `
  e.id, e.user_id, u.first_name || ' ' || u.last_name AS user_name,
  e.trip_id, e.category, e.amount::float8 AS amount, e.currency, e.description,
  e.spent_at, e.receipt_url, e.status,
  CASE WHEN a.id IS NOT NULL THEN a.first_name || ' ' || a.last_name END AS approver_name,
  e.approver_comment, e.created_at
`;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapTrip(r: TripRow): BusinessTrip {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    destination: r.destination,
    purpose: r.purpose,
    startDate: isoDate(r.start_date),
    endDate: isoDate(r.end_date),
    status: r.status,
    approverName: r.approver_name,
    approverComment: r.approver_comment,
    expenseCount: r.expense_count,
    expenseTotal: r.expense_total,
    createdAt: r.created_at,
  };
}

function mapExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    tripId: r.trip_id,
    category: r.category,
    amount: r.amount,
    currency: r.currency,
    description: r.description,
    spentAt: isoDate(r.spent_at),
    receiptUrl: r.receipt_url,
    status: r.status,
    approverName: r.approver_name,
    approverComment: r.approver_comment,
    createdAt: r.created_at,
  };
}

@Injectable()
export class TravelService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Строит WHERE-фильтр по scope (на колонку owner-а). */
  private scopeFilter(
    scope: Scope,
    userId: string,
    canApprove: boolean,
    ownerCol: string,
  ): { where: string; params: unknown[] } {
    const effective: Scope = effectiveScope(scope, canApprove);
    if (effective === "my") {
      return { where: `${ownerCol} = $1::uuid`, params: [userId] };
    }
    if (effective === "team") {
      return {
        where: `(${ownerCol} IN (SELECT id FROM users WHERE manager_id = $1::uuid) OR ${ownerCol} = $1::uuid)`,
        params: [userId],
      };
    }
    return { where: "TRUE", params: [] };
  }

  /* ───────── Командировки ───────── */

  async listTrips(scope: Scope, userId: string, canApprove: boolean): Promise<BusinessTrip[]> {
    const client = await this.tenantDb.getClient();
    const { where, params } = this.scopeFilter(scope, userId, canApprove, "t.user_id");
    const rows = await client.$queryRawUnsafe<TripRow[]>(
      `SELECT ${TRIP_SELECT}
       FROM business_trips t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users a ON a.id = t.approver_id
       LEFT JOIN expenses e ON e.trip_id = t.id
       WHERE ${where}
       GROUP BY t.id, u.first_name, u.last_name, a.id, a.first_name, a.last_name
       ORDER BY t.created_at DESC
       LIMIT 200`,
      ...params,
    );
    return rows.map(mapTrip);
  }

  async getTrip(id: string): Promise<BusinessTripDetail> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<TripRow[]>(
      `SELECT ${TRIP_SELECT}
       FROM business_trips t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users a ON a.id = t.approver_id
       LEFT JOIN expenses e ON e.trip_id = t.id
       WHERE t.id = $1::uuid
       GROUP BY t.id, u.first_name, u.last_name, a.id, a.first_name, a.last_name`,
      id,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "TRIP_NOT_FOUND" });
    const expenses = await client.$queryRawUnsafe<ExpenseRow[]>(
      `SELECT ${EXPENSE_SELECT}
       FROM expenses e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN users a ON a.id = e.approver_id
       WHERE e.trip_id = $1::uuid
       ORDER BY e.spent_at DESC, e.created_at DESC`,
      id,
    );
    return { ...mapTrip(r), expenses: expenses.map(mapExpense) };
  }

  async createTrip(dto: CreateBusinessTripDto, userId: string): Promise<BusinessTripDetail> {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException({ code: "END_BEFORE_START" });
    }
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO business_trips (user_id, destination, purpose, start_date, end_date, status)
       VALUES ($1::uuid, $2, $3, $4::date, $5::date, 'DRAFT')
       RETURNING id`,
      userId,
      dto.destination,
      dto.purpose ?? null,
      dto.startDate,
      dto.endDate,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    return this.getTrip(id);
  }

  async updateTrip(
    id: string,
    dto: UpdateBusinessTripDto,
    userId: string,
  ): Promise<BusinessTripDetail> {
    const existing = await this.getTrip(id);
    if (existing.userId !== userId) throw new ForbiddenException({ code: "NOT_OWNER" });
    if (existing.status === "APPROVED" || existing.status === "SUBMITTED") {
      throw new ConflictException({ code: "NOT_EDITABLE", current: existing.status });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE business_trips SET
         destination = COALESCE($2, destination),
         purpose = COALESCE($3, purpose),
         start_date = COALESCE($4::date, start_date),
         end_date = COALESCE($5::date, end_date),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      dto.destination ?? null,
      dto.purpose ?? null,
      dto.startDate ?? null,
      dto.endDate ?? null,
    );
    return this.getTrip(id);
  }

  async submitTrip(id: string, userId: string): Promise<BusinessTripDetail> {
    const existing = await this.getTrip(id);
    if (existing.userId !== userId) throw new ForbiddenException({ code: "NOT_OWNER" });
    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      throw new ConflictException({ code: "NOT_SUBMITTABLE", current: existing.status });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE business_trips SET status = 'SUBMITTED', approver_comment = NULL,
         decided_at = NULL, updated_at = NOW() WHERE id = $1::uuid`,
      id,
    );
    const managerId = await this.findManagerId(userId);
    if (managerId) {
      void this.notifications
        .notify([managerId], {
          type: "trip_submitted",
          title: "Заявка на командировку",
          body: `${existing.userName}: ${existing.destination} (${existing.startDate} — ${existing.endDate})`,
          link: `/dashboard/travel?scope=team`,
          payload: { tripId: id },
        })
        .catch(() => undefined);
    }
    return this.getTrip(id);
  }

  async decideTrip(
    id: string,
    approverId: string,
    decision: "APPROVED" | "REJECTED",
    comment?: string,
  ): Promise<BusinessTripDetail> {
    const existing = await this.getTrip(id);
    if (existing.status !== "SUBMITTED") {
      throw new ConflictException({ code: "NOT_PENDING", current: existing.status });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE business_trips SET status = $2, approver_id = $3::uuid,
         approver_comment = $4, decided_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      decision,
      approverId,
      comment ?? null,
    );
    void this.notifications
      .notify([existing.userId], {
        type: "trip_decided",
        title: decision === "APPROVED" ? "Командировка одобрена ✅" : "Командировка отклонена ❌",
        body: `${existing.destination} (${existing.startDate} — ${existing.endDate})`,
        link: `/dashboard/travel?scope=my`,
        payload: { tripId: id, status: decision },
      })
      .catch(() => undefined);
    return this.getTrip(id);
  }

  async removeTrip(id: string, userId: string, canApprove: boolean): Promise<void> {
    const existing = await this.getTrip(id);
    if (!canApprove && existing.userId !== userId) {
      throw new ForbiddenException({ code: "NOT_OWNER" });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(`DELETE FROM business_trips WHERE id = $1::uuid`, id);
  }

  /* ───────── Расходы ───────── */

  async listExpenses(
    scope: Scope,
    userId: string,
    canApprove: boolean,
    tripId?: string,
  ): Promise<Expense[]> {
    const client = await this.tenantDb.getClient();
    const { where, params } = this.scopeFilter(scope, userId, canApprove, "e.user_id");
    let sql = `SELECT ${EXPENSE_SELECT}
       FROM expenses e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN users a ON a.id = e.approver_id
       WHERE ${where}`;
    if (tripId) {
      params.push(tripId);
      sql += ` AND e.trip_id = $${String(params.length)}::uuid`;
    }
    sql += ` ORDER BY e.spent_at DESC, e.created_at DESC LIMIT 300`;
    const rows = await client.$queryRawUnsafe<ExpenseRow[]>(sql, ...params);
    return rows.map(mapExpense);
  }

  async getExpense(id: string): Promise<Expense> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<ExpenseRow[]>(
      `SELECT ${EXPENSE_SELECT}
       FROM expenses e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN users a ON a.id = e.approver_id
       WHERE e.id = $1::uuid`,
      id,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "EXPENSE_NOT_FOUND" });
    return mapExpense(r);
  }

  async createExpense(dto: CreateExpenseDto, userId: string): Promise<Expense> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO expenses (user_id, trip_id, category, amount, currency, description, spent_at, receipt_url, status)
       VALUES ($1::uuid, $2::uuid, $3, $4::numeric, $5, $6, $7::date, $8, 'PENDING')
       RETURNING id`,
      userId,
      dto.tripId ?? null,
      dto.category,
      dto.amount,
      (dto.currency ?? "UZS").toUpperCase(),
      dto.description ?? null,
      dto.spentAt,
      dto.receiptUrl ?? null,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    return this.getExpense(id);
  }

  async updateExpense(id: string, dto: UpdateExpenseDto, userId: string): Promise<Expense> {
    const existing = await this.getExpense(id);
    if (existing.userId !== userId) throw new ForbiddenException({ code: "NOT_OWNER" });
    if (existing.status === "APPROVED") {
      throw new ConflictException({ code: "NOT_EDITABLE", current: existing.status });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE expenses SET
         trip_id = COALESCE($2::uuid, trip_id),
         category = COALESCE($3, category),
         amount = COALESCE($4::numeric, amount),
         currency = COALESCE($5, currency),
         description = COALESCE($6, description),
         spent_at = COALESCE($7::date, spent_at),
         receipt_url = COALESCE($8, receipt_url),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      dto.tripId ?? null,
      dto.category ?? null,
      dto.amount ?? null,
      dto.currency ? dto.currency.toUpperCase() : null,
      dto.description ?? null,
      dto.spentAt ?? null,
      dto.receiptUrl ?? null,
    );
    return this.getExpense(id);
  }

  async decideExpense(
    id: string,
    approverId: string,
    decision: "APPROVED" | "REJECTED",
    comment?: string,
  ): Promise<Expense> {
    const existing = await this.getExpense(id);
    if (existing.status !== "PENDING") {
      throw new ConflictException({ code: "ALREADY_DECIDED", current: existing.status });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE expenses SET status = $2, approver_id = $3::uuid,
         approver_comment = $4, decided_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      decision,
      approverId,
      comment ?? null,
    );
    void this.notifications
      .notify([existing.userId], {
        type: "expense_decided",
        title: decision === "APPROVED" ? "Расход одобрен ✅" : "Расход отклонён ❌",
        body: `${existing.category}: ${existing.amount} ${existing.currency}`,
        link: `/dashboard/travel?scope=my`,
        payload: { expenseId: id, status: decision },
      })
      .catch(() => undefined);
    return this.getExpense(id);
  }

  async removeExpense(id: string, userId: string, canApprove: boolean): Promise<void> {
    const existing = await this.getExpense(id);
    if (!canApprove && existing.userId !== userId) {
      throw new ForbiddenException({ code: "NOT_OWNER" });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(`DELETE FROM expenses WHERE id = $1::uuid`, id);
  }

  private async findManagerId(userId: string): Promise<string | null> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ manager_id: string | null }[]>(
      `SELECT manager_id FROM users WHERE id = $1::uuid LIMIT 1`,
      userId,
    );
    return rows[0]?.manager_id ?? null;
  }

  /* ───────── Единый инбокс согласований ───────── */

  async listApprovals(
    canApprove: boolean,
  ): Promise<{ trips: BusinessTrip[]; expenses: Expense[] }> {
    if (!canApprove) return { trips: [], expenses: [] };
    const client = await this.tenantDb.getClient();
    const tripRows = await client.$queryRawUnsafe<TripRow[]>(
      `SELECT ${TRIP_SELECT}
       FROM business_trips t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users a ON a.id = t.approver_id
       LEFT JOIN expenses e ON e.trip_id = t.id
       WHERE t.status = 'SUBMITTED'
       GROUP BY t.id, u.first_name, u.last_name, a.id, a.first_name, a.last_name
       ORDER BY t.created_at
       LIMIT 200`,
    );
    const expenseRows = await client.$queryRawUnsafe<ExpenseRow[]>(
      `SELECT ${EXPENSE_SELECT}
       FROM expenses e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN users a ON a.id = e.approver_id
       WHERE e.status = 'PENDING'
       ORDER BY e.created_at
       LIMIT 300`,
    );
    return { trips: tripRows.map(mapTrip), expenses: expenseRows.map(mapExpense) };
  }

  /** Пакетное решение по командировкам и расходам одним действием. */
  async bulkDecide(
    tripIds: string[],
    expenseIds: string[],
    decision: "APPROVED" | "REJECTED",
    approverId: string,
    comment?: string,
  ): Promise<{ trips: number; expenses: number }> {
    const client = await this.tenantDb.getClient();
    let trips = 0;
    let expenses = 0;

    if (tripIds.length > 0) {
      const rows = await client.$queryRawUnsafe<{ user_id: string; destination: string }[]>(
        `UPDATE business_trips SET status = $2, approver_id = $3::uuid, approver_comment = $4,
           decided_at = NOW(), updated_at = NOW()
         WHERE id = ANY($1::uuid[]) AND status = 'SUBMITTED'
         RETURNING user_id, destination`,
        tripIds,
        decision,
        approverId,
        comment ?? null,
      );
      trips = rows.length;
      for (const r of rows) {
        void this.notifications
          .notify([r.user_id], {
            type: "trip_decided",
            title:
              decision === "APPROVED" ? "Командировка одобрена ✅" : "Командировка отклонена ❌",
            body: r.destination,
            link: `/dashboard/travel?scope=my`,
          })
          .catch(() => undefined);
      }
    }

    if (expenseIds.length > 0) {
      const rows = await client.$queryRawUnsafe<
        { user_id: string; category: string; amount: number; currency: string }[]
      >(
        `UPDATE expenses SET status = $2, approver_id = $3::uuid, approver_comment = $4,
           decided_at = NOW(), updated_at = NOW()
         WHERE id = ANY($1::uuid[]) AND status = 'PENDING'
         RETURNING user_id, category, amount::float8 AS amount, currency`,
        expenseIds,
        decision,
        approverId,
        comment ?? null,
      );
      expenses = rows.length;
      for (const r of rows) {
        void this.notifications
          .notify([r.user_id], {
            type: "expense_decided",
            title: decision === "APPROVED" ? "Расход одобрен ✅" : "Расход отклонён ❌",
            body: `${r.category}: ${r.amount} ${r.currency}`,
            link: `/dashboard/travel?scope=my`,
          })
          .catch(() => undefined);
      }
    }

    return { trips, expenses };
  }
}
