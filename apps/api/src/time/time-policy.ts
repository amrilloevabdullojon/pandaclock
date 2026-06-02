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

export interface Office {
  /** Стабильный id офиса (UUID), генерится клиентом или сервером при создании. */
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** В метрах */
  radius: number;
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
  /**
   * DEPRECATED single-office geofence. Оставлено для backward-compat при чтении.
   * Новые тенанты используют offices[]. parseTimePolicy() мигрирует geofence → offices[]
   * при первом чтении, дальше пишется только offices.
   */
  geofence?: {
    latitude: number;
    longitude: number;
    radius: number;
    name?: string;
  };
  /** Список офисов. Если пуст — geofence не применяется (отмечаться можно откуда угодно). */
  offices: Office[];
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
  offices: [],
  leave: DEFAULT_LEAVE,
};

export function parseTimePolicy(raw: unknown): TimePolicy {
  if (!raw || typeof raw !== "object") return DEFAULT_POLICY;
  const candidate = raw as Partial<TimePolicy>;

  // Auto-migration: если в БД лежит старый одиночный geofence без offices[],
  // на лету конвертируем его в массив с одним элементом «Главный офис».
  // При следующем save updatePolicy() запишет уже offices без geofence.
  let offices: Office[] = Array.isArray(candidate.offices)
    ? candidate.offices.filter(isValidOffice)
    : [];
  if (offices.length === 0 && candidate.geofence) {
    offices = [
      {
        id: "legacy-main",
        name: candidate.geofence.name ?? "Главный офис",
        latitude: candidate.geofence.latitude,
        longitude: candidate.geofence.longitude,
        radius: candidate.geofence.radius,
      },
    ];
  }

  return {
    workStart: candidate.workStart ?? DEFAULT_POLICY.workStart,
    workEnd: candidate.workEnd ?? DEFAULT_POLICY.workEnd,
    lateThresholdMinutes: candidate.lateThresholdMinutes ?? DEFAULT_POLICY.lateThresholdMinutes,
    workdays:
      candidate.workdays && candidate.workdays.length > 0
        ? candidate.workdays
        : DEFAULT_POLICY.workdays,
    geofence: candidate.geofence,
    offices,
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

/**
 * Inside если координаты входят в радиус ЛЮБОГО офиса (логика «или одного из них»).
 * no_geofence — если ни одного офиса не задано.
 */
export function isWithinGeofence(
  policy: TimePolicy,
  coords: { latitude: number; longitude: number } | undefined,
): "no_geofence" | "inside" | "outside" | "no_coords" {
  if (policy.offices.length === 0) return "no_geofence";
  if (!coords) return "no_coords";
  for (const office of policy.offices) {
    if (distanceMeters(office, coords) <= office.radius) return "inside";
  }
  return "outside";
}

function isValidOffice(o: unknown): o is Office {
  if (!o || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.latitude === "number" &&
    typeof obj.longitude === "number" &&
    typeof obj.radius === "number"
  );
}
