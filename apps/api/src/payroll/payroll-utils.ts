/**
 * Чистые функции payroll (без БД) — для юнит-тестов.
 */

/** К выплате = оклад + премия − удержания. Отрицательный результат отсекается до 0. */
export function computeNet(base: number, bonus: number, deductions: number): number {
  return Math.max(0, base + bonus - deductions);
}

/**
 * Допустимые переходы статуса расчётного периода:
 * DRAFT → APPROVED → PAID (строго по цепочке, без откатов).
 */
export function isValidRunTransition(from: string, to: string): boolean {
  return (to === "APPROVED" && from === "DRAFT") || (to === "PAID" && from === "APPROVED");
}
