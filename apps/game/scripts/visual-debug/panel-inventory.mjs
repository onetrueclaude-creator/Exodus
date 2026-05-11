// Enumerate ALL absolute-positioned elements with their rects + text content + z-index
import { chromium } from '@playwright/test';
import fs from 'fs';

const OUT = '/tmp/game-debug';
fs.mkdirSync(OUT, { recursive: true });

async function inspectAt(viewport, label) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();

  await page.goto('http://localhost:3000/game', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  await page.screenshot({ path: `${OUT}/viewport-${label}.png`, fullPage: false });

  const panels = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all
      .filter((el) => {
        const cs = getComputedStyle(el);
        return (cs.position === 'absolute' || cs.position === 'fixed')
          && el.getBoundingClientRect().width > 50
          && el.getBoundingClientRect().height > 50;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const text = el.textContent?.trim().slice(0, 80) || '';
        return {
          tag: el.tagName,
          class: el.className?.toString()?.slice(0, 120) || '',
          position: cs.position,
          z: cs.zIndex,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          textPreview: text,
          display: cs.display,
          visibility: cs.visibility,
        };
      })
      .sort((a, b) => parseInt(b.z || '0') - parseInt(a.z || '0'));
  });

  await browser.close();
  return { viewport, panelCount: panels.length, panels };
}

(async () => {
  const sizes = [
    { width: 1440, height: 900, label: '1440x900' },
    { width: 1280, height: 720, label: '1280x720' },
    { width: 1024, height: 768, label: '1024x768' },
    { width: 1920, height: 1080, label: '1920x1080' },
  ];
  const results = [];
  for (const s of sizes) {
    console.log(`\n=== ${s.label} ===`);
    const r = await inspectAt({ width: s.width, height: s.height }, s.label);
    console.log(`Visible panels (>50×50): ${r.panelCount}`);
    for (const p of r.panels) {
      console.log(`  z=${p.z || '0'} ${p.rect.x},${p.rect.y} ${p.rect.w}×${p.rect.h} [${p.position}] <${p.tag}> "${p.textPreview}" :: ${p.class}`);
    }
    results.push(r);
  }
  fs.writeFileSync(`${OUT}/panels-summary.json`, JSON.stringify(results, null, 2));
  console.log('\nSaved screenshots + summary to /tmp/game-debug/');
})().catch((e) => { console.error(e); process.exit(1); });
