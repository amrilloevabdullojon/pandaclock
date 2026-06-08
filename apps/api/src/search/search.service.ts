import { Injectable } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

export interface SearchResult {
  employees: EmployeeHit[];
  tasks: TaskHit[];
  requests: RequestHit[];
  articles: ArticleHit[];
  courses: CourseHit[];
}

export interface ArticleHit {
  id: string;
  type: "article";
  title: string;
  subtitle: string;
  link: string;
}

export interface CourseHit {
  id: string;
  type: "course";
  title: string;
  subtitle: string;
  link: string;
}

export interface EmployeeHit {
  id: string;
  type: "employee";
  title: string;
  subtitle: string;
  link: string;
}

export interface TaskHit {
  id: string;
  type: "task";
  title: string;
  subtitle: string;
  link: string;
  status: string;
}

export interface RequestHit {
  id: string;
  type: "request";
  title: string;
  subtitle: string;
  link: string;
  status: string;
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  VACATION: "Отпуск",
  SICK: "Больничный",
  TIME_OFF: "Отгул",
  OTHER: "Другое",
};

@Injectable()
export class SearchService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  /**
   * Global search через ILIKE по 3 таблицам.
   * Для MVP без tsvector — достаточно частоты запросов и dataset размера.
   * Все 3 запроса исполняются параллельно через Promise.all.
   */
  async search(query: string, limit: number, currentUserId: string): Promise<SearchResult> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { employees: [], tasks: [], requests: [], articles: [], courses: [] };
    }
    const pattern = `%${trimmed.toLowerCase()}%`;
    const perTypeLimit = Math.max(1, Math.min(limit, 10));
    const client = await this.tenantDb.getClient();

    interface EmpRow {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      position: string | null;
      department_name: string | null;
    }
    interface TaskRow {
      id: string;
      title: string;
      description: string | null;
      status: string;
      assignee_name: string | null;
    }
    interface ReqRow {
      id: string;
      type: string;
      reason: string | null;
      status: string;
      user_name: string;
      start_date: Date;
      end_date: Date;
    }
    interface ArticleRow {
      id: string;
      title: string;
      category: string;
    }
    interface CourseRow {
      id: string;
      title: string;
      lesson_count: number;
    }

    // Sequential — параллельные queries могут попасть на разные соединения
    // пула, где search_path ещё не установлен.
    const employeesRows = await client.$queryRawUnsafe<EmpRow[]>(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.position,
                d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         WHERE u.status != 'TERMINATED' AND (
           LOWER(u.first_name) LIKE $1 OR
           LOWER(u.last_name) LIKE $1 OR
           LOWER(u.email) LIKE $1 OR
           LOWER(COALESCE(u.position, '')) LIKE $1 OR
           LOWER(u.first_name || ' ' || u.last_name) LIKE $1
         )
         ORDER BY u.first_name, u.last_name
         LIMIT ${perTypeLimit}`,
      pattern,
    );
    const tasksRows = await client.$queryRawUnsafe<TaskRow[]>(
      `SELECT t.id, t.title, t.description, t.status,
                CASE WHEN a.id IS NOT NULL
                  THEN a.first_name || ' ' || a.last_name
                  ELSE NULL END AS assignee_name
         FROM tasks t
         LEFT JOIN users a ON a.id = t.assignee_id
         WHERE (
           t.assignee_id = $2::uuid OR t.created_by_id = $2::uuid
         ) AND (
           LOWER(t.title) LIKE $1 OR
           LOWER(COALESCE(t.description, '')) LIKE $1
         )
         ORDER BY t.created_at DESC
         LIMIT ${perTypeLimit}`,
      pattern,
      currentUserId,
    );
    const requestsRows = await client.$queryRawUnsafe<ReqRow[]>(
      `SELECT r.id, r.type, r.reason, r.status,
                u.first_name || ' ' || u.last_name AS user_name,
                r.start_date, r.end_date
         FROM leave_requests r
         JOIN users u ON u.id = r.user_id
         WHERE (
           r.user_id = $2::uuid OR EXISTS (
             SELECT 1 FROM users me
             WHERE me.id = $2::uuid AND me.role IN ('OWNER','HR','MANAGER')
           )
         ) AND (
           LOWER(COALESCE(r.reason, '')) LIKE $1 OR
           LOWER(u.first_name || ' ' || u.last_name) LIKE $1
         )
         ORDER BY r.created_at DESC
         LIMIT ${perTypeLimit}`,
      pattern,
      currentUserId,
    );
    // База знаний — только опубликованные статьи (видны всем).
    const articlesRows = await client.$queryRawUnsafe<ArticleRow[]>(
      `SELECT id, title, category
         FROM kb_articles
         WHERE published = true AND (
           LOWER(title) LIKE $1 OR LOWER(content) LIKE $1
         )
         ORDER BY updated_at DESC
         LIMIT ${perTypeLimit}`,
      pattern,
    );
    // Курсы — только опубликованные.
    const coursesRows = await client.$queryRawUnsafe<CourseRow[]>(
      `SELECT c.id, c.title,
              (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = c.id)::int AS lesson_count
         FROM courses c
         WHERE c.status = 'PUBLISHED' AND LOWER(c.title) LIKE $1
         ORDER BY c.created_at DESC
         LIMIT ${perTypeLimit}`,
      pattern,
    );

    return {
      employees: employeesRows.map((row) => ({
        id: row.id,
        type: "employee" as const,
        title: `${row.first_name} ${row.last_name}`,
        subtitle: [row.position, row.department_name, row.email].filter(Boolean).join(" · "),
        link: `/dashboard/employees/${row.id}`,
      })),
      tasks: tasksRows.map((row) => ({
        id: row.id,
        type: "task" as const,
        title: row.title,
        subtitle: [row.assignee_name, statusLabel(row.status)].filter(Boolean).join(" · "),
        link: `/dashboard/tasks/${row.id}`,
        status: row.status,
      })),
      requests: requestsRows.map((row) => ({
        id: row.id,
        type: "request" as const,
        title: `${LEAVE_TYPE_LABEL[row.type] ?? row.type}: ${row.user_name}`,
        subtitle: [
          row.start_date.toISOString().slice(0, 10),
          "→",
          row.end_date.toISOString().slice(0, 10),
          row.reason ? `· ${row.reason.slice(0, 60)}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        link: `/dashboard/requests?scope=my`,
        status: row.status,
      })),
      articles: articlesRows.map((row) => ({
        id: row.id,
        type: "article" as const,
        title: row.title,
        subtitle: row.category,
        link: `/dashboard/knowledge?article=${row.id}`,
      })),
      courses: coursesRows.map((row) => ({
        id: row.id,
        type: "course" as const,
        title: row.title,
        subtitle: `${row.lesson_count} уроков`,
        link: `/dashboard/knowledge?course=${row.id}`,
      })),
    };
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    NEW: "Новая",
    IN_PROGRESS: "В работе",
    DONE: "Готово",
    REJECTED: "Отклонена",
  };
  return map[status] ?? status;
}
