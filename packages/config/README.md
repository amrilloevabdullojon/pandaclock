# @pandaclock/config

Общие конфигурации для всех приложений и пакетов Pandaclock.

## Использование

### Tailwind preset

```ts
// apps/web/tailwind.config.ts
import type { Config } from "tailwindcss";
import preset from "@pandaclock/config/tailwind";

export default {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
} satisfies Config;
```

### TypeScript

```json
// apps/api/tsconfig.json
{
  "extends": "@pandaclock/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

### ESLint

```js
// apps/web/eslint.config.js
import config from "@pandaclock/config/eslint/react";
export default config;
```

## Источник истины для дизайн-токенов

Все цвета и токены приведены в соответствие с [docs/Дизайн_система.md](../../docs/Дизайн_система.md). При изменении токенов обновлять оба источника одновременно.
