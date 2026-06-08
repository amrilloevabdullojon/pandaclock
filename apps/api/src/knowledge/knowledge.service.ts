import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import type {
  CreateArticleDto,
  CreateCourseDto,
  UpdateArticleDto,
  UpdateCourseDto,
} from "./dto/knowledge.dto.js";

export interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  authorName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseLesson {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  completed: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  status: string;
  lessonCount: number;
  enrolled: boolean;
  progress: number;
  completed: boolean;
  createdAt: Date;
}

export interface CourseDetail extends Course {
  lessons: CourseLesson[];
}

interface ArticleRow {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  author_name: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  lesson_count: number;
  enrolled: boolean;
  done_count: number;
  completed_at: Date | null;
  created_at: Date;
}

function mapArticle(r: ArticleRow): Article {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    category: r.category,
    published: r.published,
    authorName: r.author_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapCourse(r: CourseRow): Course {
  const progress = r.lesson_count > 0 ? Math.round((r.done_count / r.lesson_count) * 100) : 0;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    lessonCount: r.lesson_count,
    enrolled: r.enrolled,
    progress,
    completed: r.completed_at !== null,
    createdAt: r.created_at,
  };
}

const ARTICLE_SELECT = `
  a.id, a.title, a.content, a.category, a.published, a.created_at, a.updated_at,
  CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name END AS author_name
`;

const COURSE_SELECT = `
  c.id, c.title, c.description, c.status, c.created_at,
  (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = c.id)::int AS lesson_count,
  (e.id IS NOT NULL) AS enrolled,
  e.completed_at,
  (SELECT COUNT(*) FROM lesson_completions lc WHERE lc.enrollment_id = e.id)::int AS done_count
`;

