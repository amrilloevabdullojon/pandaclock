# On-call playbook

> Что делать при типовых инцидентах в production.

---

## Severity-levels

| Sev | Описание                                              | Реакция             | Кого будить           |
|-----|-------------------------------------------------------|---------------------|------------------------|
| 1   | Платформа недоступна для всех                          | < 15 мин            | Tech lead + CEO        |
| 2   | Недоступна крупная функция (login, clock-in)           | < 1 час             | Tech lead              |
| 3   | Деградация для части пользователей                     | < 4 часа            | Дежурный инженер       |
| 4   | Косметика, неудобство                                  | Сл. рабочий день    | Тикет в backlog        |

## Каналы мониторинга

- **Sentry** — все необработанные ошибки API/Web/Mobile
- **Vercel** — статус деплоев, билд-логи
- **Neon** — статус БД, CPU/IO метрики
- **Upstash** — статус Redis
- **Uptime monitor** (TODO: подключить) — внешние проверки `/health`

## Типовые сценарии

### 1. API падает на старте
**Симптомы:** `/health` не отвечает, в Vercel — failed deployment.

**Шаги:**
1. Открыть build logs в Vercel
2. Если жалоба на env vars — проверить Vercel project settings
3. Если жалоба на миграции — откатить последнюю миграцию и redeploy
4. Если ничего не понятно — `vercel rollback` на предыдущий рабочий деплой

### 2. Resend не доставляет email
**Симптомы:** пользователи жалуются что не приходит верификация.

**Шаги:**
1. Проверить Resend dashboard → Activity
2. Если bounced — проблема с email пользователя
3. Если quota exceeded — повысить план или подождать
4. Если SPF/DKIM failures — проверить DNS pandaclock.uz
5. Перезапросить ссылку: `POST /auth/resend-verification`

### 3. Click webhook вернул ошибку подписи
**Симптомы:** в логах `click signature mismatch`.

**Шаги:**
1. Проверить env var `CLICK_SECRET` совпадает с Click merchant cabinet
2. Проверить что body не модифицируется промежуточными прокси (Vercel rewrites)
3. Связаться с Click support

### 4. Tenant потерял доступ к данным
**Симптомы:** "ничего не отображается" после логина.

**Шаги:**
1. Проверить `public.tenants` — есть ли запись, какой `schemaName`
2. Подключиться к Neon, выполнить `\dn` — есть ли эта schema?
3. Если schema отсутствует — re-apply tenant template:
   ```sql
   CREATE SCHEMA "tenant_<slug>";
   SET search_path TO "tenant_<slug>";
   -- скопировать TENANT_TEMPLATE_SQL из packages/db/src/tenant-template.ts
   ```
4. Если schema есть, но запросы возвращают пусто — проверить `TenantMiddleware` логи

### 5. Push-уведомления не приходят
**Симптомы:** клиенты жалуются что нет уведомлений на телефоне.

**Шаги:**
1. Проверить токены в `tenant.push_tokens` — есть ли валидные `ExponentPushToken[...]`
2. В логах API искать `expo push delivery contained failures`
3. Проверить EAS dashboard → Push Receipts
4. Если 401 — обновить `EXPO_ACCESS_TOKEN`
5. Если DeviceNotRegistered — удалить токен и попросить пользователя перелогиниться

### 6. Mobile-приложение крашится
**Шаги:**
1. Найти crash в Sentry с фильтром `release:pandaclock@v0.x.0`
2. Если в native-коде — нужен hotfix через EAS Update (OTA не поможет)
3. Если в JS — выпустить EAS Update с фиксом
4. Уведомить пользователей в Telegram-канале

### 7. Tenant просрочил оплату
**Симптомы:** в `subscription.expiresAt` дата в прошлом, tenant жалуется на блокировку.

**Шаги:**
1. Проверить `billing_transactions` — последний платёж
2. Если платёж был но не зарегистрирован — проверить webhook логи
3. Вручную продлить:
   ```sql
   UPDATE public.subscriptions
   SET expires_at = expires_at + INTERVAL '1 month'
   WHERE tenant_id = '<id>';
   UPDATE public.tenants SET status = 'ACTIVE' WHERE id = '<id>';
   ```

## Post-mortem template

Для всех Sev 1-2 инцидентов:
1. **Что случилось** — короткое описание
2. **Хронология** (UTC): T0 — обнаружение, T+15 — диагностика, T+30 — фикс, T+60 — verify
3. **Root cause**
4. **Impact** — сколько tenant'ов / пользователей затронуто
5. **Action items** — что сделать чтобы не повторилось

Хранить в `docs/incidents/YYYY-MM-DD-short-name.md`.
