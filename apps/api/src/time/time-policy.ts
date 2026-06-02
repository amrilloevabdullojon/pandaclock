/**
 * Tenant-level time policy. Хранится в tenants.time_policy (jsonb).
 * Парсится со значениями по умолчанию для устойчивости к старым tenants.
 */

export interface LeavePolicy {
  /** Сколько дней отпуска накапливается за год работы (стандарт РУз — 21). */
  vacationDaysPerYear: number;
  /** Сколько дней больничного без справки в год (0 = всегда нужна справка). */
  sickDaysPerYearWithoutDoc: number;
  /** Можно ли брать отгулы и сколько в год (0 = запрещено). */
  unpaidDaysPerYear: number;
}

export interface TimePolicy {
  /** HH:mm */
  workStart: string;
  /** HH:mm */
  workEnd: string;
  /** Опоздание считается, если started_at позже workStart + threshold. */
  lateThresholdMinutes: number;
  /** ISO weekdays: 1=Monday..7=Sunday. */
  workdays: number[];
  /** Опциональный гео-фенс. Если задан — отметка вне радиуса требует подтверждения. */
  geofence?: {
    latitude: number;
    longitude: number;
    /** В метрах */
    radius: number;
    name?: string;
  };
  /** Политика отпусков. Если не задана — берётся DEFAULT_LEAVE. */
  leave: LeavePolicy;
}

const DEFAULT_LEAVE: LeavePolicy = {
  vacationDaysPerYear: 21,
  sickDaysPerYearWithoutDoc: 3,
  unpaidDaysPerYear: 14,
};

const DEFAULT_POLICY: TimePolicy = {
  workStart: "09:00",
  workEnd: "18:00",
  lateThresholdMinutes: 15,
  workdays: [1, 2, 3, 4, 5],
  leave: DEFAULT_LEAVE,
};

export function parseTimePolicy(raw: unknown): TimePolicy {
  if (!raw || typeof raw !== "object") return DEFAULT_POLICY;
  const candidate = raw as Partial<TimePolicy>;
  return {
    workStart: candidate.workStart ?? DEFAULT_POLICY.workStart,
    workEnd: candidate.workEnd ?? DEFAULT_POLICY.workEnd,
    lateThresholdMinutes: candidate.lateThresholdMinutes ?? DEFAULT_POLICY.lateThresholdMinutes,
    workdays:
      candidate.workdays && candidate.workdays.length > 0
        ? candidate.workdays
        : DEFAULT_POLICY.workdays,
    geofence: candidate.geofence,
    leave: {
      vacationDaysPerYear:
        candidate.leave?.vacationDaysPerYear ?? DEFAULT_LEAVE.vacationDaysPerYear,
      sickDaysPerYearWithoutDoc:
        candidate.leave?.sickDaysPerYearWithoutDoc ?? DEFAULT_LEAVE.sickDaysPerYearWithoutDoc,
      unpaidDaysPerYear: candidate.leave?.unpaidDaysPerYear ?? DEFAULT_LEAVE.unpaidDaysPerYear,
    },
  };
}

/**
 * Сравнивает фактическое время начала дня с work-start + lateThreshold.
 * Возвращает true, если сотрудник опоздал.
 *
 * Все вычисления — в локальном часовом поясе tenant (передаётся снаружи),
 * чтобы избежать ошибок с UTC.
 */
export function isLateArrival(
  policy: TimePolicy,
  startedAtUtc: Date,
  tenantTimezone: string,
): boolean {
  const localTime = toLocalParts(startedAtUtc, tenantTimezone);
  const [policyHour, policyMinute] = policy.workStart.split(":").map(Number) as [number, number];
  const policyMinutes = policyHour * 60 + policyMinute + policy.lateThresholdMinutes;
  const actualMinutes = localTime.hour * 60 + localTime.minute;
  return actualMinutes > policyMinutes;
}

/** Раскладывает Date в часы/минуты в указанной таймзоне через Intl. */
function toLocalParts(date: Date, timezone: string): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

/**
 * Расстояние Хаверсина между двумя точками (lat/lng в градусах) в метрах.
 */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371_000; // м
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

export function isWithinGeofence(
  policy: TimePolicy,
  coords: { latitude: number; longitude: number } | undefined,
): "no_geofence" | "inside" | "outside" | "no_coords" {
  if (!policy.geofence) return "no_geofence";
  if (!coords) return "no_coords";
  const meters = distanceMeters(policy.geofence, coords);
  return meters <= policy.geofence.radius ? "inside" : "outside";
}
