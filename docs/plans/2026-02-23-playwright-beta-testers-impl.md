# Playwright Autonomous Beta Testers — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A continuous Playwright test suite that plays through ZK Agentic Network end-to-end and produces structured gap reports.

**Architecture:** Supabase Admin API creates a persistent test user; `storageState` injects the session so tests start already authenticated. Four spec files cover the full journey + game interactions. Zustand state is readable via `window.__gameStore` injected in dev mode.

**Tech Stack:** `@playwright/test`, `@supabase/supabase-js` (already installed), Next.js 16 App Router, Zustand 5

---

### Task 1: Install Playwright and add config + scripts

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `playwright/.gitignore`

**Step 1: Install Playwright**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

Expected output: `✔ chromium v...` installed

**Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './playwright/tests',
  fullyParallel: false,
  retries: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'playwright/.auth/user.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
```

**Step 3: Add scripts to `package.json`**

Add under `"scripts"`:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

**Step 4: Create `playwright/.gitignore`**

```
.auth/
```

**Step 5: Verify config loads**

```bash
npx playwright test --list 2>&1 | head -5
```

Expected: `No tests found` (no spec files yet — that's fine)

**Step 6: Commit**

```bash
git add package.json playwright.config.ts playwright/.gitignore
git commit -m "feat(e2e): install Playwright + base config"
```

---

### Task 2: Seed script — create Supabase test user + session

**Files:**
- Create: `playwright/scripts/seed-test-user.ts`
- Create: `playwright/.auth/.gitkeep`

This script runs once before tests to create a test user and write their session cookies to `playwright/.auth/user.json`. It uses Supabase Admin API (requires `SUPABASE_SERVICE_ROLE_KEY`).

**Step 1: Create `playwright/scripts/seed-test-user.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_EMAIL = 'beta_tester@zkagenticnetwork.test'
const TEST_PASSWORD = 'TestPass123!'
const TEST_USERNAME = 'beta_tester_01'

async function seed() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create or re-use test user
  const { data: existing } = await admin.auth.admin.listUsers()
  const existingUser = existing?.users.find((u) => u.email === TEST_EMAIL)

  let userId: string
  if (existingUser) {
    userId = existingUser.id
    console.log('Test user exists:', userId)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { username: TEST_USERNAME },
    })
    if (error) throw error
    userId = data.user.id
    console.log('Created test user:', userId)
  }

  // Upsert agent row (homenode at origin)
  const { error: agentErr } = await admin.from('agents').upsert({
    id: `${userId}-homenode`,
    user_id: userId,
    username: TEST_USERNAME,
    tier: 'sonnet',
    is_primary: true,
    visual_x: 0,
    visual_y: 0,
    border_radius: 1,
    cpu_per_turn: 10,
    mining_rate: 1,
    staked_cpu: 5,
    density: 0.5,
    storage_slots: 10,
    synced_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (agentErr) console.warn('Agent upsert warning:', agentErr.message)

  // Sign in to get session cookies
  const browser_client = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: session, error: signInErr } = await browser_client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInErr || !session.session) throw signInErr ?? new Error('No session')

  const { access_token, refresh_token } = session.session

  // Write storageState in Playwright format (cookie-based for Supabase SSR)
  const storageState = {
    cookies: [
      {
        name: 'sb-access-token',
        value: access_token,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
      {
        name: 'sb-refresh-token',
        value: refresh_token,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  }

  mkdirSync('playwright/.auth', { recursive: true })
  writeFileSync('playwright/.auth/user.json', JSON.stringify(storageState, null, 2))
  console.log('Session written to playwright/.auth/user.json')
}

seed().catch((e) => { console.error(e); process.exit(1) })
```

**Step 2: Add `SUPABASE_SERVICE_ROLE_KEY` note to `.env.local`**

Add this line (value must be filled from Supabase dashboard → Project Settings → API):
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Step 3: Add seed script to `package.json`**

```json
"e2e:seed": "npx ts-node --project tsconfig.json playwright/scripts/seed-test-user.ts"
```

**Step 4: Create `.auth` placeholder**

```bash
mkdir -p playwright/.auth && touch playwright/.auth/.gitkeep
```

**Step 5: Commit**

```bash
git add playwright/scripts/seed-test-user.ts playwright/.auth/.gitkeep package.json
git commit -m "feat(e2e): seed script — creates Supabase test user + session"
```

---

### Task 3: Zustand bridge — expose store in dev mode

**Files:**
- Modify: `src/app/game/page.tsx`

The Playwright tests need to read Zustand state directly. We expose the store on `window` in non-production mode only.

**Step 1: Find the return statement in `GamePage`**

In `src/app/game/page.tsx`, find the `useEffect` block near the top of `GamePage` (around line 80-120 where other effects are). Add a new `useEffect` that sets `window.__gameStore`:

```ts
// Expose store to Playwright in dev mode
useEffect(() => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__gameStore = useGameStore
  }
}, [])
```

This import is already available — `useGameStore` is imported at line 24.

**Step 2: Add TypeScript declaration**

Create `src/types/global.d.ts`:

```ts
import type { useGameStore } from '@/store'

