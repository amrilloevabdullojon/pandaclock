/**
 * Чистые функции агрегации ответов опроса (без БД) — чтобы их можно было
 * покрыть юнит-тестами. Используются в SurveysService.getResults.
 */

export interface EnpsBreakdown {
  promoters: number;
  passives: number;
  detractors: number;
  score: number;
}

/**
 * eNPS по шкале 0–10: промоутеры 9–10, нейтралы 7–8, критики 0–6.
 * score = %промоутеров − %критиков, округлённый до целого. Пустой набор → 0.
 */
export function computeEnps(values: number[]): EnpsBreakdown {
  const total = values.length;
  const promoters = values.filter((v) => v >= 9).length;
  const passives = values.filter((v) => v >= 7 && v <= 8).length;
  const detractors = values.filter((v) => v <= 6).length;
  const score = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
  return { promoters, passives, detractors, score };
}

/** Среднее по набору, округлённое до 1 знака. Пустой набор → 0. */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

/** Распределение по фиксированным меткам (например 1..5). */
export function distribution(
  values: number[],
  buckets: number[],
): { label: string; count: number }[] {
  return buckets.map((n) => ({ label: String(n), count: values.filter((v) => v === n).length }));
}

/** Распределение выбора по вариантам: value_int = индекс варианта. */
export function choiceDistribution(
  values: number[],
  options: string[],
): { label: string; count: number }[] {
  return options.map((label, idx) => ({ label, count: values.filter((v) => v === idx).length }));
}
