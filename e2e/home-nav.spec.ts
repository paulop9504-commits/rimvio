import { test, expect } from "@playwright/test";

test.describe("home shell", () => {
  test.describe.configure({ timeout: 45_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("rimvio.draw-redirected", "1");
    });
  });

  test("globe home loads with bottom nav tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("rimvio-bottom-nav")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('[data-nav-href="/"]')).toBeVisible();
    await expect(page.locator('[data-nav-href="/field"]')).toBeVisible();
    await expect(page.locator('[data-nav-href="/peers"]')).toBeVisible();
    await expect(page.locator('[data-nav-action="capture"]')).toBeVisible();
  });
});
