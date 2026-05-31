# GitHub Secrets — настройка CI/CD

После того как репозиторий запушен на GitHub, нужно добавить секреты для
автоматического деплоя из `.github/workflows/deploy.yml`.

**Settings → Secrets and variables → Actions** в репо.

## Repository Secrets (обязательные)

### Для деплоя API на fly.io

| Имя             | Где взять                                                           |
| --------------- | ------------------------------------------------------------------- |
| `FLY_API_TOKEN` | `flyctl auth token` в терминале (нужен `flyctl auth login` сначала) |

### Для деплоя Web на Vercel

| Имя                 | Где взять                                          |
| ------------------- | -------------------------------------------------- |
| `VERCEL_TOKEN`      | https://vercel.com/account/tokens → Create Token   |
| `VERCEL_ORG_ID`     | `cat apps/web/.vercel/project.json` → поле `orgId` |
| `VERCEL_PROJECT_ID` | то же место → поле `projectId`                     |

## Repository Variables (опциональные)

`Settings → Secrets and variables → Actions → Variables` (НЕ Secrets):

| Имя                  | Значение | Что включает            |
| -------------------- | -------- | ----------------------- |
| `DEPLOY_API_ENABLED` | `true`   | Деплой API на main push |
| `DEPLOY_WEB_ENABLED` | `true`   | Деплой Web на main push |

По умолчанию деплой работает только для owner-репо. Variables нужны
если хочешь включить на форке/чужом репо.

## Как проверить что работает

1. Запушь любой коммит в `main`
2. Открой **Actions** в GitHub UI
3. Должны появиться 2 джобы: `Deploy API to fly.io` и `Deploy Web to Vercel`
4. После успеха — открой `pandaclock-api-staging.fly.dev/api/v1/health`
   (должна быть новая версия) и Vercel URL — тоже свежий

## Ручной запуск

В GitHub UI → **Actions → Deploy → Run workflow** (кнопка справа).

## Откат

Fly: `flyctl releases --app pandaclock-api-staging` → `flyctl releases rollback <version>`
Vercel: в UI → Deployments → клик на нужный → "Promote to Production"

## Что НЕ деплоится автоматом

- **Mobile (Expo)** — деплоится вручную через `eas build`. Можно автоматизировать
  через GitHub Action `expo/expo-github-action`, но preview-билды требуют ~20 мин
  и стоят credits, поэтому каждый push в main — слишком дорого. Лучше тегировать
  релизы и деплоить по тегам.
- **Marketing** — отдельный Vercel-проект, аналогично web (добавить
  `deploy-marketing` job по той же схеме).
