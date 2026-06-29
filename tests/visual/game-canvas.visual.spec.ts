import { test, expect } from "@playwright/test";

test("orbital lattice canvas", async ({ page }) => {
  await page.goto("/visual/canvas");
  // The harness sets window.__visualReady once the deterministic frame is drawn.
  await page.waitForFunction(() => (window as unknown as { __visualReady?: boolean }).__visualReady === true, null, { timeout: 30_000 });
  await expect(page).toHaveScreenshot("lattice.png");
});
