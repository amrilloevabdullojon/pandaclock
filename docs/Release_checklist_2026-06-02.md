# Release checklist — 2026-06-02

> Все висяки после полировки G + H + I-пакетов. Когда всё ниже отмечено —
> staging готов к раздаче тестерам.

Коммиты этого релиза:

- `d95fc38` — I2 Inline comments
- `ec00372` — I5+I6 Departments drag-drop + mobile
- `d35c745` — #18 Восстановить skipped тесты
- `2f6ba60` — I4 Tasks attachments
- `9302798` — I1 Subtasks

---

## 0. Дождаться зелёного CI

Проверить, что все три workflow прошли на последнем коммите `9302798`:

- [ ] **CI** (lint + typecheck + test) — https://github.com/amrilloevabdullojon/pandaclock/actions
- [ ] **Deploy web** (Vercel) — должен задеплоить новый build
- [ ] **Deploy api** (fly) — должен прокатить новый Docker

Если что-то красное — фиксим до перехода дальше.

---

## 1. Vercel Authentication выкл. (КРИТИЧНО)

**Симптом без этого:** все тестеры получают `401 Authentication Required` при заходе на staging.web — даже залогиниться не могут.

Шаги:

1. https://vercel.com/dashboard → выбрать проект **pandaclock-web**
2. **Settings** → **Deployment Protection** (раньше называлось «Vercel Authentication»)
3. Переключить **Vercel Authentication** в **Off** для всех окружений (Production + Preview)
4. Save

**Проверка:** открыть https://pandaclock-web-iota.vercel.app в инкогнито — должна открыться страница логина (а не Vercel SSO).

- [ ] Готово

---

## 2. R2 bucket `attachments` (для I4)

**Симптом без этого:** загрузка файла в задачу падает с `UPLOAD_FAILED` (S3 говорит «NoSuchBucket»).

Шаги:

1. https://dash.cloudflare.com → **R2** → **Create bucket**
2. Имя: **`attachments`**, location — **Automatic**
3. Открыть bucket → **Settings** → **Public access** → **Allow Access**
   (нужно для inline-просмотра PDF и images без подписи URL)
4. CORS: добавить policy (Settings → CORS Policy → JSON):
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

**Проверка:** в Pandaclock UI открыть любую задачу → вложить файл → должен появиться в списке без ошибки.

- [ ] Готово

---

## 3. Миграция БД: subtasks (для I1)

**Симптом без этого:** `GET /tasks/:id/subtasks` отдаёт 500 для существующих tenants (cloudit, plov-palace, uzbank). Новые tenants получат таблицу сразу при регистрации — для них миграция не нужна.

Команда (выполняется ОДИН раз, локально с production DATABASE_URL):

```bash
cd /Users/panda/Documents/GitHub/hr-crm
DATABASE_URL='postgresql://...neon.tech/...' \
  pnpm --filter @pandaclock/db apply-tenant-migration \
  migrations-tenant/2026-06-02-subtasks.sql
```

Ожидаемый вывод:

```
Found 3 tenants. Migrating: migrations-tenant/2026-06-02-subtasks.sql
  ✓ cloudit (tenant_cloudit)
  ✓ plov-palace (tenant_plov_palace)
  ✓ uzbank (tenant_uzbank)

Done. 3 tenants migrated.
```

Скрипт **идемпотентный** (`CREATE TABLE IF NOT EXISTS`) — безопасно повторить.

**Проверка:** в Pandaclock UI открыть задачу → добавить «Подзадачу» → должна сохраниться.

- [ ] Готово

---

## 4. fly secrets

```bash
fly secrets set ATTACHMENTS_BUCKET=attachments -a pandaclock-api-staging
```

После этого API перезапустится автоматически (~30 сек).

**Проверка:** в `/api/v1/health` Status 200 ok + загрузка attachment работает.

- [ ] Готово

---

## 5. APK для тестера Макса

```bash
cd apps/mobile
eas build --profile preview --platform android
```

EAS вернёт URL — отправить Максу.

Если `eas login` ругается — `eas whoami` и при необходимости `eas login`.

- [ ] Билд запущен
- [ ] APK отправлен Максу

---

## 6. Ротация R2 + Neon секретов

> Креды светились в чате при разработке — нужно сменить и обновить fly.

### 6.1 R2

1. https://dash.cloudflare.com → R2 → **API tokens** → создать новый token со scope:
   - Object read & write
   - Buckets: avatars + attachments
2. Сохранить **Access Key ID** + **Secret Access Key** (показывается один раз!)
3. Удалить старый token из R2
4. Обновить fly:
   ```bash
   fly secrets set \
     MINIO_ACCESS_KEY=<new-key> \
     MINIO_SECRET_KEY=<new-secret> \
     -a pandaclock-api-staging
   ```

- [ ] R2 ротация готова

### 6.2 Neon

1. https://console.neon.tech → проект → **Connection details**
2. **Reset password** для production-роли
3. Скопировать новую connection string
4. Обновить fly:
   ```bash
   fly secrets set DATABASE_URL='postgresql://...' -a pandaclock-api-staging
   ```

⚠️ ВНИМАНИЕ: после reset password старая connection string умрёт — fly перезапустится с новой автоматически (~30s), за это время API даст 503.

- [ ] Neon ротация готова

### 6.3 GitHub Actions secrets

Те же значения нужно обновить в GitHub:

1. https://github.com/amrilloevabdullojon/pandaclock/settings/secrets/actions
2. Update: `DATABASE_URL`, `R2_ACCESS_KEY`, `R2_SECRET_KEY` (если есть)

- [ ] GH secrets обновлены

---

## 7. (опц.) Sentry → Slack

1. Sentry → **Settings** → **Integrations** → **Slack** → Install
2. Выбрать workspace + канал (например `#pandaclock-alerts`)
3. Sentry **Alerts** → создать rule:
   - When: An issue is first seen
   - Filter: env = production OR staging
   - Action: Send Slack notification to `#pandaclock-alerts`

- [ ] Sentry Slack настроен

---

## Smoke-test после всего

В браузере на https://pandaclock-web-iota.vercel.app (или текущий URL):

- [ ] Логин с demo-аккаунтом (cloudit / `owner@cloudit.uz` / `demo1234`)
- [ ] Создать задачу → проверить что есть Подзадачи + Вложения секции
- [ ] Добавить подзадачу → отметить done
- [ ] Загрузить PDF в задачу → открыть → удалить
- [ ] Открыть страницу Отделы → drag-drop отдел между уровнями
- [ ] Открыть APK → проверить тот же flow

Если всё зелёное — **раздавать**.
