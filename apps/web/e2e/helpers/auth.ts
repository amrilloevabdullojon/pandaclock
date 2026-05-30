import type { Page } from "@playwright/test";

export interface DemoAccount {
  email: string;
  password: string;
  role: "OWNER" | "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";
  firstName: string;
}

/**
 * Seed-аккаунты из /scripts/seed-cloudit.ts.
 * Пароль одинаковый: demo1234.
 */
export const ACCOUNTS = {
  owner: {
    email: "maksim@cloudit.uz",
    password: "demo1234",
    role: "OWNER",
    firstName: "Максим",
  },
  hr: { email: "laylo@cloudit.uz", password: "demo1234", role: "HR", firstName: "Лайло" },
  manager: {
    email: "bakhrom@cloudit.uz",
    password: "demo1234",
    role: "MANAGER",
    firstName: "Бахром",
  },
  employee: {
    email: "anvar@cloudit.uz",
    password: "demo1234",
    role: "EMPLOYEE",
    firstName: "Анвар",
  },
} as const satisfies Record<string, DemoAccount>;

/**
 * Логин через UI-форму на /login.
 * После успеха редирект на /dashboard.
 */
export async function login(page: Page, acc: DemoAccount): Promise<void> {
  await page.goto("/login");
  // /login содержит tenant-picker — выбираем cloudit
  const tenantInput = page.getByLabel(/тенант|компани/i).first();
  if (await tenantInput.isVisible().catch(() => false)) {
    await tenantInput.fill("cloudit");
  }
  await page.getByLabel(/email|почта/i).fill(acc.email);
  await page.getByLabel(/пароль/i).fill(acc.password);
  await page.getByRole("button", { name: /войти|вход/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Прямой logout через API-route + сброс cookies — для быстрого переключения акков
 * между тестами.
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
}
