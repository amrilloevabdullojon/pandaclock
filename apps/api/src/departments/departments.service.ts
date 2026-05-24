import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

export interface DepartmentRow {
  id: string;
  name: string;
  parent_id: string | null;
  head_id: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  description: string | null;
  children: DepartmentNode[];
}

@Injectable()
export class DepartmentsService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async list(): Promise<DepartmentRow[]> {
    const client = await this.tenantDb.getClient();
    return client.$queryRawUnsafe<DepartmentRow[]>(
      `SELECT id, name, parent_id, head_id, description, created_at, updated_at
       FROM departments ORDER BY name`,
    );
  }

  async tree(): Promise<DepartmentNode[]> {
    const rows = await this.list();
    return buildTree(rows);
  }

  async create(input: {
    name: string;
    parentId?: string;
    headId?: string;
    description?: string;
  }): Promise<DepartmentRow> {
    if (input.parentId) {
      await this.assertExists(input.parentId);
    }
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<DepartmentRow[]>(
      `INSERT INTO departments (name, parent_id, head_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, parent_id, head_id, description, created_at, updated_at`,
      input.name,
      input.parentId ?? null,
      input.headId ?? null,
      input.description ?? null,
    );
    const row = rows[0];
    if (!row) throw new BadRequestException({ code: "INSERT_FAILED" });
    return row;
  }

  async update(
    id: string,
    input: { name?: string; parentId?: string; headId?: string; description?: string },
  ): Promise<DepartmentRow> {
    if (input.parentId === id) {
      throw new BadRequestException({ code: "CANNOT_PARENT_SELF" });
    }
    await this.assertExists(id);
    if (input.parentId) {
      await this.assertExists(input.parentId);
    }
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<DepartmentRow[]>(
      `UPDATE departments SET
         name = COALESCE($2, name),
         parent_id = COALESCE($3, parent_id),
         head_id = COALESCE($4, head_id),
         description = COALESCE($5, description),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, parent_id, head_id, description, created_at, updated_at`,
      id,
      input.name ?? null,
      input.parentId ?? null,
      input.headId ?? null,
      input.description ?? null,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException({ code: "DEPARTMENT_NOT_FOUND" });
    return row;
  }

  async remove(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const result = await client.$executeRawUnsafe(`DELETE FROM departments WHERE id = $1`, id);
    if (result === 0) {
      throw new NotFoundException({ code: "DEPARTMENT_NOT_FOUND" });
    }
  }

  private async assertExists(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM departments WHERE id = $1 LIMIT 1`,
      id,
    );
    if (rows.length === 0) {
      throw new NotFoundException({ code: "DEPARTMENT_NOT_FOUND", id });
    }
  }
}

export function buildTree(rows: DepartmentRow[]): DepartmentNode[] {
  const map = new Map<string, DepartmentNode>();
  rows.forEach((row) => {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      headId: row.head_id,
      description: row.description,
      children: [],
    });
  });

  const roots: DepartmentNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}
