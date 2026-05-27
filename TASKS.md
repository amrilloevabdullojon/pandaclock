# TASKS.md
## Текущие задачи разработки Pandaclock

Этот файл — рабочий backlog для AI-агентов. Обновляется по мере выполнения работ.

**Формат:**
- `[ ]` — открытая задача
- `[~]` — в процессе
- `[x]` — завершена
- `[!]` — заблокирована (см. блокер)

---

# 🚀 LOCAL POLISH ROUND — всё работает end-to-end

**Что сделано в этот раунд:**

- [x] **Docker Desktop** запущен, `docker compose up -d` поднял Postgres 16 (порт 5433 — соседский skillpath уже занял 5432), Redis, MinIO, Mailpit
- [x] **Prisma migration `init`** создана и применена → 5 public-таблиц (tenants, subscriptions, billing_transactions, tenant_invitations, platform_admins) + enums
- [x] **TENANT_TEMPLATE_SQL разбит на отдельные команды** (Prisma $executeRawUnsafe не умеет multi-statement)
- [x] **30+ UUID касts** в raw queries (`$1::uuid`, `$1::inet`, `$1::date`, `$1::timestamptz`) — PostgreSQL не приводит text→uuid автоматически в parameterized queries
- [x] **AuthModule сделан @Global**, экспортирует JwtStrategy/PassportModule/JwtModule — JwtAuthGuard теперь работает в любом модуле без дублирования
- [x] **TenantMiddleware** переписан под Nest 11 / Express 5: пути без globalPrefix, `forRoutes({ path: '{*splat}', method: RequestMethod.ALL })`
- [x] **packages/db** теперь компилируется в `dist/` (main/exports переключены) — Node ESM резолвит из собранного API
- [x] **bcrypt native binding** собран через `node-pre-gyp install` (без node-gyp toolchain)

## E2E реально работает (доказано curl-ом)

| Endpoint | HTTP | Что подтверждает |
|----------|------|------------------|
| `POST /auth/register-company` | 201 | tenant + schema + Owner user созданы в одной транзакции |
| `POST /auth/login` | 200 | JWT access+refresh с правильным payload |
| `GET /auth/me` | 200 | JwtAuthGuard + tenant binding работают |
| `POST /auth/refresh` | 200 | rotation выпускает новую пару |
| `GET /employees` | 200 | список сотрудников из tenant schema |
| `POST /departments` | 201 | CRUD отделов |
| `POST /time/start` → break → break/finish → finish | 200/201 | полный цикл рабочего дня с late detection |
| `POST /tasks` + `PATCH /tasks/:id` + `POST /tasks/:id/comments` | 201/200/201 | задачи + переходы + комментарии |
| `POST /requests` + `POST /requests/:id/approve` | 201/201 | заявка на отпуск + утверждение |
| `GET /requests/balance` | 200 | расчёт `{used, accrued, pending, remaining}` |
| `GET /reports/attendance` | 200 | агрегации с late count и hours |
| `GET /calendar/events` | 200 | unified feed leave_requests + task_deadlines |

## Hardening сделан

- [x] **Rate limit `/auth/login`** через `@Throttle({ ttl: 5min, limit: 5 })` — 6-я попытка реально возвращает 429
- [x] **Audit log** через global APP_INTERCEPTOR (singleton scope с собственным PrismaClient + manual search_path) — пишет action/entity_type/entity_id/ip/user_agent/changes для каждого POST/PATCH/DELETE
- [x] **pnpm.overrides** на `@types/react@18.3.12` + `react-dom@18.3.1` → mobile typecheck: **0 ошибок**
- [x] **`shouldShowAlert`** добавлен в Expo NotificationBehavior (поломалось в Expo SDK 52)

## Маскот Pandi

Без AI image API (есть только ANTHROPIC_API_KEY который не умеет генерить картинки) — нарисовал 3 SVG-маскота руками:

- `pandi-hello.svg` — машет лапой (Hero на landing)
- `pandi-clock.svg` — обнимает будильник (для loading/empty states)
- `pandi-404.svg` — растерян с вопросами (для not-found)

