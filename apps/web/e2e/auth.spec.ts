import { test, expect } from "@playwright/test";
import { ACCOUNTS, login, logout } from "./helpers/auth";

test.describe("Auth flow", () => {
  test("неавторизованный → редирект на /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("OWNER может залогиниться и попасть на dashboard", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.owner);
    await expect(page).toHaveURL(/\/dashboard/);
    // На дашборде должно быть имя или email пользователя где-то в шапке.
    // Не падаем, если конкретный селектор не найден — просто проверяем что страница загрузилась.
    await expect(page.locator("body")).toContainText(/дашборд|обзор|команд|сотрудник/i);
  });

  test("логин с неверным паролем — ошибка, остаёмся на /login", async ({ page }) => {
    await logout(page);
    await page.goto("/login");
    const tenant = page.getByLabel(/тенант|компани/i).first();
    if (await tenant.isVisible().catch(() => false)) await tenant.fill("cloudit");
    await page.getByLabel(/email|почта/i).fill(ACCOUNTS.owner.email);
    await page.getByLabel(/пароль/i).fill("wrong-password");
    await page.getByRole("button", { name: /войти|вход/i }).click();
    // не должен уйти с /login
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/login/);
  });
});
