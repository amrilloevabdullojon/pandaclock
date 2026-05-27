/**
 * Augmentation: добавляем `tenant` на Express Request.
 * Используется в TenantMiddleware и контроллерах.
 */
import type { Tenant } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

export {};
