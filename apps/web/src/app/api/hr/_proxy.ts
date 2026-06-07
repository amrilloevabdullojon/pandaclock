import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

/** Общий прокси к API hr: прокидывает токен + tenant. */
export async function hrProxy(
  apiPath: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  request?: Request,
  search?: string,
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantFromCookie = cookieStore.get("pcl_tenant")?.value;
  const host = headerStore.get("host") ?? "";
  const tenantSlug = tenantFromCookie ?? (host.includes(".") ? (host.split(".")[0] ?? "") : "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const body = method === "POST" || method === "PATCH" ? await request?.text() : undefined;

  const response = await fetch(`${apiUrl}${apiPath}${search ? `?${search}` : ""}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Slug": tenantSlug,
      Authorization: token ? `Bearer ${token}` : "",
    },
    body,
    cache: "no-store",
  });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}
