import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateSurveyDto, SubmitResponseDto, UpdateSurveyDto } from "./dto/survey.dto.js";
import { average, choiceDistribution, computeEnps, distribution } from "./enps-utils.js";

export interface SurveyQuestion {
  id: string;
  text: string;
  kind: string;
  options: string[] | null;
  sortOrder: number;
  required: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  anonymous: boolean;
  closesAt: Date | null;
  questionCount: number;
  responseCount: number;
  createdAt: Date;
}

export interface SurveyDetail extends Survey {
  questions: SurveyQuestion[];
}

export interface ActiveSurvey {
  id: string;
  title: string;
  description: string | null;
  type: string;
  anonymous: boolean;
  closesAt: Date | null;
  completed: boolean;
}

export interface RespondentSurvey {
  id: string;
  title: string;
  description: string | null;
  anonymous: boolean;
  status: string;
  completed: boolean;
  questions: SurveyQuestion[];
}

export interface QuestionResult {
  id: string;
  text: string;
  kind: string;
  options: string[] | null;
  answered: number;
  /** Для SCALE_0_10 — eNPS-метрики. */
  enps?: { promoters: number; passives: number; detractors: number; score: number };
  /** Средний балл (SCALE_*). */
  average?: number;
  /** Распределение: метка → количество. */
  distribution?: { label: string; count: number }[];
  /** Текстовые ответы (TEXT). */
  texts?: string[];
}

export interface SurveyResults {
  surveyId: string;
  title: string;
  anonymous: boolean;
  responseCount: number;
  eligibleCount: number;
  questions: QuestionResult[];
}

interface SurveyRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  anonymous: boolean;
  closes_at: Date | null;
  question_count: number;
  response_count: number;
  created_at: Date;
}

interface QuestionRow {
  id: string;
  text: string;
  kind: string;
  options: string[] | null;
  sort_order: number;
  required: boolean;
}

function mapQuestion(r: QuestionRow): SurveyQuestion {
  return {
    id: r.id,
    text: r.text,
    kind: r.kind,
    options: r.options,
    sortOrder: r.sort_order,
    required: r.required,
  };
}

function mapSurvey(r: SurveyRow): Survey {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    status: r.status,
    anonymous: r.anonymous,
    closesAt: r.closes_at,
    questionCount: Number(r.question_count),
    responseCount: Number(r.response_count),
    createdAt: r.created_at,
  };
}

const SURVEY_SELECT = `
  s.id, s.title, s.description, s.type, s.status, s.anonymous, s.closes_at, s.created_at,
  (SELECT COUNT(*) FROM survey_questions q WHERE q.survey_id = s.id)::int AS question_count,
  (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id)::int AS response_count
`;

