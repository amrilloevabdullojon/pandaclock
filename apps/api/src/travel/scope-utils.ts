/**
 * Чистая логика scope-видимости (без БД) — для юнит-тестов.
 */

export type Scope = "my" | "team" | "all";

/**
 * Понижает запрошенный scope до "my", если у пользователя нет права согласовывать.
 * Сотрудник всегда видит только свои записи, независимо от ?scope=.
 */
export function effectiveScope(requested: Scope, canApprove: boolean): Scope {
  return canApprove ? requested : "my";
}
