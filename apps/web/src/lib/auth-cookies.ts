import type { NextResponse } from "next/server";
import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";

export const ACCESS_COOKIE = "pcl_access";
export const REFRESH_COOKIE = "pcl_refresh";
export const TENANT_COOKIE = "pcl_tenant";

interface CookieJar {
  set: ResponseCookies["set"];
  delete: ResponseCookies["delete"];
}

export function setAuthCookies(
  response: NextResponse | { cookies: CookieJar },
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
): void {
  const isProd = process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };

  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function setTenantCookie(
  response: NextResponse | { cookies: CookieJar },
  slug: string,
): void {
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(TENANT_COOKIE, slug, {
    httpOnly: false, // читаем и с клиента — пригодится для отображения
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function clearAuthCookies(response: NextResponse | { cookies: CookieJar }): void {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  // tenant cookie оставляем — пригодится для следующего логина
}
