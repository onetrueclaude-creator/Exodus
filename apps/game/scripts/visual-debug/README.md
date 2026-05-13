# Visual Debug Scripts

Playwright-driven autonomous frontend debugging for the ZkAgentic game UI.

## What this is for

Use when:
- A user reports a visual bug ("the map is not visible", "something's at the bottom")
- You suspect a UI regression but can't reproduce by reading code alone
- You need to enumerate every visible panel + its bounding rect across viewports
- You want a before/after screenshot diff after a fix

This is the toolkit the agent reaches for when "read the code" is not enough — it drives a real Chromium against `localhost:3000` and produces evidence (screenshots + DOM measurements + console errors + network failures).

## Prerequisites

- Dev server running: `npm run dev` from `apps/game/` (serves on `localhost:3000`)
- Playwright + Chromium installed at the **monorepo root**:
  ```bash
  npm install @playwright/test --prefix /Users/toyg/Exodus
  npx playwright install chromium --prefix /Users/toyg/Exodus
  ```

## Scripts

### `game-flow.mjs`
End-to-end visual flow:
1. Navigate to `/game` and wait 3s for hydration + Pixi init
2. Screenshot initial state → `/tmp/game-debug/01-initial.png`
3. Measure canvas, LatticeGrid container, ResourceBar, TabNav, tab content, loading overlay
4. Click `⌂ Home Node` (bottom bar) → screenshot 02
5. Click `⌂` inside the zoom widget → screenshot 03
6. Dump console messages, page errors, and network failures

Run:
```bash
node apps/game/scripts/visual-debug/game-flow.mjs
```

### `panel-inventory.mjs`
Enumerate every absolute/fixed-positioned element (>50×50) across four viewports (1024×768, 1280×720, 1440×900, 1920×1080). Outputs rect, z-index, class, and text preview for each panel. Saves screenshots `viewport-{size}.png`.

Use this to answer "what's covering the canvas?" without having to drive the browser by hand.

Run:
```bash
node apps/game/scripts/visual-debug/panel-inventory.mjs
```

## Output

All artifacts go to `/tmp/game-debug/`:
- `01-initial.png`, `02-after-home-click.png`, `03-after-zoom-home-click.png` from `game-flow.mjs`
- `viewport-1024x768.png` etc. from `panel-inventory.mjs`
- `panels-summary.json` with the full DOM enumeration

The Read tool can open PNGs directly — the agent can see what the user sees.

## Pattern

The intended loop:
1. User reports visual bug.
2. Agent reads code (Phase 1 of systematic-debugging).
3. If the cause isn't obvious from code, agent runs `panel-inventory.mjs` to enumerate what's on-screen.
4. Agent reads the screenshots + JSON.
5. Agent forms a hypothesis grounded in **visual evidence**, not speculation.
6. Agent applies the fix and re-runs to verify.

This is the closest a CLI agent can get to "see the bug, fix the bug." It's how the AgentChat + DebugOverlay map-obscuring bug was diagnosed in commit `6ff170a` — the inventory script revealed two unexpected panels covering most of the canvas, and the screenshots confirmed the fix.
