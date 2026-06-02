import { Injectable, Scope, Inject } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import type { Request } from "express";
import { PrismaClient } from "@pandaclock/db";

/**
 * Per-request Prisma client с динамическим search_path для tenant schema.
 *
 * ⚠️ ВАЖНО: Prisma внутри держит свой connection pool, плюс прод (Neon)
 * стоит за PgBouncer. Поэтому `SET search_path` на одной операции не
 * персистится в следующую — они могут попасть на разные соединения.
 *
 * Решение: каждый raw-запрос оборачивается в `$transaction([SET, query])`.
 * Транзакция гарантирует один и тот же connection для обеих команд.
 * Прозрачно для всех 87 callsites в сервисах — Proxy патчит только
 * `$queryRawUnsafe` и `$executeRawUnsafe` (единственные методы, которыми
 * мы реально пользуемся для tenant-таблиц).
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private readonly prismaClient: PrismaClient;
  private wrappedClient: PrismaClient | null = null;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this.prismaClient = new PrismaClient();
  }

  async getClient(): Promise<PrismaClient> {
    if (this.wrappedClient) return this.wrappedClient;
    const tenant = this.request.tenant;
    if (!tenant) {
      throw new Error("Tenant is not resolved in request — TenantMiddleware missing?");
    }
    // Валидируем schemaName (защита от SQL injection в SET search_path).
    if (!/^tenant_[a-z][a-z0-9_-]*$/.test(tenant.schemaName)) {
      throw new Error(`Invalid tenant schemaName: ${tenant.schemaName}`);
    }
    const setSearchPath = `SET search_path TO "${tenant.schemaName}", public`;
    const client = this.prismaClient;

    // Proxy перехватывает только $queryRawUnsafe и $executeRawUnsafe.
    // Все остальные методы (Prisma model accessors, $transaction, ...) идут как есть.
    this.wrappedClient = new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === "$queryRawUnsafe") {
          return (sql: string, ...params: unknown[]) => {
            return target
              .$transaction([
                target.$executeRawUnsafe(setSearchPath),
                target.$queryRawUnsafe(sql, ...params),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ] as any[])
              .then((results: unknown[]) => results[1]);
          };
        }
        if (prop === "$executeRawUnsafe") {
          return (sql: string, ...params: unknown[]) => {
            return target
              .$transaction([
                target.$executeRawUnsafe(setSearchPath),
                target.$executeRawUnsafe(sql, ...params),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ] as any[])
              .then((results: unknown[]) => results[1]);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as PrismaClient;

    return this.wrappedClient;
  }

  async onModuleDestroy(): Promise<void> {
    await this.prismaClient.$disconnect();
  }
}
