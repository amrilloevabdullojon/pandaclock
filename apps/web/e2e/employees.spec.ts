import { test, expect } from "@playwright/test";
import { ACCOUNTS, login, logout } from "./helpers/auth";

test.describe("Employees + RBAC", () => {
  test("OWNER видит список сотрудников + кнопку Пригласить", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.owner);
    await page.goto("/dashboard/employees");
    await expect(page.getByRole("heading", { name: /сотрудник/i })).toBeVisible();
    // OWNER должен видеть invite-кнопку.
    await expect(page.getByRole("button", { name: /пригласить/i }).first()).toBeVisible();
  });

  test("EMPLOYEE НЕ видит кнопку Пригласить (RBAC)", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.employee);
    await page.goto("/dashboard/employees");
    await expect(page.getByRole("heading", { name: /сотрудник/i })).toBeVisible();
    // Кнопка не должна появиться вообще.
    await expect(page.getByRole("button", { name: /пригласить/i })).toHaveCount(0);
  });

  test("EMPLOYEE НЕ видит пункт «Журнал действий» в сайдбаре", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.employee);
    await page.goto("/dashboard");
    // Раскрываем подменю Настройки если оно есть.
    const settings = page.getByRole("button", { name: /настройк/i }).first();
    if (await settings.isVisible().catch(() => false)) {
      await settings.click();
    }
    await expect(page.getByRole("link", { name: /журнал действий|audit/i })).toHaveCount(0);
  });

  test("EMPLOYEE — прямой переход на /audit показывает «Нет доступа»", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.employee);
    await page.goto("/dashboard/settings/audit");
    await expect(page.locator("body")).toContainText(/нет доступа|access denied|forbidden/i);
  });

  test("OWNER может открыть /audit", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.owner);
    await page.goto("/dashboard/settings/audit");
    await expect(page.getByRole("heading", { name: /журнал/i })).toBeVisible();
  });
});
