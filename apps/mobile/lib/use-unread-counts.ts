import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { api } from "./api-client";
import { useAuthStore } from "./auth-store";

interface UnreadResponse {
  chats: number;
  notifications: number;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Подгружает unread-счётчики и поллит раз в 30 сек + при возвращении в foreground.
 * Используется для badges на табах (chats, профиль с уведомлениями).
 */
export function useUnreadCounts(): UnreadResponse {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [counts, setCounts] = useState<UnreadResponse>({ chats: 0, notifications: 0 });

  useEffect(() => {
    if (!accessToken) {
      setCounts({ chats: 0, notifications: 0 });
      return;
    }
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        // У chats нет отдельного endpoint — суммируем unreadCount из списка каналов
        const [channels, notifications] = await Promise.all([
          api<{ unreadCount: number }[]>("/chats/channels").catch(() => []),
          api<{ count: number }>("/notifications/unread-count").catch(() => ({ count: 0 })),
        ]);
        if (!cancelled) {
          const chatsTotal = channels.reduce((sum, ch) => sum + (ch.unreadCount ?? 0), 0);
          setCounts({ chats: chatsTotal, notifications: notifications.count });
        }
      } catch {
        // silent
      }
    }

    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);

    // Refresh при возврате в foreground
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void load();
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      sub.remove();
    };
  }, [accessToken]);

  return counts;
}
