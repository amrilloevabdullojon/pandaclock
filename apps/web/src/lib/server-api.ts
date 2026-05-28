import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE, TENANT_COOKIE } from "./auth-cookies";

/**
 * Серверный fetch к Pandaclock API с автоматическим прокидыванием access-токена
 * и tenant slug. Tenant определяется в порядке:
 *   1. Cookie `pcl_tenant` (выставляется при /api/auth/login)
 *   2. Поддомен (production)
 *
 * Использовать в Server Components.
 */
export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const headerList = await headers();

  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantFromCookie = cookieStore.get(TENANT_COOKIE)?.value;
  const host = headerList.get("host") ?? "";
  const tenantFromHost = host.includes(".") ? (host.split(".")[0] ?? "") : "";
  const tenantSlug = tenantFromCookie ?? tenantFromHost;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const reqHeaders = new Headers(init.headers);
  reqHeaders.set("Content-Type", "application/json");
  if (tenantSlug) reqHeaders.set("X-Tenant-Slug", tenantSlug);
  if (accessToken) reqHeaders.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: reqHeaders,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } };
    throw new Error(body.error?.code ?? `HTTP_${response.status}`);
  }
  return response.json() as Promise<T>;
}
