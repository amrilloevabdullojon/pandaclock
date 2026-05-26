import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "./auth-store";

const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 5;

/**
 * Планирует локальное напоминание «Начните рабочий день»
 * в 09:05 по локальному времени устройства. Перепланируется каждый день.
 */
export function useDailyReminder(): void {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function schedule() {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") return;

        await Notifications.cancelAllScheduledNotificationsAsync();
        if (cancelled) return;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "☀️ Начните рабочий день",
            body: "Откройте Pandaclock и отметьтесь, когда будете готовы.",
            data: { type: "DAILY_REMINDER" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: REMINDER_HOUR,
            minute: REMINDER_MINUTE,
            repeats: true,
          },
        });
      } catch {
        // ignore
      }
    }

    void schedule();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);
}
