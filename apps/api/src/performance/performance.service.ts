import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";

export interface GoalRow {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  dueDate: string | null;
  createdBy: string | null;
}

export interface ReviewRow {
  id: string;
  userId: string;
  userName: string;
  reviewerId: string | null;
  reviewerName: string | null;
  periodLabel: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

interface RawGoal {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  due_date: Date | null;
  created_by: string | null;
}

interface RawReview {
  id: string;
  user_id: string;
  user_name: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  period_label: string;
  rating: number;
  comment: string | null;
  created_at: Date;
}

function isoOrNull(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function mapGoal(r: RawGoal): GoalRow {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    title: r.title,
    description: r.description,
    progress: r.progress,
    status: r.status,
    dueDate: typeof r.due_date === "string" ? r.due_date : isoOrNull(r.due_date),
    createdBy: r.created_by,
  };
}

function mapReview(r: RawReview): ReviewRow {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    reviewerId: r.reviewer_id,
    reviewerName: r.reviewer_name,
    periodLabel: r.period_label,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  };
}

const GOAL_SELECT = `g.id, g.user_id, u.first_name || ' ' || u.last_name AS user_name,
  g.title, g.description, g.progress, g.status, g.due_date, g.created_by`;

const REVIEW_SELECT = `r.id, r.user_id, u.first_name || ' ' || u.last_name AS user_name,
  r.reviewer_id, rv.first_name || ' ' || rv.last_name AS reviewer_name,
  r.period_label, r.rating, r.comment, r.created_at`;

