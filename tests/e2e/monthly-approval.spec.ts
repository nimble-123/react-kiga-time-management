import { test, expect } from "@playwright/test";
import { loginAsUser, loginAsAdmin, navigateTo } from "./helpers";

test.describe("Monthly View", () => {
  test("user can see monthly view", async ({ page }) => {
    await loginAsUser(page);
    await navigateTo(page, "Monatsansicht");
    await expect(page.getByRole("heading", { name: "Monatsansicht" })).toBeVisible();
  });

  test("shows month navigation", async ({ page }) => {
    await loginAsUser(page);
    await navigateTo(page, "Monatsansicht");
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("shows submit button for open months", async ({ page }) => {
    await loginAsUser(page);
    await navigateTo(page, "Monatsansicht");
    await expect(page.locator("text=Offen")).toBeVisible();
    await expect(page.locator("text=Monat einreichen")).toBeVisible();
  });
});

test.describe("Admin Approvals", () => {
  test("admin can access approvals page", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "Genehmigungen");
    await expect(page.getByRole("heading", { name: "Genehmigungen" })).toBeVisible();
  });

  test("admin can filter by status", async ({ page }) => {
    await loginAsAdmin(page);
    await navigateTo(page, "Genehmigungen");
    await expect(page.getByRole("button", { name: "Eingereicht" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Genehmigt" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Alle" })).toBeVisible();
  });
});
