import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const SUPPORTED_LOCALES = ["ru", "en", "uz-latn"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "pcl_locale";

export default getRequestConfig(async () => {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale =
    fromCookie && SUPPORTED_LOCALES.includes(fromCookie) ? fromCookie : DEFAULT_LOCALE;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
