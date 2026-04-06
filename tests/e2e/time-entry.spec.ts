import { test, expect } from "@playwright/test";
import { loginAsUser, navigateTo } from "./helpers";

test.describe("Time Entry - Week View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test("navigates to week view", async ({ page }) => {
    await navigateTo(page, "Wochenansicht");
    await expect(page.getByRole("heading", { name: "Wochenansicht" })).toBeVisible();
    await expect(page.locator("text=Gesamt Woche")).toBeVisible();
  });

  test("shows week navigation buttons", async ({ page }) => {
    await navigateTo(page, "Wochenansicht");
    await expect(page.locator("text=Vorherige Woche")).toBeVisible();
    await expect(page.locator("text=Naechste Woche")).toBeVisible();
  });

  test("shows column headers", async ({ page }) => {
    await navigateTo(page, "Wochenansicht");
    await expect(page.locator("text=Taetigkeit")).toBeVisible();
    await expect(page.locator("text=Vorbereitung")).toBeVisible();
    await expect(page.locator("text=Pause")).toBeVisible();
  });
});
