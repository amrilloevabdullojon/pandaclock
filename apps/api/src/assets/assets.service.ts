import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateAssetDto, UpdateAssetDto } from "./dto/asset.dto.js";

export interface Asset {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  status: string;
  assignedTo: string | null;
  assignedToName: string | null;
  purchaseDate: string | null;
  cost: number | null;
  currency: string;
  notes: string | null;
  createdAt: Date;
}

export interface AssignmentRecord {
  id: string;
  userId: string;
  userName: string;
  assignedByName: string | null;
  assignedAt: Date;
  returnedAt: Date | null;
  note: string | null;
}

export interface AssetDetail extends Asset {
  history: AssignmentRecord[];
}

interface AssetRow {
  id: string;
  name: string;
  category: string;
  serial_number: string | null;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  purchase_date: Date | null;
  cost: number | null;
  currency: string;
  notes: string | null;
  created_at: Date;
}

const ASSET_SELECT = `
  a.id, a.name, a.category, a.serial_number, a.status, a.assigned_to,
  CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name END AS assigned_to_name,
  a.purchase_date, a.cost::float8 AS cost, a.currency, a.notes, a.created_at
`;

function mapAsset(r: AssetRow): Asset {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    serialNumber: r.serial_number,
    status: r.status,
    assignedTo: r.assigned_to,
    assignedToName: r.assigned_to_name,
    purchaseDate: r.purchase_date ? r.purchase_date.toISOString().slice(0, 10) : null,
    cost: r.cost,
    currency: r.currency,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(filters: {
    status?: string;
    category?: string;
    assignedTo?: string;
    q?: string;
  }): Promise<Asset[]> {
    const client = await this.tenantDb.getClient();
    const conds: string[] = [];
    const params: unknown[] = [];
    if (filters.status) {
      params.push(filters.status);
      conds.push(`a.status = $${String(params.length)}`);
    }
    if (filters.category) {
      params.push(filters.category);
      conds.push(`a.category = $${String(params.length)}`);
    }
    if (filters.assignedTo) {
      params.push(filters.assignedTo);
      conds.push(`a.assigned_to = $${String(params.length)}::uuid`);
    }
    if (filters.q) {
      params.push(`%${filters.q}%`);
      conds.push(
        `(a.name ILIKE $${String(params.length)} OR a.serial_number ILIKE $${String(params.length)})`,
      );
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = await client.$queryRawUnsafe<AssetRow[]>(
      `SELECT ${ASSET_SELECT}
       FROM assets a
       LEFT JOIN users u ON u.id = a.assigned_to
       ${where}
       ORDER BY a.status = 'RETIRED', a.created_at DESC
       LIMIT 500`,
      ...params,
    );
    return rows.map(mapAsset);
  }

  async listMy(userId: string): Promise<Asset[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<AssetRow[]>(
      `SELECT ${ASSET_SELECT}
       FROM assets a
       LEFT JOIN users u ON u.id = a.assigned_to
       WHERE a.assigned_to = $1::uuid
       ORDER BY a.created_at DESC`,
      userId,
    );
    return rows.map(mapAsset);
  }

  async getById(id: string): Promise<AssetDetail> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<AssetRow[]>(
      `SELECT ${ASSET_SELECT}
       FROM assets a
       LEFT JOIN users u ON u.id = a.assigned_to
       WHERE a.id = $1::uuid`,
      id,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "ASSET_NOT_FOUND" });
    const hist = await client.$queryRawUnsafe<
      {
        id: string;
        user_id: string;
        user_name: string;
        assigned_by_name: string | null;
        assigned_at: Date;
        returned_at: Date | null;
        note: string | null;
      }[]
    >(
      `SELECT h.id, h.user_id,
              u.first_name || ' ' || u.last_name AS user_name,
              CASE WHEN b.id IS NOT NULL THEN b.first_name || ' ' || b.last_name END AS assigned_by_name,
              h.assigned_at, h.returned_at, h.note
       FROM asset_assignments h
       JOIN users u ON u.id = h.user_id
       LEFT JOIN users b ON b.id = h.assigned_by
       WHERE h.asset_id = $1::uuid
       ORDER BY h.assigned_at DESC`,
      id,
    );
    return {
      ...mapAsset(r),
      history: hist.map((h) => ({
        id: h.id,
        userId: h.user_id,
        userName: h.user_name,
        assignedByName: h.assigned_by_name,
        assignedAt: h.assigned_at,
        returnedAt: h.returned_at,
        note: h.note,
      })),
    };
  }

  async create(dto: CreateAssetDto): Promise<AssetDetail> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO assets (name, category, serial_number, purchase_date, cost, currency, notes, status)
       VALUES ($1, $2, $3, $4::date, $5::numeric, $6, $7, 'AVAILABLE')
       RETURNING id`,
      dto.name,
      dto.category,
      dto.serialNumber ?? null,
      dto.purchaseDate ?? null,
      dto.cost ?? null,
      (dto.currency ?? "UZS").toUpperCase(),
      dto.notes ?? null,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });
    return this.getById(id);
  }

  async update(id: string, dto: UpdateAssetDto): Promise<AssetDetail> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `UPDATE assets SET
         name = COALESCE($2, name),
         category = COALESCE($3, category),
         serial_number = COALESCE($4, serial_number),
         status = COALESCE($5, status),
         purchase_date = COALESCE($6::date, purchase_date),
         cost = COALESCE($7::numeric, cost),
         currency = COALESCE($8, currency),
         notes = COALESCE($9, notes),
         updated_at = NOW()
       WHERE id = $1::uuid AND status <> 'ASSIGNED'`,
      id,
      dto.name ?? null,
      dto.category ?? null,
      dto.serialNumber ?? null,
      dto.status ?? null,
      dto.purchaseDate ?? null,
      dto.cost ?? null,
      dto.currency ? dto.currency.toUpperCase() : null,
      dto.notes ?? null,
    );
    if (affected === 0) {
      // Либо нет такого, либо актив выдан и менять статус нельзя.
      const exists = await client.$queryRawUnsafe<{ status: string }[]>(
        `SELECT status FROM assets WHERE id = $1::uuid`,
        id,
      );
      if (exists.length === 0) throw new NotFoundException({ code: "ASSET_NOT_FOUND" });
      throw new ConflictException({ code: "ASSET_ASSIGNED", hint: "Сначала верните актив" });
    }
    return this.getById(id);
  }

  async remove(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(`DELETE FROM assets WHERE id = $1::uuid`, id);
    if (affected === 0) throw new NotFoundException({ code: "ASSET_NOT_FOUND" });
  }

  async assign(
    id: string,
    userId: string,
    assignedBy: string,
    note?: string,
  ): Promise<AssetDetail> {
    const asset = await this.getById(id);
    if (asset.status === "RETIRED") {
      throw new ConflictException({ code: "ASSET_RETIRED" });
    }
    const client = await this.tenantDb.getClient();
    // Закрыть прежнюю открытую выдачу, если актив уже у кого-то.
    await client.$executeRawUnsafe(
      `UPDATE asset_assignments SET returned_at = NOW()
       WHERE asset_id = $1::uuid AND returned_at IS NULL`,
      id,
    );
    await client.$executeRawUnsafe(
      `UPDATE assets SET assigned_to = $2::uuid, status = 'ASSIGNED', updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      userId,
    );
    await client.$executeRawUnsafe(
      `INSERT INTO asset_assignments (asset_id, user_id, assigned_by, note)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4)`,
      id,
      userId,
      assignedBy,
      note ?? null,
    );
    void this.notifications
      .notify([userId], {
        type: "asset_assigned",
        title: "Вам выдан актив",
        body: asset.name,
        link: "/dashboard/assets",
      })
      .catch(() => undefined);
    return this.getById(id);
  }

  async returnAsset(id: string, note?: string): Promise<AssetDetail> {
    const asset = await this.getById(id);
    if (asset.status !== "ASSIGNED") {
      throw new ConflictException({ code: "NOT_ASSIGNED", current: asset.status });
    }
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE asset_assignments SET returned_at = NOW(),
         note = COALESCE($2, note)
       WHERE asset_id = $1::uuid AND returned_at IS NULL`,
      id,
      note ?? null,
    );
    await client.$executeRawUnsafe(
      `UPDATE assets SET assigned_to = NULL, status = 'AVAILABLE', updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
    );
    return this.getById(id);
  }
}
