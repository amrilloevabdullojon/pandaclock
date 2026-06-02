import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { canTransition, type TaskStatus, type TaskPriority } from "./task-status.js";
import type { CreateTaskDto, TasksQueryDto, UpdateTaskDto } from "./dto/task.dto.js";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdById: string;
  assigneeId: string | null;
  deadline: Date | null;
  completedAt: Date | null;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithPeople extends TaskRow {
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  createdByName: string;
  createdByAvatarUrl: string | null;
  commentsCount: number;
}

interface TaskRawRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_by_id: string;
  assignee_id: string | null;
  deadline: Date | null;
  completed_at: Date | null;
  labels: string[];
  created_at: Date;
  updated_at: Date;
  assignee_name: string | null;
  assignee_avatar_url: string | null;
  created_by_name: string;
  created_by_avatar_url: string | null;
  comments_count: bigint;
}

const SELECT_TASK = `
  t.id, t.title, t.description, t.status, t.priority,
  t.created_by_id, t.assignee_id, t.deadline, t.completed_at,
  t.labels, t.created_at, t.updated_at,
  CASE WHEN a.id IS NOT NULL THEN a.first_name || ' ' || a.last_name END AS assignee_name,
  a.avatar_url AS assignee_avatar_url,
  c.first_name || ' ' || c.last_name AS created_by_name,
  c.avatar_url AS created_by_avatar_url,
  COALESCE((SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id), 0)::bigint AS comments_count
`;

@Injectable()
export class TasksService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: TasksQueryDto, currentUserId: string): Promise<TaskWithPeople[]> {
    const filters: string[] = [];
    const params: unknown[] = [];
    const push = (clause: (idx: string) => string, value: unknown): void => {
      params.push(value);
      filters.push(clause(`$${String(params.length)}`));
    };

    if (query.search) {
      push(
        (p) => `(LOWER(t.title) LIKE ${p} OR LOWER(t.description) LIKE ${p})`,
        `%${query.search.toLowerCase()}%`,
      );
    }
    if (query.assigneeId) push((p) => `t.assignee_id = ${p}::uuid`, query.assigneeId);
    if (query.status) push((p) => `t.status = ${p}`, query.status);
    if (query.priority) push((p) => `t.priority = ${p}`, query.priority);
    if (query.labels && query.labels.length > 0) {
      push((p) => `t.labels && ${p}::text[]`, query.labels);
    }
    if (query.scope === "my") push((p) => `t.assignee_id = ${p}::uuid`, currentUserId);
    if (query.scope === "today") {
      push((p) => `t.assignee_id = ${p}::uuid`, currentUserId);
      filters.push("t.deadline::date = CURRENT_DATE");
    }
    if (query.scope === "overdue") {
      push((p) => `t.assignee_id = ${p}::uuid`, currentUserId);
      filters.push("t.deadline < NOW() AND t.status NOT IN ('DONE','REJECTED')");
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<TaskRawRow[]>(
      `SELECT ${SELECT_TASK}
       FROM tasks t
       LEFT JOIN users a ON a.id = t.assignee_id
       JOIN users c ON c.id = t.created_by_id
       ${where}
       ORDER BY
         CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
         t.deadline NULLS LAST,
         t.created_at DESC
       LIMIT 200`,
      ...params,
    );
    return rows.map(toWithPeople);
  }

  async board(currentUserId: string): Promise<Record<TaskStatus, TaskWithPeople[]>> {
    const items = await this.list({ scope: "all" }, currentUserId);
    const grouped: Record<TaskStatus, TaskWithPeople[]> = {
      NEW: [],
      IN_PROGRESS: [],
      DONE: [],
      REJECTED: [],
    };
    for (const task of items) {
      grouped[task.status].push(task);
    }
    return grouped;
  }

