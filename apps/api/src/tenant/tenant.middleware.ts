import { Injectable, type NestMiddleware, NotFoundException } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "@pandaclock/db";

/**
 * Извлекает tenant slug из поддомена и кладёт tenant в request.
 *
 * Примеры:
 *   acmebank.pandaclock.uz → slug = "acmebank"
 *   localhost:4000 → ищет header X-Tenant-Slug (для локальной разработки)
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const slug = this.extractTenantSlug(req);
    if (!slug) {
      throw new NotFoundException({ code: "TENANT_NOT_RESOLVED" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException({ code: "TENANT_NOT_FOUND", slug });
    }

    req.tenant = tenant;
    next();
  }

  private extractTenantSlug(req: Request): string | null {
    // 1. Локальная разработка: явный заголовок
    const headerSlug = req.headers["x-tenant-slug"];
    if (typeof headerSlug === "string" && headerSlug.length > 0) {
      return headerSlug;
    }

    // 2. Поддомен
    const host = req.headers.host ?? "";
    const hostWithoutPort = host.split(":")[0] ?? "";
    const parts = hostWithoutPort.split(".");

    // Минимум 3 уровня: <slug>.pandaclock.uz
    if (parts.length < 3) {
      return null;
    }

    const slug = parts[0];
    // Игнорируем технические поддомены
    if (slug === "www" || slug === "api" || slug === "app") {
      return null;
    }
    return slug ?? null;
  }
}
