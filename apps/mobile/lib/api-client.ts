import Constants from "expo-constants";
import { useAuthStore } from "./auth-store";

const apiBase: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4000/api/v1";

/**
 * Ошибка от API. Унифицированный формат ответа: { statusCode, code, message }
 * (см. apps/api/src/observability/sentry.filter.ts).
 *
 * `code` — машинно-читаемая константа (например INVALID_CREDENTIALS), на ней
 * строятся локализованные сообщения в UI. `message` — fallback.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Ошибка когда запрос вообще не дошёл — нет интернета, DNS, timeout, CORS.
 * Отдельная от ApiError, чтобы UI мог показать корректное сообщение
 * («Нет связи с сервером» вместо «Неверный email или пароль»).
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function rawRequest<T>(path: string, opts: ApiOptions = {}, withAuth = true): Promise<T> {
  const state = useAuthStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (state.tenantSlug) headers["X-Tenant-Slug"] = state.tenantSlug;
  if (withAuth && state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (cause) {
    // fetch бросает только при network-level fail (нет интернета, DNS, abort).
    // Различаем эту категорию отдельно от API-ответа с ошибкой.
    if (cause instanceof Error && cause.name === "AbortError") throw cause;
    throw new NetworkError(cause instanceof Error ? cause.message : "Network request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    // Контракт API: { statusCode, code, message } (см. sentry.filter.ts)
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    throw new ApiError(
      response.status,
      body.code ?? `HTTP_${response.status}`,
      body.message ?? body.code ?? `HTTP_${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, opts);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshed = await useAuthStore.getState().refresh();
      if (refreshed) {
        return rawRequest<T>(path, opts);
      }
    }
    throw error;
  }
}

export const publicApi = {
  request: <T>(path: string, opts: ApiOptions = {}) => rawRequest<T>(path, opts, false),
};

export { apiBase };
