import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import type {
  CreateCandidateDto,
  CreateVacancyDto,
  UpdateCandidateDto,
  UpdateVacancyDto,
} from "./dto/recruitment.dto.js";

export interface Vacancy {
  id: string;
  title: string;
  departmentId: string | null;
  departmentName: string | null;
  description: string | null;
  status: string;
  candidateCount: number;
  createdAt: Date;
}

export interface Candidate {
  id: string;
  vacancyId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string;
  notes: string | null;
  rating: number | null;
  createdAt: Date;
}

interface VacancyRow {
  id: string;
  title: string;
  department_id: string | null;
  department_name: string | null;
  description: string | null;
  status: string;
  candidate_count: bigint;
  created_at: Date;
}

interface CandidateRow {
  id: string;
  vacancy_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string;
  notes: string | null;
  rating: number | null;
  created_at: Date;
}

function mapVacancy(r: VacancyRow): Vacancy {
  return {
    id: r.id,
    title: r.title,
    departmentId: r.department_id,
    departmentName: r.department_name,
    description: r.description,
    status: r.status,
    candidateCount: Number(r.candidate_count),
    createdAt: r.created_at,
  };
}

function mapCandidate(r: CandidateRow): Candidate {
  return {
    id: r.id,
    vacancyId: r.vacancy_id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    source: r.source,
    stage: r.stage,
    notes: r.notes,
    rating: r.rating,
    createdAt: r.created_at,
  };
}

