import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { api, ApiError } from "./api-client";
import { enqueue, drainQueue, type QueuedAction } from "./offline-queue";

export type SessionStatus = "NOT_STARTED" | "WORKING" | "ON_BREAK" | "FINISHED";

export interface TodaySession {
  id: string | null;
  status: SessionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  isLate: boolean;
  totalMinutes: number | null;
  breaksTotalMinutes: number;
  currentBreak: { id: string; startedAt: string; type: string } | null;
  geofenceStatus: "no_geofence" | "inside" | "outside" | "no_coords";
}

const EMPTY: TodaySession = {
  id: null,
  status: "NOT_STARTED",
  startedAt: null,
  finishedAt: null,
  isLate: false,
  totalMinutes: null,
  breaksTotalMinutes: 0,
  currentBreak: null,
  geofenceStatus: "no_geofence",
};

async function tryGetCoords(): Promise<{ latitude: number; longitude: number } | undefined> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status !== Location.PermissionStatus.GRANTED) {
      return undefined;
    }
  }
  try {
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  } catch {
    return undefined;
  }
}

async function applyQueuedAction(action: QueuedAction): Promise<void> {
  switch (action.type) {
    case "START_DAY":
      await api("/time/start", { method: "POST", body: action.payload });
      return;
    case "FINISH_DAY":
      await api("/time/finish", { method: "POST", body: action.payload });
      return;
    case "START_BREAK":
      await api("/time/break/start", { method: "POST", body: action.payload });
      return;
    case "FINISH_BREAK":
      await api("/time/break/finish", { method: "POST" });
      return;
  }
}

export function useTimeTracking() {
  const [session, setSession] = useState<TodaySession>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api<TodaySession>("/time/today");
      setSession(data);
    } catch (err) {
      if (!(err instanceof ApiError)) setError("offline");
    }
  }, []);

  const flushOffline = useCallback(async () => {
    const { flushed } = await drainQueue(applyQueuedAction);
    if (flushed > 0) {
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await flushOffline();
      if (!cancelled) await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, flushOffline]);

  const handleStart = useCallback(async () => {
    const coords = await tryGetCoords();
    try {
      const updated = await api<TodaySession>("/time/start", {
        method: "POST",
        body: coords ?? {},
      });
      setSession(updated);
    } catch (err) {
      if (err instanceof ApiError && err.code === "OUTSIDE_GEOFENCE") {
        const updated = await api<TodaySession>("/time/start", {
          method: "POST",
          body: { ...coords, note: "Confirmed outside geofence" },
        });
        setSession(updated);
        return;
      }
      await enqueue({ type: "START_DAY", payload: coords ?? {} });
    }
  }, []);

  const handleFinish = useCallback(async () => {
    const coords = await tryGetCoords();
    try {
      const updated = await api<TodaySession>("/time/finish", {
        method: "POST",
        body: coords ?? {},
      });
      setSession(updated);
    } catch {
      await enqueue({ type: "FINISH_DAY", payload: coords ?? {} });
    }
  }, []);

  const handleStartBreak = useCallback(async () => {
    try {
      const updated = await api<TodaySession>("/time/break/start", {
        method: "POST",
        body: { type: "PERSONAL" },
      });
      setSession(updated);
    } catch {
      await enqueue({ type: "START_BREAK", payload: { type: "PERSONAL" } });
    }
  }, []);

  const handleFinishBreak = useCallback(async () => {
    try {
      const updated = await api<TodaySession>("/time/break/finish", { method: "POST" });
      setSession(updated);
    } catch {
      await enqueue({ type: "FINISH_BREAK", payload: {} });
    }
  }, []);

  return {
    session,
    loading,
    error,
    startDay: handleStart,
    finishDay: handleFinish,
    startBreak: handleStartBreak,
    finishBreak: handleFinishBreak,
    refresh,
  };
}
