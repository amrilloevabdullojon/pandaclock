import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@pandaclock/types";

export const PERMISSIONS_KEY = "pandaclock:permissions";

/**
 * Помечает handler/controller списком обязательных permissions.
 * Если указано несколько — проверяются ВСЕ (AND).
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
