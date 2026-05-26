import { NextResponse } from "next/server";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from "@/i18n/request";

export async function POST(request: Request) {
  const body = (await request.json()) as { locale?: string };
  const locale = body.locale as Locale | undefined;
  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    return NextResponse.json({ error: "INVALID_LOCALE" }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
