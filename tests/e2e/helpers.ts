import { type Page } from "@playwright/test";

export async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|login)/);
}

export async function loginAsAdmin(page: Page) {
  await login(page, "admin", "admin123");
}

export async function loginAsUser(page: Page) {
  await login(page, "inge", "user123");
}

/** Click a navigation link in the sidebar (avoids matching dashboard links) */
export async function navigateTo(page: Page, name: string) {
  await page.locator("nav").getByRole("link", { name, exact: true }).click();
}
