import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config для apps/web.
 *
 * Перед запуском должны быть подняты:
 *  - Postgres + MinIO (docker compose up -d postgres minio)
 *  - API (apps/api): pnpm --filter @pandaclock/api dev   → :4000
 *  - Тенант cloudit с seed-сотрудниками (демо-аккаунты)
 *
 * Web Playwright поднимает сам через webServer.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // тесты делят cookies/login flow
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "ru-RU",
    timezoneId: "Asia/Tashkent",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_SKIP_WEB
    ? undefined
    : {
        command: "pnpm dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
