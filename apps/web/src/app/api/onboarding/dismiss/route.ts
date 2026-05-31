import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

export async function POST() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantFromCookie = cookieStore.get("pcl_tenant")?.value;
  const host = headerStore.get("host") ?? "";
  const tenantSlug = tenantFromCookie ?? (host.includes(".") ? (host.split(".")[0] ?? "") : "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  const response = await fetch(`${apiUrl}/onboarding/dismiss`, {
    method: "POST",
    headers: {
      "X-Tenant-Slug": tenantSlug,
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  return new NextResponse(null, { status: response.status });
}
