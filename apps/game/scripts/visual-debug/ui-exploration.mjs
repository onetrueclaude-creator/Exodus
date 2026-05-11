// Systematic UI exploration — visit every dock panel + tab, click interactive
// elements, screenshot each state, capture console errors. The intent is to
// surface "delicate" bugs the user might not have specifically named.
import { chromium } from '@playwright/test';
import fs from 'fs';

const OUT = '/tmp/game-debug/exploration';
fs.mkdirSync(OUT, { recursive: true });

const findings = [];

const note = (label, detail) => {
  console.log(`\n[${label}] ${detail}`);
  findings.push({ label, detail });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('http://localhost:3000/game', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/00-loaded.png` });

  // === DOCK PANEL TOUR ===
  const dockButtons = [
    { label: 'Agent Terminal', expect: 'OPUS' },
    { label: 'Chain Stats', expect: 'TIMECHAIN' },
    { label: 'Network Chat', expect: 'CHAT' },
  ];
  for (let i = 0; i < dockButtons.length; i++) {
    const { label, expect } = dockButtons[i];
    note('DOCK', `Opening: ${label}`);
    const btn = page.locator(`button[aria-label="${label}"]`).first();
    const visible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) {
      note('DOCK-FAIL', `${label} button not visible`);
      continue;
    }
    await btn.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/dock-${i + 1}-${label.replace(/\s+/g, '-').toLowerCase()}.png` });

    // Look for expected text in the panel area
    const panelText = await page.evaluate(({ keyword }) => {
      const panels = Array.from(document.querySelectorAll('[class*="glass-panel-floating"], [class*="panel"]'));
      for (const p of panels) {
        if (p.textContent?.includes(keyword)) return { hit: true, sample: p.textContent.slice(0, 120) };
      }
      return { hit: false };
    }, { keyword: expect });
    if (!panelText.hit) {
      note('DOCK-WARN', `${label} panel opened but expected keyword "${expect}" not found`);
    } else {
      note('DOCK-OK', `${label} panel content includes "${expect}"`);
    }
  }
  // Close by clicking same icon again (toggle)
  await page.locator('button[aria-label="Network Chat"]').first().click().catch(() => {});
  await page.waitForTimeout(500);

  // === TAB TOUR ===
  const tabs = ['Network', 'Account View'];
  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i];
    note('TAB', `Switching to: ${t}`);
    const tab = page.locator(`button:has-text("${t}")`).first();
    if (!(await tab.isVisible({ timeout: 1000 }).catch(() => false))) {
      note('TAB-FAIL', `${t} tab not visible`);
      continue;
    }
    await tab.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/tab-${i + 1}-${t.replace(/\s+/g, '-').toLowerCase()}.png` });
  }
  // Back to Network tab so subsequent interactions see the lattice
  await page.locator('button:has-text("Network")').first().click().catch(() => {});
  await page.waitForTimeout(500);

  // === ZOOM SLIDER ===
  note('ZOOM', 'Testing zoom slider movement');
  const slider = page.locator('input[type="range"]').first();
  if (await slider.isVisible({ timeout: 1000 }).catch(() => false)) {
    const beforeZoom = await page.evaluate(() => {
      const i = document.querySelector('input[type="range"]');
      return i?.value;
    });
    await slider.evaluate((el) => {
      const inp = el;
      inp.value = '0.5';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    const afterZoom = await page.evaluate(() => {
      const i = document.querySelector('input[type="range"]');
      return i?.value;
    });
    note('ZOOM', `slider: ${beforeZoom} → ${afterZoom}`);
    await page.screenshot({ path: `${OUT}/zoom-50pct.png` });
  } else {
    note('ZOOM-FAIL', 'slider not visible');
  }

  // === HOME BUTTON (zoom widget) ===
  note('HOME', 'Clicking zoom-widget home button');
  const zoomHome = page.locator('button[title="Center on home node"]').first();
  if (await zoomHome.isVisible({ timeout: 1000 }).catch(() => false)) {
    await zoomHome.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/home-clicked.png` });
  }

  // === BOTTOM "Home Node" BUTTON ===
  note('BOTTOM-HOME', 'Clicking ⌂ Home Node bottom bar');
  const bottomHome = page.locator('button:has-text("⌂ Home Node")').first();
  if (await bottomHome.isVisible({ timeout: 1000 }).catch(() => false)) {
    await bottomHome.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/bottom-home-clicked.png` });
  }

  // === DEPLOY AGENT FLOW (uses fixed hover focus) ===
  note('DEPLOY', 'Opening terminal then Deploy Agent');
  await page.locator('button[aria-label="Agent Terminal"]').first().click();
  await page.waitForTimeout(600);
  const deployBtn = page.locator('button:has-text("Deploy Agent")').first();
  if (await deployBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await deployBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/deploy-list.png` });

    // Hover the LAST candidate (typically farthest, biggest test)
    const candidates = page.locator('button:has-text("Node ")');
    const n = await candidates.count();
    note('DEPLOY-LIST', `${n} candidates`);
    if (n > 0) {
      const last = candidates.nth(n - 1);
      await last.hover();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/deploy-hover-last.png` });
    }
  } else {
    note('DEPLOY-SKIP', 'Deploy Agent button not visible (likely Haiku tier)');
  }

  // === SUMMARY ===
  console.log('\n\n========== EXPLORATION SUMMARY ==========');
  console.log(`Findings:  ${findings.length}`);
  console.log(`Console errors: ${consoleErrors.length}`);
  console.log(`Page errors:    ${pageErrors.length}`);
  if (consoleErrors.length) {
    console.log('\nConsole errors:');
    consoleErrors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
  }
  if (pageErrors.length) {
    console.log('\nPage errors:');
    pageErrors.forEach((e) => console.log(`  - ${e}`));
  }
  console.log(`\nScreenshots → ${OUT}/`);

  fs.writeFileSync(`${OUT}/findings.json`, JSON.stringify({ findings, consoleErrors, pageErrors }, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
