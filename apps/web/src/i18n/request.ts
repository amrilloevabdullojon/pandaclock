import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // Пока поддерживаем только русский. Узбекский/английский добавим в Этапе 2.
  const locale = "ru";
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
