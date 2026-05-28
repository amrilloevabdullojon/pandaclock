import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

const ALLOWED = new Set(["approve", "reject", "cancel"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantFromCookie = cookieStore.get("pcl_tenant")?.value;
  const host = headerStore.get("host") ?? "";
  const tenantSlug = tenantFromCookie ?? (host.includes(".") ? (host.split(".")[0] ?? "") : "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const response = await fetch(`${apiUrl}/requests/${id}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Slug": tenantSlug,
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: await request.text(),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
