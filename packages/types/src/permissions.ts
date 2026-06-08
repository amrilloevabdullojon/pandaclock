/**
 * Granular permissions для всех модулей системы.
 *
 * Каждый permission — строка вида "resource:action".
 * - Источник истины: ROLE_PERMISSIONS — статичный mapping (без БД).
 * - Используется и в API (PermissionsGuard) и в web (usePermission).
 */
import type { UserRole } from "./user.js";

export const PERMISSIONS = [
  // Employees
  "employees:read",
  "employees:write",
  "employees:invite",
  "employees:delete",
  "employees:bulk",
  // Departments
  "departments:read",
  "departments:write",
  // Tasks
  "tasks:create",
  "tasks:assign",
  "tasks:delete",
  // Time tracking
  "time:read_all",
  // Leave requests
  "requests:create",
  "requests:approve",
  "requests:read_team",
  "requests:read_all",
  "requests:bulk_decide",
  // Reports
  "reports:read",
  "reports:export",
  // Shifts (графики смен)
  "shifts:read",
  "shifts:write",
  // Performance (цели и оценки)
  "performance:read",
  "performance:write",
  // HR (адаптация + кадровый ЭДО)
  "hr:read",
  "hr:write",
  // Recruitment / ATS (вакансии и кандидаты)
  "recruitment:read",
  "recruitment:write",
  // Travel / Expenses (командировки и расходы)
  "travel:read",
  "travel:write",
  "travel:approve",
  // Surveys / eNPS (опросы)
  "surveys:read",
  "surveys:write",
  // Assets (учёт активов)
  "assets:read",
  "assets:write",
  // Billing
  "billing:read",
  "billing:manage",
  // Notifications (read-own всегда доступно)
  "notifications:read_all",
  // Audit log
  "audit:read",
  // Tenant settings
  "tenant:settings",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Статичный mapping ролей → permissions.
 * Можно мигрировать в БД-таблицу role_permissions позже без изменений API.
 */
const _ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [...PERMISSIONS], // владелец — может всё
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
    "shifts:read",
    "shifts:write",
    "performance:read",
    "performance:write",
    "hr:read",
    "hr:write",
    "recruitment:read",
    "recruitment:write",
    "travel:read",
    "travel:write",
    "travel:approve",
    "surveys:read",
    "surveys:write",
    "assets:read",
    "assets:write",
    "billing:read",
    // NB: ADMIN ≠ billing:manage — оплата плана только OWNER.
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
    "shifts:read",
    "shifts:write",
    "performance:read",
    "performance:write",
    "hr:read",
    "hr:write",
    "recruitment:read",
    "recruitment:write",
    "travel:read",
    "travel:write",
    "travel:approve",
    "surveys:read",
    "surveys:write",
    "assets:read",
    "assets:write",
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
    "shifts:read",
    "shifts:write",
    "performance:read",
    "performance:write",
    "recruitment:read",
    "travel:read",
    "travel:write",
    "travel:approve",
    "surveys:read",
    "assets:read",
  ],
  EMPLOYEE: [
    "employees:read",
    "departments:read",
    "tasks:create",
    "requests:create",
    "travel:read",
    "travel:write",
    "surveys:read",
    "assets:read",
  ],
};

export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> =
  _ROLE_PERMISSIONS;

/**
 * Проверка одного permission по роли.
 * Если role неизвестна — возвращает false (fail-closed).
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const list = _ROLE_PERMISSIONS[role as UserRole];
  if (!list) return false;
  return list.includes(permission);
}

/**
 * Проверка что выполнены ВСЕ перечисленные permissions.
 */
export function hasAllPermissions(role: string, perms: Permission[]): boolean {
  return perms.every((p) => hasPermission(role, p));
}

/**
 * Возвращает массив permissions для роли (read-only копия).
 */
export function permissionsForRole(role: string): Permission[] {
  return [...(_ROLE_PERMISSIONS[role as UserRole] ?? [])];
}