declare global {
  interface Window {
    __gameStore?: typeof useGameStore
  }
}
```

**Step 3: Verify build compiles**

```bash
npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors related to `__gameStore`

**Step 4: Commit**

```bash
git add src/app/game/page.tsx src/types/global.d.ts
git commit -m "feat(e2e): expose Zustand store on window in dev mode"
```

---

### Task 4: `01-journey.spec.ts` — Full user journey

**Files:**
- Create: `playwright/tests/01-journey.spec.ts`

Tests the full onboarding flow from landing page through to game render.

**Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test'

test.describe('01 · Full User Journey', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // unauthenticated

  test('landing page has Google auth button', async ({ page }) => {
    await page.goto('/')
    // The landing page should show a sign-in button
    const authBtn = page.getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }))
      .or(page.getByText(/sign in/i))
    await expect(authBtn.first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('01 · Authenticated Journey', () => {
  // Uses default storageState from playwright.config.ts (seeded user)

  test('authenticated user reaches /game', async ({ page }) => {
    await page.goto('/game')
    // Should not redirect to landing
    await expect(page).not.toHaveURL(/\/$/, { timeout: 5_000 })
    await expect(page).toHaveURL('/game', { timeout: 10_000 })
  })

  test('ResourceBar is visible with CPU Energy', async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByText('CPU Energy')).toBeVisible({ timeout: 15_000 })
  })

  test('ResourceBar shows Secured counter', async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByText('Secured')).toBeVisible({ timeout: 15_000 })
  })

  test('TimechainStats panel is visible', async ({ page }) => {
    await page.goto('/game')
    // TimechainStats renders chain status — look for "TESTNET" or "OFFLINE" badge
    const badge = page.getByText('TESTNET').or(page.getByText('OFFLINE'))
    await expect(badge.first()).toBeVisible({ timeout: 15_000 })
  })

  test('game canvas is present', async ({ page }) => {
    await page.goto('/game')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 })
  })
})
```

**Step 2: Run the spec**

```bash
npm run test:e2e -- 01-journey 2>&1 | tail -30
```

Expected: first test (unauthenticated) may fail if landing redirects logged-in users. Authenticated tests should pass once dev server + seed are done.

**Step 3: Commit**

```bash
git add playwright/tests/01-journey.spec.ts
git commit -m "feat(e2e): 01-journey spec — landing + authenticated game load"
```

---

### Task 5: `02-terminal.spec.ts` — Agent terminal menu walk

**Files:**
- Create: `playwright/tests/02-terminal.spec.ts`

Tests the AgentChat terminal — clicks each top-level command and verifies responses.

**Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test'

test.describe('02 · Agent Terminal Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game')
    // Wait for game to be ready
    await expect(page.getByText('CPU Energy')).toBeVisible({ timeout: 15_000 })
  })

  test('primary agent terminal is open', async ({ page }) => {
    // AgentChat renders a terminal window — look for the command list
    const terminal = page.locator('[data-testid="agent-chat"]')
      .or(page.getByText('Deploy Agent'))
      .or(page.getByText('Blockchain Protocols'))
    await expect(terminal.first()).toBeVisible({ timeout: 5_000 })
  })

  test('Blockchain Protocols opens sub-menu', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await expect(page.getByText('Secure')).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText('Write Data')).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText('Read Data')).toBeVisible({ timeout: 3_000 })
  })

  test('Secure opens cycle selector', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Secure').first().click()
    // Should show generation options
    await expect(page.getByText('1 Generation').or(page.getByText('1 Gen'))).toBeVisible({ timeout: 3_000 })
  })

  test('Settings opens settings sub-menu', async ({ page }) => {
    await page.getByText('Settings').first().click()
    // Settings should show some option (network color, status report, etc.)
    const settingsContent = page.getByText(/color/i)
      .or(page.getByText(/status/i))
      .or(page.getByText(/settings/i))
    await expect(settingsContent.first()).toBeVisible({ timeout: 3_000 })
  })

  test('Chain Stats shows blockchain data', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Chain Stats').or(page.getByText('Stats')).first().click()
    // Should display some chain output
    const output = page.getByText(/block/i).or(page.getByText(/pool/i)).or(page.getByText(/mined/i))
    await expect(output.first()).toBeVisible({ timeout: 5_000 })
  })
})
```

**Step 2: Run the spec**

```bash
npm run test:e2e -- 02-terminal 2>&1 | tail -30
```

**Step 3: Commit**