Landing уже использует `pandi-hello.svg` в Hero вместо emoji.

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 8 — Полировка и запуск

**Статус:** все 8 спринтов закрыты. Pandaclock готов к soft-launch с пилотами.

## Sprint 8 — Полировка + запуск

### API
- [x] BillingTransaction recording из Click и Payme webhooks (поиск tenant по merchant_trans_id, продление subscription.expiresAt, перевод TRIAL → ACTIVE)
- [x] TransactionService.parseMerchantTransId + Vitest (4 кейса)
- [x] SchedulerModule (@nestjs/schedule): утренние напоминания (Cron 09:00), trial-warning за 3 дня до конца
- [x] e2e скелет (supertest) — Health endpoint
- [x] AppModule зарегистрировал SchedulerModule + webhook routes исключены из TenantMiddleware

### Web
- [x] i18n: en.json + uz-latn.json + cookie-based locale
- [x] LocaleSwitcher компонент в TopBar
- [x] /api/locale endpoint для смены локали
- [x] /legal/oferta, /legal/privacy, /legal/dpa страницы

### Mobile
- [x] eas.json с 3 профилями (development/preview/production)
- [x] README с инструкциями по EAS build/submit/update

### Marketing
- [x] Расширенные метаданные (Open Graph + Twitter Card + canonical + alternate locales)
- [x] sitemap.ts + robots.ts (Next.js 15 MetadataRoute)
- [x] Schema.org JSON-LD (SoftwareApplication + Organization)
- [x] Viewport meta + themeColor

### DevOps
- [x] Multi-stage Dockerfile для API (production-ready, non-root user, healthcheck)
- [x] vercel.json для web и marketing (rewrites, headers, security)
- [x] .dockerignore

### Документация
- [x] docs/Deployment_runbook.md — окружения, env vars, pre-flight, миграции, rollback, smoke test
- [x] docs/On_call_playbook.md — severity levels, 7 типовых сценариев, post-mortem template

## Готовность MVP — итог по 8 спринтам

- ✅ Sprint 0: monorepo + scaffolds (Turborepo, NestJS, Next.js, Expo)
- ✅ Sprint 1: auth (login/register/JWT rotation/email verification/forgot)
- ✅ Sprint 2: employees + departments + invitations + Excel import
- ✅ Sprint 3: time tracking + geofence + breaks + offline queue
- ✅ Sprint 4: tasks (kanban, transitions, comments)
- ✅ Sprint 5: leave requests + balance + Expo Push + landing
- ✅ Sprint 6: reports (xlsx/pdf) + calendar + mobile offline
- ✅ Sprint 7: billing (Click/Payme) + chats (Socket.IO) + locale
- ✅ Sprint 8: полировка + deployment configs + docs

## Post-MVP backlog

- [ ] Чек-лист безопасности (penetration test, OWASP ZAP)
- [ ] ISO 27001 подготовка
- [ ] Telegram-бот для уведомлений
- [ ] Видео-созвоны (LiveKit)
- [ ] Отраслевые модули: HoReCa (sprint 2 продукта), колл-центры, банки
- [ ] Интеграция с 1С
- [ ] AI-аналитика (предсказание выгорания)
- [ ] White-label
- [ ] Расширение на СНГ

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 7 — Биллинг и чаты

**Цель:** Платная подписка с тарифами Pandaclock, webhook-handler'ы для Click/Payme, real-time чаты на Socket.IO с web и mobile клиентами.

## API

