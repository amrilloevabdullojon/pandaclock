import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateRunDto, SetSalaryDto, UpdatePayslipDto } from "./dto/payroll.dto.js";

export interface SalaryRow {
  userId: string;
  userName: string;
  amount: number | null;
  currency: string | null;
  effectiveFrom: string | null;
}

export interface SalaryHistoryItem {
  id: string;
  amount: number;
  currency: string;
  effectiveFrom: string;
  createdAt: Date;
}

export interface PayrollRun {
  id: string;
  period: string;
  status: string;
  payslipCount: number;
  totalNet: number;
  paidAt: Date | null;
  createdAt: Date;
}

export interface Payslip {
  id: string;
  runId: string;
  userId: string;
  userName: string;
  baseAmount: number;
  bonus: number;
  deductions: number;
  netAmount: number;
  currency: string;
  note: string | null;
}

export interface PayrollRunDetail extends PayrollRun {
  payslips: Payslip[];
}

export interface MyPayslip {
  id: string;
  period: string;
  status: string;
  baseAmount: number;
  bonus: number;
  deductions: number;
  netAmount: number;
  currency: string;
  note: string | null;
  paidAt: Date | null;
}

interface PayslipRow {
  id: string;
  run_id: string;
  user_id: string;
  user_name: string;
  base_amount: number;
  bonus: number;
  deductions: number;
  net_amount: number;
  currency: string;
  note: string | null;
}

function mapPayslip(r: PayslipRow): Payslip {
  return {
    id: r.id,
    runId: r.run_id,
    userId: r.user_id,
    userName: r.user_name,
    baseAmount: r.base_amount,
    bonus: r.bonus,
    deductions: r.deductions,
    netAmount: r.net_amount,
    currency: r.currency,
    note: r.note,
  };
}

const PAYSLIP_SELECT = `
  p.id, p.run_id, p.user_id, u.first_name || ' ' || u.last_name AS user_name,
  p.base_amount::float8 AS base_amount, p.bonus::float8 AS bonus,
  p.deductions::float8 AS deductions, p.net_amount::float8 AS net_amount,
  p.currency, p.note
`;

