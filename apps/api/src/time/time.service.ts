import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "@pandaclock/db";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import {
  parseTimePolicy,
  isLateArrival,
  isWithinGeofence,
  type TimePolicy,
} from "./time-policy.js";

export interface TodaySession {
  id: string | null;
  status: "NOT_STARTED" | "WORKING" | "ON_BREAK" | "FINISHED";
  startedAt: Date | null;
  finishedAt: Date | null;
  isLate: boolean;
  totalMinutes: number | null;
  breaksTotalMinutes: number;
  currentBreak: { id: string; startedAt: Date; type: string } | null;
  geofenceStatus: "no_geofence" | "inside" | "outside" | "no_coords";
  /**
   * Все офисы компании — клиент находит ближайший и показывает distance/status
   * к нему. Пустой массив = geofence не настроен, отметка разрешена откуда угодно.
   */
  offices: { id: string; name: string; latitude: number; longitude: number; radius: number }[];
}

interface TimeEntryRow {
  id: string;
  date: Date;
  started_at: Date;
  finished_at: Date | null;
  status: string;
  total_minutes: number | null;
  breaks_total_minutes: number;
  is_late: boolean;
}

interface BreakRow {
  id: string;
  time_entry_id: string;
  started_at: Date;
  finished_at: Date | null;
  type: string;
}

