import { Injectable } from "@nestjs/common";
import { prisma } from "@pandaclock/db";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { resolvePeriod, type Period } from "./period.js";

export interface AttendanceRow {
  userId: string;
  fullName: string;
  email: string;
  departmentName: string | null;
  daysWorked: number;
  lateCount: number;
  totalMinutes: number;
}

export interface HoursRow {
  userId: string;
  fullName: string;
  totalMinutes: number;
  averageMinutes: number;
  daysCount: number;
}

export interface TasksRow {
  userId: string;
  fullName: string;
  assigned: number;
  completed: number;
  completionRate: number;
  overdue: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async period(tenantSlug: string, query: { start?: string; end?: string }): Promise<Period> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { timezone: true },
    });
    return resolvePeriod(query, tenant?.timezone ?? "Asia/Tashkent");
  }

  async attendance(period: Period): Promise<AttendanceRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        user_id: string;
        full_name: string;
        email: string;
        department_name: string | null;
        days_worked: bigint;
        late_count: bigint;
        total_minutes: number;
      }[]
    >(
      `SELECT u.id AS user_id,
              u.first_name || ' ' || u.last_name AS full_name,
              u.email,
              d.name AS department_name,
              COUNT(te.id)::bigint AS days_worked,
              COUNT(*) FILTER (WHERE te.is_late = TRUE)::bigint AS late_count,
              COALESCE(SUM(te.total_minutes), 0)::int AS total_minutes
       FROM users u
       LEFT JOIN time_entries te
         ON te.user_id = u.id AND te.date BETWEEN $1::date AND $2::date
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.status = 'ACTIVE'
       GROUP BY u.id, u.first_name, u.last_name, u.email, d.name
       ORDER BY u.last_name`,
      period.startIso,
      period.endIso,
    );

    return rows.map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      departmentName: row.department_name,
      daysWorked: Number(row.days_worked),
      lateCount: Number(row.late_count),
      totalMinutes: row.total_minutes,
    }));
  }

  async hours(period: Period): Promise<HoursRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        user_id: string;
        full_name: string;
        total_minutes: number;
        days_count: bigint;
      }[]
    >(
      `SELECT u.id AS user_id,
              u.first_name || ' ' || u.last_name AS full_name,
              COALESCE(SUM(te.total_minutes), 0)::int AS total_minutes,
              COUNT(te.id)::bigint AS days_count
       FROM users u
       LEFT JOIN time_entries te
         ON te.user_id = u.id
        AND te.date BETWEEN $1::date AND $2::date
        AND te.status = 'FINISHED'
       WHERE u.status = 'ACTIVE'
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY total_minutes DESC`,
      period.startIso,
      period.endIso,
    );

    return rows.map((row) => {
      const days = Number(row.days_count);
      return {
        userId: row.user_id,
        fullName: row.full_name,
        totalMinutes: row.total_minutes,
        daysCount: days,
        averageMinutes: days > 0 ? Math.round(row.total_minutes / days) : 0,
      };
    });
  }

  async tasks(period: Period): Promise<TasksRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        user_id: string;
        full_name: string;
        assigned: bigint;
        completed: bigint;
        overdue: bigint;
      }[]
    >(
      `SELECT u.id AS user_id,
              u.first_name || ' ' || u.last_name AS full_name,
              COUNT(t.id)::bigint AS assigned,
              COUNT(*) FILTER (WHERE t.status = 'DONE')::bigint AS completed,
              COUNT(*) FILTER (
                WHERE t.deadline < NOW() AND t.status NOT IN ('DONE', 'REJECTED')
              )::bigint AS overdue
       FROM users u
       LEFT JOIN tasks t
         ON t.assignee_id = u.id
        AND t.created_at::date BETWEEN $1::date AND $2::date
       WHERE u.status = 'ACTIVE'
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY assigned DESC`,
      period.startIso,
      period.endIso,
    );

    return rows.map((row) => {
      const assigned = Number(row.assigned);
      const completed = Number(row.completed);
      return {
        userId: row.user_id,
        fullName: row.full_name,
        assigned,
        completed,
        completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
        overdue: Number(row.overdue),
      };
    });
  }
}
