// Verify the deploy-agent hover-focus fix.
// 1. Open game, manually open agent terminal (dev mode no longer auto-opens it)
// 2. Click "Deploy Agent" to enter pick-star step
// 3. Hover over first nearby node
// 4. Screenshot before/after; report camera-position delta from the debug store
import { chromium } from '@playwright/test';
import fs from 'fs';

const OUT = '/tmp/game-debug';
fs.mkdirSync(OUT, { recursive: true });

const log = (label, data) => {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  console.log(`\n=== ${label} ===\n${text}`);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const cameraEvents = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('camera')) cameraEvents.push(t);
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('http://localhost:3000/game', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/deploy-01-initial.png` });

  // Open the Agent Terminal dock panel (▣ icon, top of dock strip)
  const terminalBtn = page.locator('button[aria-label="Agent Terminal"]').first();
  if (!(await terminalBtn.isVisible())) {
    log('FAIL', 'Agent Terminal icon not visible');
    await browser.close();
    process.exit(1);
  }
  await terminalBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/deploy-02-terminal-open.png` });

  // Click the "Deploy Agent" action in the terminal
  const deployBtn = page.locator('button:has-text("Deploy Agent")').first();
  if (await deployBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await deployBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/deploy-03-pick-star.png` });
  } else {
    log('WARN', 'Deploy Agent button not found — opus/sonnet tier required');
  }

  // Snapshot the nearby-nodes list, plus camera before hover
  const beforeHover = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b =>
      b.textContent && b.textContent.includes('Node') && b.querySelector('.rounded-full')
    );
    return {
      candidateCount: buttons.length,
      firstThree: buttons.slice(0, 3).map(b => b.textContent?.trim().slice(0, 50)),
    };
  });
  log('NEARBY NODES (before hover)', beforeHover);

  if (beforeHover.candidateCount === 0) {
    log('FAIL', 'No nearby nodes rendered — list is empty');
    await browser.close();
    process.exit(1);
  }

  // Get the camera position from the Zustand store via the window debug
  const camBefore = await page.evaluate(() => {
    const store = window.__GAME_STORE_DEBUG__ || null;
    return store ? { position: store.camera.position, zoom: store.camera.zoom } : 'no-debug-handle';
  });
  log('CAMERA before hover', camBefore);

  // Hover the FIRST nearby node candidate
  const firstNode = page.locator('button:has-text("Node ")').first();
  await firstNode.hover();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/deploy-04-after-hover.png` });

  const camAfter = await page.evaluate(() => {
    const store = window.__GAME_STORE_DEBUG__ || null;
    return store ? { position: store.camera.position, zoom: store.camera.zoom } : 'no-debug-handle';
  });
  log('CAMERA after hover', camAfter);

  log('CAMERA EVENTS (from console)', cameraEvents.slice(-5));
  log('PAGE ERRORS', errors);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
