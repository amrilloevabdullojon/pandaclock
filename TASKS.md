# TASKS.md
## Текущие задачи разработки Pandaclock

Этот файл — рабочий backlog для AI-агентов. Обновляется по мере выполнения работ.

**Формат:**
- `[ ]` — открытая задача
- `[~]` — в процессе
- `[x]` — завершена
- `[!]` — заблокирована (см. блокер)

---

# 🟢 АКТИВНЫЙ СПРИНТ: Sprint 0 — Инфраструктура

**Цель:** К концу спринта команда может запустить проект локально и в Vercel-preview.
**Длительность:** 2 недели

## Базовая структура репозитория

- [x] Инициализировать git
- [x] Создать структуру monorepo (`apps/`, `packages/`, `docs/`)
- [x] `AGENTS.md` — главный файл для AI-агентов
- [x] `CLAUDE.md` — дополнения для Claude Code
- [x] `README.md` — для людей
- [x] `package.json` (root)
- [x] `pnpm-workspace.yaml`
- [x] `turbo.json`
- [x] `tsconfig.base.json`
- [x] `.gitignore`
- [x] `.prettierrc`
- [x] `.editorconfig`
- [x] `docker-compose.yml`
- [x] `.github/workflows/ci.yml`
- [x] Переместить документы в `docs/`
- [x] Первый коммит

## Базовые packages

- [ ] `packages/config/` — общие eslint, tailwind, tsconfig
  - [ ] eslint preset
  - [ ] tailwind preset (с дизайн-токенами из docs/Дизайн_система.md)
  - [ ] tsconfig presets (base, react, node)
- [ ] `packages/types/` — общие TypeScript types
  - [ ] Tenant, User, Department types
  - [ ] API response types
- [ ] `packages/ui/` — shadcn/ui компоненты
  - [ ] Setup shadcn/ui
  - [ ] Базовые компоненты: Button, Input, Card, Badge
- [ ] `packages/db/` — Prisma
  - [ ] Установить Prisma
  - [ ] Initial schema: tenants, subscriptions, billing_transactions
  - [ ] Tenant template SQL (для создания tenant schema)
  - [ ] Migrations

## Backend (apps/api)

- [ ] Создать NestJS приложение
- [ ] Подключить Prisma
- [ ] `TenantMiddleware` — определение tenant по subdomain
- [ ] `TenantPrismaService` — динамический search_path
- [ ] Endpoint: `POST /api/v1/tenants` — регистрация компании
- [ ] Endpoint: `POST /api/v1/auth/register-company`
- [ ] Endpoint: `POST /api/v1/auth/login`
- [ ] JWT-стратегия (access + refresh)
- [ ] Swagger/OpenAPI документация

## Frontend Web (apps/web)

- [ ] Создать Next.js 15 приложение (App Router)
- [ ] Tailwind + shadcn/ui setup
- [ ] Подключить Nunito (Google Fonts)
- [ ] next-intl для локализации (RU базовый)
- [ ] Route: `/` — заглушка "Coming Soon"
- [ ] Route: `/login` — форма входа
- [ ] Connect to API

## Marketing site (apps/marketing)

- [ ] Создать Next.js 15 приложение (или зашарить с web?)
- [ ] Setup Tailwind + дизайн-токены
- [ ] Минимальная landing page (см. docs/Landing_page_бриф.md)

## Mobile (apps/mobile)

- [ ] Создать Expo приложение
- [ ] NativeWind (Tailwind для RN)
- [ ] Базовая навигация (Expo Router)
- [ ] Экран Login
- [ ] Экран Home (заглушка)

## DevOps

- [ ] Husky + lint-staged setup
- [ ] commitlint setup (Conventional Commits)
- [ ] Vercel deployment для apps/web и apps/marketing
- [ ] Vercel deployment для apps/api
- [ ] Neon project setup (production + staging branches)
- [ ] Upstash Redis setup
- [ ] Cloudflare R2 buckets
- [ ] DNS: pandaclock.uz + wildcard *.pandaclock.uz
- [ ] SSL via Cloudflare

## Документация для команды

- [ ] CONTRIBUTING.md (как делать PR)
- [ ] ARCHITECTURE.md (краткое описание решений)
- [ ] PR/Issue templates в .github/

---

# 🔵 ДАЛЬНЕЙШИЕ СПРИНТЫ (планируется)

## Sprint 1: Фундамент (недели 3-4)
- Авторизация компаний и пользователей
- Multi-tenancy работает end-to-end
- Базовые роли (Employee, Manager, Admin)
- Welcome email

## Sprint 2: Сотрудники и отделы (недели 5-6)
- CRUD departments
- CRUD users
- Импорт из Excel
- Org chart

## Sprint 3: Учёт времени (недели 7-8)
- Mobile clock-in/out
- Геолокация
- Web dashboard "Кто на работе"
- Offline-режим

## Sprint 4: Задачи (недели 9-10)
- Канбан-доска
- Создание/назначение задач
- Комментарии и файлы

## Sprint 5: Заявки и уведомления (недели 11-12)
- Отпуска / больничные
- Push notifications
- Email шаблоны

## Sprint 6: Отчёты (недели 13-14)
- Экспорт Excel/PDF
- KPI дашборды

## Sprint 7: Биллинг + Чаты (недели 15-16)
- Click / Payme интеграции
- Тарифы и подписки
- Чаты отделов (Socket.IO)

## Sprint 8: Полировка + Запуск (недели 17-18)
- E2E тесты
- Локализация (узбекский)
- Юридические страницы
- App Store + Google Play
- Soft launch с пилотами

См. [docs/Roadmap_MVP.md](docs/Roadmap_MVP.md) для деталей.

---

# 🔴 БЛОКЕРЫ

_Пока нет блокеров._

---

# 📊 МЕТРИКИ ПРОГРЕССА

- **Sprint 0:** ~30% (структура есть, packages и apps впереди)
- **Готовность MVP:** ~5%
- **Документация:** ✅ 100%

---

# 🤖 ПРАВИЛА РАБОТЫ С ЭТИМ ФАЙЛОМ

Для AI-агентов:

1. **Перед началом задачи** — отметить её как `[~]` (в процессе)
2. **После завершения** — отметить `[x]` и обновить % готовности спринта
3. **Если задача оказалась больше** — разбить на подзадачи
4. **Если обнаружен блокер** — поставить `[!]` и описать в секции БЛОКЕРЫ
5. **Не удалять выполненные задачи** в течение спринта — для отчётности

При завершении спринта — переместить все задачи в `docs/Sprint_X_отчёт.md` и очистить активный спринт.
