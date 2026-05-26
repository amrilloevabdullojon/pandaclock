/**
 * Утилиты для работы с отпускными заявками.
 * Чистые функции без зависимостей — легко тестировать.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Считает количество рабочих дней (Пн-Пт) между двумя датами включительно.
 * Календарные праздники игнорируются в MVP (Sprint 6+).
 */
export function countWorkingDays(startIso: string, endIso: string): number {
  const start = parseDateOnly(startIso);
  const end = parseDateOnly(endIso);
  if (end < start) return 0;

  let count = 0;
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + MS_PER_DAY)) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/**
 * Возвращает накопленные отпускные дни для сотрудника на сегодня.
 * 21 день в год, пропорционально количеству отработанных дней.
 */
export function accruedDays(hireDateIso: string | null, asOf = new Date()): number {
  if (!hireDateIso) return 0;
  const hire = parseDateOnly(hireDateIso);
  const totalDays = Math.max(0, Math.floor((asOf.getTime() - hire.getTime()) / MS_PER_DAY));
  return Math.floor((totalDays / 365) * 21);
}

/**
 * Проверяет пересечение интервалов [aStart, aEnd] и [bStart, bEnd] включительно.
 */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const aS = parseDateOnly(aStart).getTime();
  const aE = parseDateOnly(aEnd).getTime();
  const bS = parseDateOnly(bStart).getTime();
  const bE = parseDateOnly(bEnd).getTime();
  return aS <= bE && bS <= aE;
}

function parseDateOnly(iso: string): Date {
  // Защита от таймзонных багов — берём только YYYY-MM-DD часть и парсим как UTC.
  const datePart = iso.slice(0, 10);
  return new Date(`${datePart}T00:00:00Z`);
}
