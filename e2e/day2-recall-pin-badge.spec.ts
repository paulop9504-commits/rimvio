import { test, expect } from "@playwright/test";
import {
  E2E_DAY2_RECALL_EVENT_ID,
  installE2eDay2RecallFixture,
} from "../lib/test/e2e-day2-recall-fixture";

test.describe("Day 2 recall", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(installE2eDay2RecallFixture);
  });

  test("shows recall badge on globe pin after cold start", async ({ page }) => {
    await page.goto(`/?recallEvent=${encodeURIComponent(E2E_DAY2_RECALL_EVENT_ID)}`);

    await expect(page.getByTestId("rimvio-bottom-nav")).toBeVisible({
      timeout: 25_000,
    });

    const recallBadge = page.locator(".rimvio-globe-3d-pin__recall-badge");
    await expect(recallBadge.first()).toBeVisible({ timeout: 25_000 });
    await expect(recallBadge.first()).toContainText("확정");
  });

  test("shows context recall strip when hub detail opens", async ({ page }) => {
    await page.goto(`/?recallEvent=${encodeURIComponent(E2E_DAY2_RECALL_EVENT_ID)}`);

    await expect(page.getByTestId("rimvio-bottom-nav")).toBeVisible({
      timeout: 25_000,
    });

    const recallBadge = page.locator(".rimvio-globe-3d-pin__recall-badge").first();
    await expect(recallBadge).toBeVisible({ timeout: 25_000 });
    await recallBadge.click();

    const contextRecall = page.locator("[data-globe-context-recall-badge]");
    await expect(contextRecall).toBeVisible({ timeout: 15_000 });
    await expect(contextRecall).toContainText("숙소");
  });
});
