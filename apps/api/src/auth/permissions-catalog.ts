/**
 * Локальная (runtime) копия role→permissions для API.
 * Источник истины — packages/types/src/permissions.ts; здесь дублируется
 * только потому, что nest build не бандлит workspace packages, а
 * `@pandaclock/types` экспортируется как сырые .ts (не работает в node runtime).
 *
 * При изменении permissions catalog держать оба файла в синхронизации.
 */

import type { Permission, UserRole } from "@pandaclock/types";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "employees:read",
    "employees:write",
    "employees:invite",
    "employees:delete",
    "employees:bulk",
    "departments:read",
    "departments:write",
    "tasks:create",
    "tasks:assign",
    "tasks:delete",
    "time:read_all",
    "requests:create",
    "requests:approve",
    "requests:read_team",
    "requests:read_all",
    "requests:bulk_decide",
    "reports:read",
    "reports:export",
    "billing:read",
    "billing:manage",
    "notifications:read_all",
    "audit:read",
    "tenant:settings",
  ],
  ADMIN: [
    "employees:read",
    "employees:write",
    "employees:invite",
    "employees:delete",
    "employees:bulk",
    "departments:read",
    "departments:write",
    "tasks:create",
    "tasks:assign",
    "tasks:delete",
    "time:read_all",
    "requests:create",
    "requests:approve",
    "requests:read_team",
    "requests:read_all",
    "requests:bulk_decide",
    "reports:read",
    "reports:export",
    "billing:read",
    "notifications:read_all",
    "audit:read",
    "tenant:settings",
  ],
  HR: [
    "employees:read",
    "employees:write",
    "employees:invite",
    "employees:bulk",
    "departments:read",
    "departments:write",
    "tasks:create",
    "tasks:assign",
    "time:read_all",
    "requests:create",
    "requests:approve",
    "requests:read_team",
    "requests:read_all",
    "requests:bulk_decide",
    "reports:read",
    "reports:export",
    "audit:read",
  ],
  MANAGER: [
    "employees:read",
    "departments:read",
    "tasks:create",
    "tasks:assign",
    "requests:create",
    "requests:approve",
    "requests:read_team",
    "requests:bulk_decide",
    "reports:read",
  ],
  EMPLOYEE: ["employees:read", "departments:read", "tasks:create", "requests:create"],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const list = ROLE_PERMISSIONS[role as UserRole];
  if (!list) return false;
  return list.includes(permission);
}

export function hasAllPermissions(role: string, perms: Permission[]): boolean {
  return perms.every((p) => hasPermission(role, p));
}

export function permissionsForRole(role: string): Permission[] {
  return [...(ROLE_PERMISSIONS[role as UserRole] ?? [])];
}
