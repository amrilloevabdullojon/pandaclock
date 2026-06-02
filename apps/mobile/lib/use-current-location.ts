import * as React from "react";
import * as Location from "expo-location";

export type PermissionState = "granted" | "denied" | "asking" | "unknown";

export interface CurrentLocation {
  coords: { latitude: number; longitude: number; accuracy: number | null } | null;
  permission: PermissionState;
  /** undefined пока не получили первое значение, "asking" пока запрашиваем */
  loading: boolean;
  /** Запросить разрешение явно (повторно, например после кнопки «Разрешить»). */
  requestPermission: () => Promise<void>;
  /** Принудительно обновить координаты сейчас. */
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000; // 30 сек — баланс между freshness и батареей

/**
 * Хук текущих координат пользователя.
 *
 * Стратегия:
 * 1. На mount: check permission → если нет, дёргаем UI с состоянием "denied"
 *    (НЕ запрашиваем автоматически, иначе RN покажет диалог сразу при открытии Home).
 * 2. Если granted: getCurrentPositionAsync + setInterval каждые 30 сек.
 * 3. При unmount: clearInterval.
 *
 * watchPositionAsync не используем — у нас не нужен realtime трекинг, polling
 * каждые 30s достаточно и расходует меньше батареи.
 */
export function useCurrentLocation(): CurrentLocation {
  const [coords, setCoords] = React.useState<CurrentLocation["coords"]>(null);
  const [permission, setPermission] = React.useState<PermissionState>("unknown");
  const [loading, setLoading] = React.useState(true);

  const fetchOnce = React.useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? null,
      });
    } catch {
      // оставляем coords как есть (последнее известное)
    }
  }, []);

  const requestPermission = React.useCallback(async () => {
    setPermission("asking");
    const result = await Location.requestForegroundPermissionsAsync();
    if (result.status === Location.PermissionStatus.GRANTED) {
      setPermission("granted");
      await fetchOnce();
    } else {
      setPermission("denied");
    }
  }, [fetchOnce]);

  const refresh = React.useCallback(async () => {
    if (permission !== "granted") return;
    await fetchOnce();
  }, [permission, fetchOnce]);

  // Initial check
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const current = await Location.getForegroundPermissionsAsync();
      if (cancelled) return;
      if (current.status === Location.PermissionStatus.GRANTED) {
        setPermission("granted");
        await fetchOnce();
      } else {
        setPermission("denied");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOnce]);

  // Polling — только если permission есть
  React.useEffect(() => {
    if (permission !== "granted") return;
    const timer = setInterval(() => {
      void fetchOnce();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [permission, fetchOnce]);

  return { coords, permission, loading, requestPermission, refresh };
}

/**
 * Расстояние Хаверсина между двумя точками (lat/lng в градусах) в метрах.
 * Дублирует apps/api/src/time/time-policy.ts — оставлено локально, чтобы не тащить
 * сервер-пакет в mobile bundle.
 */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

/**
 * Направление (bearing) от точки A к точке B в градусах [0..360),
 * где 0 = север, 90 = восток. Для отрисовки стрелки-компаса.
 */
export function bearingDegrees(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Форматирует метры: <1000 → «340 м», иначе → «1.2 км». */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
}
