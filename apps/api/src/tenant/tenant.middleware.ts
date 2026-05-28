import { Injectable, type NestMiddleware, NotFoundException } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "@pandaclock/db";

/**
 * Извлекает tenant slug по такому приоритету:
 *   1. Заголовок `X-Tenant-Slug` (для CLI / mobile / тестов)
 *   2. Cookie `pcl_tenant` (для локальной демо в браузере без поддомена)
 *   3. Query `?tenant=` (для прямых API-ссылок и Swagger)
 *   4. Поддомен `<slug>.pandaclock.uz` (production-режим)
 *
 * И кладёт tenant в request.
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
    // 1. Заголовок (CLI, mobile, тесты)
    const headerSlug = req.headers["x-tenant-slug"];
    if (typeof headerSlug === "string" && headerSlug.length > 0) {
      return headerSlug.toLowerCase();
    }

    // 2. Cookie (локальная демо в браузере)
    const cookieJar = (req as Request & { cookies?: Record<string, string> }).cookies;
    if (cookieJar && typeof cookieJar.pcl_tenant === "string" && cookieJar.pcl_tenant.length > 0) {
      return cookieJar.pcl_tenant.toLowerCase();
    }

    // 3. Query string ?tenant=
    const queryTenant = req.query.tenant;
    if (typeof queryTenant === "string" && queryTenant.length > 0) {
      return queryTenant.toLowerCase();
    }

    // 4. Поддомен
    const host = req.headers.host ?? "";
    const hostWithoutPort = host.split(":")[0] ?? "";
    const parts = hostWithoutPort.split(".");
    if (parts.length < 3) {
      return null;
    }
    const sub = parts[0];
    if (sub === "www" || sub === "api" || sub === "app") return null;
    return sub ?? null;
  }
}
