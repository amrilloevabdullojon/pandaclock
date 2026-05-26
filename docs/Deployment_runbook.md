# Deployment runbook

> Как развернуть Pandaclock в production / staging.

---

## Окружения

| Среда       | Web                              | Marketing                  | API                              | DB                              |
|-------------|----------------------------------|----------------------------|----------------------------------|---------------------------------|
| Production  | Vercel (`app.pandaclock.uz` + wildcard) | Vercel (`pandaclock.uz`)   | Vercel / Uztelecom (контейнер)   | Neon main + Cloudflare R2       |
| Staging     | Vercel preview (`*.staging.pandaclock.uz`) | Vercel preview            | Vercel preview                   | Neon staging branch             |
| Local       | localhost:3000                   | localhost:3001             | localhost:4000                   | docker-compose (Postgres + Redis + MinIO + Mailpit) |

## Зависимости провайдеров

- **Vercel** — хостинг web/marketing/api в MVP
- **Neon** — managed PostgreSQL 16
- **Upstash Redis** — кэш + BullMQ (когда подключим)
- **Cloudflare R2** — файлы (avatars, attachments)
- **Cloudflare DNS** — `pandaclock.uz` + wildcard
- **Resend** — email (Apps Domain настроен с SPF/DKIM/DMARC)
- **Sentry** — error tracking (DSN в env)
- **Expo EAS** — mobile builds
- **Click / Payme** — платежи (Узбекистан)
- **Stripe** — международные платежи (будущее)

## Pre-flight checklist

Перед каждым production-релизом:

- [ ] Все CI checks зелёные на ветке `main`
- [ ] `pnpm typecheck && pnpm lint && pnpm test` локально
- [ ] Прогон smoke-тестов в staging
- [ ] Создан release-tag (`git tag v0.x.0 && git push --tags`)
- [ ] Записан changelog в `docs/CHANGELOG.md`
- [ ] Проверены миграции БД (`pnpm --filter @pandaclock/db prisma migrate status`)
- [ ] Проверен размер бандла web (`pnpm --filter @pandaclock/web build`)

## Деплой API

### Vercel (MVP)
1. `vercel link` в `apps/api/` (одноразово)
2. Установить env vars (см. ниже)
3. Push в `main` → авто-деплой

### Docker (alt / Uztelecom когда переедем)
```bash
docker build -f apps/api/Dockerfile -t pandaclock-api:latest .
docker run -p 4000:4000 \
  --env-file apps/api/.env.production \
  pandaclock-api:latest
```

## Деплой web / marketing

```bash
vercel --prod                    # из корня проекта, выбирает проект
```

или просто пуш в `main`. Branch-deploys для staging берутся с `staging`.

## Миграции БД

```bash
# Применить миграции (production)
DATABASE_URL=<prod> pnpm --filter @pandaclock/db prisma migrate deploy

# Создать новую миграцию
pnpm --filter @pandaclock/db prisma migrate dev --name <name>

# Прокатить tenant template на существующих tenants (если меняли SQL)
DATABASE_URL=<prod> pnpm --filter @pandaclock/db tsx scripts/reapply-tenant-template.ts
```

## Mobile релизы (EAS)

```bash
cd apps/mobile

# Build production для iOS + Android
npx eas-cli build --profile production --platform all

# Submit в стор (после ручной проверки)
npx eas-cli submit --profile production --platform all

# OTA-обновление (для JS-only изменений в том же binary)
npx eas-cli update --channel production --message "v0.x.0 — fix Y"
```

## Required environment variables

### API (`apps/api/.env.production`)
```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...neon.tech/pandaclock?sslmode=require
REDIS_URL=rediss://...upstash.io
JWT_SECRET=<32+ random bytes>
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=<32+ random bytes>
JWT_REFRESH_TTL=30d
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@pandaclock.uz
APP_URL=https://app.pandaclock.uz
MARKETING_URL=https://pandaclock.uz
SENTRY_DSN=https://...@sentry.io/...
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=pandaclock-files-prod
CLICK_SECRET=<from Click merchant cabinet>
PAYME_MERCHANT_KEY=<from Payme>
EXPO_ACCESS_TOKEN=<expo personal access token>
BCRYPT_ROUNDS=12
```

### Web (`apps/web` Vercel env)
```
NEXT_PUBLIC_API_URL=https://api.pandaclock.uz/api/v1
NEXT_PUBLIC_APP_URL=https://app.pandaclock.uz
NEXT_PUBLIC_MARKETING_URL=https://pandaclock.uz
NEXTAUTH_SECRET=<32+ random>
NEXTAUTH_URL=https://app.pandaclock.uz
```

### Marketing (`apps/marketing` Vercel env)
```
NEXT_PUBLIC_APP_URL=https://app.pandaclock.uz
NEXT_PUBLIC_MARKETING_URL=https://pandaclock.uz
NEXT_PUBLIC_GA_ID=G-...
NEXT_PUBLIC_YANDEX_METRIKA_ID=...
```

### Mobile (`apps/mobile` EAS secrets)
```
EXPO_PUBLIC_API_URL=https://api.pandaclock.uz/api/v1
```

## Rollback

```bash
# Vercel — откатиться к предыдущему деплою
vercel rollback <deployment-url>

# Mobile (OTA) — откатить update
npx eas-cli update --channel production --message "rollback to v0.x.0" --branch <prev-branch>

# Mobile (binary) — нет rollback'а в сторе, нужно вылить новую версию
```

## Smoke test после деплоя

1. `curl https://api.pandaclock.uz/api/v1/health` → `{ "status": "ok" }`
2. Открыть `https://pandaclock.uz` — landing загружается
3. Зарегистрировать тестовую компанию `https://app.pandaclock.uz/register`
4. Войти, отметить день, создать задачу
5. Проверить email с подтверждением в Mailpit (staging) или реальной почте
6. Проверить в Sentry — нет новых ошибок

## Контакты

- Tech lead: [имя, telegram]
- Hosting support: Vercel / Neon dashboard
- Payments: Click / Payme merchant support
