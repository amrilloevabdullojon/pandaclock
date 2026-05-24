import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, clearAuthCookies } from "@/lib/auth-cookies";

export async function POST(request: Request) {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const host = request.headers.get("host") ?? "";
  const tenantSlug = host.split(".")[0] ?? "";

  if (refresh) {
    await fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": tenantSlug,
      },
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