@Injectable()
export class TimeService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  private async getPolicyAndTimezone(
    tenantSlug: string,
  ): Promise<{ policy: TimePolicy; timezone: string }> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { timePolicy: true, timezone: true },
    });
    if (!tenant) throw new NotFoundException({ code: "TENANT_NOT_FOUND" });
    return {
      policy: parseTimePolicy(tenant.timePolicy),
      timezone: tenant.timezone ?? "Asia/Tashkent",
    };
  }

  async getToday(userId: string, tenantSlug: string): Promise<TodaySession> {
    const { policy } = await this.getPolicyAndTimezone(tenantSlug);
    const client = await this.tenantDb.getClient();

    const entries = await client.$queryRawUnsafe<TimeEntryRow[]>(
      `SELECT id, date, started_at, finished_at, status, total_minutes,
              breaks_total_minutes, is_late
       FROM time_entries
       WHERE user_id = $1::uuid AND date = CURRENT_DATE
       LIMIT 1`,
      userId,
    );
    const offices = policy.offices.map((o) => ({
      id: o.id,
      name: o.name,
      latitude: o.latitude,
      longitude: o.longitude,
      radius: o.radius,
    }));

    const entry = entries[0];
    if (!entry) {
      return {
        id: null,
        status: "NOT_STARTED",
        startedAt: null,
        finishedAt: null,
        isLate: false,
        totalMinutes: null,
        breaksTotalMinutes: 0,
        currentBreak: null,
        geofenceStatus: isWithinGeofence(policy, undefined),
        offices,
      };
    }

    let currentBreak: TodaySession["currentBreak"] = null;
    if (entry.status === "ON_BREAK") {
      const breaks = await client.$queryRawUnsafe<BreakRow[]>(
        `SELECT id, time_entry_id, started_at, finished_at, type
         FROM breaks
         WHERE time_entry_id = $1::uuid AND finished_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
        entry.id,
      );
      const row = breaks[0];
      if (row) currentBreak = { id: row.id, startedAt: row.started_at, type: row.type };
    }

    return {
      id: entry.id,
      status: entry.status as TodaySession["status"],
      startedAt: entry.started_at,
      finishedAt: entry.finished_at,
      isLate: entry.is_late,
      totalMinutes: entry.total_minutes,
      breaksTotalMinutes: entry.breaks_total_minutes,
      currentBreak,
      geofenceStatus: isWithinGeofence(policy, undefined),
      offices,
    };
  }

  async startDay(
    userId: string,
    tenantSlug: string,
    input: { latitude?: number; longitude?: number; note?: string },
    request: { ipAddress?: string },
  ): Promise<TodaySession> {
    const { policy, timezone } = await this.getPolicyAndTimezone(tenantSlug);
    const client = await this.tenantDb.getClient();

    const existing = await client.$queryRawUnsafe<TimeEntryRow[]>(
      `SELECT id FROM time_entries WHERE user_id = $1::uuid AND date = CURRENT_DATE LIMIT 1`,
      userId,
    );
    if (existing.length > 0) {
      throw new ConflictException({ code: "DAY_ALREADY_STARTED" });
    }

    const coords =
      input.latitude !== undefined && input.longitude !== undefined
        ? { latitude: input.latitude, longitude: input.longitude }
        : undefined;

    const geofenceStatus = isWithinGeofence(policy, coords);
    if (geofenceStatus === "outside" && !input.note) {
      throw new BadRequestException({ code: "OUTSIDE_GEOFENCE" });
    }

    const now = new Date();
    const isLate = isLateArrival(policy, now, timezone);

    await client.$executeRawUnsafe(
      `INSERT INTO time_entries (
         user_id, date, started_at, status, is_late, ip_address,
         start_latitude, start_longitude, note
       )
       VALUES ($1::uuid, CURRENT_DATE, NOW(), 'WORKING', $2, $3::inet, $4, $5, $6)`,
      userId,
      isLate,
      request.ipAddress ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.note ?? null,
    );

    return this.getToday(userId, tenantSlug);
  }

  async finishDay(
    userId: string,
    tenantSlug: string,
    input: { latitude?: number; longitude?: number },
  ): Promise<TodaySession> {
    const client = await this.tenantDb.getClient();

    const entries = await client.$queryRawUnsafe<TimeEntryRow[]>(
      `SELECT id, started_at, breaks_total_minutes, status
       FROM time_entries
       WHERE user_id = $1::uuid AND date = CURRENT_DATE LIMIT 1`,
      userId,
    );
    const entry = entries[0];
    if (!entry) throw new NotFoundException({ code: "NO_ACTIVE_DAY" });
    if (entry.status === "FINISHED") throw new ConflictException({ code: "DAY_ALREADY_FINISHED" });

    // Если ушли на перерыв и забыли вернуться — закрываем перерыв.
    if (entry.status === "ON_BREAK") {
      await this.closeOpenBreaks(entry.id);
    }

    const breaks = await client.$queryRawUnsafe<{ total: number }[]>(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (finished_at - started_at))) / 60, 0)::int AS total
       FROM breaks WHERE time_entry_id = $1::uuid AND finished_at IS NOT NULL`,
      entry.id,
    );
    const breaksTotal = breaks[0]?.total ?? 0;

    const startedMs = entry.started_at.getTime();
    const finishedMs = Date.now();
    const totalMinutes = Math.max(0, Math.floor((finishedMs - startedMs) / 60_000) - breaksTotal);

    await client.$executeRawUnsafe(
      `UPDATE time_entries
       SET finished_at = NOW(), status = 'FINISHED',
           total_minutes = $2, breaks_total_minutes = $3,
           finish_latitude = $4, finish_longitude = $5,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      entry.id,
      totalMinutes,
      breaksTotal,
      input.latitude ?? null,
      input.longitude ?? null,
    );

    return this.getToday(userId, tenantSlug);
  }

  async startBreak(userId: string, tenantSlug: string, type: string): Promise<TodaySession> {
    const client = await this.tenantDb.getClient();
    const entries = await client.$queryRawUnsafe<TimeEntryRow[]>(
      `SELECT id, status FROM time_entries WHERE user_id = $1::uuid AND date = CURRENT_DATE LIMIT 1`,
      userId,
    );
    const entry = entries[0];
    if (!entry) throw new NotFoundException({ code: "NO_ACTIVE_DAY" });
    if (entry.status !== "WORKING") {
      throw new ConflictException({ code: "NOT_WORKING" });
    }
    await client.$executeRawUnsafe(
      `INSERT INTO breaks (time_entry_id, started_at, type) VALUES ($1::uuid, NOW(), $2)`,
      entry.id,
      type,
    );
    await client.$executeRawUnsafe(
      `UPDATE time_entries SET status = 'ON_BREAK', updated_at = NOW() WHERE id = $1::uuid`,
      entry.id,
    );
    return this.getToday(userId, tenantSlug);
  }

  async finishBreak(userId: string, tenantSlug: string): Promise<TodaySession> {
    const client = await this.tenantDb.getClient();
    const entries = await client.$queryRawUnsafe<TimeEntryRow[]>(
      `SELECT id, status FROM time_entries WHERE user_id = $1::uuid AND date = CURRENT_DATE LIMIT 1`,
      userId,
    );
    const entry = entries[0];
    if (!entry) throw new NotFoundException({ code: "NO_ACTIVE_DAY" });
    if (entry.status !== "ON_BREAK") {
      throw new ConflictException({ code: "NOT_ON_BREAK" });
    }
    await this.closeOpenBreaks(entry.id);
    await client.$executeRawUnsafe(
      `UPDATE time_entries SET status = 'WORKING', updated_at = NOW() WHERE id = $1::uuid`,
      entry.id,
    );
    return this.getToday(userId, tenantSlug);
  }

  async listHistory(
    userId: string,
    days = 30,
  ): Promise<
    {
      date: string;
      startedAt: Date;
      finishedAt: Date | null;
      totalMinutes: number | null;
      isLate: boolean;
    }[]
  > {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        date: Date;
        started_at: Date;
        finished_at: Date | null;
        total_minutes: number | null;
        is_late: boolean;
      }[]
    >(
      `SELECT date, started_at, finished_at, total_minutes, is_late
       FROM time_entries
       WHERE user_id = $1::uuid AND date >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
       ORDER BY date DESC`,
      userId,
      days,
    );
    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      totalMinutes: row.total_minutes,
      isLate: row.is_late,
    }));
  }

  async whoIsWorking(): Promise<
    {
      userId: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      status: string;
      startedAt: Date;
      departmentName: string | null;
    }[]
  > {
    const client = await this.tenantDb.getClient();
    return client.$queryRawUnsafe(`
      SELECT u.id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName",
             u.avatar_url AS "avatarUrl",
             te.status, te.started_at AS "startedAt",
             d.name AS "departmentName"
      FROM time_entries te
      JOIN users u ON u.id = te.user_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE te.date = CURRENT_DATE AND te.status IN ('WORKING', 'ON_BREAK')
      ORDER BY te.started_at
    `);
  }

  async getDashboardCounts(): Promise<{
    totalEmployees: number;
    workingNow: number;
    lateToday: number;
    onLeave: number;
  }> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        total_employees: bigint;
        working_now: bigint;
        late_today: bigint;
        on_leave: bigint;
      }[]
    >(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE')::bigint AS total_employees,
        (SELECT COUNT(*) FROM time_entries
           WHERE date = CURRENT_DATE AND status IN ('WORKING','ON_BREAK'))::bigint AS working_now,
        (SELECT COUNT(*) FROM time_entries
           WHERE date = CURRENT_DATE AND is_late = TRUE)::bigint AS late_today,
        (SELECT COUNT(*) FROM leave_requests
           WHERE status = 'APPROVED' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)::bigint AS on_leave
    `);
    const row = rows[0];
    return {
      totalEmployees: Number(row?.total_employees ?? 0),
      workingNow: Number(row?.working_now ?? 0),
      lateToday: Number(row?.late_today ?? 0),
      onLeave: Number(row?.on_leave ?? 0),
    };
  }

  /**
   * Возвращает sparkline (массив значений по дням) + trend % за последний день
   * относительно среднего по периоду — для 3 ключевых метрик.
   *
   * Метрики:
   *  - active: общее число активных сотрудников (стабильно, без sparkline)
   *  - workingPerDay: сколько уникальных сотрудников отметились за день
   *  - latePerDay: сколько опозданий за день
   *  - onLeavePerDay: сколько сотрудников были в одобренном отпуске в этот день
   */
  async getDashboardTrends(days = 14): Promise<{
    workingPerDay: { sparkline: number[]; current: number; trend: number };
    latePerDay: { sparkline: number[]; current: number; trend: number };
    onLeavePerDay: { sparkline: number[]; current: number; trend: number };
  }> {
    const client = await this.tenantDb.getClient();
    const period = Math.max(2, Math.min(60, Math.floor(days)));

    interface DayRow {
      d: Date;
      working: bigint;
      late: bigint;
      on_leave: bigint;
    }

    const rows = await client.$queryRawUnsafe<DayRow[]>(
      `
      WITH days AS (
        SELECT generate_series(
          CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS d
      )
      SELECT
        days.d,
        COALESCE((
          SELECT COUNT(DISTINCT user_id)
            FROM time_entries
            WHERE date = days.d
        ), 0)::bigint AS working,
        COALESCE((
          SELECT COUNT(*)
            FROM time_entries
            WHERE date = days.d AND is_late = TRUE
        ), 0)::bigint AS late,
        COALESCE((
          SELECT COUNT(*)
            FROM leave_requests
            WHERE status = 'APPROVED'
              AND start_date <= days.d
              AND end_date >= days.d
        ), 0)::bigint AS on_leave
      FROM days
      ORDER BY days.d
      `,
      period,
    );

    const working = rows.map((r) => Number(r.working));
    const late = rows.map((r) => Number(r.late));
    const leave = rows.map((r) => Number(r.on_leave));

    function summarize(values: number[]): { sparkline: number[]; current: number; trend: number } {
      const current = values[values.length - 1] ?? 0;
      const previous = values.slice(0, -1);
      const avgPrev =
        previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : 0;
      const trend = avgPrev === 0 ? 0 : Math.round(((current - avgPrev) / avgPrev) * 100);
      return { sparkline: values, current, trend };
    }

    return {
      workingPerDay: summarize(working),
      latePerDay: summarize(late),
      onLeavePerDay: summarize(leave),
    };
  }

  private async closeOpenBreaks(timeEntryId: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE breaks SET finished_at = NOW() WHERE time_entry_id = $1::uuid AND finished_at IS NULL`,
      timeEntryId,
    );
  }
}