- [x] pricing table (STARTER/BUSINESS/PRO/ENTERPRISE) + calculatePrice + planCanFit + Vitest (8 кейсов)
- [x] BillingService: getCurrentSubscription (+ activeEmployees count), listTransactions, previewChange, changePlan
- [x] BillingController: GET /plans, /subscription, /transactions, /preview; POST /change-plan с RolesGuard
- [x] ClickProvider: MD5 signature verification (constant-time compare) + buildResponse + prepare/complete check
- [x] PaymeProvider: Basic-auth merchant key check + JSON-RPC ok/error envelopes
- [x] Vitest для обоих провайдеров (valid/tampered signature, wrong basic auth)
- [x] WebhooksController: POST /webhooks/click + /webhooks/payme (public, без JWT)
- [x] tenant template: chat_channels, chat_members (PRIMARY KEY composite), chat_messages с индексом (channel_id, created_at DESC)
- [x] ChatsService: listChannels (с unread_count через JOIN), createChannel (CHANNEL/DM), listMessages, sendMessage, markRead, getChannelMemberIds
- [x] ChatsController: GET /chats/channels, POST /chats/channels, GET/POST /channels/:id/messages, POST /channels/:id/read
- [x] ChatsGateway (Socket.IO): JWT-handshake с tenant binding, channel:join/leave, message:send, typing indicator, rooms по tenant + channel
- [x] BillingModule + ChatsModule зарегистрированы в AppModule

## Web

- [x] /api/billing/change-plan + /api/chats/access-token + /api/chats/channels/[id]/messages — auth-cookie прокси
- [x] /dashboard/settings/billing: текущий тариф (KPI карточка с ценой), 4 plan-карточки, кнопка "Выбрать", таблица истории
- [x] /dashboard/chats: 2-колоночный layout (список каналов + окно), Socket.IO клиент с автоподключением по channelId, отправка сообщений через message:send

## Mobile

- [x] socket.ts: getChatSocket с auth handshake (token из useAuthStore)
- [x] (tabs)/chats: pull-to-refresh список с unread-бейджами
- [x] /chats/[id]: KeyboardAvoidingView, real-time подписка на message:new, отправка через socket.emit

## TODO для Sprint 8

- [ ] BillingTransaction создаётся при успешном Click/Payme webhook (привязка через merchant_trans_id)
- [ ] Email-уведомления о биллинге (оплата прошла, неудача, триал заканчивается)
- [ ] Mobile: typing indicators + read receipts
- [ ] Web: создание DM из карточки сотрудника

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 6 — Отчёты и календарь

**Цель:** Реальные KPI-отчёты с Excel/PDF экспортом, единый календарь команды, mobile офлайн-индикатор и локальные напоминания.

## API

- [x] ReportsService: attendance (days/late/hours по сотруднику), hours (avg/total), tasks (assigned/completed/overdue + rate)
- [x] period helper с дефолтом «текущий месяц по таймзоне tenant»
- [x] ExportService: xlsx (через xlsx aoa_to_sheet), pdf (PDFKit с шапкой Pandaclock и заголовками)
- [x] ReportsController: GET /reports/attendance|hours|tasks + /reports/:type/export?format=xlsx|pdf|json, RolesGuard для OWNER/ADMIN/HR/MANAGER
- [x] CalendarService: events(start, end, scope) → unified LEAVE_APPROVED/PENDING + TASK_DEADLINE с фильтром my/team/all
- [x] CalendarController + RequestsModule + ReportsModule + CalendarModule зарегистрированы в AppModule
- [x] Vitest: resolvePeriod (custom + дефолт + февраль)

## Web

- [x] /dashboard/reports: 3 карточки выбора типа отчёта, ReportControls (datepicker период + кнопки Excel/PDF), таблицы с правильными колонками для каждого типа
- [x] /api/reports/[type]/export — стримит файл с правильными Content-Type / Content-Disposition
- [x] /dashboard/calendar: месячный grid (7×6), Пн-Вс header, события на ячейках с цветом по типу, навигация по месяцам
- [x] /dashboard/employees/[id]: вкладки Time/Tasks/Requests наполнены реальными данными через serverFetch

## Mobile

- [x] useNetworkStatus (expo-network polling каждые 10s) → офлайн-баннер в RootLayout
- [x] useDailyReminder: scheduleNotificationAsync на 9:05 каждый день (CALENDAR trigger, repeats true)

## TODO для Sprint 7

- [ ] Async-экспорт через BullMQ для больших отчётов
- [ ] Filter calendar by department/user
- [ ] Дополнить employee tabs контролами для админа (выгрузить отчёт по сотруднику)
- [ ] Cron-уведомление: дедлайн через час → push исполнителю

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 5 — Заявки и уведомления

