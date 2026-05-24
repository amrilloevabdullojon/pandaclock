import { NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth-cookies";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: { code: "INVALID_INPUT" } }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const host = request.headers.get("host") ?? "";
  const tenantSlug = host.split(".")[0] ?? "";

  const apiResponse = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Slug": tenantSlug,
    },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  if (!apiResponse.ok) {
    const errorBody = (await apiResponse.json().catch(() => ({}))) as unknown;
    return NextResponse.json({ error: errorBody }, { status: apiResponse.status });
  }

  const tokens = (await apiResponse.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };

  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, tokens);
  return response;
}
