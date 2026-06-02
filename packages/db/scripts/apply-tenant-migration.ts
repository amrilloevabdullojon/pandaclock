/* eslint-disable no-console */
/**
 * Применяет SQL-миграцию ко ВСЕМ tenant-схемам в базе.
 *
 * Usage:
 *   pnpm --filter @pandaclock/db tsx scripts/apply-tenant-migration.ts \
 *     migrations-tenant/2026-06-02-subtasks.sql
 *
 * Что делает:
 *  1. SELECT slug, schemaName FROM tenants (из public.tenants)
 *  2. Для каждой схемы: SET search_path → выполнить SQL → revert
 *  3. Идемпотентно: SQL должен использовать IF NOT EXISTS / IF EXISTS
 *
 * Безопасность:
 *  - НЕ запускать на проде без бэкапа (Neon делает point-in-time)
 *  - НЕ выполняет multi-tenant миграцию в транзакции (по схеме на запрос),
 *    чтобы упавшая схема не блокировала все остальные.
 */
import { readFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { PrismaClient } from "@prisma/client";

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("usage: apply-tenant-migration.ts <path-to-sql>");
  process.exit(1);
}

const fullPath = isAbsolute(sqlPath) ? sqlPath : resolve(process.cwd(), sqlPath);
const sql = readFileSync(fullPath, "utf-8");

function splitStatements(input: string): string[] {
  return input
    .split("\n")
    .map((line) => (line.trim().startsWith("--") ? "" : line))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const tenants = await prisma.tenant.findMany({
      select: { slug: true, schemaName: true },
      orderBy: { slug: "asc" },
    });
    console.log(`Found ${tenants.length} tenants. Migrating: ${sqlPath}`);

    const statements = splitStatements(sql);
    const failures: { slug: string; error: string }[] = [];

    for (const t of tenants) {
      // schemaName приходит из БД — на всякий случай валидируем.
      if (!/^tenant_[a-z][a-z0-9_-]*$/.test(t.schemaName)) {
        console.warn(`  ⚠️  skip ${t.slug}: invalid schemaName ${t.schemaName}`);
        continue;
      }
      try {
        await prisma.$executeRawUnsafe(`SET search_path TO "${t.schemaName}", public`);
        for (const stmt of statements) {
          await prisma.$executeRawUnsafe(stmt);
        }
        console.log(`  ✓ ${t.slug} (${t.schemaName})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${t.slug}: ${message}`);
        failures.push({ slug: t.slug, error: message });
      } finally {
        await prisma.$executeRawUnsafe(`SET search_path TO public`).catch(() => undefined);
      }
    }

    if (failures.length > 0) {
      console.error(`\nFAILED: ${failures.length} tenants`);
      failures.forEach((f) => console.error(`  - ${f.slug}: ${f.error}`));
      process.exit(1);
    } else {
      console.log(`\nDone. ${tenants.length} tenants migrated.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
