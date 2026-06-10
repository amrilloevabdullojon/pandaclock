import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateAnnouncementDto, UpdateAnnouncementDto } from "./dto/announcement.dto.js";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorName: string | null;
  read: boolean;
  createdAt: Date;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  author_name: string | null;
  read: boolean;
  created_at: Date;
}

const SELECT = `
  a.id, a.title, a.body, a.pinned, a.created_at,
  CASE WHEN u.id IS NOT NULL THEN u.first_name || ' ' || u.last_name END AS author_name,
  EXISTS (SELECT 1 FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = $1::uuid) AS read
`;

function map(r: AnnouncementRow): Announcement {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: r.pinned,
    authorName: r.author_name,
    read: r.read,
    createdAt: r.created_at,
  };
}

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string): Promise<Announcement[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<AnnouncementRow[]>(
      `SELECT ${SELECT}
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.pinned DESC, a.created_at DESC
       LIMIT 200`,
      userId,
    );
    return rows.map(map);
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(*)::int AS c FROM announcements a
       WHERE NOT EXISTS (
         SELECT 1 FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = $1::uuid
       )`,
      userId,
    );
    return { count: rows[0]?.c ?? 0 };
  }

  async get(id: string, userId: string): Promise<Announcement> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<AnnouncementRow[]>(
      `SELECT ${SELECT}
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.id = $2::uuid`,
      userId,
      id,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "ANNOUNCEMENT_NOT_FOUND" });
    return map(r);
  }

  async create(dto: CreateAnnouncementDto, createdBy: string): Promise<Announcement> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO announcements (title, body, pinned, created_by)
       VALUES ($1, $2, $3::boolean, $4::uuid) RETURNING id`,
      dto.title,
      dto.body ?? "",
      dto.pinned ?? false,
      createdBy,
    );
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException({ code: "INSERT_FAILED" });

    const recipients = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM users WHERE status = 'ACTIVE' AND id <> $1::uuid`,
      createdBy,
    );
    const ids = recipients.map((u) => u.id);
    if (ids.length > 0) {
      void this.notifications
        .notify(ids, {
          type: "announcement",
          title: "Новое объявление",
          body: dto.title,
          link: "/dashboard/announcements",
        })
        .catch(() => undefined);
    }
    return this.get(id, createdBy);
  }

  async update(id: string, dto: UpdateAnnouncementDto, userId: string): Promise<Announcement> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `UPDATE announcements SET
         title = COALESCE($2, title),
         body = COALESCE($3, body),
         pinned = COALESCE($4::boolean, pinned),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      dto.title ?? null,
      dto.body ?? null,
      dto.pinned ?? null,
    );
    if (affected === 0) throw new NotFoundException({ code: "ANNOUNCEMENT_NOT_FOUND" });
    return this.get(id, userId);
  }

  async remove(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `DELETE FROM announcements WHERE id = $1::uuid`,
      id,
    );
    if (affected === 0) throw new NotFoundException({ code: "ANNOUNCEMENT_NOT_FOUND" });
  }

  async markRead(id: string, userId: string): Promise<{ ok: true }> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `INSERT INTO announcement_reads (announcement_id, user_id) VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (announcement_id, user_id) DO NOTHING`,
      id,
      userId,
    );
    return { ok: true };
  }
}
