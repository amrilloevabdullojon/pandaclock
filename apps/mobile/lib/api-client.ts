import Constants from "expo-constants";
import { useAuthStore } from "./auth-store";

const apiBase: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4000/api/v1";

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

  const response = await fetch(`${apiBase}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } };
    throw new ApiError(
      response.status,
      body.error?.code ?? "UNKNOWN",
      body.error?.code ?? `HTTP_${response.status}`,
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