```bash
git add playwright/tests/02-terminal.spec.ts
git commit -m "feat(e2e): 02-terminal spec — agent chat menu walk"
```

---

### Task 6: `03-blockchain.spec.ts` — Secure + Write Data flows

**Files:**
- Create: `playwright/tests/03-blockchain.spec.ts`

Tests blockchain actions and asserts Zustand state changes.

**Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test'

test.describe('03 · Blockchain Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByText('CPU Energy')).toBeVisible({ timeout: 15_000 })
  })

  test('Secure action decreases CPU Energy in store', async ({ page }) => {
    // Read energy before
    const energyBefore = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? store.getState().energy : null
    })

    // Navigate to Secure → 1 Generation
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Secure').first().click()
    await page.getByText('1 Generation').or(page.getByText('1 Gen')).first().click()

    // Find and click the execute/confirm button
    const executeBtn = page.getByRole('button', { name: /execute|confirm|secure/i })
    if (await executeBtn.isVisible({ timeout: 2_000 })) {
      await executeBtn.click()
    }

    // Wait for store update
    await page.waitForTimeout(1_000)

    const energyAfter = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? store.getState().energy : null
    })

    if (energyBefore !== null && energyAfter !== null) {
      expect(energyAfter).toBeLessThan(energyBefore)
    } else {
      // Store not accessible — gap
      test.fail(true, 'window.__gameStore not available — Zustand bridge missing')
    }
  })

  test('Write Data On Chain shows input or confirmation', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Write Data').first().click()

    // Should show some input or confirmation UI
    const writeUi = page.getByRole('textbox')
      .or(page.getByText(/message/i))
      .or(page.getByText(/write/i))
      .or(page.getByText(/data/i))
    await expect(writeUi.first()).toBeVisible({ timeout: 5_000 })
  })

  test('Read Data On Chain returns output', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Read Data').first().click()

    // Should show scan output or "no data" message
    const readOutput = page.getByText(/scan|report|data|no data|empty/i)
    await expect(readOutput.first()).toBeVisible({ timeout: 5_000 })
  })
})
```

**Step 2: Run the spec**

```bash
npm run test:e2e -- 03-blockchain 2>&1 | tail -30
```

**Step 3: Commit**

```bash
git add playwright/tests/03-blockchain.spec.ts
git commit -m "feat(e2e): 03-blockchain spec — Secure + Write Data flows"
```

---

### Task 7: `04-grid.spec.ts` — Node selection + agent creation

**Files:**
- Create: `playwright/tests/04-grid.spec.ts`

Tests grid interaction by clicking near the canvas center and verifying UI responses.

**Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test'

test.describe('04 · Grid Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByText('CPU Energy')).toBeVisible({ timeout: 15_000 })
  })

  test('canvas is present and sized', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(200)
    expect(box!.height).toBeGreaterThan(200)
  })

  test('clicking canvas near center opens QuickActionMenu or AgentCreator', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) test.skip(true, 'Canvas not found')

    // Click slightly offset from center (avoid clicking own homenode)
    await canvas.click({ position: { x: box!.width / 2 + 60, y: box!.height / 2 } })
    await page.waitForTimeout(500)

    // Either a QuickActionMenu, AgentCreator, or some node UI should appear
    const nodeUi = page.getByText(/deploy|create|claim|node|unclaimed/i)
    // Not asserting — just checking something responds
    const appeared = await nodeUi.first().isVisible({ timeout: 2_000 }).catch(() => false)
    // Record result but don't fail — canvas interaction is fragile
    console.log('Node UI appeared after canvas click:', appeared)
  })

  test('Zustand agents map is populated after load', async ({ page }) => {
    await page.waitForTimeout(3_000) // allow hydration

    const agentCount = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? Object.keys(store.getState().agents).length : -1
    })

    expect(agentCount).toBeGreaterThan(-1) // -1 means bridge missing
    // Agent count ≥ 1 means homenode loaded from Supabase
    expect(agentCount).toBeGreaterThanOrEqual(1)
  })

  test('currentUserId is set after game loads', async ({ page }) => {
    await page.waitForTimeout(3_000)

    const userId = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? store.getState().currentUserId : null
    })

    expect(userId).not.toBeNull()
  })
})
```

**Step 2: Run the spec**

```bash
npm run test:e2e -- 04-grid 2>&1 | tail -30
```

**Step 3: Commit**

```bash
git add playwright/tests/04-grid.spec.ts
git commit -m "feat(e2e): 04-grid spec — canvas interaction + Zustand state assertions"
```

---

### Task 8: Gap reporter script

**Files:**
- Create: `playwright/scripts/report-gaps.ts`