@Injectable()
export class PayrollService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ───────── Оклады ───────── */

  async listSalaries(): Promise<SalaryRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        user_id: string;
        user_name: string;
        amount: number | null;
        currency: string | null;
        effective_from: Date | null;
      }[]
    >(
      `SELECT u.id AS user_id, u.first_name || ' ' || u.last_name AS user_name,
              s.amount::float8 AS amount, s.currency, s.effective_from
       FROM users u
       LEFT JOIN LATERAL (
         SELECT amount, currency, effective_from FROM salaries
         WHERE user_id = u.id AND effective_from <= CURRENT_DATE
         ORDER BY effective_from DESC LIMIT 1
       ) s ON true
       WHERE u.status = 'ACTIVE'
       ORDER BY u.first_name, u.last_name`,
    );
    return rows.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      amount: r.amount,
      currency: r.currency,
      effectiveFrom: r.effective_from ? r.effective_from.toISOString().slice(0, 10) : null,
    }));
  }

  async setSalary(
    userId: string,
    dto: SetSalaryDto,
    createdBy: string,
  ): Promise<SalaryHistoryItem> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      { id: string; amount: number; currency: string; effective_from: Date; created_at: Date }[]
    >(
      `INSERT INTO salaries (user_id, amount, currency, effective_from, created_by)
       VALUES ($1::uuid, $2::numeric, $3, COALESCE($4::date, CURRENT_DATE), $5::uuid)
       RETURNING id, amount::float8 AS amount, currency, effective_from, created_at`,
      userId,
      dto.amount,
      (dto.currency ?? "UZS").toUpperCase(),
      dto.effectiveFrom ?? null,
      createdBy,
    );
    const r = rows[0];
    if (!r) throw new BadRequestException({ code: "INSERT_FAILED" });
    return {
      id: r.id,
      amount: r.amount,
      currency: r.currency,
      effectiveFrom: r.effective_from.toISOString().slice(0, 10),
      createdAt: r.created_at,
    };
  }

  async salaryHistory(userId: string): Promise<SalaryHistoryItem[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      { id: string; amount: number; currency: string; effective_from: Date; created_at: Date }[]
    >(
      `SELECT id, amount::float8 AS amount, currency, effective_from, created_at
       FROM salaries WHERE user_id = $1::uuid ORDER BY effective_from DESC`,
      userId,
    );
    return rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      currency: r.currency,
      effectiveFrom: r.effective_from.toISOString().slice(0, 10),
      createdAt: r.created_at,
    }));
  }

  /* ───────── Расчётные периоды ───────── */

  async listRuns(): Promise<PayrollRun[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        period: string;
        status: string;
        payslip_count: number;
        total_net: number;
        paid_at: Date | null;
        created_at: Date;
      }[]
    >(
      `SELECT r.id, r.period, r.status, r.paid_at, r.created_at,
              COUNT(p.id)::int AS payslip_count,
              COALESCE(SUM(p.net_amount), 0)::float8 AS total_net
       FROM payroll_runs r
       LEFT JOIN payslips p ON p.run_id = r.id
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
    );
    return rows.map((r) => ({
      id: r.id,
      period: r.period,
      status: r.status,
      payslipCount: r.payslip_count,
      totalNet: r.total_net,
      paidAt: r.paid_at,
      createdAt: r.created_at,
    }));
  }

  async getRun(id: string): Promise<PayrollRunDetail> {
    const client = await this.tenantDb.getClient();
    const runs = await client.$queryRawUnsafe<
      {
        id: string;
        period: string;
        status: string;
        payslip_count: number;
        total_net: number;
        paid_at: Date | null;
        created_at: Date;
      }[]
    >(
      `SELECT r.id, r.period, r.status, r.paid_at, r.created_at,
              COUNT(p.id)::int AS payslip_count,
              COALESCE(SUM(p.net_amount), 0)::float8 AS total_net
       FROM payroll_runs r
       LEFT JOIN payslips p ON p.run_id = r.id
       WHERE r.id = $1::uuid
       GROUP BY r.id`,
      id,
    );
    const r = runs[0];
    if (!r) throw new NotFoundException({ code: "RUN_NOT_FOUND" });
    const payslips = await client.$queryRawUnsafe<PayslipRow[]>(
      `SELECT ${PAYSLIP_SELECT}
       FROM payslips p JOIN users u ON u.id = p.user_id
       WHERE p.run_id = $1::uuid
       ORDER BY u.first_name, u.last_name`,
      id,
    );
    return {
      id: r.id,
      period: r.period,
      status: r.status,
      payslipCount: r.payslip_count,
      totalNet: r.total_net,
      paidAt: r.paid_at,
      createdAt: r.created_at,
      payslips: payslips.map(mapPayslip),
    };
  }

  /** Создаёт период и генерирует листки из текущих окладов активных сотрудников. */
  async createRun(dto: CreateRunDto, createdBy: string): Promise<PayrollRunDetail> {
    const client = await this.tenantDb.getClient();
    const runRows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO payroll_runs (period, created_by, status) VALUES ($1, $2::uuid, 'DRAFT')
       RETURNING id`,
      dto.period,
      createdBy,
    );
    const runId = runRows[0]?.id;
    if (!runId) throw new BadRequestException({ code: "INSERT_FAILED" });

    await client.$executeRawUnsafe(
      `INSERT INTO payslips (run_id, user_id, base_amount, net_amount, currency)
       SELECT $1::uuid, s.user_id, s.amount, s.amount, s.currency
       FROM (
         SELECT DISTINCT ON (user_id) user_id, amount, currency
         FROM salaries WHERE effective_from <= CURRENT_DATE
         ORDER BY user_id, effective_from DESC
       ) s
       JOIN users u ON u.id = s.user_id AND u.status = 'ACTIVE'`,
      runId,
    );
    return this.getRun(runId);
  }

  async updateRunStatus(id: string, status: "APPROVED" | "PAID"): Promise<PayrollRunDetail> {
    const run = await this.getRun(id);
    // Допустимые переходы: DRAFT→APPROVED, APPROVED→PAID.
    const ok =
      (status === "APPROVED" && run.status === "DRAFT") ||
      (status === "PAID" && run.status === "APPROVED");
    if (!ok)
      throw new ConflictException({ code: "INVALID_TRANSITION", from: run.status, to: status });

    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE payroll_runs SET status = $2,
         paid_at = CASE WHEN $2 = 'PAID' THEN NOW() ELSE paid_at END,
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      status,
    );

    if (status === "PAID") {
      const recipients = await client.$queryRawUnsafe<{ user_id: string }[]>(
        `SELECT user_id FROM payslips WHERE run_id = $1::uuid`,
        id,
      );
      const ids = recipients.map((x) => x.user_id);
      if (ids.length > 0) {
        void this.notifications
          .notify(ids, {
            type: "payslip_ready",
            title: "Расчётный листок готов",
            body: `Зарплата за ${run.period} начислена`,
            link: "/dashboard/payroll",
          })
          .catch(() => undefined);
      }
    }
    return this.getRun(id);
  }

  async removeRun(id: string): Promise<void> {
    const run = await this.getRun(id);
    if (run.status !== "DRAFT") {
      throw new ConflictException({ code: "NOT_DRAFT", current: run.status });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(`DELETE FROM payroll_runs WHERE id = $1::uuid`, id);
  }

  async updatePayslip(id: string, dto: UpdatePayslipDto): Promise<Payslip> {
    const client = await this.tenantDb.getClient();
    const meta = await client.$queryRawUnsafe<{ status: string }[]>(
      `SELECT r.status FROM payslips p JOIN payroll_runs r ON r.id = p.run_id
       WHERE p.id = $1::uuid`,
      id,
    );
    if (meta.length === 0) throw new NotFoundException({ code: "PAYSLIP_NOT_FOUND" });
    if (meta[0]!.status !== "DRAFT") {
      throw new ConflictException({ code: "RUN_LOCKED", current: meta[0]!.status });
    }
    await client.$executeRawUnsafe(
      `UPDATE payslips SET
         bonus = COALESCE($2::numeric, bonus),
         deductions = COALESCE($3::numeric, deductions),
         note = COALESCE($4, note),
         net_amount = base_amount + COALESCE($2::numeric, bonus) - COALESCE($3::numeric, deductions)
       WHERE id = $1::uuid`,
      id,
      dto.bonus ?? null,
      dto.deductions ?? null,
      dto.note ?? null,
    );
    const rows = await client.$queryRawUnsafe<PayslipRow[]>(
      `SELECT ${PAYSLIP_SELECT}
       FROM payslips p JOIN users u ON u.id = p.user_id WHERE p.id = $1::uuid`,
      id,
    );
    return mapPayslip(rows[0]!);
  }

  /* ───────── Сотрудник ───────── */

  async listMyPayslips(userId: string): Promise<MyPayslip[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        period: string;
        status: string;
        base_amount: number;
        bonus: number;
        deductions: number;
        net_amount: number;
        currency: string;
        note: string | null;
        paid_at: Date | null;
      }[]
    >(
      `SELECT p.id, r.period, r.status,
              p.base_amount::float8 AS base_amount, p.bonus::float8 AS bonus,
              p.deductions::float8 AS deductions, p.net_amount::float8 AS net_amount,
              p.currency, p.note, r.paid_at
       FROM payslips p JOIN payroll_runs r ON r.id = p.run_id
       WHERE p.user_id = $1::uuid AND r.status IN ('APPROVED', 'PAID')
       ORDER BY r.created_at DESC`,
      userId,
    );
    return rows.map((r) => ({
      id: r.id,
      period: r.period,
      status: r.status,
      baseAmount: r.base_amount,
      bonus: r.bonus,
      deductions: r.deductions,
      netAmount: r.net_amount,
      currency: r.currency,
      note: r.note,
      paidAt: r.paid_at,
    }));
  }
}
