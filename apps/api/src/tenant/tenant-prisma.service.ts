import { Injectable, Scope, Inject } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import type { Request } from "express";
import { PrismaClient } from "@prisma/client";

/**
 * Per-request Prisma client с динамическим search_path для tenant schema.
 *
 * Использование:
 *   constructor(private readonly tenantDb: TenantPrismaService) {}
 *   const users = await this.tenantDb.client.$queryRaw`SELECT * FROM users`;
 *
 * ⚠️ ВАЖНО: Prisma не имеет нативной поддержки динамического search_path,
 * поэтому для CRUD по tenant-таблицам используем $queryRaw / $executeRaw.
 * Альтернатива (для будущего) — переключаться через PgBouncer prepared transactions
 * или генерировать Prisma client на лету.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private readonly prismaClient: PrismaClient;
  private isSchemaSet = false;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this.prismaClient = new PrismaClient();
  }

  async getClient(): Promise<PrismaClient> {
    if (!this.isSchemaSet) {
      const tenant = this.request.tenant;
      if (!tenant) {
        throw new Error("Tenant is not resolved in request — TenantMiddleware missing?");
      }
      await this.prismaClient.$executeRawUnsafe(
        `SET search_path TO "${tenant.schemaName}", public`,
      );
      this.isSchemaSet = true;
    }
    return this.prismaClient;
  }

  async onModuleDestroy(): Promise<void> {
    await this.prismaClient.$disconnect();
  }
}