@Injectable()
export class RecruitmentService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  /* ───────── Вакансии ───────── */

  async listVacancies(status?: string): Promise<Vacancy[]> {
    const client = await this.tenantDb.getClient();
    const where = status ? `WHERE v.status = $1` : ``;
    const params = status ? [status] : [];
    const rows = await client.$queryRawUnsafe<VacancyRow[]>(
      `SELECT v.id, v.title, v.department_id, d.name AS department_name,
              v.description, v.status, v.created_at,
              COUNT(c.id)::bigint AS candidate_count
       FROM vacancies v
       LEFT JOIN departments d ON d.id = v.department_id
       LEFT JOIN candidates c ON c.vacancy_id = v.id
       ${where}
       GROUP BY v.id, d.name
       ORDER BY v.status = 'CLOSED', v.created_at DESC`,
      ...params,
    );
    return rows.map(mapVacancy);
  }

  async getVacancy(id: string): Promise<Vacancy> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<VacancyRow[]>(
      `SELECT v.id, v.title, v.department_id, d.name AS department_name,
              v.description, v.status, v.created_at,
              COUNT(c.id)::bigint AS candidate_count
       FROM vacancies v
       LEFT JOIN departments d ON d.id = v.department_id
       LEFT JOIN candidates c ON c.vacancy_id = v.id
       WHERE v.id = $1::uuid
       GROUP BY v.id, d.name`,
      id,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "VACANCY_NOT_FOUND" });
    return mapVacancy(r);
  }

  async createVacancy(input: CreateVacancyDto, createdBy: string): Promise<Vacancy> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO vacancies (title, department_id, description, created_by)
       VALUES ($1, $2::uuid, $3, $4::uuid) RETURNING id`,
      input.title,
      input.departmentId ?? null,
      input.description ?? null,
      createdBy,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    return this.getVacancy(id);
  }

  async updateVacancy(id: string, input: UpdateVacancyDto): Promise<Vacancy> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `UPDATE vacancies SET
         title = COALESCE($2, title),
         department_id = COALESCE($3::uuid, department_id),
         description = COALESCE($4, description),
         status = COALESCE($5, status),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      input.title ?? null,
      input.departmentId ?? null,
      input.description ?? null,
      input.status ?? null,
    );
    if (affected === 0) throw new NotFoundException({ code: "VACANCY_NOT_FOUND" });
    return this.getVacancy(id);
  }

  async removeVacancy(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `DELETE FROM vacancies WHERE id = $1::uuid`,
      id,
    );
    if (affected === 0) throw new NotFoundException({ code: "VACANCY_NOT_FOUND" });
  }

  /* ───────── Кандидаты ───────── */

  async listCandidates(vacancyId: string): Promise<Candidate[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<CandidateRow[]>(
      `SELECT id, vacancy_id, full_name, email, phone, source, stage, notes, rating, created_at
       FROM candidates WHERE vacancy_id = $1::uuid
       ORDER BY created_at DESC`,
      vacancyId,
    );
    return rows.map(mapCandidate);
  }

  async getCandidate(id: string): Promise<Candidate> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<CandidateRow[]>(
      `SELECT id, vacancy_id, full_name, email, phone, source, stage, notes, rating, created_at
       FROM candidates WHERE id = $1::uuid`,
      id,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "CANDIDATE_NOT_FOUND" });
    return mapCandidate(r);
  }

  async createCandidate(vacancyId: string, input: CreateCandidateDto): Promise<Candidate> {
    const client = await this.tenantDb.getClient();
    // Проверяем что вакансия существует (иначе FK даст 500).
    await this.getVacancy(vacancyId);
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO candidates (vacancy_id, full_name, email, phone, source, notes, rating)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::int) RETURNING id`,
      vacancyId,
      input.fullName,
      input.email ?? null,
      input.phone ?? null,
      input.source ?? null,
      input.notes ?? null,
      input.rating ?? null,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    return this.getCandidate(id);
  }

  async updateCandidate(id: string, input: UpdateCandidateDto): Promise<Candidate> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `UPDATE candidates SET
         full_name = COALESCE($2, full_name),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         source = COALESCE($5, source),
         stage = COALESCE($6, stage),
         notes = COALESCE($7, notes),
         rating = COALESCE($8::int, rating),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      input.fullName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.source ?? null,
      input.stage ?? null,
      input.notes ?? null,
      input.rating ?? null,
    );
    if (affected === 0) throw new NotFoundException({ code: "CANDIDATE_NOT_FOUND" });
    return this.getCandidate(id);
  }

  async setStage(id: string, stage: string): Promise<Candidate> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `UPDATE candidates SET stage = $2, updated_at = NOW() WHERE id = $1::uuid`,
      id,
      stage,
    );
    if (affected === 0) throw new NotFoundException({ code: "CANDIDATE_NOT_FOUND" });
    return this.getCandidate(id);
  }

  async removeCandidate(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `DELETE FROM candidates WHERE id = $1::uuid`,
      id,
    );
    if (affected === 0) throw new NotFoundException({ code: "CANDIDATE_NOT_FOUND" });
  }

  /* ───────── Аналитика найма ───────── */

  async analytics(): Promise<RecruitmentAnalytics> {
    const client = await this.tenantDb.getClient();

    const funnelRows = await client.$queryRawUnsafe<{ stage: string; count: number }[]>(
      `SELECT stage, COUNT(*)::int AS count FROM candidates GROUP BY stage`,
    );
    const funnelMap = new Map(funnelRows.map((r) => [r.stage, r.count]));
    const funnel = CANDIDATE_STAGE_ORDER.map((stage) => ({
      stage,
      count: funnelMap.get(stage) ?? 0,
    }));

    const sources = await client.$queryRawUnsafe<
      { source: string; total: number; hired: number }[]
    >(
      `SELECT COALESCE(NULLIF(source, ''), '—') AS source,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE stage = 'HIRED')::int AS hired
       FROM candidates
       GROUP BY COALESCE(NULLIF(source, ''), '—')
       ORDER BY total DESC
       LIMIT 20`,
    );

    const tth = await client.$queryRawUnsafe<{ days: number | null }[]>(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::float8 AS days
       FROM candidates WHERE stage = 'HIRED'`,
    );
    const avgTimeToHireDays =
      tth[0]?.days !== null && tth[0]?.days !== undefined
        ? Math.round(tth[0].days * 10) / 10
        : null;

    const totals = await client.$queryRawUnsafe<
      { total: number; hired: number; open_vacancies: number }[]
    >(
      `SELECT
         (SELECT COUNT(*) FROM candidates)::int AS total,
         (SELECT COUNT(*) FROM candidates WHERE stage = 'HIRED')::int AS hired,
         (SELECT COUNT(*) FROM vacancies WHERE status = 'OPEN')::int AS open_vacancies`,
    );
    const t = totals[0] ?? { total: 0, hired: 0, open_vacancies: 0 };

    return {
      funnel,
      sources,
      avgTimeToHireDays,
      totalCandidates: t.total,
      hiredCount: t.hired,
      openVacancies: t.open_vacancies,
    };
  }
}

const CANDIDATE_STAGE_ORDER = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;

export interface RecruitmentAnalytics {
  funnel: { stage: string; count: number }[];
  sources: { source: string; total: number; hired: number }[];
  avgTimeToHireDays: number | null;
  totalCandidates: number;
  hiredCount: number;
  openVacancies: number;
}
