# AGENTS.md
## Инструкции для AI-агентов, работающих над Pandaclock

Этот файл — главный entry-point для любого AI-агента (Claude Code, OpenAI Codex, Cursor, и др.), работающего над проектом Pandaclock.

---

## 🎯 О проекте

**Pandaclock** — SaaS HR-система для управления командой и временем. Основной рынок — Узбекистан, перспектива — СНГ.

- **Мульти-tenancy:** schema-per-tenant в PostgreSQL
- **Целевые отрасли:** IT, HoReCa, колл-центры, банки
- **Бренд:** дружелюбная панда, фиолетово-синяя палитра, шрифт Nunito
- **Платформы:** Web (Next.js), Mobile iOS/Android (React Native + Expo)
- **Бэкенд:** NestJS + Prisma + PostgreSQL

## 📚 Обязательно прочитать перед работой

Все ключевые решения зафиксированы в `docs/`. Перед первым PR обязательно прочитать:

1. [docs/Техническое_задание.md](docs/Техническое_задание.md) — ЧТО строим
2. [docs/Архитектура_и_стек.md](docs/Архитектура_и_стек.md) — КАК строим
3. [docs/Roadmap_MVP.md](docs/Roadmap_MVP.md) — план по спринтам
4. [docs/Дизайн_система.md](docs/Дизайн_система.md) — цвета, шрифты, токены (Tailwind config)
5. [docs/Sprint_0_чеклист.md](docs/Sprint_0_чеклист.md) — инфраструктура

При работе над конкретными фичами также см.:
- [docs/Брифы_MVP_экранов.md](docs/Брифы_MVP_экранов.md) — детальные брифы экранов
- [docs/Брифы_основных_экранов.md](docs/Брифы_основных_экранов.md)
- [docs/Брифы_остальных_экранов.md](docs/Брифы_остальных_экранов.md)
- [docs/Email_шаблоны.md](docs/Email_шаблоны.md) — все системные письма
- [docs/Landing_page_бриф.md](docs/Landing_page_бриф.md)

---

## 🏗 Структура репозитория (monorepo)

```
pandaclock/
├── apps/
│   ├── web/         # Next.js — dashboard для tenants (acmebank.pandaclock.uz)
│   ├── marketing/   # Next.js — landing (pandaclock.uz)
│   ├── mobile/      # Expo React Native — для сотрудников
│   └── api/         # NestJS — backend
├── packages/
│   ├── ui/          # Общие React-компоненты (shadcn/ui base)
│   ├── types/       # Общие TypeScript types
│   ├── config/      # Общий eslint + tailwind + tsconfig
│   └── db/          # Prisma schema + миграции
├── docs/            # Все .md документы проекта
├── .github/         # GitHub Actions workflows
├── AGENTS.md        # Этот файл
├── CLAUDE.md        # Дополнительно для Claude Code
└── README.md
```

---

## 🔧 Технический стек (НЕ менять без обсуждения)

| Слой | Технология | Версия |
|------|-----------|--------|
| Язык | TypeScript | strict |
| Web | Next.js + App Router | 15+ |
| Mobile | Expo + React Native | SDK 52+ |
| Backend | NestJS | latest |
| ORM | Prisma | latest |
| БД | PostgreSQL | 16+ |
| Кэш | Redis (Upstash в MVP) | 7+ |
| Стили | Tailwind CSS + shadcn/ui | latest |
| Иконки | Lucide React | latest |
| Шрифт | Nunito (Google Fonts) | - |
| Формы | react-hook-form + zod | latest |
| State | Zustand + TanStack Query | latest |
| Очереди | BullMQ | latest |
| Real-time | Socket.IO | latest |
| Email | Resend | - |
| Платежи | Click, Payme (UZ) + Stripe (intl) | - |
| Хостинг MVP | Vercel + Neon + Upstash + Cloudflare R2 | - |
| Менеджер пакетов | pnpm | 9+ |
| Monorepo | Turborepo | latest |

---

## 📐 Правила кода

### Общие
- **Strict TypeScript** — никакого `any` без обоснования
- **Композиция > Наследование**
- **Маленькие функции** — лучше много мелких, чем одна большая
- **Никаких комментариев типа "// что делает"** — код должен говорить сам за себя
- Комментарии **только для "почему"** — нестандартные решения, костыли, баги фреймворка

### Naming
- Файлы: `kebab-case.ts` (`user-profile.tsx`, `tenant.service.ts`)
- React components: `PascalCase.tsx` (`UserProfile.tsx`)
- Переменные/функции: `camelCase`
- Константы: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase` (без префикса `I`)
- Enums: `PascalCase` (значения `SCREAMING_SNAKE_CASE`)

### Импорты — порядок
1. React/Next/Expo
2. Внешние библиотеки
3. Внутренние пакеты (`@pandaclock/ui`, `@pandaclock/types`)
4. Локальные модули (`./`, `../`)
5. Стили / типы

Между группами — пустая строка.

### Структура React-компонента
```typescript
// 1. Imports

// 2. Types
type Props = { ... };

