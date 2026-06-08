/**
 * Чистые функции прогресса курса (без БД) — для юнит-тестов.
 */

/** Прогресс курса в процентах (0–100). Курс без уроков → 0. */
export function courseProgress(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(done, total) / total) * 100);
}

/** Курс считается завершённым, когда пройдены все уроки (и они есть). */
export function isCourseComplete(done: number, total: number): boolean {
  return total > 0 && done >= total;
}
