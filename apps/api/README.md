# @pandaclock/api

NestJS backend для Pandaclock.

## Запуск

```bash
# Установить зависимости (из корня monorepo)
pnpm install

# Скопировать env
cp apps/api/.env.example apps/api/.env.local

# Запустить локальную инфраструктуру
docker compose up -d

# Применить миграции public schema
pnpm --filter @pandaclock/db migrate:dev

# Запустить API
pnpm --filter @pandaclock/api dev
```

API будет на http://localhost:4000
Swagger UI: http://localhost:4000/docs

## Multi-tenancy

Каждый запрос (кроме `register-company` и `health`) определяет tenant по поддомену.

Для локальной разработки можно передавать заголовок `X-Tenant-Slug` вместо поддомена:

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "X-Tenant-Slug: demo" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.uz","password":"..."}'
```

## Структура

```
src/
├── main.ts              # Bootstrap
├── app.module.ts        # Корневой модуль + middleware
├── tenant/              # Multi-tenant логика
│   ├── tenant.middleware.ts    # subdomain → tenant
│   ├── tenant-prisma.service.ts # search_path switcher
│   └── tenant.service.ts        # CRUD tenant + schema creation
├── auth/                # Авторизация
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── dto/
└── health/              # /api/v1/health
```

## TODO

- [ ] Passport JWT strategy + guards
- [ ] Refresh token rotation
- [ ] Email verification flow
- [ ] 2FA (TOTP)
- [ ] Rate limiting (express-rate-limit или throttler)
- [ ] Sentry integration
