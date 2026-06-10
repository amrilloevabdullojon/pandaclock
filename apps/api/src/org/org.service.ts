import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import type { CreateStaffPositionDto, UpdateStaffPositionDto } from "./dto/org.dto.js";

export interface OrgMember {
  id: string;
  fullName: string;
  position: string | null;
  avatarUrl: string | null;
  isHead: boolean;
}

export interface OrgDepartment {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  headName: string | null;
  members: OrgMember[];
}

export interface OrgChart {
  departments: OrgDepartment[];
  unassigned: OrgMember[];
}

export interface StaffPosition {
  id: string;
  departmentId: string | null;
  departmentName: string | null;
  title: string;
  plannedCount: number;
  filled: number;
  notes: string | null;
}

interface DeptRow {
  id: string;
  name: string;
  parent_id: string | null;
  head_id: string | null;
  head_name: string | null;
}

interface UserRow {
  id: string;
  full_name: string;
  position: string | null;
  avatar_url: string | null;
  department_id: string | null;
}

interface StaffRow {
  id: string;
  department_id: string | null;
  department_name: string | null;
  title: string;
  planned_count: number;
  filled: number;
  notes: string | null;
}

function mapStaff(r: StaffRow): StaffPosition {
  return {
    id: r.id,
    departmentId: r.department_id,
    departmentName: r.department_name,
    title: r.title,
    plannedCount: r.planned_count,
    filled: r.filled,
    notes: r.notes,
  };
}

@Injectable()
export class OrgService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  /* ───────── Оргструктура ───────── */

  async chart(): Promise<OrgChart> {
    const client = await this.tenantDb.getClient();
    const depts = await client.$queryRawUnsafe<DeptRow[]>(
      `SELECT d.id, d.name, d.parent_id, d.head_id,
              CASE WHEN h.id IS NOT NULL THEN h.first_name || ' ' || h.last_name END AS head_name
       FROM departments d
       LEFT JOIN users h ON h.id = d.head_id
       ORDER BY d.name`,
    );
    const users = await client.$queryRawUnsafe<UserRow[]>(
      `SELECT id, first_name || ' ' || last_name AS full_name, position, avatar_url, department_id
       FROM users WHERE status = 'ACTIVE'
       ORDER BY first_name, last_name`,
    );

    const byDept = new Map<string, OrgMember[]>();
    const unassigned: OrgMember[] = [];
    const headIds = new Set(depts.map((d) => d.head_id).filter(Boolean) as string[]);
    for (const u of users) {
      const member: OrgMember = {
        id: u.id,
        fullName: u.full_name,
        position: u.position,
        avatarUrl: u.avatar_url,
        isHead: headIds.has(u.id),
      };
      if (u.department_id) {
        const list = byDept.get(u.department_id) ?? [];
        list.push(member);
        byDept.set(u.department_id, list);
      } else {
        unassigned.push(member);
      }
    }

    const departments: OrgDepartment[] = depts.map((d) => ({
      id: d.id,
      name: d.name,
      parentId: d.parent_id,
      headId: d.head_id,
      headName: d.head_name,
      members: (byDept.get(d.id) ?? []).sort((a, b) =>
        a.isHead === b.isHead ? 0 : a.isHead ? -1 : 1,
      ),
    }));

    return { departments, unassigned };
  }

  /* ───────── Штатное расписание ───────── */

  async listStaffing(): Promise<StaffPosition[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<StaffRow[]>(
      `SELECT sp.id, sp.department_id, d.name AS department_name, sp.title,
              sp.planned_count, sp.notes,
              (SELECT COUNT(*) FROM users u
                 WHERE u.status = 'ACTIVE'
                   AND (sp.department_id IS NULL OR u.department_id = sp.department_id)
                   AND LOWER(COALESCE(u.position, '')) = LOWER(sp.title))::int AS filled
       FROM staff_positions sp
       LEFT JOIN departments d ON d.id = sp.department_id
       ORDER BY d.name NULLS FIRST, sp.title`,
    );
    return rows.map(mapStaff);
  }

  async getStaffing(id: string): Promise<StaffPosition> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<StaffRow[]>(
      `SELECT sp.id, sp.department_id, d.name AS department_name, sp.title,
              sp.planned_count, sp.notes,
              (SELECT COUNT(*) FROM users u
                 WHERE u.status = 'ACTIVE'
                   AND (sp.department_id IS NULL OR u.department_id = sp.department_id)
                   AND LOWER(COALESCE(u.position, '')) = LOWER(sp.title))::int AS filled
       FROM staff_positions sp
       LEFT JOIN departments d ON d.id = sp.department_id
       WHERE sp.id = $1::uuid`,
      id,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "POSITION_NOT_FOUND" });
    return mapStaff(r);
  }

  async createStaffing(dto: CreateStaffPositionDto): Promise<StaffPosition> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO staff_positions (department_id, title, planned_count, notes)
       VALUES ($1::uuid, $2, $3::int, $4) RETURNING id`,
      dto.departmentId ?? null,
      dto.title,
      dto.plannedCount ?? 1,
      dto.notes ?? null,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    return this.getStaffing(id);
  }

  async updateStaffing(id: string, dto: UpdateStaffPositionDto): Promise<StaffPosition> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `UPDATE staff_positions SET
         department_id = COALESCE($2::uuid, department_id),
         title = COALESCE($3, title),
         planned_count = COALESCE($4::int, planned_count),
         notes = COALESCE($5, notes),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      dto.departmentId ?? null,
      dto.title ?? null,
      dto.plannedCount ?? null,
      dto.notes ?? null,
    );
    if (affected === 0) throw new NotFoundException({ code: "POSITION_NOT_FOUND" });
    return this.getStaffing(id);
  }

  async removeStaffing(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `DELETE FROM staff_positions WHERE id = $1::uuid`,
      id,
    );
    if (affected === 0) throw new NotFoundException({ code: "POSITION_NOT_FOUND" });
  }
}
