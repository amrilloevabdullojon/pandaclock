import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";

export interface OnboardingItem {
  id: string;
  userId: string;
  kind: string;
  title: string;
  done: boolean;
  doneAt: Date | null;
}

export interface HrDocumentRow {
  id: string;
  title: string;
  body: string | null;
  fileUrl: string | null;
  createdAt: Date;
  totalRecipients: number;
  acknowledged: number;
}

export interface MyHrDocument {
  id: string;
  title: string;
  body: string | null;
  fileUrl: string | null;
  createdAt: Date;
  acknowledgedAt: Date | null;
}

const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  ONBOARDING: [
    "Подписать трудовой договор",
    "Выдать доступы (почта, аккаунты)",
    "Выдать оборудование",
    "Знакомство с командой",
    "Инструктаж по технике безопасности",
    "Настроить рабочее место",
  ],
  OFFBOARDING: [
    "Вернуть оборудование",
    "Отозвать доступы",
    "Передать дела",
    "Финальное интервью",
    "Расчёт и закрытие документов",
  ],
};

@Injectable()
export class HrService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ───────── Онбординг/офбординг ───────── */

  async listItems(userId: string, kind?: string): Promise<OnboardingItem[]> {
    const client = await this.tenantDb.getClient();
    const where = kind ? `WHERE user_id = $1::uuid AND kind = $2` : `WHERE user_id = $1::uuid`;
    const params = kind ? [userId, kind] : [userId];
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        user_id: string;
        kind: string;
        title: string;
        done: boolean;
        done_at: Date | null;
      }[]
    >(
      `SELECT id, user_id, kind, title, done, done_at FROM onboarding_items
       ${where} ORDER BY sort_order, created_at`,
      ...params,
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      kind: r.kind,
      title: r.title,
      done: r.done,
      doneAt: r.done_at,
    }));
  }

  async createItem(
    input: { userId: string; kind: string; title: string },
    createdBy: string,
  ): Promise<OnboardingItem> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        user_id: string;
        kind: string;
        title: string;
        done: boolean;
        done_at: Date | null;
      }[]
    >(
      `INSERT INTO onboarding_items (user_id, kind, title, sort_order, created_by)
       VALUES ($1::uuid, $2, $3,
         COALESCE((SELECT MAX(sort_order) + 1 FROM onboarding_items WHERE user_id = $1::uuid AND kind = $2), 0),
         $4::uuid)
       RETURNING id, user_id, kind, title, done, done_at`,
      input.userId,
      input.kind,
      input.title,
      createdBy,
    );
    const r = rows[0];
    if (!r) throw new BadRequestException({ code: "INSERT_FAILED" });
    return {
      id: r.id,
      userId: r.user_id,
      kind: r.kind,
      title: r.title,
      done: r.done,
      doneAt: r.done_at,
    };
  }

  /** Создаёт стандартный набор пунктов чек-листа (если их ещё нет). */
  async seedChecklist(userId: string, kind: string, createdBy: string): Promise<OnboardingItem[]> {
    const titles = DEFAULT_CHECKLISTS[kind];
    if (!titles) throw new BadRequestException({ code: "UNKNOWN_KIND" });
    const client = await this.tenantDb.getClient();
    for (let i = 0; i < titles.length; i++) {
      await client.$executeRawUnsafe(
        `INSERT INTO onboarding_items (user_id, kind, title, sort_order, created_by)
         VALUES ($1::uuid, $2, $3, $4::int, $5::uuid)`,
        userId,
        kind,
        titles[i],
        i,
        createdBy,
      );
    }
    return this.listItems(userId, kind);
  }

  /** Отметка пункта. Доступно владельцу чек-листа или менеджеру. */
  async updateItem(
    id: string,
    input: { done?: boolean; title?: string },
    actorId: string,
    actorIsManager: boolean,
  ): Promise<OnboardingItem> {
    const client = await this.tenantDb.getClient();
    const owner = await client.$queryRawUnsafe<{ user_id: string }[]>(
      `SELECT user_id FROM onboarding_items WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    if (owner.length === 0) throw new NotFoundException({ code: "ITEM_NOT_FOUND" });
    if (!actorIsManager && owner[0]!.user_id !== actorId) {
      throw new ForbiddenException({ code: "FORBIDDEN" });
    }
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        user_id: string;
        kind: string;
        title: string;
        done: boolean;
        done_at: Date | null;
      }[]
    >(
      `UPDATE onboarding_items SET
         done = COALESCE($2::boolean, done),
         done_at = CASE WHEN $2::boolean IS TRUE THEN NOW()
                        WHEN $2::boolean IS FALSE THEN NULL ELSE done_at END,
         title = COALESCE($3, title),
         updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id, user_id, kind, title, done, done_at`,
      id,
      input.done ?? null,
      input.title ?? null,
    );
    const r = rows[0]!;
    return {
      id: r.id,
      userId: r.user_id,
      kind: r.kind,
      title: r.title,
      done: r.done,
      doneAt: r.done_at,
    };
  }

  async removeItem(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `DELETE FROM onboarding_items WHERE id = $1::uuid`,
      id,
    );
    if (affected === 0) throw new NotFoundException({ code: "ITEM_NOT_FOUND" });
  }

  /* ───────── Кадровый ЭДО ───────── */

  async listDocuments(): Promise<HrDocumentRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        title: string;
        body: string | null;
        file_url: string | null;
        created_at: Date;
        total: bigint;
        acked: bigint;
      }[]
    >(
      `SELECT d.id, d.title, d.body, d.file_url, d.created_at,
              COUNT(a.id)::bigint AS total,
              COUNT(a.acknowledged_at)::bigint AS acked
       FROM hr_documents d
       LEFT JOIN hr_document_acks a ON a.document_id = d.id
       GROUP BY d.id ORDER BY d.created_at DESC`,
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      fileUrl: r.file_url,
      createdAt: r.created_at,
      totalRecipients: Number(r.total),
      acknowledged: Number(r.acked),
    }));
  }

  async listMyDocuments(userId: string): Promise<MyHrDocument[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        title: string;
        body: string | null;
        file_url: string | null;
        created_at: Date;
        acknowledged_at: Date | null;
      }[]
    >(
      `SELECT d.id, d.title, d.body, d.file_url, d.created_at, a.acknowledged_at
       FROM hr_document_acks a JOIN hr_documents d ON d.id = a.document_id
       WHERE a.user_id = $1::uuid
       ORDER BY a.acknowledged_at IS NOT NULL, d.created_at DESC`,
      userId,
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      fileUrl: r.file_url,
      createdAt: r.created_at,
      acknowledgedAt: r.acknowledged_at,
    }));
  }

  async createDocument(
    input: { title: string; body?: string; fileUrl?: string; recipientIds?: string[] },
    createdBy: string,
  ): Promise<HrDocumentRow> {
    const client = await this.tenantDb.getClient();
    const docRows = await client.$queryRawUnsafe<{ id: string; created_at: Date }[]>(
      `INSERT INTO hr_documents (title, body, file_url, created_by)
       VALUES ($1, $2, $3, $4::uuid) RETURNING id, created_at`,
      input.title,
      input.body ?? null,
      input.fileUrl ?? null,
      createdBy,
    );
    const doc = docRows[0];
    if (!doc) throw new BadRequestException({ code: "INSERT_FAILED" });

    // Список получателей: переданные или все активные.
    let recipientIds = input.recipientIds ?? [];
    if (recipientIds.length === 0) {
      const all = await client.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM users WHERE status = 'ACTIVE'`,
      );
      recipientIds = all.map((u) => u.id);
    }
    for (const uid of recipientIds) {
      await client.$executeRawUnsafe(
        `INSERT INTO hr_document_acks (document_id, user_id) VALUES ($1::uuid, $2::uuid)
         ON CONFLICT (document_id, user_id) DO NOTHING`,
        doc.id,
        uid,
      );
    }

    if (recipientIds.length > 0) {
      void this.notifications.notify(recipientIds, {
        type: "hr_document",
        title: "Новый кадровый документ",
        body: input.title,
        link: "/dashboard/hr",
      });
    }

    return {
      id: doc.id,
      title: input.title,
      body: input.body ?? null,
      fileUrl: input.fileUrl ?? null,
      createdAt: doc.created_at,
      totalRecipients: recipientIds.length,
      acknowledged: 0,
    };
  }

  /** Подтверждение (электронная подпись) документа сотрудником. */
  async acknowledge(documentId: string, userId: string): Promise<{ acknowledgedAt: Date }> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ acknowledged_at: Date }[]>(
      `UPDATE hr_document_acks SET acknowledged_at = COALESCE(acknowledged_at, NOW())
       WHERE document_id = $1::uuid AND user_id = $2::uuid
       RETURNING acknowledged_at`,
      documentId,
      userId,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException({ code: "DOC_NOT_ASSIGNED" });
    return { acknowledgedAt: r.acknowledged_at };
  }

  async removeDocument(id: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const affected = await client.$executeRawUnsafe(
      `DELETE FROM hr_documents WHERE id = $1::uuid`,
      id,
    );
    if (affected === 0) throw new NotFoundException({ code: "DOC_NOT_FOUND" });
  }
}