// 3. Component
export function MyComponent({ ... }: Props) {
  // 4. Hooks
  // 5. Computed values
  // 6. Effects
  // 7. Handlers
  // 8. Render

  return ( ... );
}
```

### Backend (NestJS)
- Каждая фича = отдельный модуль (`UsersModule`, `TasksModule`)
- DTO с zod-валидацией
- Сервисы — бизнес-логика
- Контроллеры — только маршрутизация и DTO
- Все ошибки через `HttpException` или кастомные exception classes

---

## 🔐 Multi-tenancy — критически важно

**ВСЕ запросы к БД должны учитывать tenant.** Это основа SaaS-изоляции.

### Как работает
1. Запрос приходит на `<subdomain>.pandaclock.uz`
2. `TenantMiddleware` извлекает subdomain → находит tenant в `public.tenants`
3. Устанавливает `search_path` в PostgreSQL на схему этого tenant
4. Все Prisma-запросы автоматически работают с правильной схемой

### Правила
- **НИКОГДА** не делать запросы к данным клиентов из `public` schema напрямую
- **НИКОГДА** не использовать tenant ID для фильтрации (используем schema isolation)
- При создании нового tenant — обязательно создавать его schema и применять template
- Все интеграционные тесты должны проверять что данные одного tenant не утекают в другой

См. детали: [docs/Архитектура_и_стек.md](docs/Архитектура_и_стек.md) раздел 3.

---

## 🧪 Тесты

- **Unit:** Vitest для всех packages и apps
- **Integration:** Vitest + real Postgres + Redis (через docker-compose)
- **E2E web:** Playwright
- **E2E mobile:** Maestro

**Покрытие минимум 60%** для бизнес-логики. UI можно тестировать на key paths.

Перед PR обязательно:
```bash
pnpm lint && pnpm typecheck && pnpm test
```

---

## 🚀 Workflow для AI-агентов

### Цикл разработки фичи

1. **Прочитать соответствующий бриф** в `docs/`
2. **Определить touched modules** — какие apps/packages меняем
3. **Создать ветку:** `git checkout -b feature/short-description`
4. **Реализовать:**
   - Backend: types в `packages/types` → DTO → service → controller → tests
   - Frontend: types → UI component → page → integration → tests
5. **Локально проверить:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
6. **Commit с conventional commits:** `feat: add time tracking endpoint`
7. **Создать PR** с описанием по шаблону
8. **CI должен пройти** — иначе фиксим

### Conventional Commits

- `feat:` новая фича
- `fix:` багфикс
- `chore:` рутина (зависимости, конфиги)
- `docs:` документация
- `refactor:` рефакторинг без смены поведения
- `test:` тесты
- `perf:` оптимизация
- `style:` форматирование, без логики

---

## ❌ Чего НЕ делать

- ❌ Не использовать Bootstrap / Material UI (только Tailwind + shadcn/ui)
- ❌ Не использовать Axios (есть встроенный `fetch` в Next.js / native fetch)
- ❌ Не использовать Moment.js (используем `date-fns`)
- ❌ Не использовать Redux (используем Zustand)
- ❌ Не использовать Express напрямую (используем NestJS)
- ❌ Не использовать `any`, `as any`, `// @ts-ignore`
- ❌ Не коммитить `.env` файлы
- ❌ Не игнорировать ошибки линтера / TypeScript
- ❌ Не делать прямые SQL-запросы (только через Prisma)
- ❌ Не использовать `console.log` в production-коде (используем Pino logger)
- ❌ Не создавать новые .md документы без причины — расширять существующие

---

## 🌍 Локализация

- **Основной язык интерфейса:** русский
- **Дополнительные:** узбекский (латиница), узбекский (кириллица), английский
- **Библиотека:** `next-intl` для web, `expo-localization` + `i18n-js` для mobile
- **Все user-facing строки** через `t('key')` — никаких хардкоженных русских строк

Файлы локализации: `apps/web/messages/ru.json`, `uz-latn.json`, и т.д.

---

## 🎨 Дизайн-токены

Все цвета, шрифты, радиусы, тени — в `packages/config/tailwind.config.ts`.

Источник истины: [docs/Дизайн_система.md](docs/Дизайн_система.md).

Никогда не использовать "магические" значения цвета/размера в коде — только через Tailwind-классы.

---

## 📦 Управление зависимостями

- **Только pnpm.** Не использовать npm/yarn.
- Добавление зависимости в конкретное приложение:
  ```bash
  pnpm add <package> --filter @pandaclock/web
  ```
- Workspace зависимости через `workspace:*`:
  ```json
  "@pandaclock/ui": "workspace:*"
  ```
- Перед добавлением новой зависимости — проверить не делает ли это уже существующая
- Не добавлять зависимости с лицензиями GPL, AGPL (только MIT, Apache 2.0, BSD)

---

## 🔄 Текущее состояние проекта

**Спринт:** Sprint 0 (инфраструктура)

**Следующая задача:** см. [TASKS.md](TASKS.md) или GitHub Issues

**Что работает:**
- _(заполнить когда что-то заработает)_

**Что в процессе:**
- _(заполнить из активных PR)_

---

## 💬 Коммуникация

- **PR-ревью:** друг AI-агент проверяет PR другого (по запросу человека)
- **Сложные решения:** документируем как ADR (Architecture Decision Records) в `docs/adr/`
- **Вопросы к человеку:** оставляем `// HUMAN-REVIEW:` в коде или в PR-описании
- **Не уверены — спрашиваем** (это разумнее чем тратить время на неверное решение)
