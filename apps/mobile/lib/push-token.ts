import { api } from "./api-client";

/**
 * Хранилище последнего зарегистрированного Expo Push токена + снятие его с
 * регистрации. Вынесено отдельно от use-push-notifications, чтобы auth-store
 * мог дернуть unregister при логауте без импорта React-хука.
 */
let currentToken: string | null = null;

export function setCurrentPushToken(token: string | null): void {
  currentToken = token;
}

/**
 * Снимает текущий токен с регистрации на бэкенде. Вызывать ДО очистки сессии
 * (нужен валидный accessToken). Best-effort — ошибки глотаем.
 */
export async function unregisterCurrentPushToken(): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  try {
    await api("/notifications/push", { method: "DELETE", body: { token } });
  } catch {
    // нет сети / уже разлогинены — не критично
  }
}
