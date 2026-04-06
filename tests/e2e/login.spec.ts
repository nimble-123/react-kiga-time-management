import { test, expect } from "@playwright/test";
import { login, loginAsAdmin, loginAsUser } from "./helpers";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("logs in as admin", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.locator("text=Willkommen, Administrator")).toBeVisible();
  });

  test("logs in as user", async ({ page }) => {
    await loginAsUser(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("text=Willkommen, Inge Mueller")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await login(page, "admin", "wrongpassword");
    await expect(page.locator("text=Benutzername oder Passwort falsch")).toBeVisible();
  });

  test("admin can see admin nav links", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("link", { name: "Genehmigungen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Benutzerverwaltung" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Feiertage" })).toBeVisible();
  });

  test("user cannot see admin nav links", async ({ page }) => {
    await loginAsUser(page);
    await expect(page.getByRole("link", { name: "Genehmigungen" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Benutzerverwaltung" })).not.toBeVisible();
  });
});
