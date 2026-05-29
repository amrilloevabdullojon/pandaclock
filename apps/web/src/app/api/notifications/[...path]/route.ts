import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST" | "PATCH" | "DELETE",
) {
  const { path } = await context.params;
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantFromCookie = cookieStore.get("pcl_tenant")?.value;
  const host = headerStore.get("host") ?? "";
  const tenantSlug = tenantFromCookie ?? (host.includes(".") ? (host.split(".")[0] ?? "") : "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const url = new URL(request.url);
  const subPath = path.join("/");
  const search = url.search;
  const targetUrl = `${apiUrl}/notifications${subPath ? `/${subPath}` : ""}${search}`;

  const body = method === "GET" || method === "DELETE" ? undefined : await request.text();

  const response = await fetch(targetUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Slug": tenantSlug,
      Authorization: token ? `Bearer ${token}` : "",
    },
    body,
    cache: "no-store",
  });

  // 204 / пустые тела — без JSON
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return new NextResponse(null, { status: response.status });
  }
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx, "GET");
}
export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx, "POST");
}
export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx, "PATCH");
}
