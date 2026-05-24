# @pandaclock/db

Prisma schema и утилиты для базы данных Pandaclock.

## Архитектура

### Two-layer schema

**Layer 1 — `public` schema:**
Управляется Prisma migrations. Содержит общие таблицы платформы:
- `tenants` — компании-клиенты
- `subscriptions` — подписки
- `billing_transactions` — платежи
- `tenant_invitations` — приглашения новых tenants
- `platform_admins` — наша команда

**Layer 2 — `tenant_<slug>` schemas:**
Создаются динамически при регистрации tenant. **НЕ управляются Prisma migrations.**
Содержат данные конкретной компании:
- `users`, `departments`, `user_documents`
- `time_entries`, `breaks`
- `tasks`, `task_comments`, `task_attachments`
- `leave_requests`, `leave_attachments`
- `audit_log`, `refresh_tokens`

SQL-шаблон для tenant schema — в `src/tenant-template.ts`.

## Команды

```bash
# Сгенерировать Prisma Client
pnpm generate

# Применить миграции в dev
pnpm migrate:dev

# Применить миграции в production
pnpm migrate:deploy

# Сбросить БД (только локально!)
pnpm migrate:reset

# Prisma Studio
pnpm studio

# Заполнить тестовыми данными
pnpm seed
```

## Использование в других пакетах

```ts
import { prisma } from "@pandaclock/db";

// Public schema запросы (общие данные платформы)
const tenants = await prisma.tenant.findMany();
```

Для работы с tenant schema используйте `TenantPrismaService` из `apps/api/src/tenant/tenant-prisma.service.ts` — он динамически переключает `search_path`.

## Создание нового tenant

```ts
import { TENANT_TEMPLATE_SQL } from "@pandaclock/db/tenant-template";

await prisma.$transaction(async (tx) => {
  // 1. Создать запись tenant
  const tenant = await tx.tenant.create({ ... });

  // 2. Создать схему
  await tx.$executeRawUnsafe(`CREATE SCHEMA "${tenant.schemaName}"`);

  // 3. Установить search_path и применить шаблон
  await tx.$executeRawUnsafe(`SET search_path TO "${tenant.schemaName}"`);
  await tx.$executeRawUnsafe(TENANT_TEMPLATE_SQL);
});
```
