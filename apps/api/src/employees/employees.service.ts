import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import type { EmployeesQueryDto } from "./dto/employees-query.dto.js";
import type { UpdateEmployeeDto } from "./dto/update-employee.dto.js";

export interface EmployeeListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  position: string | null;
  departmentId: string | null;
  departmentName: string | null;
  avatarUrl: string | null;
}

export interface EmployeeDetail extends EmployeeListItem {
  middleName: string | null;
  phone: string | null;
  managerId: string | null;
  hireDate: string | null;
  birthDate: string | null;
  citizenship: string | null;
  employmentType: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

interface RowList {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  position: string | null;
  department_id: string | null;
  department_name: string | null;
  avatar_url: string | null;
}

interface RowDetail extends RowList {
  middle_name: string | null;
  phone: string | null;
  manager_id: string | null;
  hire_date: Date | null;
  birth_date: Date | null;
  citizenship: string | null;
  employment_type: string | null;
  email_verified_at: Date | null;
  created_at: Date;
}

const LIST_FIELDS = `
  u.id, u.email, u.first_name, u.last_name, u.role, u.status,
  u.position, u.department_id, u.avatar_url,
  d.name AS department_name
`;

@Injectable()
export class EmployeesService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async list(query: EmployeesQueryDto): Promise<{
    items: EmployeeListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: unknown[] = [];
    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      filters.push(
        `(LOWER(u.email) LIKE $${String(params.length)}
          OR LOWER(u.first_name) LIKE $${String(params.length)}
          OR LOWER(u.last_name) LIKE $${String(params.length)})`,
      );
    }
    if (query.departmentId) {
      params.push(query.departmentId);
      filters.push(`u.department_id = $${String(params.length)}`);
    }
    if (query.status) {
      params.push(query.status);
      filters.push(`u.status = $${String(params.length)}`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Sort whitelist — никаких пользовательских строк в ORDER BY, чтобы не
    // открыть SQL-инъекцию (даже из DTO @IsIn — двойная защита).
    const SORT_MAP: Record<string, string> = {
      name: "u.last_name, u.first_name",
      role: "u.role",
      status: "u.status",
      department: "d.name NULLS LAST, u.last_name",
      hireDate: "u.hire_date NULLS LAST",
    };
    const sortColumn = SORT_MAP[query.sortBy ?? "name"] ?? SORT_MAP.name;
    const sortDirection = query.sortDir === "desc" ? "DESC" : "ASC";

    const client = await this.tenantDb.getClient();

    const rows = await client.$queryRawUnsafe<RowList[]>(
      `SELECT ${LIST_FIELDS}
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       ${where}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT ${String(pageSize)} OFFSET ${String(offset)}`,
      ...params,
    );

    const totalRows = await client.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM users u ${where}`,
      ...params,
    );
    const total = Number(totalRows[0]?.count ?? 0);

    return {
      items: rows.map(toListItem),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<EmployeeDetail> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RowDetail[]>(
      `SELECT ${LIST_FIELDS},
              u.middle_name, u.phone, u.manager_id,
              u.hire_date, u.birth_date, u.citizenship, u.employment_type,
              u.email_verified_at, u.created_at
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1::uuid LIMIT 1`,
      id,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "EMPLOYEE_NOT_FOUND" });
    return toDetail(row);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeDetail> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    const push = (col: string, value: unknown) => {
      params.push(value);
      sets.push(`${col} = $${String(params.length)}`);
    };

    if (dto.firstName !== undefined) push("first_name", dto.firstName);
    if (dto.lastName !== undefined) push("last_name", dto.lastName);
    if (dto.middleName !== undefined) push("middle_name", dto.middleName);
    if (dto.phone !== undefined) push("phone", dto.phone);
    if (dto.avatarUrl !== undefined) push("avatar_url", dto.avatarUrl);
    if (dto.position !== undefined) push("position", dto.position);
    if (dto.departmentId !== undefined) push("department_id", dto.departmentId);
    if (dto.managerId !== undefined) push("manager_id", dto.managerId);
    if (dto.role !== undefined) push("role", dto.role);
    if (dto.hireDate !== undefined) push("hire_date", dto.hireDate);
    if (dto.birthDate !== undefined) push("birth_date", dto.birthDate);
    if (dto.citizenship !== undefined) push("citizenship", dto.citizenship);
    if (dto.employmentType !== undefined) push("employment_type", dto.employmentType);

    if (sets.length === 0) {
      return this.getById(id);
    }

    const client = await this.tenantDb.getClient();
    const result = await client.$executeRawUnsafe(
      `UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1::uuid`,
      ...params,
    );
    if (result === 0) throw new NotFoundException({ code: "EMPLOYEE_NOT_FOUND" });
    return this.getById(id);
  }

  async deactivate(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE users SET status = 'SUSPENDED', updated_at = NOW() WHERE id = $1::uuid`,
      id,
    );
  }

  /**
   * Массовая смена статуса. Защищает от изменения OWNER-аккаунтов
   * — их перевести в SUSPENDED/TERMINATED через bulk нельзя.
   */
  async bulkSetStatus(
    ids: string[],
    status: "ACTIVE" | "SUSPENDED" | "TERMINATED",
  ): Promise<{ updated: number }> {
    if (ids.length === 0) return { updated: 0 };
    const client = await this.tenantDb.getClient();
    interface CountRow {
      count: bigint;
    }
    const rows = await client.$queryRawUnsafe<CountRow[]>(
      `WITH upd AS (
         UPDATE users SET status = $2::varchar, updated_at = NOW()
         WHERE id = ANY($1::uuid[]) AND role != 'OWNER'
         RETURNING id
       )
       SELECT COUNT(*)::bigint AS count FROM upd`,
      ids,
      status,
    );
    return { updated: Number(rows[0]?.count ?? 0) };
  }
}

function toListItem(row: RowList): EmployeeListItem {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    status: row.status,
    position: row.position,
    departmentId: row.department_id,
    departmentName: row.department_name,
    avatarUrl: row.avatar_url,
  };
}

function toDetail(row: RowDetail): EmployeeDetail {
  return {
    ...toListItem(row),
    middleName: row.middle_name,
    phone: row.phone,
    managerId: row.manager_id,
    hireDate: row.hire_date ? row.hire_date.toISOString().slice(0, 10) : null,
    birthDate: row.birth_date ? row.birth_date.toISOString().slice(0, 10) : null,
    citizenship: row.citizenship,
    employmentType: row.employment_type,
    emailVerified: row.email_verified_at !== null,
    createdAt: row.created_at,
  };
}
