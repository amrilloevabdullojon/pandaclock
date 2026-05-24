import { Injectable, ConflictException, BadRequestException } from "@nestjs/common";
import { prisma, TENANT_TEMPLATE_SQL } from "@pandaclock/db";
import type { Tenant } from "@pandaclock/db";
import * as bcrypt from "bcrypt";

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
      // 1. Public schema запись о tenant + базовый Starter план
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

      // 2. Создать schema
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);

      // 3. Применить tenant template (все клиентские таблицы)
      await tx.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);
      await tx.$executeRawUnsafe(TENANT_TEMPLATE_SQL);

      // 4. Создать первого пользователя — администратора компании
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
}
