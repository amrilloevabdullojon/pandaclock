import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client для public schema.
 *
 * Для запросов в tenant-схемы используйте TenantPrismaService
 * (см. apps/api/src/tenant/tenant-prisma.service.ts), который
 * динамически переключает search_path.
 */

declare global {
  // eslint-disable-next-line no-var
  var __pandaclockPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__pandaclockPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pandaclockPrisma = prisma;
}
