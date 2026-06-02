import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import { prisma, PrismaClient, TENANT_TEMPLATE_SQL } from "@pandaclock/db";
import type { Tenant } from "@pandaclock/db";
import { parseTimePolicy, type TimePolicy } from "../time/time-policy.js";

export interface UpdatePolicyInput {
  workStart?: string;
  workEnd?: string;
  lateThresholdMinutes?: number;
  workdays?: number[];
  /** undefined → не трогать; null → удалить; объект → установить */
  geofence?: TimePolicy["geofence"] | null;
  leave?: TimePolicy["leave"];
}

export interface CreateTenantParams {
  slug: string;
  name: string;
  industry?: string | null;
  timezone?: string;
  admin: {
    email: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    password: string;
  };
}

const VERIFICATION_TTL_HOURS = 24;

@Injectable()
export class TenantService {
  async createTenant(params: CreateTenantParams): Promise<Tenant> {
    this.assertValidSlug(params.slug);

    const existing = await prisma.tenant.findUnique({ where: { slug: params.slug } });
    if (existing) {
      throw new ConflictException({ code: "TENANT_SLUG_TAKEN" });
    }

    const schemaName = `tenant_${params.slug}`;
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const passwordHash = await bcrypt.hash(
      params.admin.password,
      Number(process.env.BCRYPT_ROUNDS ?? 10),
    );

    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: params.slug,
          name: params.name,
          industry: params.industry ?? null,
          timezone: params.timezone ?? "Asia/Tashkent",
          schemaName,
          status: "TRIAL",
          trialEndsAt,
          subscription: {
            create: {
              plan: "STARTER",
              employeesLimit: 10,
              modules: {},
              priceAmount: 0,
              priceCurrency: "UZS",
              billingPeriod: "MONTHLY",
              startedAt: new Date(),
              expiresAt: trialEndsAt,
            },
          },
        },
      });

      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
      await tx.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);
      // Prisma $executeRawUnsafe не умеет multi-statement в одном prepared statement,
      // поэтому разбиваем template SQL на отдельные команды по `;` (комментарии и пустые
      // строки отбрасываем).
      for (const stmt of splitSql(TENANT_TEMPLATE_SQL)) {
        await tx.$executeRawUnsafe(stmt);
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO users (
           email, password_hash, first_name, last_name, middle_name, phone,
           role, status, pd_consent_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'OWNER', 'ACTIVE', NOW())`,
        params.admin.email.toLowerCase(),
        passwordHash,
        params.admin.firstName,
        params.admin.lastName,
        params.admin.middleName ?? null,
        params.admin.phone ?? null,
      );

      return tenant;
    });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({ where: { slug } });
  }

  async getProfile(slug: string): Promise<{
    name: string;
    industry: string | null;
    timezone: string;
    logoUrl: string | null;
  }> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { name: true, industry: true, timezone: true, metadata: true },
    });
    if (!tenant) throw new NotFoundException({ code: "TENANT_NOT_FOUND" });
    const metadata = (tenant.metadata as Record<string, unknown> | null) ?? {};
    return {
      name: tenant.name,
      industry: tenant.industry ?? null,
      timezone: tenant.timezone,
      logoUrl: typeof metadata.logoUrl === "string" ? metadata.logoUrl : null,
    };
  }

  async updateProfile(
    slug: string,
    input: { name?: string; industry?: string | null; timezone?: string },
  ): Promise<void> {
    if (input.name !== undefined && input.name.trim().length < 2) {
      throw new BadRequestException({ code: "INVALID_NAME" });
    }
    // Sanity-check timezone — должен быть валидный IANA ID.
    if (input.timezone !== undefined) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: input.timezone });
      } catch {
        throw new BadRequestException({ code: "INVALID_TIMEZONE" });
      }
    }
    await prisma.tenant.update({
      where: { slug },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.industry !== undefined ? { industry: input.industry } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      },
    });
  }

  async getPolicy(slug: string): Promise<TimePolicy> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { timePolicy: true },
    });
    if (!tenant) throw new NotFoundException({ code: "TENANT_NOT_FOUND" });
    return parseTimePolicy(tenant.timePolicy);
  }

  /**
   * Частичное обновление tenant.time_policy. Поле geofence имеет 3 значения:
   *  - undefined → не трогать
   *  - null      → удалить
   *  - объект    → заменить
   */
  async updatePolicy(slug: string, input: UpdatePolicyInput): Promise<TimePolicy> {
    const current = await this.getPolicy(slug);
    // Дополнительная санити-проверка диапазона work-window.
    const next: TimePolicy = {
      workStart: input.workStart ?? current.workStart,
      workEnd: input.workEnd ?? current.workEnd,
      lateThresholdMinutes: input.lateThresholdMinutes ?? current.lateThresholdMinutes,
      workdays: input.workdays ?? current.workdays,
      geofence:
        input.geofence === null
          ? undefined
          : input.geofence !== undefined
            ? input.geofence
            : current.geofence,
      leave: input.leave ?? current.leave,
    };
    if (toMinutes(next.workStart) >= toMinutes(next.workEnd)) {
      throw new BadRequestException({
        code: "INVALID_WORK_WINDOW",
        message: "workEnd должен быть позже workStart",
      });
    }
    await prisma.tenant.update({
      where: { slug },
      data: {
        timePolicy: next as unknown as Parameters<
          typeof prisma.tenant.update
        >[0]["data"]["timePolicy"],
      },
    });
    return next;
  }

  async updateMetadata(slug: string, metadata: Record<string, unknown>): Promise<void> {
    // Prisma.Json типизирован узко (readonly array | object), кастуем чтобы
    // не тащить Prisma-namespace в публичный API метода.
    await prisma.tenant.update({
      where: { slug },
      data: {
        metadata: metadata as unknown as Parameters<
          typeof prisma.tenant.update
        >[0]["data"]["metadata"],
      },
    });
  }

  /**
   * Выполняет callback с активным search_path на указанной tenant-схеме.
   * Используется в эндпоинтах, где TenantMiddleware не сработал (например, в register-company).
   */
  async runInTenantSchema<T>(
    schemaName: string,
    callback: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    this.assertValidSchemaName(schemaName);
    const client = new PrismaClient();
    try {
      await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);
      return await callback(client);
    } finally {
      await client.$disconnect();
    }
  }

  async createVerificationToken(
    client: PrismaClient,
    userId: string,
    purpose: "EMAIL" | "PASSWORD_RESET",
  ): Promise<string> {
    const raw = crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
    await client.$executeRawUnsafe(
      `INSERT INTO verification_tokens (user_id, token_hash, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      userId,
      hash,
      purpose,
      expiresAt,
    );
    return raw;
  }

  private assertValidSlug(slug: string): void {
    if (!/^[a-z][a-z0-9-]{2,30}$/.test(slug)) {
      throw new BadRequestException({
        code: "INVALID_SLUG",
        message: "Slug must be 3-31 lowercase letters/digits/dashes and start with a letter",
      });
    }
    const reserved = new Set(["api", "www", "admin", "app", "mail", "support", "billing"]);
    if (reserved.has(slug)) {
      throw new ConflictException({ code: "SLUG_RESERVED" });
    }
  }

  private assertValidSchemaName(name: string): void {
    if (!/^tenant_[a-z][a-z0-9_]*$/.test(name)) {
      throw new BadRequestException({ code: "INVALID_SCHEMA_NAME" });
    }
  }
}

/**
 * Разбивает SQL-блок на отдельные команды по `;`.
 * Игнорирует строки-комментарии (--) и пустые строки. Все наши команды
 * в tenant-template без литералов с `;`, иначе пришлось бы парсить нормально.
 */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

function splitSql(sql: string): string[] {
  const noComments = sql
    .split("\n")
    .map((line) => (line.trim().startsWith("--") ? "" : line))
    .join("\n");
  return noComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
