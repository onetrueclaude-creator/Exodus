import { test, expect } from "@playwright/test";

test("onboard view", async ({ page }) => {
  await page.goto("/visual/onboard");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot("onboard.png", { fullPage: true });
});
