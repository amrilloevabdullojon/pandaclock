# Demo-аккаунты Pandaclock

Готовый набор тестовых данных для локальной демонстрации. Загружается одной командой.

---

## Запуск

```bash
# 1. Поднять инфру
docker compose up -d

# 2. Применить миграции (один раз)
pnpm --filter @pandaclock/db prisma migrate dev

# 3. Запустить API
cd apps/api && pnpm build && pnpm start

# 4. В другом терминале: засеять demo-данные
DATABASE_URL="postgresql://pandaclock:dev@localhost:5433/pandaclock?schema=public" \
  node scripts/seed-demo.mjs
```

Скрипт идемпотентен — повторный запуск не дублирует tenants/пользователей.

---

## Пароль

**Для всех демо-аккаунтов:** `demo1234`

---

## Acme Bank — оригинальный e2e-тест

| Slug | `acmebank` |
| URL | `acmebank.pandaclock.uz` (или header `X-Tenant-Slug: acmebank`) |

| Роль  | Email              | Пароль        |
| ----- | ------------------ | ------------- |
| OWNER | `anna@acmebank.uz` | `password123` |

Здесь уже есть 1 задача, 1 заявка APPROVED (Анна сама себе утвердила), 1 рабочий день, 2+ записи в audit log.

---

## 🏢 Cloud IT Studio (IT)

| Slug | `cloudit` |
| URL | `cloudit.pandaclock.uz` |

| Роль     | Имя             | Email                | Должность        |
| -------- | --------------- | -------------------- | ---------------- |
| OWNER    | Максим Усманов  | `maksim@cloudit.uz`  | CEO              |
| HR       | Лайло Турдиева  | `laylo@cloudit.uz`   | HR-менеджер      |
| MANAGER  | Бахром Юлдашев  | `bakhrom@cloudit.uz` | Tech Lead        |
| EMPLOYEE | Анвар Каримов   | `anvar@cloudit.uz`   | Senior Frontend  |
| EMPLOYEE | Диана Хан       | `diana@cloudit.uz`   | Backend Engineer |
| EMPLOYEE | Эльдар Сулейман | `eldar@cloudit.uz`   | QA Engineer      |

**Отделы:** Разработка · QA · HR
**Заявка:** Анвар запросил отпуск 14-18 июня (PENDING — ждёт решения Максима)

---

## 🍽 Plov Palace (HoReCa)

| Slug | `plov-palace` |
| URL | `plov-palace.pandaclock.uz` |

| Роль     | Имя                  | Email                   | Должность   |
| -------- | -------------------- | ----------------------- | ----------- |
| OWNER    | Рустам Алиев         | `rustam@plovpalace.uz`  | Владелец    |
| MANAGER  | Дильшод Каримов      | `dilshod@plovpalace.uz` | Управляющий |
| HR       | Гульнара Назарова    | `gulnara@plovpalace.uz` | HR          |
| EMPLOYEE | Алишер Худайбергенов | `alisher@plovpalace.uz` | Шеф-повар   |
| EMPLOYEE | Зарина Тошева        | `zarina@plovpalace.uz`  | Официант    |
| EMPLOYEE | Шахзод Эргашев       | `shahzod@plovpalace.uz` | Официант    |

**Отделы:** Кухня · Зал · Бар

---

## 🏦 Узбекистан Банк (Finance)

| Slug | `uzbank` |
| URL | `uzbank.pandaclock.uz` |

| Роль     | Имя              | Email               | Должность                   |
| -------- | ---------------- | ------------------- | --------------------------- |
| OWNER    | Шерзод Расулов   | `sherzod@uzbank.uz` | Председатель правления      |
| HR       | Малика Юсупова   | `malika@uzbank.uz`  | Директор HR                 |
| MANAGER  | Камол Икромов    | `kamol@uzbank.uz`   | Начальник кредитного отдела |
| EMPLOYEE | Нозима Махмудова | `nozima@uzbank.uz`  | Кредитный специалист        |
| EMPLOYEE | Тимур Алимов     | `timur@uzbank.uz`   | Аналитик                    |

**Отделы:** Кредитный · Аналитика · Безопасность · HR

---

## Что внутри каждого tenant

Скрипт `scripts/seed-demo.mjs` для каждой компании создаёт:

- ✅ Tenant + schema через `POST /auth/register-company` (как настоящий пользователь)
- ✅ 3-4 отдела
- ✅ 5-6 сотрудников (с verified email, hire_date 180 дней назад)
- ✅ **5 задач** разных статусов и приоритетов
- ✅ **1 заявку на отпуск** в статусе PENDING
- ✅ **5 рабочих дней истории** для каждого extra-сотрудника
  (с ~20% вероятностью опоздания — для красивой статистики в `/reports`)

---

## Быстрый login через curl

```bash
# Получить JWT
ACCESS=$(curl -sS -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: cloudit" \
  -d '{"email":"maksim@cloudit.uz","password":"demo1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')

# Посмотреть свой профиль
curl -sS http://localhost:4000/api/v1/auth/me \
  -H "X-Tenant-Slug: cloudit" \
  -H "Authorization: Bearer $ACCESS"

# Все сотрудники
curl -sS http://localhost:4000/api/v1/employees \
  -H "X-Tenant-Slug: cloudit" \
  -H "Authorization: Bearer $ACCESS"

# Канбан-доска задач
curl -sS http://localhost:4000/api/v1/tasks/board \
  -H "X-Tenant-Slug: cloudit" \
  -H "Authorization: Bearer $ACCESS"

# Отчёт посещаемости за месяц
curl -sS "http://localhost:4000/api/v1/reports/attendance?start=2026-05-01&end=2026-05-31" \
  -H "X-Tenant-Slug: cloudit" \
  -H "Authorization: Bearer $ACCESS"
```

## Сброс данных

```bash
# Уронить всё (volumes удалятся)
docker compose down -v

# Поднять заново и засеять
docker compose up -d
pnpm --filter @pandaclock/db prisma migrate deploy
node scripts/seed-demo.mjs
```
