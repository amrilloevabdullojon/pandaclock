import { Injectable } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

export type CalendarEventType =
  | "LEAVE_APPROVED"
  | "LEAVE_PENDING"
  | "TASK_DEADLINE"
  | "BIRTHDAY";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  startDate: string;
  endDate: string;
  userId: string | null;
  userName: string | null;
  meta?: Record<string, unknown>;
}

interface LeaveRow {
  id: string;
  user_id: string;
  user_name: string;
  type: string;
  status: string;
  start_date: Date;
  end_date: Date;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  deadline: Date;
  assignee_id: string | null;
  assignee_name: string | null;
}

@Injectable()
export class CalendarService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async events(start: string, end: string, currentUserId: string, scope: "my" | "team" | "all"): Promise<CalendarEvent[]> {
    const client = await this.tenantDb.getClient();

    const leaveFilter = scope === "my" ? `AND lr.user_id = '${currentUserId}'::uuid` : "";
    const leaves = await client.$queryRawUnsafe<LeaveRow[]>(
      `SELECT lr.id, lr.user_id,
              u.first_name || ' ' || u.last_name AS user_name,
              lr.type, lr.status, lr.start_date, lr.end_date
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       WHERE lr.status IN ('APPROVED', 'PENDING')
         AND lr.start_date <= $2::date
         AND lr.end_date >= $1::date
         ${leaveFilter}`,
      start,
      end,
    );

    const taskFilter = scope === "my" ? `AND t.assignee_id = '${currentUserId}'::uuid` : "";
    const tasks = await client.$queryRawUnsafe<TaskRow[]>(
      `SELECT t.id, t.title, t.status, t.deadline,
              t.assignee_id,
              CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name END AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.deadline IS NOT NULL
         AND t.deadline::date BETWEEN $1::date AND $2::date
         AND t.status NOT IN ('DONE', 'REJECTED')
         ${taskFilter}`,
      start,
      end,
    );

    const events: CalendarEvent[] = [];

    leaves.forEach((row) => {
      events.push({
        id: `leave-${row.id}`,
        type: row.status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_PENDING",
        title: `${labelForLeaveType(row.type)} · ${row.user_name}`,
        startDate: row.start_date.toISOString().slice(0, 10),
        endDate: row.end_date.toISOString().slice(0, 10),
        userId: row.user_id,
        userName: row.user_name,
        meta: { leaveType: row.type },
      });
    });

    tasks.forEach((row) => {
      const date = row.deadline.toISOString().slice(0, 10);
      events.push({
        id: `task-${row.id}`,
        type: "TASK_DEADLINE",
        title: `📋 ${row.title}`,
        startDate: date,
        endDate: date,
        userId: row.assignee_id,
        userName: row.assignee_name,
        meta: { status: row.status },
      });
    });

    events.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    return events;
  }
}

function labelForLeaveType(type: string): string {
  if (type === "VACATION") return "✈️ Отпуск";
  if (type === "SICK") return "🤒 Больничный";
  if (type === "TIME_OFF") return "🎂 Отгул";
  return "📝 Заявка";
}
