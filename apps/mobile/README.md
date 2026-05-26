# @pandaclock/mobile

Expo React Native приложение для сотрудников Pandaclock.

## Запуск локально

```bash
cd apps/mobile
cp .env.example .env.local      # Заполнить EXPO_PUBLIC_API_URL
pnpm install
pnpm dev
```

Откроется Expo Dev Tools. Сканируйте QR-код в Expo Go (iOS/Android) или нажмите `i` / `a` для симуляторов.

## Build через EAS

```bash
# Логин
npx eas-cli login

# Регистрация проекта (первый раз)
npx eas-cli init

# Development build
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile development --platform android

# Preview (для пилотов)
npx eas-cli build --profile preview --platform all

# Production (для App Store / Google Play)
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform all
```

## Профили в `eas.json`

- **development** — debug, dev-client, локальный API
- **preview** — release, internal distribution, staging API
- **production** — release, auto-incremented version, prod API

## Push-уведомления

Регистрация происходит автоматически через `usePushRegistration` после логина (см. `lib/use-push-notifications.ts`). Project ID берётся из `expoConfig.extra.eas.projectId` — заполняется при `eas init`.

## Перед submit в стор

- [ ] Указать настоящий `bundleIdentifier` и `package` в `app.json`
- [ ] Сгенерировать иконки и сплеш через `npx expo-splash-screen`
- [ ] Подготовить скриншоты для App Store / Google Play
- [ ] Заполнить privacy manifest (iOS 17+)
- [ ] Заполнить data safety section в Google Play
- [ ] Связать Apple Developer ID и Google Play Service Account
