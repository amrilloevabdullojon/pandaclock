import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

async function proxy(
  request: Request,
  context: { params: Promise<{ id: string }> },
  method: "PATCH" | "DELETE",
) {
  const { id } = await context.params;
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantFromCookie = cookieStore.get("pcl_tenant")?.value;
  const host = headerStore.get("host") ?? "";
  const tenantSlug = tenantFromCookie ?? (host.includes(".") ? (host.split(".")[0] ?? "") : "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const body = method === "PATCH" ? await request.text() : undefined;

  const response = await fetch(`${apiUrl}/shifts/${id}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Slug": tenantSlug,
      Authorization: token ? `Bearer ${token}` : "",
    },
    body,
  });
  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return proxy(request, ctx, "PATCH");
}
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return proxy(request, ctx, "DELETE");
}
