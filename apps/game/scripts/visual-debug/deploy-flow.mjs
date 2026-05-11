// Drive the full deploy flow end-to-end and verify:
// 1. After deploy, terminal stays on the homenode (no auto-switch)
// 2. Account View lists both homenode + new sub-agent
// 3. CPU Allocation flow returns to the Blockchain Protocols sub-menu after Apply
import { chromium } from '@playwright/test';
import fs from 'fs';

const OUT = '/tmp/game-debug/deploy-flow';
fs.mkdirSync(OUT, { recursive: true });

const log = (label, data) => {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  console.log(`\n=== ${label} ===\n${text}`);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('http://localhost:3000/game', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Open Agent Terminal
  await page.locator('button[aria-label="Agent Terminal"]').first().click();
  await page.waitForTimeout(700);

  // Note current agent id (homenode)
  const homeAgent = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('span, div'));
    for (const h of headers) {
      const t = h.textContent?.trim() || '';
      if (t.startsWith('cell-')) return t;
    }
    return null;
  });
  log('TERMINAL AGENT (initial)', homeAgent);

  await page.screenshot({ path: `${OUT}/01-terminal-open.png` });

  // Click Deploy Agent
  await page.locator('button:has-text("Deploy Agent")').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/02-pick-star.png` });

  // Click the first candidate
  const candidates = page.locator('button:has-text("Node ")');
  const n = await candidates.count();
  log('CANDIDATES', n);
  if (n === 0) {
    log('FAIL', 'No deploy candidates');
    await browser.close();
    process.exit(1);
  }
  await candidates.first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/03-after-pick-star.png` });

  // Pick model — buttons labeled HAIKU/SONNET (Opus user, so two options)
  const haikuBtn = page.locator('button:has-text("HAIKU")').first();
  if (await haikuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await haikuBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/04-after-pick-model.png` });
  } else {
    log('NOTE', 'No model picker — deploy may have auto-completed');
  }

  // Intro screen: skip or submit empty
  const skipBtn = page.locator('button:has-text("Skip")').first();
  const deployBtn = page.locator('button:has-text("Deploy")').first();
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click();
  } else if (await deployBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await deployBtn.click();
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/05-deploy-completed.png` });

  // Verify terminal still on homenode (Fix 1)
  const afterAgent = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('span, div'));
    for (const h of headers) {
      const t = h.textContent?.trim() || '';
      if (t.startsWith('cell-')) return t;
    }
    return null;
  });
  log('TERMINAL AGENT (after deploy)', afterAgent);
  log('TERMINAL UNCHANGED?', afterAgent === homeAgent ? 'YES (Fix 1 works)' : 'NO — auto-switch still happening');

  // Switch to Account View tab
  await page.locator('button:has-text("Account View")').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/06-account-view.png` });

  // Count "My Agents" cards
  const agentCount = await page.evaluate(() => {
    const m = document.body.textContent?.match(/My Agents\s*\((\d+)\)/);
    return m ? parseInt(m[1], 10) : null;
  });
  log('MY AGENTS COUNT', agentCount);
  log('FIX 3 (multi-agent list)', agentCount && agentCount >= 2 ? 'WORKS' : 'NEEDS VERIFICATION');

  // Now test CPU Allocation flow (Fix 2)
  await page.locator('button:has-text("Network")').first().click();
  await page.waitForTimeout(500);

  // Open Blockchain Protocols → CPU Allocation
  const bpBtn = page.locator('button:has-text("Blockchain Protocols")').first();
  if (await bpBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await bpBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/07-bp-menu.png` });

    const cpuAllocBtn = page.locator('button:has-text("CPU Allocation")').first();
    if (await cpuAllocBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cpuAllocBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/08-cpu-alloc.png` });

      // Click Apply
      const applyBtn = page.locator('button:has-text("Apply")').first();
      if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await applyBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/09-after-cpu-apply.png` });

        // After Apply, CPU Allocation button should still be visible (in BP sub-menu)
        const stillVisible = await page.locator('button:has-text("CPU Allocation")').first().isVisible({ timeout: 1500 }).catch(() => false);
        log('FIX 2 (CPU Alloc visible after Apply)', stillVisible ? 'WORKS' : 'BROKEN');
      } else {
        log('SKIP', 'Apply button not visible');
      }
    }
  }

  log('PAGE ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
