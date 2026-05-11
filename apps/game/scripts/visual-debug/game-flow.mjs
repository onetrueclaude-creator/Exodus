// Visual debug of /game route — screenshots + DOM measurements + console capture
import { chromium } from '@playwright/test';
import fs from 'fs';

const VIEWPORT = { width: 1440, height: 900 };
const OUT = '/tmp/game-debug';
fs.mkdirSync(OUT, { recursive: true });

const log = (label, data) => {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  console.log(`\n=== ${label} ===\n${text}`);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  const reqFailures = [];
  page.on('requestfailed', req => reqFailures.push({
    url: req.url(),
    method: req.method(),
    failure: req.failure()?.errorText,
  }));

  log('NAVIGATING', 'http://localhost:3000/game');
  try {
    await page.goto('http://localhost:3000/game', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
  } catch (e) {
    log('NAV ERROR', e.message);
  }

  // Wait for hydration + Pixi init
  await page.waitForTimeout(3000);

  // Screenshot 1: initial state
  await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: false });
  log('SCREENSHOT 1', `${OUT}/01-initial.png saved`);

  // DOM measurements — what is actually positioned where
  const measurements = await page.evaluate(() => {
    const rect = (el) => el ? el.getBoundingClientRect().toJSON() : null;
    const canvas = document.querySelector('canvas');
    const latticeContainer = document.querySelector('[style*="touch-action"]');
    const resourceBar = document.querySelector('div.h-8.bg-background-light');
    const tabNav = document.querySelectorAll('div.h-8')[1];
    const tabContent = document.querySelector('div.flex-1');
    const loadingOverlay = document.querySelector('div.z-\\[100\\]');
    const homeButtonBar = document.querySelector('div.absolute.bottom-0.left-10');
    const flexParent = document.querySelector('div.flex.flex-col.w-screen.h-screen');
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
      canvasCount: document.querySelectorAll('canvas').length,
      canvas: rect(canvas),
      canvasStyle: canvas ? { width: canvas.width, height: canvas.height, styleW: canvas.style.width, styleH: canvas.style.height } : null,
      latticeContainer: rect(latticeContainer),
      resourceBar: rect(resourceBar),
      tabNav: rect(tabNav),
      tabContent: rect(tabContent),
      loadingOverlay: rect(loadingOverlay),
      homeButtonBar: rect(homeButtonBar),
      flexParent: rect(flexParent),
      loadingOverlayVisible: loadingOverlay ? getComputedStyle(loadingOverlay).display !== 'none' : false,
      bodyChildren: document.body.children.length,
      activeTab: document.querySelector('button[class*="text-accent-cyan"]')?.textContent,
    };
  });
  log('DOM MEASUREMENTS (initial)', measurements);

  // Try to click "Home Node" button (the one in the bottom bar)
  log('CLICK ATTEMPT', 'looking for ⌂ Home Node button');
  let clickResult = 'not attempted';
  try {
    const homeBtn = page.locator('button:has-text("⌂ Home Node")').first();
    const visible = await homeBtn.isVisible({ timeout: 2000 }).catch(() => false);
    log('HOME BTN VISIBLE', visible);
    if (visible) {
      const btnRect = await homeBtn.boundingBox();
      log('HOME BTN RECT', btnRect);
      await homeBtn.click({ force: true });
      clickResult = 'clicked';
      await page.waitForTimeout(2000);
    } else {
      clickResult = 'not visible';
    }
  } catch (e) {
    clickResult = `error: ${e.message}`;
  }
  log('CLICK RESULT', clickResult);

  // Screenshot 2: after click
  await page.screenshot({ path: `${OUT}/02-after-home-click.png`, fullPage: false });
  log('SCREENSHOT 2', `${OUT}/02-after-home-click.png saved`);

  // Post-click measurements
  const postMeasure = await page.evaluate(() => {
    const rect = (el) => el ? el.getBoundingClientRect().toJSON() : null;
    const canvas = document.querySelector('canvas');
    return {
      canvasCount: document.querySelectorAll('canvas').length,
      canvas: rect(canvas),
      canvasStyle: canvas ? { width: canvas.width, height: canvas.height, styleW: canvas.style.width, styleH: canvas.style.height } : null,
      loadingOverlayPresent: !!document.querySelector('div.z-\\[100\\]'),
    };
  });
  log('DOM MEASUREMENTS (post-click)', postMeasure);

  // Also try the zoom-widget home button (inside the LatticeGrid)
  log('TRYING zoom-widget home button (the ⌂ inside the zoom slider)', '');
  try {
    const zoomHome = page.locator('button[title="Center on home node"]').first();
    const v = await zoomHome.isVisible({ timeout: 2000 }).catch(() => false);
    log('ZOOM-HOME VISIBLE', v);
    if (v) {
      await zoomHome.click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/03-after-zoom-home-click.png`, fullPage: false });
      log('SCREENSHOT 3', `${OUT}/03-after-zoom-home-click.png saved`);
    }
  } catch (e) {
    log('ZOOM-HOME CLICK ERROR', e.message);
  }

  // Console + errors summary
  log('CONSOLE MESSAGES', consoleMessages);
  log('PAGE ERRORS', pageErrors);
  log('NETWORK FAILURES', reqFailures);

  await browser.close();
  log('DONE', 'browser closed');
})().catch(e => {
  console.error('\n=== SCRIPT ERROR ===');
  console.error(e);
  process.exit(1);
});
