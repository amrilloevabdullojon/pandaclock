# CONTRIBUTING.md

> Если вы AI-агент — обязательно сначала прочитайте [AGENTS.md](AGENTS.md).

---

## Процесс работы

1. **Выбрать задачу** из [TASKS.md](TASKS.md) или GitHub Issues
2. **Создать ветку** от `dev`:
   ```bash
   git checkout dev && git pull
   git checkout -b feature/short-description
   ```
3. **Реализовать**
4. **Локальные проверки:**
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```
5. **Коммит** по [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(api): add tenant registration endpoint"
   ```
6. **Push + Pull Request** в `dev`
7. **Review** (другим AI-агентом или человеком)
8. **Merge** после прохождения CI

---

## Conventional Commits

| Префикс | Когда использовать |
|---------|--------------------|
| `feat:` | Новая фича |
| `fix:` | Багфикс |
| `chore:` | Рутина (зависимости, конфиги) |
| `docs:` | Документация |
| `refactor:` | Рефакторинг без смены поведения |
| `test:` | Тесты |
| `perf:` | Оптимизация |
| `style:` | Форматирование, без логики |
| `ci:` | Изменения в CI/CD |

**Scope** (опционально): `feat(api):`, `fix(web):`, `chore(deps):`.

---

## Ветки

- `main` — production (защищённая)
- `staging` — pre-production
- `dev` — основная для разработки
- `feature/*` — фичи (мерж в `dev`)
- `hotfix/*` — срочные багфиксы (мерж в `main` и `dev`)

---

## Code style

- TypeScript strict mode
- ESLint + Prettier (запускаются автоматически через Husky)
- Файлы — `kebab-case.ts`, компоненты — `PascalCase.tsx`
- Нет `any`, `// @ts-ignore` без обоснования
- Нет `console.log` в production-коде

См. [AGENTS.md](AGENTS.md) → "Правила кода" для деталей.

---

## Тесты

- **Unit:** Vitest для всех packages и apps
- **Integration:** Vitest + real Postgres
- **E2E web:** Playwright
- **E2E mobile:** Maestro

Покрытие минимум 60% для бизнес-логики.

---

## Что должно быть в PR

- ✅ Соответствует одному из шаблонов (`.github/pull_request_template.md`)
- ✅ Все CI-проверки зелёные
- ✅ Тесты добавлены (если новая фича / багфикс)
- ✅ Документация обновлена (если нужно)
- ✅ TASKS.md обновлён (если завершена задача спринта)
- ✅ Multi-tenant safety (если backend)

---

## Контакты

- Project owner: [имя]
- Технические вопросы: см. [AGENTS.md](AGENTS.md) и [docs/](docs/)
