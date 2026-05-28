import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

export async function GET() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const tenantFromCookie = cookieStore.get("pcl_tenant")?.value;
  const host = headerStore.get("host") ?? "";
  const tenantSlug = tenantFromCookie ?? (host.includes(".") ? (host.split(".")[0] ?? "") : "");
  return NextResponse.json({
    token,
    tenantSlug,
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
  });
}
