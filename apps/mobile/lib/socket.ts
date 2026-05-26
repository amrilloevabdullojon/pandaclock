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
    transports: ["websocket"],
    reconnection: true,
  });
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
}
