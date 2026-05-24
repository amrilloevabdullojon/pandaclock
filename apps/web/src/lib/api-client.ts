/**
 * Тонкая обёртка над fetch для работы с Pandaclock API.
 *
 * Использует относительный URL — Next.js rewrites или прокси
 * пробрасывают запросы на бэкенд (см. middleware и vercel.json).
 */

export interface ApiClientOptions {
  baseUrl?: string;
  getAccessToken?: () => string | null;
}

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

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");

    const token = options.getAccessToken?.();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string };
      };
      throw new ApiError(
        response.status,
        body.error?.code ?? "UNKNOWN",
        body.error?.message ?? "Request failed",
      );
    }

    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}

export const api = createApiClient();
