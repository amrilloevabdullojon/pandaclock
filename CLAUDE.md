# CLAUDE.md
## Дополнительные инструкции для Claude Code

> **Сначала прочитать [AGENTS.md](AGENTS.md)** — там общие правила для всех AI-агентов.
> Этот файл — дополнения специфично для Claude Code.

---

## Стиль работы Claude в этом проекте

### Перед началом задачи
1. Прочитать AGENTS.md (если ещё не читал в этой сессии)
2. Прочитать соответствующий бриф в `docs/` (например, для Sprint 1 → `Roadmap_MVP.md` → Sprint 1)
3. Просмотреть текущую структуру `apps/` и `packages/` через `ls`
4. Понять что уже существует, что нужно добавить

### Во время работы
- Делать **маленькие, фокусированные коммиты** — один коммит = одна логическая единица
- Если задача большая — разбивать на несколько коммитов внутри одной ветки
- Перед коммитом ВСЕГДА запускать `pnpm lint && pnpm typecheck`
- При обнаружении бага в чужом коде — отдельный коммит/PR, не смешивать

### После завершения
- Запустить полный тестовый прогон
- Обновить `TASKS.md` или закрыть GitHub Issue
- Если что-то заработало впервые — обновить раздел "Что работает" в AGENTS.md

---

## Полезные команды (как запускать)

### Установка зависимостей
```bash
pnpm install
```

### Локальный запуск
```bash
# Все приложения сразу
pnpm dev

# Только web
pnpm --filter @pandaclock/web dev

# Только API
pnpm --filter @pandaclock/api dev

# Только mobile
pnpm --filter @pandaclock/mobile dev
```

### База данных
```bash
# Применить миграции в dev
pnpm --filter @pandaclock/db prisma migrate dev

# Сгенерировать Prisma Client
pnpm --filter @pandaclock/db prisma generate

# Открыть Prisma Studio
pnpm --filter @pandaclock/db prisma studio

# Сбросить БД (только локально!)
pnpm --filter @pandaclock/db prisma migrate reset
```

### Проверки
```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Vitest
pnpm build         # Сборка всех приложений
```

### Docker (локальные сервисы)
```bash
docker compose up -d        # Запустить Postgres + Redis + MinIO + Mailpit
docker compose down         # Остановить
docker compose logs -f      # Смотреть логи
```

---

## Где что искать

| Что | Где |
|-----|-----|
| Дизайн-токены | `packages/config/tailwind.config.ts` |
| Общие UI-компоненты | `packages/ui/src/` |
| Общие TypeScript types | `packages/types/src/` |
| Prisma schema | `packages/db/prisma/schema.prisma` |
| API endpoints | `apps/api/src/<module>/` |
| Web страницы | `apps/web/app/` |
| Mobile экраны | `apps/mobile/app/` |
| Локализация web | `apps/web/messages/` |
| Email шаблоны | `apps/api/src/emails/templates/` |

---

## Известные особенности проекта

### Multi-tenant в Prisma
Стандартный Prisma Client не поддерживает динамическое переключение `search_path`. Мы используем кастомный `TenantPrismaService` (см. `apps/api/src/tenant/tenant-prisma.service.ts`), который перед каждым запросом устанавливает правильную схему.

### Mobile push-уведомления
Используем Expo Push Notifications (не FCM/APN напрямую). Это упрощает разработку, но имеет лимит ~600 notifications/sec — для MVP достаточно.

### Платежи Click/Payme
Эти интеграции имеют **специфику** — webhook'и приходят на специальные URL'ы, требуется ручная верификация подписи. См. `apps/api/src/billing/providers/`.

---

## Что приоритетнее: скорость или качество?

**Качество** — на этапе MVP закладываем фундамент, который будет жить годами. Один лишний день на правильную архитектуру сейчас = неделя сэкономлена позже.

Но **не over-engineering**. Не строить абстракции "на будущее". YAGNI работает.

**Правило:** если фича работает, покрыта тестами, читаема и не нарушает архитектурные принципы — этого достаточно.

---

## Когда стоит уточнить у человека

Создаём `// HUMAN-REVIEW: <вопрос>` в коде или сообщаем в чат, если:

- Изменяем что-то в `AGENTS.md` (контракт между агентами)
- Меняем структуру БД радикально (rename таблиц, миграции данных)
- Добавляем новые зависимости из категорий: payments, auth, encryption
- Делаем что-то связанное с юридической частью или ПД
- Архитектурное решение, не описанное в `docs/Архитектура_и_стек.md`

---

## Контакты в случае проблем

- Project owner / Product: [имя, telegram]
- Tech questions: см. `docs/Архитектура_и_стек.md` и `AGENTS.md`
- Дизайн: см. `docs/Дизайн_система.md`
