import { test, expect } from "@playwright/test";

test("landing page", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
});
