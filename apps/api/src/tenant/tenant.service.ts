import { Injectable, ConflictException, BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import { prisma, PrismaClient, TENANT_TEMPLATE_SQL } from "@pandaclock/db";
import type { Tenant } from "@pandaclock/db";

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
