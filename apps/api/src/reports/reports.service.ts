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

export interface OverviewDailyPoint {
  date: string;
  present: number;
  late: number;
  onLeave: number;
}

export interface OverviewDepartment {
  department: string;
  totalHours: number;
  lateRate: number;
  headcount: number;
}

export interface OverviewLeaveType {
  type: string;
  days: number;
  count: number;
}

export interface OverviewResult {
  daily: OverviewDailyPoint[];
  byDepartment: OverviewDepartment[];
  leaveByType: OverviewLeaveType[];
  summary: {
    totalHours: number;
    avgPresentPerDay: number;
    lateRate: number;
    leaveDays: number;
  };
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

  /**
   * Сводная аналитика за период: дневные ряды (выходы/опоздания/в отпуске),
   * разбивка по отделам и по типам отпусков. Используется для графиков на
   * странице «Аналитика».
   */
  async overview(period: Period): Promise<OverviewResult> {
    const client = await this.tenantDb.getClient();

    // 1) Дневные ряды по всему периоду (generate_series заполняет пустые дни).
    const dailyRows = await client.$queryRawUnsafe<
      { date: Date; present: number; late: number; on_leave: number }[]
    >(
      `WITH days AS (
         SELECT generate_series($1::date, $2::date, '1 day')::date AS d
       )
       SELECT days.d AS date,
              COALESCE(te.present, 0)::int AS present,
              COALESCE(te.late, 0)::int AS late,
              COALESCE(lv.on_leave, 0)::int AS on_leave
       FROM days
       LEFT JOIN (
         SELECT date,
                COUNT(*)::int AS present,
                COUNT(*) FILTER (WHERE is_late = TRUE)::int AS late
         FROM time_entries
         WHERE date BETWEEN $1::date AND $2::date
         GROUP BY date
       ) te ON te.date = days.d
       LEFT JOIN (
         SELECT g.d AS d, COUNT(DISTINCT lr.user_id)::int AS on_leave
         FROM (SELECT generate_series($1::date, $2::date, '1 day')::date AS d) g
         JOIN leave_requests lr
           ON lr.status = 'APPROVED' AND g.d BETWEEN lr.start_date AND lr.end_date
         GROUP BY g.d
       ) lv ON lv.d = days.d
       ORDER BY days.d`,
      period.startIso,
      period.endIso,
    );

    // 2) Разбивка по отделам.
    const deptRows = await client.$queryRawUnsafe<
      {
        department: string;
        total_minutes: number;
        entries: number;
        late: number;
        headcount: number;
      }[]
    >(
      `SELECT COALESCE(d.name, 'Без отдела') AS department,
              COALESCE(SUM(te.total_minutes), 0)::int AS total_minutes,
              COUNT(te.id)::int AS entries,
              COUNT(*) FILTER (WHERE te.is_late = TRUE)::int AS late,
              COUNT(DISTINCT u.id)::int AS headcount
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN time_entries te
         ON te.user_id = u.id AND te.date BETWEEN $1::date AND $2::date
       WHERE u.status = 'ACTIVE'
       GROUP BY COALESCE(d.name, 'Без отдела')
       ORDER BY total_minutes DESC`,
      period.startIso,
      period.endIso,
    );

    // 3) Отпуска по типам (одобренные, пересекающиеся с периодом).
    const leaveRows = await client.$queryRawUnsafe<{ type: string; days: number; count: number }[]>(
      `SELECT type,
              COALESCE(SUM(days_count), 0)::int AS days,
              COUNT(*)::int AS count
       FROM leave_requests
       WHERE status = 'APPROVED'
         AND start_date <= $2::date
         AND end_date >= $1::date
       GROUP BY type
       ORDER BY days DESC`,
      period.startIso,
      period.endIso,
    );

    const daily: OverviewDailyPoint[] = dailyRows.map((r) => ({
      date: toIsoDate(r.date),
      present: r.present,
      late: r.late,
      onLeave: r.on_leave,
    }));

    const byDepartment: OverviewDepartment[] = deptRows.map((r) => ({
      department: r.department,
      totalHours: Math.round((r.total_minutes / 60) * 10) / 10,
      lateRate: r.entries > 0 ? Math.round((r.late / r.entries) * 100) : 0,
      headcount: r.headcount,
    }));

    const leaveByType: OverviewLeaveType[] = leaveRows.map((r) => ({
      type: r.type,
      days: r.days,
      count: r.count,
    }));

    const totalMinutes = deptRows.reduce((sum, r) => sum + r.total_minutes, 0);
    const totalEntries = deptRows.reduce((sum, r) => sum + r.entries, 0);
    const totalLate = deptRows.reduce((sum, r) => sum + r.late, 0);
    const presentDays = daily.filter((d) => d.present > 0).length;
    const totalPresent = daily.reduce((sum, d) => sum + d.present, 0);

    return {
      daily,
      byDepartment,
      leaveByType,
      summary: {
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        avgPresentPerDay: presentDays > 0 ? Math.round(totalPresent / presentDays) : 0,
        lateRate: totalEntries > 0 ? Math.round((totalLate / totalEntries) * 100) : 0,
        leaveDays: leaveByType.reduce((sum, l) => sum + l.days, 0),
      },
    };
  }
}

/** Date → 'YYYY-MM-DD' без сдвига таймзоны (DATE-колонки приходят как UTC-полночь). */
function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
