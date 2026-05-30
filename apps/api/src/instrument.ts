/**
 * Sentry instrumentation — должен быть импортирован САМЫМ ПЕРВЫМ в main.ts,
 * до любых других модулей, иначе auto-instrumentation не подхватит зависимости.
 *
 * Opt-in: если SENTRY_DSN не задан, Sentry молча выключен.
 */
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Не шлём cookies/headers с PII
    sendDefaultPii: false,
  });
}

export { Sentry };
