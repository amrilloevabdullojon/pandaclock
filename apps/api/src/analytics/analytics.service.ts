import { Injectable } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { computeEnps } from "../surveys/enps-utils.js";

export interface ManagementOverview {
  recruitment: { openVacancies: number; totalCandidates: number; hiredThisMonth: number };
  approvals: { pendingTrips: number; pendingExpenses: number };
  enps: { score: number | null; responses: number };
  payroll: { lastPeriod: string | null; fund: number };
  surveys: { active: number };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async overview(): Promise<ManagementOverview> {
    const client = await this.tenantDb.getClient();

    const count = async (sql: string): Promise<number> => {
      const rows = await client.$queryRawUnsafe<{ c: number }[]>(sql);
      return rows[0]?.c ?? 0;
    };

    const openVacancies = await count(
      `SELECT COUNT(*)::int AS c FROM vacancies WHERE status = 'OPEN'`,
    );
    const totalCandidates = await count(`SELECT COUNT(*)::int AS c FROM candidates`);
    const hiredThisMonth = await count(
      `SELECT COUNT(*)::int AS c FROM candidates
       WHERE stage = 'HIRED' AND updated_at >= date_trunc('month', CURRENT_DATE)`,
    );
    const pendingTrips = await count(
      `SELECT COUNT(*)::int AS c FROM business_trips WHERE status = 'SUBMITTED'`,
    );
    const pendingExpenses = await count(
      `SELECT COUNT(*)::int AS c FROM expenses WHERE status = 'PENDING'`,
    );
    const activeSurveys = await count(
      `SELECT COUNT(*)::int AS c FROM surveys WHERE status = 'ACTIVE'`,
    );

    // eNPS по самому свежему eNPS-опросу (активному или закрытому).
    const enpsRows = await client.$queryRawUnsafe<{ value_int: number | null }[]>(
      `SELECT a.value_int
       FROM survey_answers a
       JOIN survey_questions q ON q.id = a.question_id
       JOIN survey_responses r ON r.id = a.response_id
       WHERE q.kind = 'SCALE_0_10'
         AND r.survey_id = (
           SELECT id FROM surveys
           WHERE type = 'ENPS' AND status IN ('ACTIVE', 'CLOSED')
           ORDER BY created_at DESC LIMIT 1
         )`,
    );
    const enpsValues = enpsRows
      .map((r) => r.value_int)
      .filter((v): v is number => v !== null && v !== undefined);
    const enps =
      enpsValues.length > 0
        ? { score: computeEnps(enpsValues).score, responses: enpsValues.length }
        : { score: null, responses: 0 };

    // Фонд последнего расчётного периода.
    const payrollRows = await client.$queryRawUnsafe<{ period: string; fund: number }[]>(
      `SELECT r.period,
              COALESCE((SELECT SUM(p.net_amount) FROM payslips p WHERE p.run_id = r.id), 0)::float8 AS fund
       FROM payroll_runs r
       ORDER BY r.created_at DESC LIMIT 1`,
    );
    const payroll = payrollRows[0]
      ? { lastPeriod: payrollRows[0].period, fund: payrollRows[0].fund }
      : { lastPeriod: null, fund: 0 };

    return {
      recruitment: { openVacancies, totalCandidates, hiredThisMonth },
      approvals: { pendingTrips, pendingExpenses },
      enps,
      payroll,
      surveys: { active: activeSurveys },
    };
  }
}