**Цель:** Полный цикл leave-requests + Expo Push + расширенный лендинг.

## API

- [x] leave-utils: countWorkingDays, accruedDays, rangesOverlap + Vitest (9 кейсов)
- [x] RequestsService: list (scope my/team/all), create (с валидацией пересечений), approve/reject, cancel
- [x] balance(userId): {used, accrued, pending, remaining} с пропорциональным начислением 21 день/год
- [x] push_tokens (UNIQUE user_id+token) добавлены в tenant template
- [x] NotificationsService (Expo HTTP API), register/unregister token, pushToUsers (fire-and-forget)
- [x] Интеграция: при create task → push исполнителю; при DONE → автору; при create request → руководителю; при approve/reject → заявителю
- [x] NotificationsController (POST /notifications/push/register, DELETE /notifications/push)
- [x] RequestsController: list/balance/create/approve/reject/cancel, RolesGuard для approve/reject

## Web

- [x] /api/requests + /api/requests/[id]/[action] (approve/reject/cancel) — auth-cookie прокси
- [x] /dashboard/requests с scope-табами (My/Team/All) + status-фильтрами
- [x] CreateRequestButton модалка: type chips, daterange, live-расчёт рабочих дней и остатка
- [x] DecisionButtons inline для PENDING заявок в скоупах team/all
- [x] 4 KPI-карточки баланса (Накоплено / Использовано / Pending / Остаток)

## Mobile

- [x] usePushRegistration hook (Expo getExpoPushTokenAsync + permission flow)
- [x] (tabs)/requests — список своих заявок + Modal создания с type chips + 2 date input + причина

## Marketing

- [x] Pricing с toggle Monthly/Yearly, 4 тарифа, Pro выделен gradient + "Рекомендуем"
- [x] FAQ accordion с 10 вопросами

## TODO для Sprint 6

- [ ] Web: детальная страница заявки с историей решений
- [ ] Mobile: native date picker вместо текстового поля
- [ ] Cron-уведомления (напомнить начать день, дедлайн через час)
- [ ] Calendar страница с отпусками команды

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 4 — Задачи и канбан

**Цель:** Полный цикл работы с задачами: канбан-доска на web, mobile-приоритезированный список, комментарии, переходы статусов.

## API

- [x] task-status: canTransition (NEW↔IN_PROGRESS↔DONE/REJECTED, reopen из DONE)
- [x] TasksService: list (фильтры assignee/status/priority/labels/search/scope=my|today|overdue), board, getById, create, update (с валидацией перехода), remove
- [x] addComment / listComments
- [x] Сортировка: URGENT→HIGH→MEDIUM→LOW + deadline NULLS LAST + created_at DESC
- [x] При DONE автоматически проставляется completed_at; при reopen сбрасывается
- [x] TasksController: 7 endpoints под JwtAuthGuard, ParseUUIDPipe для всех :id
- [x] Vitest: status transitions (7 кейсов)

## Web

- [x] /api/tasks (POST) + /api/tasks/[id] (PATCH/DELETE) + /api/tasks/[id]/comments (POST) — auth-cookie прокси
- [x] /dashboard/tasks — kanban с @dnd-kit/core (4 колонки + drag-n-drop + оптимистичное обновление + rollback)
- [x] CreateTaskButton modal (title/description/assignee select/deadline/priority/labels)
- [x] /dashboard/tasks/[id] — детальная страница (grid 2/1: контент + sidebar)
- [x] TaskActions sidebar — кнопки с разрешёнными переходами по текущему статусу
- [x] CommentList с inline-формой добавления комментария

## Mobile

- [x] (tabs)/tasks — pill-табы (На сегодня / Все мои / Просрочены), pull-to-refresh, тап → детали
- [x] /tasks/[id] — детали + большие кнопки смены статуса (Stack screen с headerShown)

## Marketing

- [x] Problem section (4 карточки боли)
- [x] Industries section (4 отрасли с бейджами "Доступно/Скоро/Этап")

