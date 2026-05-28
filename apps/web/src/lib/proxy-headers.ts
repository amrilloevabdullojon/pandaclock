import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE, TENANT_COOKIE } from "./auth-cookies";

/**
 * Возвращает headers + tenant slug для прокси-роутов в /api/*.
 * Tenant читается: cookie pcl_tenant → subdomain. access-токен берётся из cookies.
 */
export async function proxyAuthHeaders(): Promise<{
  tenantSlug: string;
  apiUrl: string;
  headers: Record<string, string>;
}> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantFromCookie = cookieStore.get(TENANT_COOKIE)?.value;
  const host = headerStore.get("host") ?? "";
  const tenantFromHost = host.includes(".") ? (host.split(".")[0] ?? "") : "";
  const tenantSlug = tenantFromCookie ?? tenantFromHost ?? "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const hdr: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (tenantSlug) hdr["X-Tenant-Slug"] = tenantSlug;
  if (token) hdr.Authorization = `Bearer ${token}`;

  return { tenantSlug, apiUrl, headers: hdr };
}
