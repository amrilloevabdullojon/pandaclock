# Sprint 0 — Чеклист настройки инфраструктуры
## Pandaclock — старт разработки

**Версия:** 1.0
**Дата:** 2026-05-24
**Длительность:** 2 недели (1 неделя при выделенном Tech Lead)
**Цель:** к концу Sprint 0 разработчики могут начать писать продуктовый код

---

## Общая структура Sprint 0

```
Неделя 1: Аккаунты + Репозитории + Локальная среда
Неделя 2: CI/CD + Базовый деплой + Multi-tenant фундамент
```

---

# НЕДЕЛЯ 1

## День 1-2: Регистрация аккаунтов и доменов

### 1.1 Доменные имена

- [ ] Проверить и купить домен `pandaclock.uz`
  - Регистратор: [uznic.uz](https://uznic.uz) (государственный регистратор .uz)
  - Стоимость: ~$30-50/год
- [ ] Купить дополнительные:
  - `pandaclock.com` — на [Namecheap](https://namecheap.com) или [Porkbun](https://porkbun.com), ~$10/год
  - `pandaclock.io` — резерв на расширение, ~$30/год
- [ ] Купить варианты с типичными опечатками:
  - `pandaclock.uz` (правильный)
  - Опционально: `pandaclok.uz`, `pandaclok.com`

### 1.2 Бизнес-аккаунты

- [ ] **Google Workspace** для команды
  - План Business Starter: $6/пользователь/мес
  - Создать email-аккаунты: `team@`, `hello@`, `support@`, `billing@`, `legal@`, `privacy@`, `noreply@`, `security@`
  - Привязать к домену `pandaclock.uz`
- [ ] **GitHub Organization** [github.com/pandaclock](https://github.com)
  - Бесплатно для small team
  - Team plan ($4/user/мес) если нужны private repos с расширенными правами

### 1.3 Облачные сервисы (для MVP)

- [ ] **Vercel** [vercel.com](https://vercel.com)
  - Pro plan: $20/мес (для team features и большего лимита bandwidth)
  - Подключить к GitHub organization
- [ ] **Neon** [neon.tech](https://neon.tech) — PostgreSQL
  - Scale plan: $19/мес (для production-ready)
  - Создать проект `pandaclock-prod`
  - Создать ветку `staging` для тестового окружения
- [ ] **Upstash Redis** [upstash.com](https://upstash.com)
  - Pay-as-you-go: ~$0.20/100K команд
  - Создать БД в регионе `eu-west-1` или ближайшем доступном
- [ ] **Cloudflare R2** [cloudflare.com/products/r2](https://www.cloudflare.com/products/r2) — S3-совместимое хранилище
  - $0.015/GB/мес — очень дёшево
  - Создать buckets: `pandaclock-files-prod`, `pandaclock-files-staging`
- [ ] **Cloudflare** для DNS и CDN
  - Бесплатно
  - Перенести домен `pandaclock.uz` на Cloudflare DNS

### 1.4 Внешние сервисы

- [ ] **Resend** [resend.com](https://resend.com) — email
  - Free tier: 3000 emails/мес, 100/день
  - Подтвердить домен `pandaclock.uz` (SPF, DKIM, DMARC)
- [ ] **Sentry** [sentry.io](https://sentry.io) — мониторинг ошибок
  - Team plan: $26/мес
  - Создать проекты: `pandaclock-web`, `pandaclock-api`, `pandaclock-mobile`
- [ ] **Expo** [expo.dev](https://expo.dev) — для мобильной разработки
  - Free tier достаточен на старте
  - Production plan ($30/мес) когда начнём публиковать билды
- [ ] **Apple Developer Account** [developer.apple.com](https://developer.apple.com)
  - $99/год
  - Регистрация занимает 24-48 часов
- [ ] **Google Play Developer** [play.google.com/console](https://play.google.com/console)
  - $25 единоразово

### 1.5 Платёжные сервисы (для будущего билинга)

- [ ] Подать заявку на интеграцию **Click** [click.uz/developers](https://click.uz)
- [ ] Подать заявку на интеграцию **Payme** [payme.uz/business](https://payme.uz)
- [ ] **Stripe** account [stripe.com](https://stripe.com) — для международных платежей (Этап 2+)

Заявки на Click/Payme могут рассматриваться 1-4 недели — лучше сразу подать.

### 1.6 Аналитика

- [ ] **Google Analytics 4** — создать property для `pandaclock.uz`
- [ ] **Yandex.Metrica** [metrica.yandex.ru](https://metrica.yandex.ru) — важно для русскоязычной аудитории
- [ ] **Microsoft Clarity** [clarity.microsoft.com](https://clarity.microsoft.com) — бесплатные heatmaps

---

## День 3-4: Создание репозиториев

### 2.1 Структура репозиториев

Рекомендую **monorepo подход** через [Turborepo](https://turbo.build/repo) — общие пакеты, единые правила, одно место для зависимостей.

```
pandaclock/                          ← главный repo
├── apps/
│   ├── web/                         ← Next.js (dashboard)
│   ├── marketing/                   ← Next.js (landing page)
│   ├── mobile/                      ← Expo React Native
│   └── api/                         ← NestJS backend
├── packages/
│   ├── ui/                          ← shared shadcn/ui components
│   ├── types/                       ← shared TypeScript types
│   ├── config/                      ← shared eslint/tailwind config
│   └── db/                          ← Prisma schemas + migrations
├── docs/                            ← все .md документы
├── .github/
│   └── workflows/                   ← GitHub Actions
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### 2.2 Создание

```bash
# 1. Создать через Turborepo CLI
npx create-turbo@latest pandaclock --package-manager pnpm

# 2. Инициализировать git
cd pandaclock
git init
git remote add origin git@github.com:pandaclock/pandaclock.git

# 3. Первый коммит
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2.3 Настройка ветвления (GitFlow lite)

- `main` — production (защищённая, мерж только через PR с CI green)
- `staging` — pre-production
- `dev` — основная для разработки
- `feature/*` — фичи (от `dev`, мерж в `dev`)
- `hotfix/*` — срочные багфиксы (от `main`, мерж в `main` и `dev`)

### 2.4 GitHub настройки

- [ ] Включить **branch protection** для `main`:
  - Require PR review (1 approver)
  - Require status checks (CI должен пройти)
  - Require linear history
- [ ] Создать **issue templates** (`bug.md`, `feature.md`)
- [ ] Создать **PR template**
- [ ] Включить **Dependabot** для security updates
- [ ] Подключить **CODEOWNERS** для критичных папок

---

## День 5-7: Локальная среда разработки

### 3.1 Документ для команды: README.md в корне

```markdown
# Pandaclock

## Требования

- Node.js 22+
- pnpm 9+
- Docker Desktop
- VS Code (рекомендуется) с extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense

## Локальный запуск

1. Скопировать `.env.example` → `.env.local` в каждом приложении
2. Запросить значения у Tech Lead
3. Запустить локальные сервисы:
   ```bash
   docker compose up -d
   ```
4. Установить зависимости:
   ```bash
   pnpm install
   ```
5. Применить миграции:
   ```bash
   pnpm db:migrate:dev
   ```
6. Запустить:
   ```bash
   pnpm dev
   ```

   Откроет:
   - http://localhost:3000 — web dashboard
   - http://localhost:3001 — marketing landing
   - http://localhost:4000 — api
   - Expo Go QR-код в терминале — mobile

## Полезные команды

- `pnpm lint` — проверка кода
- `pnpm test` — запустить тесты
- `pnpm db:studio` — Prisma Studio
- `pnpm db:reset` — пересоздать БД
```

### 3.2 docker-compose.yml для локальной разработки

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pandaclock
      POSTGRES_USER: pandaclock
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    # S3-совместимое хранилище для локальной разработки
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: pandaclock
      MINIO_ROOT_PASSWORD: pandaclockdev
    volumes:
      - minio_data:/data

  mailpit:
    # Локальный SMTP сервер для тестирования email
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI
volumes:
  postgres_data:
  minio_data:
```

### 3.3 .env.example для каждого приложения

**apps/api/.env.example:**
```env
# Database
DATABASE_URL="postgresql://pandaclock:dev@localhost:5432/pandaclock"

# Redis
REDIS_URL="redis:0//localhost:6379"

# JWT
JWT_SECRET="change-me-in-production"
JWT_REFRESH_SECRET="change-me-in-production"

# Email (локально через Mailpit)
SMTP_HOST="localhost"
SMTP_PORT="1025"
EMAIL_FROM="noreply@pandaclock.uz"

# Storage (локально через MinIO)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="pandaclock"
S3_SECRET_KEY="pandaclockdev"
S3_BUCKET="pandaclock-files"

# Sentry (опционально для локалки)
SENTRY_DSN=""
```

**apps/web/.env.example:**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 3.4 Code quality setup

- [ ] **ESLint config** в `packages/config/eslint/`
- [ ] **Prettier config** с правилами:
  ```json
  {
    "semi": true,
    "trailingComma": "all",
    "singleQuote": false,
    "printWidth": 100,
    "tabWidth": 2
  }
  ```
- [ ] **Husky + lint-staged** — pre-commit hooks:
  ```bash
  pnpm add -D husky lint-staged
  npx husky init
  ```
  В `.husky/pre-commit`:
  ```bash
  pnpm lint-staged
  ```
- [ ] **commitlint** — стандарт коммитов (Conventional Commits):
  - `feat:` новая фича
  - `fix:` багфикс
  - `chore:` рутинные изменения
  - `docs:` документация
  - `refactor:` рефакторинг
  - `test:` тесты

---

# НЕДЕЛЯ 2

## День 8-9: Multi-tenant фундамент в БД

### 4.1 Базовая Prisma schema

`packages/db/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// PUBLIC schema (общая для платформы)
// ============================================

model Tenant {
  id            String   @id @default(uuid())
  slug          String   @unique
  name          String
  industry      String?
  country       String   @default("UZ")
  timezone      String   @default("Asia/Tashkent")
  status        TenantStatus @default(TRIAL)
  schemaName    String   @unique  // "tenant_acmebank"
  createdAt     DateTime @default(now())
  trialEndsAt   DateTime?
  metadata      Json?

  subscription  Subscription?

  @@map("tenants")
}

enum TenantStatus {
  TRIAL
  ACTIVE
  SUSPENDED
  CANCELLED
}

model Subscription {
  id              String   @id @default(uuid())
  tenantId        String   @unique
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  plan            String   // starter/business/pro/enterprise
  employeesLimit  Int
  modules         Json     // {"it": true, ...}
  priceAmount     Decimal  @db.Decimal(10, 2)
  priceCurrency   String   @default("UZS")
  billingPeriod   String   // monthly/yearly
  startedAt       DateTime
  expiresAt       DateTime

  @@map("subscriptions")
}

// Дополнительно: PlatformAdmin, BillingTransaction, etc.
```

### 4.2 Tenant schema (для каждого клиента)

Создаём отдельный файл со схемой клиентских таблиц, который будет применяться к каждой tenant-схеме:

`packages/db/migrations/tenant_template.sql`:

```sql
-- Этот SQL применяется при создании каждого нового tenant

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  -- ...
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  -- ...
);

-- (все остальные таблицы из ТЗ)
```

### 4.3 NestJS middleware для tenant context

`apps/api/src/middleware/tenant.middleware.ts`:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Извлечь tenant slug из поддомена
    const host = req.headers.host;
    const subdomain = host.split('.')[0];

    // 2. Найти tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: subdomain },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // 3. Установить search_path в PostgreSQL
    await this.prisma.$executeRawUnsafe(
      `SET search_path TO ${tenant.schemaName}, public`
    );

    // 4. Сохранить tenant в request для использования в контроллерах
    req['tenant'] = tenant;

    next();
  }
}
```

### 4.4 Создание нового tenant — сервис

```typescript
async createTenant(data: CreateTenantDto): Promise<Tenant> {
  const slug = generateSlug(data.name);
  const schemaName = `tenant_${slug}`;

  // 1. Создать запись в public.tenants
  const tenant = await this.prisma.tenant.create({
    data: { slug, schemaName, ...data },
  });

  // 2. Создать schema в PostgreSQL
  await this.prisma.$executeRawUnsafe(
    `CREATE SCHEMA ${schemaName}`
  );

  // 3. Применить tenant_template.sql к новой schema
  await this.prisma.$executeRawUnsafe(
    `SET search_path TO ${schemaName}`
  );
  await this.applyTenantTemplate();

  return tenant;
}
```

---

## День 10-11: CI/CD

### 5.1 GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, dev, staging]
  pull_request:
    branches: [main, dev]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: pandaclock_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pandaclock_test

      - name: Build
        run: pnpm build
```

### 5.2 Deploy на Vercel

Vercel автоматически деплоит при push в `main` (для production) и `staging` (для preview).

Настроить **environment variables** в Vercel dashboard для каждого окружения:
- Production: `main` ветка
- Preview: `staging` ветка
- Development: PR previews

### 5.3 База данных в production

- **main** ветка → production БД (Neon main branch)
- **staging** ветка → staging БД (Neon staging branch)
- Миграции применяются автоматически через скрипт в deployment step

---

## День 12-14: Базовый деплой + Smoke test

### 6.1 Минимальный работающий продукт

К концу Sprint 0 должно работать:

- [ ] `pandaclock.uz` показывает заглушку "Coming Soon" (или начало landing)
- [ ] `acmebank.pandaclock.uz` показывает страницу login (multi-tenant маршрутизация работает)
- [ ] Можно зарегистрировать тестовую компанию через API endpoint
- [ ] Можно войти и получить JWT
- [ ] Mobile app собирается через Expo и работает локально

### 6.2 DNS-настройка для wildcard поддоменов

В Cloudflare добавить:

```
A     pandaclock.uz             → Vercel IP
A     www.pandaclock.uz         → Vercel IP
A     *.pandaclock.uz           → Vercel IP    (wildcard для tenants)
A     api.pandaclock.uz         → Vercel IP    (для backend)
```

В Vercel: настроить **wildcard domain** `*.pandaclock.uz`.

### 6.3 SSL

Cloudflare и Vercel оба дают бесплатный SSL автоматически. Включить **Full (Strict) SSL** mode в Cloudflare.

---

# Чеклист готовности к Sprint 1

К концу Sprint 0 должно быть:

### Аккаунты и доступы
- [x] Все облачные сервисы созданы и оплачены
- [x] Все члены команды добавлены с правильными правами
- [x] Платёжные методы привязаны
- [x] Заявки на Click/Payme поданы

### Репозиторий
- [x] Monorepo через Turborepo создан
- [x] Структура apps/ + packages/ настроена
- [x] Branch protection включена
- [x] Templates созданы (PR, issues)

### Локальная разработка
- [x] README с инструкцией установки
- [x] docker-compose работает
- [x] Все 4 приложения запускаются локально
- [x] ESLint, Prettier, Husky работают
- [x] Pre-commit hooks проверяют код

### Multi-tenant
- [x] Public schema с tenants и subscriptions
- [x] Tenant template (DDL для клиентской schema)
- [x] Middleware определения tenant по subdomain
- [x] Создание нового tenant через API работает

### CI/CD
- [x] GitHub Actions запускают lint + test + build на каждый PR
- [x] Vercel автодеплоит main и staging
- [x] Миграции БД применяются автоматически

### Production
- [x] Домены настроены с wildcard
- [x] SSL работает
- [x] Заглушка на главном домене
- [x] Sentry получает ошибки

### Документация
- [x] README актуальный
- [x] CONTRIBUTING.md (как делать PR, conventions)
- [x] ARCHITECTURE.md (краткое описание решений)

---

# Бюджет Sprint 0 (инфраструктура за 2 недели)

| Сервис | Цена | За 2 недели |
|--------|------|-------------|
| Домены (.uz, .com, .io) | $90/год | $90 (одноразово) |
| Google Workspace | $24/мес (4 чел) | $12 |
| Vercel Pro | $20/мес | $10 |
| Neon | $19/мес | $10 |
| Upstash Redis | ~$5/мес | $3 |
| Cloudflare R2 | ~$5/мес | $3 |
| Resend | бесплатно | $0 |
| Sentry | $26/мес | $13 |
| Apple Developer | $99/год | $99 (одноразово) |
| Google Play | $25 единоразово | $25 |
| **Итого Sprint 0** | | **~$265** |

Ежемесячно после Sprint 0: **~$80-100/мес** на инфраструктуру.

---

# Команда для Sprint 0

**Минимум:** 1 Tech Lead + опционально DevOps консультант

**Идеально:**
- 1 Tech Lead (полное участие)
- 1 Backend разработчик (multi-tenant архитектура)
- 1 Frontend разработчик (можно начать настройку Next.js параллельно)
- 1 Mobile разработчик (можно настроить Expo параллельно)

DevOps не нужен на старте — Vercel и облачные сервисы упрощают всё.

---

# Что НЕ делать в Sprint 0

❌ Не пытаться сделать сразу production-ready инфраструктуру (over-engineering)
❌ Не писать продуктовый код параллельно — фундамент важнее
❌ Не использовать самописные решения там где есть managed (например, не поднимать свой PostgreSQL на VPS)
❌ Не пропускать настройку CI — потом сложнее
❌ Не пренебрегать tenant isolation тестами — это основа SaaS

---

# Готовность к Sprint 1

Если все пункты этого чеклиста выполнены — команда готова к Sprint 1 (Фундамент: авторизация, регистрация компании, базовые роли).

**Следующий документ:** детальные user stories для каждого спринта (можно делать поверх существующего [Roadmap_MVP.md](Roadmap_MVP.md)).