@Injectable()
export class SurveysService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ───────── Управление (HR) ───────── */

  async listSurveys(): Promise<Survey[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<SurveyRow[]>(
      `SELECT ${SURVEY_SELECT} FROM surveys s
       ORDER BY s.status = 'CLOSED', s.created_at DESC`,
    );
    return rows.map(mapSurvey);
  }

  private async loadQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<QuestionRow[]>(
      `SELECT id, text, kind, options, sort_order, required
       FROM survey_questions WHERE survey_id = $1::uuid ORDER BY sort_order, text`,
      surveyId,
    );
    return rows.map(mapQuestion);
  }

  async getSurvey(id: string): Promise<SurveyDetail> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<SurveyRow[]>(
      `SELECT ${SURVEY_SELECT} FROM surveys s WHERE s.id = $1::uuid`,
      id,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "SURVEY_NOT_FOUND" });
    return { ...mapSurvey(r), questions: await this.loadQuestions(id) };
  }

  async createSurvey(dto: CreateSurveyDto, createdBy: string): Promise<SurveyDetail> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO surveys (title, description, type, anonymous, closes_at, created_by, status)
       VALUES ($1, $2, $3, $4::boolean, $5::timestamptz, $6::uuid, 'DRAFT')
       RETURNING id`,
      dto.title,
      dto.description ?? null,
      dto.type ?? "CUSTOM",
      dto.anonymous ?? true,
      dto.closesAt ?? null,
      createdBy,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    await this.replaceQuestions(id, dto.questions);
    return this.getSurvey(id);
  }

  private async replaceQuestions(
    surveyId: string,
    questions: { text: string; kind: string; options?: string[]; required?: boolean }[],
  ): Promise<void> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `DELETE FROM survey_questions WHERE survey_id = $1::uuid`,
      surveyId,
    );
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      const hasOptions = q.kind === "CHOICE" && Array.isArray(q.options) && q.options.length > 0;
      await client.$executeRawUnsafe(
        `INSERT INTO survey_questions (survey_id, text, kind, options, sort_order, required)
         VALUES ($1::uuid, $2, $3, $4::jsonb, $5::int, $6::boolean)`,
        surveyId,
        q.text,
        q.kind,
        hasOptions ? JSON.stringify(q.options) : null,
        i,
        q.required ?? true,
      );
    }
  }

  async updateSurvey(id: string, dto: UpdateSurveyDto): Promise<SurveyDetail> {
    const existing = await this.getSurvey(id);
    if (dto.questions) {
      if (existing.status !== "DRAFT") {
        throw new ConflictException({ code: "QUESTIONS_LOCKED", current: existing.status });
      }
      await this.replaceQuestions(id, dto.questions);
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE surveys SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         status = COALESCE($4, status),
         anonymous = COALESCE($5::boolean, anonymous),
         closes_at = COALESCE($6::timestamptz, closes_at),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      dto.title ?? null,
      dto.description ?? null,
      dto.status ?? null,
      dto.anonymous ?? null,
      dto.closesAt ?? null,
    );

    // При активации — уведомить активных сотрудников.
    if (dto.status === "ACTIVE" && existing.status !== "ACTIVE") {
      const recipients = await client.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM users WHERE status = 'ACTIVE'`,
      );
      const ids = recipients.map((u) => u.id);
      if (ids.length > 0) {
        void this.notifications
          .notify(ids, {
            type: "survey_published",
            title: "Новый опрос",
            body: existing.title,
            link: "/dashboard/surveys",
          })
          .catch(() => undefined);
      }
    }
    return this.getSurvey(id);
  }

  async removeSurvey(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(`DELETE FROM surveys WHERE id = $1::uuid`, id);
    if (affected === 0) throw new NotFoundException({ code: "SURVEY_NOT_FOUND" });
  }

  /* ───────── Результаты ───────── */

  async getResults(id: string): Promise<SurveyResults> {
    const survey = await this.getSurvey(id);
    const client = await this.tenantDb.getClient();

    const eligible = await client.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(*)::int AS c FROM users WHERE status = 'ACTIVE'`,
    );
    const eligibleCount = eligible[0]?.c ?? 0;

    const answers = await client.$queryRawUnsafe<
      { question_id: string; value_int: number | null; value_text: string | null }[]
    >(
      `SELECT a.question_id, a.value_int, a.value_text
       FROM survey_answers a
       JOIN survey_responses r ON r.id = a.response_id
       WHERE r.survey_id = $1::uuid`,
      id,
    );

    const byQuestion = new Map<string, { ints: number[]; texts: string[] }>();
    for (const q of survey.questions) byQuestion.set(q.id, { ints: [], texts: [] });
    for (const a of answers) {
      const bucket = byQuestion.get(a.question_id);
      if (!bucket) continue;
      if (a.value_int !== null && a.value_int !== undefined) bucket.ints.push(a.value_int);
      if (a.value_text) bucket.texts.push(a.value_text);
    }

    const questions: QuestionResult[] = survey.questions.map((q) => {
      const bucket = byQuestion.get(q.id) ?? { ints: [], texts: [] };
      const result: QuestionResult = {
        id: q.id,
        text: q.text,
        kind: q.kind,
        options: q.options,
        answered: q.kind === "TEXT" ? bucket.texts.length : bucket.ints.length,
      };
      if (q.kind === "SCALE_0_10") {
        result.enps = computeEnps(bucket.ints);
        result.average = average(bucket.ints);
      } else if (q.kind === "SCALE_1_5") {
        result.average = average(bucket.ints);
        result.distribution = distribution(bucket.ints, [1, 2, 3, 4, 5]);
      } else if (q.kind === "CHOICE") {
        result.distribution = choiceDistribution(bucket.ints, q.options ?? []);
      } else {
        result.texts = bucket.texts;
      }
      return result;
    });

    return {
      surveyId: survey.id,
      title: survey.title,
      anonymous: survey.anonymous,
      responseCount: survey.responseCount,
      eligibleCount,
      questions,
    };
  }

  /* ───────── Прохождение (сотрудник) ───────── */

  async listActiveForUser(userId: string): Promise<ActiveSurvey[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        title: string;
        description: string | null;
        type: string;
        anonymous: boolean;
        closes_at: Date | null;
        completed: boolean;
      }[]
    >(
      `SELECT s.id, s.title, s.description, s.type, s.anonymous, s.closes_at,
              EXISTS (SELECT 1 FROM survey_responses r WHERE r.survey_id = s.id AND r.user_id = $1::uuid) AS completed
       FROM surveys s
       WHERE s.status = 'ACTIVE'
       ORDER BY s.created_at DESC`,
      userId,
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      anonymous: r.anonymous,
      closesAt: r.closes_at,
      completed: r.completed,
    }));
  }

  async getForRespondent(id: string, userId: string): Promise<RespondentSurvey> {
    const survey = await this.getSurvey(id);
    if (survey.status !== "ACTIVE") {
      throw new ConflictException({ code: "SURVEY_NOT_ACTIVE", current: survey.status });
    }
    const client = await this.tenantDb.getClient();
    const done = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM survey_responses WHERE survey_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
      id,
      userId,
    );
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      anonymous: survey.anonymous,
      status: survey.status,
      completed: done.length > 0,
      questions: survey.questions,
    };
  }

  async respond(id: string, userId: string, dto: SubmitResponseDto): Promise<{ ok: true }> {
    const survey = await this.getSurvey(id);
    if (survey.status !== "ACTIVE") {
      throw new ConflictException({ code: "SURVEY_NOT_ACTIVE", current: survey.status });
    }
    const questionById = new Map(survey.questions.map((q) => [q.id, q]));

    // Валидация ответов по типу вопроса.
    const valid = dto.answers.filter((a) => questionById.has(a.questionId));
    for (const a of valid) {
      const q = questionById.get(a.questionId)!;
      this.validateAnswer(q, a);
    }
    // Проверка обязательных вопросов.
    const answeredIds = new Set(
      valid
        .filter((a) => a.valueInt !== undefined || (a.valueText && a.valueText.trim().length > 0))
        .map((a) => a.questionId),
    );
    for (const q of survey.questions) {
      if (q.required && !answeredIds.has(q.id)) {
        throw new BadRequestException({ code: "REQUIRED_MISSING", questionId: q.id });
      }
    }

    const client = await this.tenantDb.getClient();
    const respRows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO survey_responses (survey_id, user_id) VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (survey_id, user_id) DO NOTHING RETURNING id`,
      id,
      userId,
    );
    const responseId = respRows[0]?.id;
    if (!responseId) {
      throw new ConflictException({ code: "ALREADY_RESPONDED" });
    }
    for (const a of valid) {
      await client.$executeRawUnsafe(
        `INSERT INTO survey_answers (response_id, question_id, value_int, value_text)
         VALUES ($1::uuid, $2::uuid, $3::int, $4)`,
        responseId,
        a.questionId,
        a.valueInt ?? null,
        a.valueText?.trim() ? a.valueText.trim() : null,
      );
    }
    return { ok: true };
  }

  private validateAnswer(q: SurveyQuestion, a: { valueInt?: number; valueText?: string }): void {
    if (q.kind === "TEXT") return;
    if (a.valueInt === undefined) {
      if (q.required) throw new BadRequestException({ code: "VALUE_REQUIRED", questionId: q.id });
      return;
    }
    if (q.kind === "SCALE_0_10" && (a.valueInt < 0 || a.valueInt > 10)) {
      throw new BadRequestException({ code: "OUT_OF_RANGE", questionId: q.id });
    }
    if (q.kind === "SCALE_1_5" && (a.valueInt < 1 || a.valueInt > 5)) {
      throw new BadRequestException({ code: "OUT_OF_RANGE", questionId: q.id });
    }
    if (q.kind === "CHOICE") {
      const len = q.options?.length ?? 0;
      if (a.valueInt < 0 || a.valueInt >= len) {
        throw new BadRequestException({ code: "OUT_OF_RANGE", questionId: q.id });
      }
    }
  }
}
