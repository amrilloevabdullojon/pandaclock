import Constants from "expo-constants";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "./auth-store";

const apiBase: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4000/api/v1";

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  const { accessToken, tenantSlug } = useAuthStore.getState();
  const origin = new URL(apiBase).origin;
  if (socket && socket.connected) return socket;
  socket = io(origin, {
    path: "/socket.io",
    auth: { token: accessToken ?? "" },
    query: tenantSlug ? { tenant: tenantSlug } : {},
    // Только polling: fly.io WebSocket-upgrade за прокси отдаёт 400, а на
    // мобильном интернете ws ещё нестабильнее. Long-polling доставляет
    // realtime-события стабильно. upgrade:false — не пытаться апгрейдиться.
    transports: ["polling"],
    upgrade: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
}
