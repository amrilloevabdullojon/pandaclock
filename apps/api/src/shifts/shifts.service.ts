import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";

export interface ShiftRow {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
  createdBy: string | null;
}

interface RawShift {
  id: string;
  user_id: string;
  user_name: string;
  date: Date;
  start_time: string;
  end_time: string;
  note: string | null;
  created_by: string | null;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function map(r: RawShift): ShiftRow {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    // date приходит как Date (полночь UTC); берём YYYY-MM-DD.
    date: typeof r.date === "string" ? r.date : toIsoDate(r.date),
    // TIME приходит как "HH:MM:SS" — обрезаем до HH:MM.
    startTime: String(r.start_time).slice(0, 5),
    endTime: String(r.end_time).slice(0, 5),
    note: r.note,
    createdBy: r.created_by,
  };
}

@Injectable()
export class ShiftsService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Список смен в диапазоне дат (для планировщика). */
  async listRange(start: string, end: string): Promise<ShiftRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawShift[]>(
      `SELECT s.id, s.user_id, u.first_name || ' ' || u.last_name AS user_name,
              s.date, s.start_time, s.end_time, s.note, s.created_by
       FROM shifts s JOIN users u ON u.id = s.user_id
       WHERE s.date BETWEEN $1::date AND $2::date
       ORDER BY s.date, s.start_time`,
      start,
      end,
    );
    return rows.map(map);
  }

  /** Смены конкретного пользователя в диапазоне (для мобилки). */
  async listForUser(userId: string, start: string, end: string): Promise<ShiftRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawShift[]>(
      `SELECT s.id, s.user_id, u.first_name || ' ' || u.last_name AS user_name,
              s.date, s.start_time, s.end_time, s.note, s.created_by
       FROM shifts s JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1::uuid AND s.date BETWEEN $2::date AND $3::date
       ORDER BY s.date, s.start_time`,
      userId,
      start,
      end,
    );
    return rows.map(map);
  }

  async create(
    input: {
      userId: string;
      date: string;
      startTime: string;
      endTime: string;
      note?: string;
    },
    createdBy: string,
  ): Promise<ShiftRow> {
    if (input.endTime <= input.startTime) {
      throw new BadRequestException({ code: "INVALID_TIME_RANGE" });
    }
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawShift[]>(
      `WITH inserted AS (
         INSERT INTO shifts (user_id, date, start_time, end_time, note, created_by)
         VALUES ($1::uuid, $2::date, $3::time, $4::time, $5, $6::uuid)
         RETURNING id, user_id, date, start_time, end_time, note, created_by
       )
       SELECT i.*, u.first_name || ' ' || u.last_name AS user_name
       FROM inserted i JOIN users u ON u.id = i.user_id`,
      input.userId,
      input.date,
      input.startTime,
      input.endTime,
      input.note ?? null,
      createdBy,
    );
    const row = rows[0];
    if (!row) throw new BadRequestException({ code: "INSERT_FAILED" });

    const shift = map(row);
    // Уведомляем сотрудника о новой смене (не себя).
    if (shift.userId !== createdBy) {
      void this.notifications.notify([shift.userId], {
        type: "shift_assigned",
        title: "Новая смена в графике",
        body: `${shift.date}, ${shift.startTime}–${shift.endTime}`,
        link: "/dashboard/shifts",
      });
    }
    return shift;
  }

  async update(
    id: string,
    input: {
      userId?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      note?: string | null;
    },
  ): Promise<ShiftRow> {
    const existing = await this.getRaw(id);
    const startTime = input.startTime ?? String(existing.start_time).slice(0, 5);
    const endTime = input.endTime ?? String(existing.end_time).slice(0, 5);
    if (endTime <= startTime) {
      throw new BadRequestException({ code: "INVALID_TIME_RANGE" });
    }

    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawShift[]>(
      `WITH updated AS (
         UPDATE shifts SET
           user_id = COALESCE($2::uuid, user_id),
           date = COALESCE($3::date, date),
           start_time = COALESCE($4::time, start_time),
           end_time = COALESCE($5::time, end_time),
           note = $6,
           updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, user_id, date, start_time, end_time, note, created_by
       )
       SELECT u2.*, u.first_name || ' ' || u.last_name AS user_name
       FROM updated u2 JOIN users u ON u.id = u2.user_id`,
      id,
      input.userId ?? null,
      input.date ?? null,
      input.startTime ?? null,
      input.endTime ?? null,
      input.note === undefined ? existing.note : input.note,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "SHIFT_NOT_FOUND" });
    return map(row);
  }

  async remove(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(`DELETE FROM shifts WHERE id = $1::uuid`, id);
    if (affected === 0) throw new NotFoundException({ code: "SHIFT_NOT_FOUND" });
  }

  private async getRaw(id: string): Promise<RawShift> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawShift[]>(
      `SELECT s.id, s.user_id, '' AS user_name, s.date, s.start_time, s.end_time, s.note, s.created_by
       FROM shifts s WHERE s.id = $1::uuid LIMIT 1`,
      id,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "SHIFT_NOT_FOUND" });
    return row;
  }
}
