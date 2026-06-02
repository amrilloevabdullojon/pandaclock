import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

async function proxy(request: Request, method: "GET" | "PATCH") {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantFromCookie = cookieStore.get("pcl_tenant")?.value;
  const host = headerStore.get("host") ?? "";
  const tenantSlug = tenantFromCookie ?? (host.includes(".") ? (host.split(".")[0] ?? "") : "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const body = method === "PATCH" ? await request.text() : undefined;
  const response = await fetch(`${apiUrl}/tenant/profile`, {
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

export async function GET(request: Request) {
  return proxy(request, "GET");
}

export async function PATCH(request: Request) {
  return proxy(request, "PATCH");
}