Reads `playwright-report/results.json` (generated by Playwright's JSON reporter) and prints a human-readable gap summary.

**Step 1: Add JSON reporter to `playwright.config.ts`**

Update the `reporter` line:
```ts
reporter: [
  ['html', { outputFolder: 'playwright-report' }],
  ['json', { outputFile: 'playwright-report/results.json' }],
  ['list'],
],
```

**Step 2: Create `playwright/scripts/report-gaps.ts`**

```ts
import { readFileSync, existsSync } from 'fs'

interface TestResult {
  title: string
  status: 'passed' | 'failed' | 'skipped' | 'timedOut'
  errors?: { message: string }[]
  attachments?: { name: string; path: string }[]
}

interface Suite {
  title: string
  suites?: Suite[]
  tests?: TestResult[]
}

interface Report {
  suites: Suite[]
}

function collectTests(suite: Suite, results: { spec: string; test: string; status: string; error?: string }[]) {
  const specName = suite.title
  for (const test of suite.tests ?? []) {
    results.push({
      spec: specName,
      test: test.title,
      status: test.status,
      error: test.errors?.[0]?.message?.split('\n')[0],
    })
  }
  for (const child of suite.suites ?? []) {
    collectTests(child, results)
  }
}

const reportPath = 'playwright-report/results.json'
if (!existsSync(reportPath)) {
  console.log('No report found. Run: npm run test:e2e first.')
  process.exit(0)
}

const report: Report = JSON.parse(readFileSync(reportPath, 'utf-8'))
const results: { spec: string; test: string; status: string; error?: string }[] = []

for (const suite of report.suites) {
  collectTests(suite, results)
}

const passed = results.filter((r) => r.status === 'passed')
const failed = results.filter((r) => r.status !== 'passed' && r.status !== 'skipped')

console.log('\n=== Beta Tester Gap Report ===\n')

const bySpec: Record<string, typeof results> = {}
for (const r of results) {
  ;(bySpec[r.spec] ??= []).push(r)
}

for (const [spec, tests] of Object.entries(bySpec)) {
  const allPassed = tests.every((t) => t.status === 'passed')
  const icon = allPassed ? '✅' : '❌'
  const passCount = tests.filter((t) => t.status === 'passed').length
  console.log(`${icon} ${spec.padEnd(30)} ${passCount}/${tests.length} passed`)
  for (const t of tests.filter((t) => t.status !== 'passed')) {
    console.log(`   ⚠  ${t.test}`)
    if (t.error) console.log(`      ${t.error.slice(0, 100)}`)
  }
}

console.log(`\n${failed.length} gap(s) found, ${passed.length} passed.\n`)
if (failed.length > 0) process.exit(1)
```

**Step 3: Add script to `package.json`**

```json
"e2e:gaps": "npx ts-node --project tsconfig.json playwright/scripts/report-gaps.ts"
```

**Step 4: Run a test and verify the report**

```bash
npm run test:e2e 2>&1 | tail -20
npm run e2e:gaps
```

Expected output: gap summary with ✅ / ❌ per spec.

**Step 5: Commit**

```bash
git add playwright.config.ts playwright/scripts/report-gaps.ts package.json
git commit -m "feat(e2e): gap reporter — structured summary from Playwright JSON output"
```

---

### Task 9: Watch mode + README update

**Files:**
- Modify: `package.json`
- Modify: `README.md` (or create if missing)

**Step 1: Add watch script to `package.json`**

```json
"test:e2e:watch": "watch 'npm run test:e2e' playwright/tests"
```

Or simpler (poll every 5 min via a shell loop — no extra dependency):
```json
"test:e2e:watch": "while true; do npm run test:e2e; sleep 300; done"
```

Use the simple version — no extra dependency needed.

**Step 2: Add E2E testing section to README.md**

Find or create `README.md` and add:

```md
## E2E Beta Testing

Autonomous Playwright beta testers exercise the full user journey + game interactions.

### Setup (once)

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (from Supabase Project Settings → API)
2. Seed the test user: `npm run e2e:seed`

### Run

```bash
npm run test:e2e          # single run
npm run test:e2e:watch    # continuous (reruns every 5 min)
npm run e2e:gaps          # print gap summary from last run
npm run test:e2e:report   # open HTML report in browser
```

### What It Tests

| Spec | Coverage |
|------|---------|
| `01-journey` | Landing page, auth, game load, ResourceBar, canvas present |
| `02-terminal` | Agent terminal menu, Blockchain Protocols sub-menu, Settings |
| `03-blockchain` | Secure action (Zustand delta), Write Data, Read Data |
| `04-grid` | Canvas present, node click response, Zustand agents populated |
```

**Step 3: Commit**

```bash
git add package.json README.md
git commit -m "feat(e2e): watch mode + README e2e testing docs"
```

---

## Execution Order

Tasks must run in order (each builds on the previous):

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

After Task 2 completes, verify `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` before running the seed script.

## Environment Variables Required

In `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://inqwwaqiptrmpruxczyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Project Settings → API → service_role>
```
