"use client";

import * as React from "react";
import { hasPermission as canDo, type Permission } from "@pandaclock/types";

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  permissions: Permission[];
}

const SessionContext = React.createContext<SessionUser | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionUser | null;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Текущий пользователь (или null если не авторизован — но в /dashboard такого не бывает). */
export function useSession(): SessionUser | null {
  return React.useContext(SessionContext);
}

/**
 * Проверка одного permission по текущему пользователю.
 * Возвращает false, если permissions[] ещё не загружены.
 */
export function usePermission(permission: Permission): boolean {
  const user = useSession();
  if (!user) return false;
  // permissions[] выдаётся API; на старых сессиях может отсутствовать — fallback на роль.
  if (user.permissions?.length) return user.permissions.includes(permission);
  return canDo(user.role, permission);
}

/**
 * Декларативный гейт UI: показывает children только при наличии permission.
 * fallback — что показать, если permission нет (по умолчанию ничего).
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
}
