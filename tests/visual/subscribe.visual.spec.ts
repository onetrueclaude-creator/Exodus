import { test, expect } from "@playwright/test";

test("subscribe view", async ({ page }) => {
  await page.goto("/visual/subscribe");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot("subscribe.png", { fullPage: true });
});