@Injectable()
export class PerformanceService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ───────── Goals ───────── */

  async listGoals(userId?: string): Promise<GoalRow[]> {
    const client = await this.tenantDb.getClient();
    const where = userId ? `WHERE g.user_id = $1::uuid` : "";
    const params = userId ? [userId] : [];
    const rows = await client.$queryRawUnsafe<RawGoal[]>(
      `SELECT ${GOAL_SELECT} FROM goals g JOIN users u ON u.id = g.user_id
       ${where} ORDER BY g.status, g.created_at DESC`,
      ...params,
    );
    return rows.map(mapGoal);
  }

  async listMyGoals(userId: string): Promise<GoalRow[]> {
    return this.listGoals(userId);
  }

  async createGoal(
    input: { userId: string; title: string; description?: string; dueDate?: string },
    createdBy: string,
  ): Promise<GoalRow> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawGoal[]>(
      `WITH inserted AS (
         INSERT INTO goals (user_id, title, description, due_date, created_by)
         VALUES ($1::uuid, $2, $3, $4::date, $5::uuid)
         RETURNING id, user_id, title, description, progress, status, due_date, created_by
       )
       SELECT i.*, u.first_name || ' ' || u.last_name AS user_name
       FROM inserted i JOIN users u ON u.id = i.user_id`,
      input.userId,
      input.title,
      input.description ?? null,
      input.dueDate ?? null,
      createdBy,
    );
    const row = rows[0];
    if (!row) throw new BadRequestException({ code: "INSERT_FAILED" });
    const goal = mapGoal(row);
    if (goal.userId !== createdBy) {
      void this.notifications.notify([goal.userId], {
        type: "goal_assigned",
        title: "Новая цель",
        body: goal.title,
        link: "/dashboard/performance",
      });
    }
    return goal;
  }

  async updateGoal(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      progress?: number;
      status?: string;
      dueDate?: string | null;
    },
  ): Promise<GoalRow> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawGoal[]>(
      `WITH updated AS (
         UPDATE goals SET
           title = COALESCE($2, title),
           description = CASE WHEN $3::text IS NULL AND $7 = false THEN description ELSE $3 END,
           progress = COALESCE($4::int, progress),
           status = COALESCE($5, status),
           due_date = CASE WHEN $6::text IS NULL AND $8 = false THEN due_date ELSE $6::date END,
           updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, user_id, title, description, progress, status, due_date, created_by
       )
       SELECT u2.*, u.first_name || ' ' || u.last_name AS user_name
       FROM updated u2 JOIN users u ON u.id = u2.user_id`,
      id,
      input.title ?? null,
      input.description === undefined ? null : input.description,
      input.progress ?? null,
      input.status ?? null,
      input.dueDate === undefined ? null : input.dueDate,
      input.description !== undefined,
      input.dueDate !== undefined,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "GOAL_NOT_FOUND" });
    return mapGoal(row);
  }

  /** Обновление прогресса владельцем цели. */
  async updateOwnProgress(id: string, userId: string, progress: number): Promise<GoalRow> {
    const client = await this.tenantDb.getClient();
    const owner = await client.$queryRawUnsafe<{ user_id: string }[]>(
      `SELECT user_id FROM goals WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    if (owner.length === 0) throw new NotFoundException({ code: "GOAL_NOT_FOUND" });
    if (owner[0]!.user_id !== userId) throw new ForbiddenException({ code: "NOT_GOAL_OWNER" });
    const status = progress >= 100 ? "DONE" : "ACTIVE";
    const rows = await client.$queryRawUnsafe<RawGoal[]>(
      `WITH updated AS (
         UPDATE goals SET progress = $2::int, status = $3, updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, user_id, title, description, progress, status, due_date, created_by
       )
       SELECT u2.*, u.first_name || ' ' || u.last_name AS user_name
       FROM updated u2 JOIN users u ON u.id = u2.user_id`,
      id,
      progress,
      status,
    );
    return mapGoal(rows[0]!);
  }

  async removeGoal(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(`DELETE FROM goals WHERE id = $1::uuid`, id);
    if (affected === 0) throw new NotFoundException({ code: "GOAL_NOT_FOUND" });
  }

  /* ───────── Reviews ───────── */

  async listReviews(userId?: string): Promise<ReviewRow[]> {
    const client = await this.tenantDb.getClient();
    const where = userId ? `WHERE r.user_id = $1::uuid` : "";
    const params = userId ? [userId] : [];
    const rows = await client.$queryRawUnsafe<RawReview[]>(
      `SELECT ${REVIEW_SELECT} FROM reviews r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN users rv ON rv.id = r.reviewer_id
       ${where} ORDER BY r.created_at DESC`,
      ...params,
    );
    return rows.map(mapReview);
  }

  async listMyReviews(userId: string): Promise<ReviewRow[]> {
    return this.listReviews(userId);
  }

  async createReview(
    input: { userId: string; periodLabel: string; rating: number; comment?: string },
    reviewerId: string,
  ): Promise<ReviewRow> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawReview[]>(
      `WITH inserted AS (
         INSERT INTO reviews (user_id, reviewer_id, period_label, rating, comment)
         VALUES ($1::uuid, $2::uuid, $3, $4::int, $5)
         RETURNING id, user_id, reviewer_id, period_label, rating, comment, created_at
       )
       SELECT i.*, u.first_name || ' ' || u.last_name AS user_name,
              rv.first_name || ' ' || rv.last_name AS reviewer_name
       FROM inserted i JOIN users u ON u.id = i.user_id
       LEFT JOIN users rv ON rv.id = i.reviewer_id`,
      input.userId,
      reviewerId,
      input.periodLabel,
      input.rating,
      input.comment ?? null,
    );
    const row = rows[0];
    if (!row) throw new BadRequestException({ code: "INSERT_FAILED" });
    const review = mapReview(row);
    if (review.userId !== reviewerId) {
      void this.notifications.notify([review.userId], {
        type: "review_received",
        title: "Новая оценка эффективности",
        body: `${review.periodLabel}: ${review.rating}/5`,
        link: "/dashboard/performance",
      });
    }
    return review;
  }

  async updateReview(
    id: string,
    input: { periodLabel?: string; rating?: number; comment?: string | null },
  ): Promise<ReviewRow> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawReview[]>(
      `WITH updated AS (
         UPDATE reviews SET
           period_label = COALESCE($2, period_label),
           rating = COALESCE($3::int, rating),
           comment = CASE WHEN $4::text IS NULL AND $5 = false THEN comment ELSE $4 END,
           updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, user_id, reviewer_id, period_label, rating, comment, created_at
       )
       SELECT u2.*, u.first_name || ' ' || u.last_name AS user_name,
              rv.first_name || ' ' || rv.last_name AS reviewer_name
       FROM updated u2 JOIN users u ON u.id = u2.user_id
       LEFT JOIN users rv ON rv.id = u2.reviewer_id`,
      id,
      input.periodLabel ?? null,
      input.rating ?? null,
      input.comment === undefined ? null : input.comment,
      input.comment !== undefined,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "REVIEW_NOT_FOUND" });
    return mapReview(row);
  }

  async removeReview(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(`DELETE FROM reviews WHERE id = $1::uuid`, id);
    if (affected === 0) throw new NotFoundException({ code: "REVIEW_NOT_FOUND" });
  }
}
