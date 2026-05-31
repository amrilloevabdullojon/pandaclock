/**
 * URLы web-приложения (где живёт сам продукт).
 * На marketing-сайте мы только рекламируем — все CTA уходят в web app.
 */

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const APP_LOGIN_URL = `${APP_BASE}/login`;
export const APP_REGISTER_URL = `${APP_BASE}/register`;