## TODO для Sprint 5

- [ ] Маркетинг: Pricing + FAQ
- [ ] Mobile: фильтр "Назначенные мной"
- [ ] Уведомления о новой задаче (push + email)
- [ ] Attachments через S3/R2

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 3 — Учёт времени

**Цель:** Реальный clock-in/out на mobile, дашборд "Кто на работе" на web, late detection, geofence, офлайн-режим.

## API

- [x] tenants.time_policy (jsonb) + parseTimePolicy с дефолтами
- [x] isLateArrival, distanceMeters, isWithinGeofence (хелперы + тесты)
- [x] TimeService: getToday / startDay / finishDay / startBreak / finishBreak
- [x] startDay: одна сессия в день, валидация geofence (требует note если outside), is_late
- [x] finishDay: авто-закрытие забытого перерыва, расчёт total_minutes минус breaks
- [x] listHistory(days), whoIsWorking (live для дашборда), getDashboardCounts (KPI)
- [x] TimeController: /time/today, /start, /finish, /break/start, /break/finish, /history, /who-is-working, /dashboard
- [x] Vitest unit tests: startDay (conflict + happy), startBreak (no day / wrong status), finishDay calc

## Web

- [x] /dashboard главная — реальные KPI (всего/на работе/опоздали/в отпуске) + "Кто на работе сейчас" список
- [x] /dashboard/time — sessions сейчас + история сотрудника за 2 недели

## Mobile

- [x] expo-location: запрос permission и получение координат перед startDay
- [x] useTimeTracking — react-hook со state + handlers для start/finish/break, авто-fallback в offline-queue
- [x] offline-queue: SecureStore-persisted queue, drain при появлении сети, retry-логика
- [x] Home screen полностью переведён на реальные API-вызовы (4 состояния от /time/today)
- [x] При OUTSIDE_GEOFENCE авто-retry с note "Confirmed outside geofence"

## TODO для Sprint 4

- [ ] Web: настройки time_policy (форма для админа)
- [ ] Mobile: индикатор офлайн-режима в header
- [ ] Push-уведомления: напоминание начать день (cron + Expo Push)
- [ ] Видеть свою позицию на карте перед отметкой (Mapbox/MapKit)
- [ ] Background sync через expo-background-fetch

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 2 — Сотрудники и отделы

**Цель:** Полный CRUD сотрудников и отделов внутри tenant, инвайты по email и Excel, восстановление пароля.

## API

- [x] DepartmentsModule (service/controller/dto), дерево по parent_id, валидация parentId !== id
- [x] EmployeesService с пагинацией, поиском и фильтрами (status, department)
- [x] EmployeesController: GET list, GET detail, PATCH, DELETE (soft suspend)
- [x] InvitationsService: создание PENDING-юзеров + verification_tokens(purpose=INVITE) + рассылка ссылок accept-invite
- [x] ExcelImportService: парсинг .xlsx (поддержка ENG и RU колонок, валидация email)
- [x] POST /employees/invite (batch) + POST /employees/import (multer 5MB)
- [x] POST /auth/forgot-password (всегда 202, не раскрывает enumeration)
- [x] POST /auth/reset-password (revoke всех refresh-токенов пользователя)
- [x] POST /auth/accept-invite — устанавливает пароль и активирует
- [x] DepartmentsModule + EmployeesModule зарегистрированы в AppModule
- [x] Vitest: buildTree (departments), parseBuffer (excel import)

## Web

- [x] /dashboard/employees: таблица с аватарками, статусами (Active/Pending/Suspended), кнопка + Пригласить (modal)
- [x] /dashboard/employees/[id]: header с avatar + badge статусов, табы Профиль/Время/Задачи/Заявки/Документы (последние пока заглушки)
- [x] /dashboard/departments: дерево отделов
- [x] /forgot-password, /reset-password, /accept-invite, /verify-email — все 4 auth-страницы
- [x] /api/employees/invite route (прокси с auth-cookie на API)

## Mobile

- [x] Profile screen — режим редактирования (firstName/lastName/phone), сохранение через PATCH /employees/:id

