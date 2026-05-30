# Observability — Sentry + PostHog

Этот документ описывает, как у нас настроен мониторинг ошибок (Sentry) и
продуктовая аналитика (PostHog).

Оба инструмента **opt-in**: без переменных окружения они молча выключены и
не делают никаких сетевых запросов. Это критично для локальной разработки
и для возможности самостоятельного хостинга.

---

## Sentry — error tracking

### Web (Next.js)

Файлы:

- `apps/web/instrumentation.ts` — Next.js entry для server-side init
- `apps/web/sentry.client.config.ts` — браузер
- `apps/web/sentry.server.config.ts` — Node runtime
- `apps/web/sentry.edge.config.ts` — middleware/edge runtime
- `apps/web/next.config.mjs` — обёртка `withSentryConfig` (source-maps upload, tunnel)

Переменные окружения:

```bash
# Минимум — DSN для отправки событий
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."

# Опционально
SENTRY_DSN="..."                       # для server-side (если отличается)
SENTRY_ORG="pandaclock"                # для source-maps upload
SENTRY_PROJECT="web"                   # для source-maps upload
SENTRY_AUTH_TOKEN="sntrys_..."         # для source-maps upload
NEXT_PUBLIC_SENTRY_ENV="production"
NEXT_PUBLIC_SENTRY_RELEASE="v0.1.0"
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE="0.1"
```

### API (NestJS)

Файлы:

- `apps/api/src/instrument.ts` — должен импортироваться **первым** в `main.ts`
  (sentry автоинструментирует http/express/...)
- `apps/api/src/observability/sentry.filter.ts` — глобальный exception filter

Переменные:

```bash
SENTRY_DSN="https://...@sentry.io/..."
SENTRY_ENV="production"
SENTRY_RELEASE="v0.1.0"
SENTRY_TRACES_SAMPLE_RATE="0.1"
```

### Что НЕ шлётся

- Cookies (отрезаются в `beforeSend`)
- 4xx ошибки (это user-error, не баг)
- `sendDefaultPii: false`

---

## PostHog — продуктовая аналитика

Файл: `apps/web/src/lib/analytics.tsx`.

Подключение в `apps/web/src/app/dashboard/layout.tsx`:

```tsx
<AnalyticsProvider>
  <IdentifyUser /> {/* identify по session.id + role */}
  <PageViewTracker /> {/* шлёт $pageview при смене pathname */}
  ...
</AnalyticsProvider>
```

Переменные:

```bash
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"  # или https://app.posthog.com
```

### Использование в компонентах

```tsx
import { useAnalytics } from "@/lib/analytics";

export function InviteButton() {
  const { track } = useAnalytics();
  return <Button onClick={() => track("employee_invited", { count: 1 })}>Пригласить</Button>;
}
```

### Что мы НЕ шлём

- `email`, `firstName`, `lastName` (PII) — только `id` + `role`
- `autocapture: false` — никаких автоматических клик-евентов
- `disable_session_recording: true`

### События которые стоит отслеживать (будущее)

- `employee_invited` — приглашение отправлено
- `request_created` — заявка создана
- `request_decided` — заявка одобрена/отклонена
- `task_created` / `task_completed`
- `time_clocked_in` / `time_clocked_out`
- `chat_message_sent`
- `report_exported` (с типом отчёта)
- `bulk_action` (с action_type + count)
- `search_used` (через cmd+K)

---

## CI / Deployment

В production Vercel:

1. Добавить `NEXT_PUBLIC_SENTRY_DSN` и `SENTRY_AUTH_TOKEN` в Vercel env vars.
2. При деплое `withSentryConfig` автоматически загрузит source-maps в Sentry.
3. `tunnelRoute: "/monitoring"` обходит ad-blockers.

В production API (fly.io / VPS):

1. Добавить `SENTRY_DSN` в env (через `flyctl secrets set` или systemd).
2. Перезапустить процесс.

---

## Локально (для отладки интеграций)

Можно поднять собственный PostHog/Sentry для теста:

```bash
# PostHog (один docker-compose, см. их docs)
# Sentry self-hosted — отдельный проект, не повторяем здесь

# Затем в .env:
SENTRY_DSN="http://localhost:9000/..."
NEXT_PUBLIC_POSTHOG_KEY="phc_local..."
NEXT_PUBLIC_POSTHOG_HOST="http://localhost:8000"
```
