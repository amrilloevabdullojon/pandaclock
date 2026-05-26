import { useEffect, useState } from "react";
import * as Network from "expo-network";

/**
 * Возвращает true, если устройство ОНЛАЙН.
 * Подписывается на изменения сети через expo-network polling.
 */
export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!cancelled) setOnline(Boolean(state.isInternetReachable ?? state.isConnected));
      } catch {
        if (!cancelled) setOnline(true);
      }
    }
    void check();
    const interval = setInterval(check, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return online;
}
