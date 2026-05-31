import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setAuthCookies, setTenantCookie, TENANT_COOKIE } from "@/lib/auth-cookies";

/**
 * Контракт ответа на ошибку: { code, message } напрямую, без { error: ... }
 * — совпадает с форматом API после SentryExceptionFilter. UI читает body.code.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; tenant?: string };
  if (!body.email || !body.password) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "Введите email и пароль" },
      { status: 400 },
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  // Tenant: 1) явный из body, 2) cookie, 3) subdomain
  const cookieStore = await cookies();
  const cookieTenant = cookieStore.get(TENANT_COOKIE)?.value;
  const host = request.headers.get("host") ?? "";
  const subdomainTenant = host.includes(".") ? host.split(".")[0] : "";
  const tenantSlug =
    (body.tenant && body.tenant.length > 0 ? body.tenant : null) ??
    (cookieTenant && cookieTenant.length > 0 ? cookieTenant : null) ??
    subdomainTenant;

  if (!tenantSlug) {
    return NextResponse.json(
      { code: "TENANT_REQUIRED", message: "Выберите компанию" },
      { status: 400 },
    );
  }

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": tenantSlug,
      },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json(
      { code: "API_UNREACHABLE", message: "Сервер не отвечает" },
      { status: 502 },
    );
  }

  if (!apiResponse.ok) {
    // API уже отдаёт { code, message } — пробрасываем без обёртки
    const errorBody = (await apiResponse.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(errorBody, { status: apiResponse.status });
  }

  const tokens = (await apiResponse.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };

  const response = NextResponse.json({ ok: true, tenant: tenantSlug });
  setAuthCookies(response, tokens);
  setTenantCookie(response, tenantSlug);
  return response;
}
