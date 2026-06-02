# 🐼 Pandaclock

HR-система, которая работает за вас. Учёт времени, задачи, чаты и отчёты для вашей команды — в одном понятном инструменте. Создано в Узбекистане.

---

## 📚 Документация

| Документ                                                   | Что внутри                   |
| ---------------------------------------------------------- | ---------------------------- |
| [docs/Техническое_задание.md](docs/Техническое_задание.md) | ЧТО строим                   |
| [docs/Технический_паспорт.md](docs/Технический_паспорт.md) | Архитектура + диаграммы + БД |
| [docs/Архитектура*и*стек.md](docs/Архитектура_и_стек.md)   | КАК строим                   |
| [docs/Roadmap_MVP.md](docs/Roadmap_MVP.md)                 | План по спринтам             |
| [docs/Дизайн_система.md](docs/Дизайн_система.md)           | Цвета, шрифты, токены        |
| [TASKS.md](TASKS.md)                                       | Текущие задачи разработки    |

Полный список — в папке [`docs/`](docs/).

---

## 🛠 Технический стек

- **Frontend Web:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Frontend Mobile:** Expo React Native, NativeWind
- **Backend:** NestJS, Prisma, PostgreSQL (multi-tenant)
- **Real-time:** Socket.IO
- **Очереди:** BullMQ + Redis
- **Хостинг MVP:** Vercel + Neon + Upstash + Cloudflare R2

См. [docs/Технический_паспорт.md](docs/Технический_паспорт.md) для полного списка.

---

## 🚀 Быстрый старт (для разработчиков)

### Требования

- Node.js 22+
- pnpm 9+
- Docker Desktop

### Установка

```bash
# 1. Клонировать репозиторий
git clone git@github.com:pandaclock/pandaclock.git
cd pandaclock

# 2. Установить зависимости
pnpm install

# 3. Запустить локальные сервисы (Postgres, Redis, MinIO, Mailpit)
docker compose up -d

# 4. Скопировать env-файлы
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
# (повторить для других apps)

# 5. Применить миграции
pnpm --filter @pandaclock/db prisma migrate dev

# 6. Запустить все приложения
pnpm dev
```

После запуска:

- **Web dashboard:** http://localhost:3000
- **Marketing landing:** http://localhost:3001
- **API:** http://localhost:4000
- **Mailpit UI** (тестовый SMTP): http://localhost:8025
- **MinIO Console** (файловое хранилище): http://localhost:9001
- **Mobile (Expo Go):** QR-код в терминале

---

## 📦 Структура репозитория (monorepo)

```
pandaclock/
├── apps/
│   ├── web/         # Next.js — dashboard
│   ├── marketing/   # Next.js — landing
│   ├── mobile/      # Expo React Native
│   └── api/         # NestJS — backend
├── packages/
│   ├── ui/          # shadcn/ui компоненты
│   ├── types/       # общие TS types
│   ├── config/      # eslint + tailwind + tsconfig
│   └── db/          # Prisma schema
├── docs/            # документация
└── .github/         # GitHub Actions
```

---

## 🧪 Тесты и качество кода

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Vitest
pnpm format        # Prettier (write)
pnpm format:check  # Prettier (check)
pnpm build         # Сборка всех приложений
```

Все эти проверки запускаются на CI для каждого PR.

---

## 🌍 Локализация

Поддерживаемые языки:

- 🇷🇺 Русский (основной)
- 🇺🇿 Узбекский (латиница)
- 🇺🇿 Узбекский (кириллица)
- 🇬🇧 Английский

Файлы переводов: `apps/web/messages/<locale>.json`.

---

## 📝 Лицензия

UNLICENSED — proprietary software. © 2026 Pandaclock LLC.

---

## 🤝 Контрибуция

Для участия — см. [CONTRIBUTING.md](CONTRIBUTING.md).
