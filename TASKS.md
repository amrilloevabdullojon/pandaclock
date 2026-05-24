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
- [x] `CONTRIBUTING.md`
- [x] `package.json` (root)
- [x] `pnpm-workspace.yaml`
- [x] `turbo.json`
- [x] `tsconfig.base.json`
- [x] `.gitignore`
- [x] `.prettierrc`
- [x] `.editorconfig`
- [x] `docker-compose.yml`
- [x] `.github/workflows/ci.yml`
- [x] PR / Issue templates
- [x] Переместить документы в `docs/`
- [x] Первый коммит

## Базовые packages

- [x] `packages/config/` — общие eslint, tailwind, tsconfig
  - [x] eslint preset (base, react, node)
  - [x] tailwind preset (с дизайн-токенами из docs/Дизайн_система.md)
  - [x] tsconfig presets (base, react, nextjs, node)
- [x] `packages/types/` — общие TypeScript types
  - [x] Tenant, Subscription
  - [x] User, Department
  - [x] Task, TimeEntry, LeaveRequest
  - [x] API response types
- [x] `packages/ui/` — shadcn/ui компоненты
  - [x] Button, Input, Card, Badge, Avatar, Dialog
  - [x] globals.css с CSS-переменными
  - [x] utils (cn helper)
- [x] `packages/db/` — Prisma
  - [x] Initial schema: tenants, subscriptions, billing_transactions, platform_admins, tenant_invitations
  - [x] Tenant template SQL (users, departments, tasks, time_entries, leave_requests, audit_log, refresh_tokens)
  - [x] Singleton Prisma client
  - [x] Seed-скрипт

## Backend (apps/api)

- [x] Скелет NestJS приложения
- [x] `TenantMiddleware` — определение tenant по subdomain (+ X-Tenant-Slug fallback)
- [x] `TenantPrismaService` — динамический search_path (request-scoped)
- [x] Endpoint: `POST /api/v1/auth/register-company` (создание tenant + schema + admin)
- [x] Endpoint: `POST /api/v1/auth/login` (bcrypt + JWT access/refresh)
- [x] Endpoint: `GET /api/v1/health`
- [x] Swagger UI на `/docs`
- [x] Pino logger
- [x] CORS для `*.pandaclock.uz` и dev URL
- [ ] Passport JWT strategy + guards
- [ ] Refresh token rotation в БД
- [ ] Rate limiting (throttler)
- [ ] Sentry integration

## Frontend Web (apps/web)

- [x] Next.js 15 App Router скелет
- [x] Tailwind + дизайн-токены из @pandaclock/config
- [x] Nunito (Google Fonts) подключён
- [x] next-intl с русской локалью
- [x] Главная страница "Coming Soon"
- [x] Страница /login
- [x] 404 страница
- [x] API-клиент (`lib/api-client.ts`)
- [ ] Защищённые маршруты (middleware с проверкой JWT)
- [ ] Layout с sidebar для авторизованных пользователей
- [ ] Multi-step registration wizard

## Marketing site (apps/marketing)

- [x] Next.js 15 скелет
- [x] Tailwind + дизайн-токены
- [x] Hero, ValueProps, NavBar, CTA, Footer
- [ ] Sprint 4: добавить секции Problem, Features (детально), Industries, Pricing, FAQ
- [ ] SEO meta + Open Graph + Schema.org
- [ ] Google Analytics + Yandex.Metrica

## Mobile (apps/mobile)

- [x] Expo 52 + Expo Router 4 скелет
- [x] NativeWind (Tailwind для RN) с общим preset
- [x] Nunito font
- [x] Welcome / Login экраны
- [x] Tab bar (Home, Tasks, Chats, Requests, Profile)
- [x] Home screen с 4 состояниями (clock-in / working / break / finished)
- [x] Permission strings для геолокации и Face ID
- [ ] SecureStore для хранения JWT
- [ ] API-клиент
- [ ] Реальные экраны для остальных табов (Tasks, Chats, Requests)

## DevOps

- [x] Husky + lint-staged setup
- [x] commitlint setup (Conventional Commits)
- [x] CI workflow (GitHub Actions)
- [ ] Vercel deployment для apps/web и apps/marketing
- [ ] Vercel deployment для apps/api
- [ ] Neon project setup (production + staging branches)
- [ ] Upstash Redis setup
- [ ] Cloudflare R2 buckets
- [ ] DNS: pandaclock.uz + wildcard *.pandaclock.uz
- [ ] SSL via Cloudflare

## Документация

- [x] README.md (актуальный)
- [x] CONTRIBUTING.md (как делать PR)
- [x] AGENTS.md (для AI-агентов)
- [x] CLAUDE.md (для Claude Code)
- [x] 16 .md документов в `docs/`

---

# 🔵 ДАЛЬНЕЙШИЕ СПРИНТЫ (планируется)

## Sprint 1: Фундамент авторизации (недели 3-4)
- Реальная регистрация компании через web (multi-step wizard)
- Email verification flow
- Реальный login + сохранение токенов в SecureStore/cookies
- Защищённые маршруты (web middleware + mobile guard)
- Реальный профиль пользователя
- Welcome email через Resend
- Refresh token rotation
- E2E тест happy path

## Sprint 2: Сотрудники и отделы (недели 5-6)
- CRUD departments
- CRUD users
- Импорт сотрудников из Excel
- Карточка сотрудника
- Org chart

## Sprint 3: Учёт времени (недели 7-8)
- Mobile clock-in/out с реальной БД
- Геолокация и валидация по радиусу
- Перерывы
- Web dashboard "Кто на работе сейчас"
- Offline-режим в mobile с синхронизацией

## Sprint 4: Задачи (недели 9-10)
- Канбан-доска (drag-n-drop)
- Создание/назначение задач
- Комментарии и файлы
- Mobile экран задач
- Лендинг расширение (Pricing, FAQ, Industries)

## Sprint 5: Заявки и уведомления (недели 11-12)
- Отпуска / больничные (CRUD + workflow утверждения)
- Push notifications (Expo)
- Email шаблоны (welcome, новая задача, заявка)
- Inline approve/reject в email

## Sprint 6: Отчёты (недели 13-14)
- Async-генерация Excel/PDF через BullMQ
- KPI дашборды для руководителя
- Дашборд сотрудника
- Календарь графика

## Sprint 7: Биллинг + Чаты (недели 15-16)
- Click / Payme webhooks
- Тарифы и подписки
- Чаты отделов (Socket.IO)
- Видео-созвоны (LiveKit базовый)

## Sprint 8: Полировка + Запуск (недели 17-18)
- E2E тесты (Playwright + Maestro)
- Локализация (узбекский латиница)
- Юридические страницы (оферта, ПД, DPA)
- App Store + Google Play
- Soft launch с пилотами

См. [docs/Roadmap_MVP.md](docs/Roadmap_MVP.md) для деталей.

---

# 🔴 БЛОКЕРЫ

_Пока нет блокеров._

---

# 📊 МЕТРИКИ ПРОГРЕССА

- **Sprint 0:** ~95% (структура и скаффолды готовы; осталось деплоить и финализировать оставшиеся mobile экраны)
- **Готовность MVP:** ~12%
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
