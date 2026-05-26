/**
 * Тарифная сетка Pandaclock. Источник истины — docs/Техническое_задание.md.
 * Цены — в UZS, до НДС.
 */

export type PlanCode = "STARTER" | "BUSINESS" | "PRO" | "ENTERPRISE";

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  /** Базовая ежемесячная стоимость (UZS), без учёта количества сотрудников. */
  baseMonthly: number;
  /** Стоимость за каждого активного сотрудника (UZS). */
  perEmployeeMonthly: number;
  /** Максимум сотрудников. 0 = безлимит. */
  employeesLimit: number;
  /** Доступные модули, если включены отраслевые расширения. */
  modules: string[];
}

export const PRICING_TABLE: Record<PlanCode, PlanDefinition> = {
  STARTER: {
    code: "STARTER",
    name: "Starter",
    baseMonthly: 0,
    perEmployeeMonthly: 0,
    employeesLimit: 10,
    modules: ["core"],
  },
  BUSINESS: {
    code: "BUSINESS",
    name: "Business",
    baseMonthly: 50_000,
    perEmployeeMonthly: 5_000,
    employeesLimit: 100,
    modules: ["core", "documents", "requests"],
  },
  PRO: {
    code: "PRO",
    name: "Pro",
    baseMonthly: 0,
    perEmployeeMonthly: 30_000,
    employeesLimit: 500,
    modules: ["core", "documents", "requests", "kpi", "video", "integrations"],
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    name: "Enterprise",
    baseMonthly: 1_500_000,
    perEmployeeMonthly: 0,
    employeesLimit: 0,
    modules: ["all"],
  },
};

export const YEARLY_DISCOUNT = 0.2;

/**
 * Считает стоимость подписки за период.
 * Для тарифов с per-employee — учитывает фактическое количество активных сотрудников.
 */
export function calculatePrice(
  plan: PlanCode,
  activeEmployees: number,
  period: "MONTHLY" | "YEARLY",
): number {
  const definition = PRICING_TABLE[plan];
  const monthly = definition.baseMonthly + definition.perEmployeeMonthly * activeEmployees;
  if (period === "MONTHLY") return monthly;
  const yearly = monthly * 12;
  return Math.round(yearly * (1 - YEARLY_DISCOUNT));
}

export function planCanFit(plan: PlanCode, activeEmployees: number): boolean {
  const def = PRICING_TABLE[plan];
  return def.employeesLimit === 0 || activeEmployees <= def.employeesLimit;
}
