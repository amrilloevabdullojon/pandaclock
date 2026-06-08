import { Injectable, Scope, Inject } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import type { Request } from "express";
import { PrismaClient } from "@pandaclock/db";

/**
 * Per-request Prisma client с динамическим выбором tenant schema.
 *
 * ⚠️ ПРОБЛЕМА с SET search_path:
 *
 * 1. Prisma внутри держит свой connection pool
 * 2. Neon стоит за PgBouncer
 * 3. `SET search_path` (без LOCAL) живёт только в рамках одного connection
 * 4. Даже `$transaction(callback)` с pgbouncer transaction-mode не
 *    гарантирует что обе команды попадут на тот же connection
 *
 * ⚙️ РЕШЕНИЕ:
 *
 * Вместо SET — **schema-qualify** имена tenant-таблиц прямо в SQL.
 * Перехватываем $queryRawUnsafe / $executeRawUnsafe в Proxy и
 * подставляем `"tenant_xxx".` перед каждым известным tenant-table.
 *
 * Это:
 * - не зависит от pooling / pgbouncer / transactions
 * - не требует переписывать 87 callsites в сервисах
 * - safe против SQL injection — schemaName валидируется regex'ом
 */

/**
 * Известные tenant-таблицы. Если добавляется новая — нужно прописать здесь.
 * Источник истины — packages/db/src/tenant-template.ts.
 */
const TENANT_TABLES = [
  "users",
  "departments",
  "user_documents",
  "time_entries",
  "breaks",
  "tasks",
  "task_comments",
  "task_attachments",
  "subtasks",
  "leave_requests",
  "leave_attachments",
  "audit_log",
  "refresh_tokens",
  "chat_channels",
  "chat_members",
  "chat_messages",
  "push_tokens",
  "verification_tokens",
  "notifications",
  "shifts",
  "goals",
  "reviews",
  "onboarding_items",
  "hr_documents",
  "hr_document_acks",
  "vacancies",
  "candidates",
] as const;

/**
 * Переписывает SQL, добавляя schema-prefix перед каждым tenant-table.
 *
 * Покрывает все формы: FROM/JOIN/INTO/UPDATE/DELETE FROM/REFERENCES/TABLE.
 * Не трогает таблицы, у которых уже есть schema-префикс (через look-behind).
 *
 * Пример: `SELECT * FROM users WHERE id = $1` →
 *         `SELECT * FROM "tenant_cloudit".users WHERE id = $1`
 */
function qualifyTables(sql: string, schemaName: string): string {
  let result = sql;
  // Word boundary до и после имени таблицы.
  // Перед — должно быть FROM/JOIN/INTO/UPDATE/DELETE FROM/REFERENCES/TABLE + whitespace.
  // После — word boundary (для конца имени) — не точка (значит схема уже есть).
  for (const table of TENANT_TABLES) {
    const re = new RegExp(
      `(\\b(?:FROM|JOIN|INTO|UPDATE|REFERENCES|TABLE)\\s+)(${table})(\\b(?!\\.))`,
      "gi",
    );
    result = result.replace(re, `$1"${schemaName}".$2$3`);
  }
  return result;
}

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
    // Валидируем schemaName regex'ом (защита от SQL injection в qualifyTables).
    if (!/^tenant_[a-z][a-z0-9_-]*$/.test(tenant.schemaName)) {
      throw new Error(`Invalid tenant schemaName: ${tenant.schemaName}`);
    }
    const schema = tenant.schemaName;
    const client = this.prismaClient;

    this.wrappedClient = new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === "$queryRawUnsafe") {
          return (sql: string, ...params: unknown[]) => {
            return target.$queryRawUnsafe(qualifyTables(sql, schema), ...params);
          };
        }
        if (prop === "$executeRawUnsafe") {
          return (sql: string, ...params: unknown[]) => {
            return target.$executeRawUnsafe(qualifyTables(sql, schema), ...params);
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
