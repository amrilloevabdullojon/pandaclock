/**
 * Утилиты для работы с периодом отчёта.
 * Дефолтный период — текущий месяц по таймзоне tenant'а.
 */

export interface Period {
  startIso: string;
  endIso: string;
}

export function resolvePeriod(query: { start?: string; end?: string }, tenantTimezone: string): Period {
  if (query.start && query.end) {
    return { startIso: query.start, endIso: query.end };
  }
  const { start, end } = currentMonth(tenantTimezone);
  return { startIso: query.start ?? start, endIso: query.end ?? end };
}

function currentMonth(timezone: string): { start: string; end: string } {
  // Формирование в TZ: берём текущий month/year через Intl.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "01");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return {
    start: `${String(year)}-${mm}-01`,
    end: `${String(year)}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}
