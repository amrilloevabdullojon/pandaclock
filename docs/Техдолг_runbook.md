# Техдолг — что осталось сделать вручную

> Код-часть закрыта (коммиты `a1bd244`, `8b406ba`). Ниже — **2 пункта,
> которые делаются в внешних дашбордах / DNS**, кодом их не закрыть.

---

## ✅ Уже сделано в коде

| Что                                                                       | Коммит    |
| ------------------------------------------------------------------------- | --------- |
| Убраны debug-`console.log` из ChatsGateway → штатный logger               | `a1bd244` |
| Фикс React #418 hydration на login (год в `suppressHydrationWarning`)     | `a1bd244` |
| Email-отправка non-fatal — Resend test-mode не роняет login/invite/reset  | `8b406ba` |
| Чат полностью работает (singleton gateway, polling, schema-qualified SQL) | `e78ea5e` |

---

## 1. Верификация домена в Resend (письма реальным юзерам)

**Симптом:** сейчас письма (инвайты, verification, password-reset, login-alert)
уходят **только** на `amrilloevabdullojon@gmail.com`. Любой другой адрес
Resend отбивает с `validation_error` — потому что домен `pandaclock.uz`
не верифицирован.

> Бизнес-флоу больше **не падает** (фикс `8b406ba`) — юзер создаётся,
> логинится; просто письмо до него не доходит. Для реальной раздачи
> нужна верификация.

### Шаги

1. https://resend.com/domains → **Add Domain** → `pandaclock.uz`
2. Resend покажет **DNS-записи** (3-4 штуки): TXT для SPF, TXT/CNAME для
   DKIM, иногда MX для bounce. Скопировать их.
3. Cloudflare → DNS → `pandaclock.uz` → добавить каждую запись как есть
   (Type / Name / Content из Resend).
4. Вернуться в Resend → **Verify** (DNS пропагируется 5-60 мин).
5. После verified — письма пойдут всем. `EMAIL_FROM=noreply@pandaclock.uz`
   уже выставлен в fly secrets, менять не нужно.

**Проверка:** залогиниться demo-аккаунтом `maksim@cloudit.uz` → в логах
fly не должно быть `Resend send failed`; на почту придёт login-alert.

- [ ] Готово

---

## 2. Ротация секретов (R2 + Neon)

**Симптом:** R2 access/secret и Neon connection string ранее светились в
переписке. Надо сменить, чтобы старые значения стали бесполезны.

### 2.1 R2

1. https://dash.cloudflare.com → R2 → **Manage API Tokens** → создать
   новый token (Object Read & Write, buckets: avatars + attachments).
2. Скопировать новые **Access Key ID** + **Secret Access Key**.
3. Удалить (Revoke) старый token.
4. Обновить fly:
   ```bash
   fly secrets set \
     MINIO_ACCESS_KEY='<new>' \
     MINIO_SECRET_KEY='<new>' \
     -a pandaclock-api-staging
   ```

- [ ] R2 ротация готова

### 2.2 Neon

1. https://console.neon.tech → проект → **Roles** → у production-роли
   **Reset password**.
2. Скопировать новую connection string.
3. ```bash
   fly secrets set DATABASE_URL='postgresql://...neon.tech/...' -a pandaclock-api-staging
   ```
   ⚠️ После reset старая строка умрёт — fly перезапустится автоматически
   (~30s даунтайма).

- [ ] Neon ротация готова

### 2.3 GitHub Actions secrets (если CI их использует)

https://github.com/amrilloevabdullojon/pandaclock/settings/secrets/actions
— обновить `DATABASE_URL` и R2-ключи, если они там продублированы.

- [ ] GH secrets обновлены

---

## Опционально (не блокеры)

| Что                             | Зачем                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| WebSocket вместо polling на fly | Сейчас чат на long-polling (работает). WS эффективнее, но fly-proxy отдаёт 400 на upgrade — нужна донастройка. |
| Resend bounce/complaint webhook | Отслеживать недоставленные письма                                                                              |
| Sentry → Slack                  | Алерты об ошибках в канал                                                                                      |
