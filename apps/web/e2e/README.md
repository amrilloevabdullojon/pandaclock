# E2E tests

Playwright тесты для web-приложения. Покрывают auth flow, RBAC, базовые user-flows.

## Запуск локально

Требуются три процесса параллельно:

```bash
# 1. Инфраструктура
docker compose up -d postgres minio

# 2. API (отдельный терминал)
pnpm --filter @pandaclock/api dev   # → :4000

# 3. Тесты — web Playwright поднимает сам через webServer
pnpm --filter @pandaclock/web test:e2e

# UI-режим (Playwright Inspector)
pnpm --filter @pandaclock/web test:e2e:ui
```

Первый запуск:

```bash
pnpm --filter @pandaclock/web exec playwright install chromium
```

## Демо-аккаунты

Берутся из `e2e/helpers/auth.ts` → seed скрипт `scripts/seed-cloudit.ts`.
Тенант: **cloudit**, пароль у всех: **demo1234**.

| Роль     | Email              |
| -------- | ------------------ |
| OWNER    | maksim@cloudit.uz  |
| HR       | laylo@cloudit.uz   |
| MANAGER  | bakhrom@cloudit.uz |
| EMPLOYEE | anvar@cloudit.uz   |

## Что покрыто

- **auth.spec.ts** — login, неверный пароль, редирект для гостя
- **employees.spec.ts** — список сотрудников, RBAC: EMPLOYEE не видит invite/audit
- **requests.spec.ts** — открытие формы создания заявки, scope=team для MANAGER,
  глобальный cmd+K поиск

## Что НЕ покрыто (TODO)

- Создание/одобрение заявки end-to-end (требует чистого state БД на каждый ран)
- Inline editing на /employees/[id]
- Bulk-actions через checkbox + toolbar
- Загрузка аватара (требует MinIO bucket inited)
- Чаты (Socket.IO mock сложнее)
