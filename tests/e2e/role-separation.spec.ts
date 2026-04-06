import { test, expect } from "@playwright/test";
import { loginAsUser, loginAsAdmin } from "./helpers";

test.describe("Role Separation", () => {
  test("user cannot access admin pages via direct URL", async ({ page }) => {
    await loginAsUser(page);
    // Wait for dashboard to fully load
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Try to navigate to admin pages - should redirect away
    await page.goto("/admin/users");
    // User should NOT see admin content - either redirected to dashboard or login
    await expect(page.getByRole("heading", { name: "Benutzerverwaltung" })).not.toBeVisible({ timeout: 3000 });
  });

  test("user sidebar does not show admin links", async ({ page }) => {
    await loginAsUser(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Genehmigungen" })).not.toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Benutzerverwaltung" })).not.toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Feiertage" })).not.toBeVisible();
  });

  test("admin sidebar shows admin links", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Genehmigungen" })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Benutzerverwaltung" })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Feiertage" })).toBeVisible();
  });

  test("admin can navigate to user management", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.locator("nav").getByRole("link", { name: "Benutzerverwaltung" }).click();
    await expect(page.getByRole("heading", { name: "Benutzerverwaltung" })).toBeVisible();
    await expect(page.locator("text=Inge Mueller")).toBeVisible();
    await expect(page.locator("text=Petra Schmidt")).toBeVisible();
  });

  test("admin can navigate to approvals", async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator("nav").getByRole("link", { name: "Genehmigungen" }).click();
    await expect(page.getByRole("heading", { name: "Genehmigungen" })).toBeVisible();
  });

  test("admin can navigate to holidays", async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator("nav").getByRole("link", { name: "Feiertage" }).click();
    await expect(page.getByRole("heading", { name: "Feiertage" })).toBeVisible();
  });
});