@Injectable()
export class KnowledgeService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  /* ───────── База знаний ───────── */

  async listArticles(canWrite: boolean, category?: string, q?: string): Promise<Article[]> {
    const client = await this.tenantDb.getClient();
    const conds: string[] = [];
    const params: unknown[] = [];
    if (!canWrite) conds.push(`a.published = true`);
    if (category) {
      params.push(category);
      conds.push(`a.category = $${String(params.length)}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conds.push(
        `(a.title ILIKE $${String(params.length)} OR a.content ILIKE $${String(params.length)})`,
      );
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = await client.$queryRawUnsafe<ArticleRow[]>(
      `SELECT ${ARTICLE_SELECT}
       FROM kb_articles a
       LEFT JOIN users u ON u.id = a.created_by
       ${where}
       ORDER BY a.updated_at DESC
       LIMIT 500`,
      ...params,
    );
    return rows.map(mapArticle);
  }

  async getArticle(id: string, canWrite: boolean): Promise<Article> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<ArticleRow[]>(
      `SELECT ${ARTICLE_SELECT}
       FROM kb_articles a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.id = $1::uuid`,
      id,
    );
    const r = rows[0];
    if (!r || (!r.published && !canWrite))
      throw new NotFoundException({ code: "ARTICLE_NOT_FOUND" });
    return mapArticle(r);
  }

  async createArticle(dto: CreateArticleDto, userId: string): Promise<Article> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO kb_articles (title, content, category, published, created_by)
       VALUES ($1, $2, $3, $4::boolean, $5::uuid) RETURNING id`,
      dto.title,
      dto.content ?? "",
      dto.category ?? "Общее",
      dto.published ?? false,
      userId,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    return this.getArticle(id, true);
  }

  async updateArticle(id: string, dto: UpdateArticleDto): Promise<Article> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `UPDATE kb_articles SET
         title = COALESCE($2, title),
         content = COALESCE($3, content),
         category = COALESCE($4, category),
         published = COALESCE($5::boolean, published),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      dto.title ?? null,
      dto.content ?? null,
      dto.category ?? null,
      dto.published ?? null,
    );
    if (affected === 0) throw new NotFoundException({ code: "ARTICLE_NOT_FOUND" });
    return this.getArticle(id, true);
  }

  async removeArticle(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `DELETE FROM kb_articles WHERE id = $1::uuid`,
      id,
    );
    if (affected === 0) throw new NotFoundException({ code: "ARTICLE_NOT_FOUND" });
  }

  /* ───────── LMS: курсы ───────── */

  async listCourses(userId: string, canWrite: boolean): Promise<Course[]> {
    const client = await this.tenantDb.getClient();
    const statusFilter = canWrite ? "" : `WHERE c.status = 'PUBLISHED'`;
    const rows = await client.$queryRawUnsafe<CourseRow[]>(
      `SELECT ${COURSE_SELECT}
       FROM courses c
       LEFT JOIN course_enrollments e ON e.course_id = c.id AND e.user_id = $1::uuid
       ${statusFilter}
       ORDER BY c.status = 'ARCHIVED', c.created_at DESC
       LIMIT 200`,
      userId,
    );
    return rows.map(mapCourse);
  }

  async getCourse(id: string, userId: string, canWrite: boolean): Promise<CourseDetail> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<CourseRow[]>(
      `SELECT ${COURSE_SELECT}
       FROM courses c
       LEFT JOIN course_enrollments e ON e.course_id = c.id AND e.user_id = $1::uuid
       WHERE c.id = $2::uuid`,
      userId,
      id,
    );
    const r = rows[0];
    if (!r || (r.status !== "PUBLISHED" && !canWrite)) {
      throw new NotFoundException({ code: "COURSE_NOT_FOUND" });
    }
    const lessons = await client.$queryRawUnsafe<
      { id: string; title: string; content: string; sort_order: number; completed: boolean }[]
    >(
      `SELECT l.id, l.title, l.content, l.sort_order,
              EXISTS (
                SELECT 1 FROM lesson_completions lc
                JOIN course_enrollments e ON e.id = lc.enrollment_id
                WHERE lc.lesson_id = l.id AND e.user_id = $2::uuid
              ) AS completed
       FROM course_lessons l
       WHERE l.course_id = $1::uuid
       ORDER BY l.sort_order, l.title`,
      id,
      userId,
    );
    return {
      ...mapCourse(r),
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        content: l.content,
        sortOrder: l.sort_order,
        completed: l.completed,
      })),
    };
  }

  private async replaceLessons(
    courseId: string,
    lessons: { title: string; content?: string }[],
  ): Promise<void> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `DELETE FROM course_lessons WHERE course_id = $1::uuid`,
      courseId,
    );
    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i]!;
      await client.$executeRawUnsafe(
        `INSERT INTO course_lessons (course_id, title, content, sort_order)
         VALUES ($1::uuid, $2, $3, $4::int)`,
        courseId,
        l.title,
        l.content ?? "",
        i,
      );
    }
  }

  async createCourse(dto: CreateCourseDto, userId: string): Promise<CourseDetail> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO courses (title, description, created_by, status)
       VALUES ($1, $2, $3::uuid, 'DRAFT') RETURNING id`,
      dto.title,
      dto.description ?? null,
      userId,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    await this.replaceLessons(id, dto.lessons);
    return this.getCourse(id, userId, true);
  }

  async updateCourse(id: string, dto: UpdateCourseDto, userId: string): Promise<CourseDetail> {
    const client = await this.tenantDb.getClient();
    if (dto.lessons) {
      await this.replaceLessons(id, dto.lessons);
    }
    const affected = await client.$executeRawUnsafe(
      `UPDATE courses SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         status = COALESCE($4, status),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      dto.title ?? null,
      dto.description ?? null,
      dto.status ?? null,
    );
    if (affected === 0) throw new NotFoundException({ code: "COURSE_NOT_FOUND" });
    return this.getCourse(id, userId, true);
  }

  async removeCourse(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(`DELETE FROM courses WHERE id = $1::uuid`, id);
    if (affected === 0) throw new NotFoundException({ code: "COURSE_NOT_FOUND" });
  }

  /* ───────── LMS: прохождение ───────── */

  private async ensureEnrollment(courseId: string, userId: string): Promise<string> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `INSERT INTO course_enrollments (course_id, user_id) VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (course_id, user_id) DO NOTHING`,
      courseId,
      userId,
    );
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM course_enrollments WHERE course_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
      courseId,
      userId,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "ENROLL_FAILED" });
    return id;
  }

  async enroll(courseId: string, userId: string): Promise<CourseDetail> {
    await this.assertCourseAvailable(courseId);
    await this.ensureEnrollment(courseId, userId);
    return this.getCourse(courseId, userId, false);
  }

  async completeLesson(courseId: string, lessonId: string, userId: string): Promise<CourseDetail> {
    await this.assertCourseAvailable(courseId);
    const client = await this.tenantDb.getClient();
    // Урок должен принадлежать курсу.
    const lesson = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM course_lessons WHERE id = $1::uuid AND course_id = $2::uuid LIMIT 1`,
      lessonId,
      courseId,
    );
    if (lesson.length === 0) throw new NotFoundException({ code: "LESSON_NOT_FOUND" });

    const enrollmentId = await this.ensureEnrollment(courseId, userId);
    await client.$executeRawUnsafe(
      `INSERT INTO lesson_completions (enrollment_id, lesson_id) VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (enrollment_id, lesson_id) DO NOTHING`,
      enrollmentId,
      lessonId,
    );
    // Пересчёт завершённости курса.
    await client.$executeRawUnsafe(
      `UPDATE course_enrollments e SET completed_at =
         CASE WHEN (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = $1::uuid) > 0
              AND (SELECT COUNT(*) FROM lesson_completions lc WHERE lc.enrollment_id = e.id)
                  >= (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = $1::uuid)
              THEN NOW() ELSE NULL END
       WHERE e.id = $2::uuid`,
      courseId,
      enrollmentId,
    );
    return this.getCourse(courseId, userId, false);
  }

  private async assertCourseAvailable(courseId: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ status: string }[]>(
      `SELECT status FROM courses WHERE id = $1::uuid LIMIT 1`,
      courseId,
    );
    if (rows.length === 0) throw new NotFoundException({ code: "COURSE_NOT_FOUND" });
    if (rows[0]!.status !== "PUBLISHED") {
      throw new BadRequestException({ code: "COURSE_NOT_PUBLISHED" });
    }
  }
}
