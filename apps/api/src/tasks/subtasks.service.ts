import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

export interface SubtaskRow {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RawRow {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * CRUD subtasks (чек-лист внутри задачи).
 *
 * Сортировка — по полю `position` (целое). Создание ставит новую subtask в
 * конец списка (MAX(position) + 1). Reorder пока через явный PATCH с position.
 *
 * Все запросы идут через TenantPrismaService, который выставляет search_path
 * на текущий tenant — поэтому никакой явной проверки tenant_id не нужно.
 */
@Injectable()
export class SubtasksService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async list(taskId: string): Promise<SubtaskRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawRow[]>(
      `SELECT id, task_id, title, done, position, created_at, updated_at
       FROM subtasks
       WHERE task_id = $1::uuid
       ORDER BY position ASC, created_at ASC`,
      taskId,
    );
    return rows.map(toSubtask);
  }

  async create(taskId: string, title: string): Promise<SubtaskRow> {
    const trimmed = title.trim();
    if (trimmed.length < 1 || trimmed.length > 500) {
      throw new BadRequestException({ code: "INVALID_TITLE" });
    }
    const client = await this.tenantDb.getClient();
    // Проверяем что задача существует в этом tenant.
    const taskRows = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM tasks WHERE id = $1::uuid LIMIT 1`,
      taskId,
    );
    if (taskRows.length === 0) {
      throw new NotFoundException({ code: "TASK_NOT_FOUND" });
    }

    const inserted = await client.$queryRawUnsafe<RawRow[]>(
      `INSERT INTO subtasks (task_id, title, position)
       VALUES (
         $1::uuid,
         $2,
         COALESCE((SELECT MAX(position) + 1 FROM subtasks WHERE task_id = $1::uuid), 0)
       )
       RETURNING id, task_id, title, done, position, created_at, updated_at`,
      taskId,
      trimmed,
    );
    const row = inserted[0];
    if (!row) throw new BadRequestException({ code: "INSERT_FAILED" });
    return toSubtask(row);
  }

  async update(
    subtaskId: string,
    input: { title?: string; done?: boolean; position?: number },
  ): Promise<SubtaskRow> {
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (trimmed.length < 1 || trimmed.length > 500) {
        throw new BadRequestException({ code: "INVALID_TITLE" });
      }
    }
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawRow[]>(
      `UPDATE subtasks SET
         title = COALESCE($2, title),
         done = COALESCE($3, done),
         position = COALESCE($4, position),
         updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id, task_id, title, done, position, created_at, updated_at`,
      subtaskId,
      input.title?.trim() ?? null,
      input.done ?? null,
      input.position ?? null,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "SUBTASK_NOT_FOUND" });
    return toSubtask(row);
  }

  async remove(subtaskId: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const result = await client.$executeRawUnsafe(
      `DELETE FROM subtasks WHERE id = $1::uuid`,
      subtaskId,
    );
    if (result === 0) {
      throw new NotFoundException({ code: "SUBTASK_NOT_FOUND" });
    }
  }
}

function toSubtask(r: RawRow): SubtaskRow {
  return {
    id: r.id,
    taskId: r.task_id,
    title: r.title,
    done: r.done,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