  async getById(id: string): Promise<TaskWithPeople> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<TaskRawRow[]>(
      `SELECT ${SELECT_TASK}
       FROM tasks t
       LEFT JOIN users a ON a.id = t.assignee_id
       JOIN users c ON c.id = t.created_by_id
       WHERE t.id = $1::uuid LIMIT 1`,
      id,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "TASK_NOT_FOUND" });
    return toWithPeople(row);
  }

  async create(input: CreateTaskDto, createdById: string): Promise<TaskWithPeople> {
    if (input.assigneeId) await this.assertUserExists(input.assigneeId);
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO tasks (title, description, status, priority, created_by_id, assignee_id, deadline, labels)
       VALUES ($1, $2, 'NEW', $3, $4::uuid, $5::uuid, $6::timestamptz, $7::text[])
       RETURNING id`,
      input.title,
      input.description ?? null,
      input.priority ?? "MEDIUM",
      createdById,
      input.assigneeId ?? null,
      input.deadline ?? null,
      input.labels ?? [],
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });

    const task = await this.getById(id);
    if (task.assigneeId && task.assigneeId !== createdById) {
      void this.notifications
        .notify([task.assigneeId], {
          type: "task_assigned",
          title: `Новая задача от ${task.createdByName}`,
          body: task.title,
          link: `/dashboard/tasks/${task.id}`,
          payload: { taskId: task.id },
        })
        .catch(() => undefined);
    }
    return task;
  }

  async update(id: string, input: UpdateTaskDto, currentUserId: string): Promise<TaskWithPeople> {
    const existing = await this.getById(id);

    if (input.status && !canTransition(existing.status, input.status as TaskStatus)) {
      throw new ForbiddenException({
        code: "INVALID_TRANSITION",
        from: existing.status,
        to: input.status,
      });
    }

    if (input.assigneeId) await this.assertUserExists(input.assigneeId);

    const sets: string[] = [];
    const params: unknown[] = [id];
    const push = (col: string, value: unknown): void => {
      params.push(value);
      sets.push(`${col} = $${String(params.length)}`);
    };

    if (input.title !== undefined) push("title", input.title);
    if (input.description !== undefined) push("description", input.description);
    if (input.priority !== undefined) push("priority", input.priority);
    if (input.deadline !== undefined) push("deadline", input.deadline);
    if (input.assigneeId !== undefined) push("assignee_id", input.assigneeId);
    if (input.labels !== undefined) {
      params.push(input.labels);
      sets.push(`labels = $${String(params.length)}::text[]`);
    }
    if (input.status !== undefined) {
      push("status", input.status);
      if (input.status === "DONE") {
        sets.push("completed_at = NOW()");
      } else {
        sets.push("completed_at = NULL");
      }
    }

    if (sets.length === 0) return existing;

    void currentUserId; // зарезервировано для audit log в следующих спринтах
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE tasks SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1::uuid`,
      ...params,
    );
    const updated = await this.getById(id);
    if (input.status === "DONE" && updated.createdById !== currentUserId) {
      void this.notifications
        .notify([updated.createdById], {
          type: "task_status_changed",
          title: "Задача выполнена ✅",
          body: `${updated.assigneeName ?? "Сотрудник"} закрыл «${updated.title}»`,
          link: `/dashboard/tasks/${updated.id}`,
          payload: { taskId: updated.id, newStatus: "DONE" },
        })
        .catch(() => undefined);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const result = await client.$executeRawUnsafe(`DELETE FROM tasks WHERE id = $1::uuid`, id);
    if (result === 0) throw new NotFoundException({ code: "TASK_NOT_FOUND" });
  }

  /* --- Comments --- */

  async addComment(taskId: string, authorId: string, body: string): Promise<void> {
    const task = await this.getById(taskId);
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `INSERT INTO task_comments (task_id, author_id, body) VALUES ($1::uuid, $2::uuid, $3)`,
      taskId,
      authorId,
      body,
    );

    // Уведомляем всех заинтересованных (assignee + автор), кроме самого комментатора.
    const recipients = new Set<string>();
    if (task.assigneeId && task.assigneeId !== authorId) recipients.add(task.assigneeId);
    if (task.createdById && task.createdById !== authorId) recipients.add(task.createdById);
    if (recipients.size > 0) {
      const authorName = await this.getUserName(authorId);
      const preview = body.length > 80 ? body.slice(0, 80) + "…" : body;
      void this.notifications
        .notify([...recipients], {
          type: "task_commented",
          title: `${authorName} прокомментировал «${task.title}»`,
          body: preview,
          link: `/dashboard/tasks/${task.id}`,
          payload: { taskId: task.id },
        })
        .catch(() => undefined);
    }
  }

  private async getUserName(userId: string): Promise<string> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ first_name: string; last_name: string }[]>(
      `SELECT first_name, last_name FROM users WHERE id = $1::uuid LIMIT 1`,
      userId,
    );
    const row = rows[0];
    return row ? `${row.first_name} ${row.last_name}` : "Сотрудник";
  }

  async listComments(taskId: string): Promise<
    {
      id: string;
      body: string;
      createdAt: Date;
      authorId: string;
      authorName: string;
      authorAvatarUrl: string | null;
    }[]
  > {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        body: string;
        created_at: Date;
        author_id: string;
        author_name: string;
        author_avatar_url: string | null;
      }[]
    >(
      `SELECT c.id, c.body, c.created_at, c.author_id,
              u.first_name || ' ' || u.last_name AS author_name,
              u.avatar_url AS author_avatar_url
       FROM task_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.task_id = $1
       ORDER BY c.created_at`,
      taskId,
    );
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      authorId: r.author_id,
      authorName: r.author_name,
      authorAvatarUrl: r.author_avatar_url,
    }));
  }

  private async assertUserExists(userId: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM users WHERE id = $1::uuid LIMIT 1`,
      userId,
    );
    if (rows.length === 0) {
      throw new BadRequestException({ code: "ASSIGNEE_NOT_IN_TENANT", userId });
    }
  }
}

function toWithPeople(row: TaskRawRow): TaskWithPeople {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    createdById: row.created_by_id,
    assigneeId: row.assignee_id,
    deadline: row.deadline,
    completedAt: row.completed_at,
    labels: row.labels ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assigneeName: row.assignee_name,
    assigneeAvatarUrl: row.assignee_avatar_url,
    createdByName: row.created_by_name,
    createdByAvatarUrl: row.created_by_avatar_url,
    commentsCount: Number(row.comments_count),
  };
}