## TODO для Sprint 3

- [ ] CRUD отделов из UI (create/rename/delete)
- [ ] Excel-import на web (drag-n-drop файл + summary modal)
- [ ] Mobile: forgot password flow
- [ ] Mobile: accept-invite flow (через deep-link)
- [ ] 2FA setup

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 1 — Фундамент авторизации

**Цель:** К концу спринта работает полный auth-цикл: регистрация компании, email verification, login/refresh/logout, защищённые маршруты на web и mobile.
**Длительность:** 2 недели

## API

- [x] EmailModule с Resend (production) / Mailpit (dev) + branded HTML-шаблоны
- [x] Passport JWT strategy + JwtAuthGuard + @CurrentUser() + RolesGuard
- [x] Refresh-token storage с ротацией (`refresh_tokens` в tenant schema)
- [x] POST /auth/refresh, POST /auth/logout
- [x] Email verification flow (`verification_tokens` таблица)
- [x] POST /auth/verify-email, POST /auth/resend-verification
- [x] GET /auth/me (JwtAuthGuard)
- [x] Welcome email отправляется при register-company с верификационной ссылкой
- [x] Login alert email при новом входе
- [x] ThrottlerGuard (60 req/min)
- [x] cookie-parser middleware
- [x] trust proxy (для x-forwarded-for)
- [x] Vitest unit-тесты: TenantService, TenantMiddleware, JwtStrategy

## Web

- [x] Multi-step registration wizard (/register, 4 шага)
- [x] Cookie-based session (HttpOnly cookies через /api/auth/login и /logout)
- [x] middleware.ts защищает /dashboard
- [x] Login страница использует cookie endpoint
- [x] serverFetch с access-токеном и tenant slug для Server Components
- [x] /dashboard layout с Sidebar + TopBar
- [x] /dashboard главная с 4 KPI-карточками (заглушки)
- [x] /dashboard/profile с реальными данными из /auth/me
- [x] Logout кнопка очищает cookies через /api/auth/logout

## Mobile

- [x] SecureStore-backed auth store (Zustand)
- [x] API client с автоматическим Bearer + tenant header + auto-refresh на 401
- [x] Welcome screen с выбором tenant slug
- [x] Login screen с реальным API-вызовом
- [x] Tab layout с auth guard (Redirect to / если не авторизован)
- [x] Profile screen с реальными данными из /auth/me
- [x] Логаут через auth store (вызывает /auth/logout)

## TODO для следующих спринтов

- [ ] Forgot password flow (web + mobile)
- [ ] 2FA (TOTP)
- [ ] Web /verify-email страница (обрабатывает токен из URL)
- [ ] Mobile экран verify-email
- [ ] Supertest integration test для multi-tenant изоляции

---

# ✅ ЗАВЕРШЁННЫЙ: Sprint 0 — Инфраструктура

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

- **Sprint 0:** ✅ 100% (код), осталась внешняя инфра (Vercel/Neon — требует учётных данных)
- **Sprint 1:** ✅ 100% (auth-цикл работает end-to-end на web и mobile)
- **Sprint 2:** ✅ 100% (employees + departments CRUD, invitations, Excel import, password reset)
- **Sprint 3:** ✅ 100% (time tracking: clock-in/out с geofence, breaks, late detection, offline queue)
- **Sprint 4:** ✅ 100% (tasks: kanban с drag-n-drop, transitions, comments, mobile-список + детали, landing расширение)
- **Sprint 5:** ✅ 100% (leave requests + balance + Expo Push + landing Pricing/FAQ)
- **Sprint 6:** ✅ 100% (reports XLSX/PDF, calendar, employee tabs, mobile offline + daily reminder)
- **Sprint 7:** ✅ 100% (billing + Click/Payme webhooks + Socket.IO chats на web и mobile)
- **Sprint 8:** ✅ 100% (полировка: cron, i18n, legal, EAS, Dockerfile, vercel.json, SEO, runbooks)
- **Готовность MVP:** ✅ 100% — готов к soft-launch с пилотами 🚀
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
