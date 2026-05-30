import { test, expect } from "@playwright/test";
import { ACCOUNTS, login, logout } from "./helpers/auth";

test.describe("Leave requests", () => {
  test("EMPLOYEE может открыть форму создания заявки", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.employee);
    await page.goto("/dashboard/requests");
    await expect(page.getByRole("heading", { name: /заявк/i }).first()).toBeVisible();

    // Кликаем «Создать заявку» (или + Новая)
    const trigger = page.getByRole("button", { name: /создать|новая|подать заявк/i }).first();
    await trigger.click();

    // Форма должна показать поле дат / типа отпуска
    await expect(page.locator("body")).toContainText(/отпуск|тип заявк|дата/i);
  });

  test("MANAGER видит вкладку «Команда»", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.manager);
    await page.goto("/dashboard/requests");
    // scope=team должен быть доступен для MANAGER через UI tabs.
    await expect(page.getByRole("tab", { name: /команд|team/i }).first()).toBeVisible();
  });

  test("Cmd+K глобальный поиск открывается", async ({ page }) => {
    await logout(page);
    await login(page, ACCOUNTS.owner);
    await page.goto("/dashboard");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    // Команд-палитра содержит поле ввода с placeholder
    await expect(page.getByPlaceholder(/поиск|search/i).first()).toBeVisible();
  });
});
