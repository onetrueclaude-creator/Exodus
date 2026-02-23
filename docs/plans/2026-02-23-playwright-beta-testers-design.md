# Playwright Autonomous Beta Testers — Design

**Date:** 2026-02-23
**Status:** Approved

## Goal

A continuous Playwright test suite that autonomously plays through ZK Agentic Network, covering the full user journey and in-game blockchain actions, and produces structured gap reports identifying broken or missing functionality.

## Architecture

```
playwright/
├── playwright.config.ts          ← baseURL, storageState, webServer, reporter
├── fixtures/
│   ├── auth.ts                   ← injects Supabase test session (no Google OAuth)
│   └── game-state.ts             ← exposes page.zustand() helper via window.__gameStore
├── tests/
│   ├── 01-journey.spec.ts        ← landing → onboard → subscribe → game
│   ├── 02-terminal.spec.ts       ← walk all AgentChat menu branches
│   ├── 03-blockchain.spec.ts     ← Secure, Write Data On Chain flows
│   └── 04-grid.spec.ts           ← node selection, agent creation
└── scripts/
    ├── seed-test-user.ts         ← creates Supabase test user + session token
    └── report-gaps.ts            ← prints gap summary from playwright-report/gaps.json
```

## Auth Strategy

`seed-test-user.ts` calls the Supabase Admin API to create a persistent test user with:
- Known username (e.g. `beta_tester_01`)
- Community tier
- Seeded DB row in `agents` table (homenode at origin)

`auth.ts` fixture calls `supabase.auth.getSession()` and writes `storageState` to `playwright/.auth/user.json`. Every test starts already authenticated — no Google OAuth interaction required.

## Test Coverage

### `01-journey.spec.ts` — Full User Journey
- Navigate `/` — assert Google auth button present
- Inject session, navigate `/onboard` — enter username, assert redirect to `/subscribe`
- Select Community tier — assert redirect to `/game`
- Assert `ResourceBar` shows CPU Energy value and Secured Chains counter
- Assert `TimechainStats` panel visible with block count

### `02-terminal.spec.ts` — Agent Terminal Menu
- Find primary AgentChat terminal
- Click each top-level command: Deploy Agent, Blockchain Protocols, Adjust Securing Rate, Adjust Network Parameters, Settings
- Verify sub-menus appear for each
- Report any command producing no response or error state

### `03-blockchain.spec.ts` — Blockchain Actions
- Open Blockchain Protocols → Secure → select 1 cycle → execute
- Read ResourceBar delta (CPU Energy decrease, Secured Chains increase)
- Read `window.__gameStore.getState()` before and after — assert store changed
- Open Write Data On Chain → send short NCP message → assert confirmation shown

### `04-grid.spec.ts` — Grid Interaction
- Click unclaimed node at known pixel offset from grid center
- Verify `QuickActionMenu` or `AgentCreator` appears in DOM
- Attempt to create a Haiku agent
- Assert new agent appears in Zustand `agents` map via `window.__gameStore`

## Gap Reporting

Each spec writes failures to `playwright-report/gaps.json`:

```json
{
  "spec": "03-blockchain",
  "step": "Secure execute",
  "expected": "cpuEnergy decreased",
  "actual": "no change detected",
  "screenshot": "gaps/03-secure-fail.png"
}
```

`scripts/report-gaps.ts` prints a human-readable summary:

```
=== Beta Tester Gap Report ===
✅ 01-journey    — 6/6 steps passed
⚠️  02-terminal  — Settings sub-menu did not appear
❌ 03-blockchain — Secure execute: cpuEnergy unchanged after action
✅ 04-grid       — 3/3 steps passed

2 gaps found. See playwright-report/gaps/ for screenshots.
```

## Continuous Operation

**Trigger modes:**
- `pnpm test:e2e` — single run, blocks CI
- `pnpm test:e2e:watch` — reruns every 5 minutes for manual QA sessions

**Dev server:** `playwright.config.ts` uses `webServer: { command: 'pnpm dev', url: 'http://localhost:3000', reuseExistingServer: true }`. Tests default to `MockChainService`; `USE_TESTNET=true` env flag switches to real FastAPI at `localhost:8080`.

## Zustand Bridge

`game/page.tsx` exposes the store in non-production builds:

```ts
if (process.env.NODE_ENV !== 'production') {
  (window as any).__gameStore = useGameStore
}
```

Playwright reads it via:
```ts
const state = await page.evaluate(() => (window as any).__gameStore.getState())
```

## Tech Stack Additions

- `@playwright/test` — test runner + browser automation
- `@supabase/supabase-js` (already installed) — admin client for seed script
- `dotenv` — load `.env.local` in seed script

## Out of Scope

- GitHub Actions CI integration (can be added later)
- Load/performance testing
- Visual regression (screenshot diffing)
- Mobile viewport testing
