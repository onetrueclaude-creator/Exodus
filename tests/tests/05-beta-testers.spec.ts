/**
 * Beta Testers 05 — Faction Simulation
 *
 * 4 autonomous beta testers, one per spiral galaxy faction.
 * Each tester runs in a separate parallel browser worker and:
 *
 *   1. Loads /game and waits for the Zustand store bridge
 *   2. Seeds their homenode at their faction's visual position
 *   3. Claims 2 neighboring nodes (E + S adjacent cells)
 *   4. Asserts all 3 nodes appear in the store agents map
 *   5. Navigates Agent Terminal → Blockchain Protocols → Secure
 *   6. Calls /api/mine to mine one live block (shows chain growth)
 *   7. Verifies the TESTNET/OFFLINE badge is visible
 *
 * Designed as a dev simulation — no real auth or Supabase needed.
 * The store bridge (window.__gameStore) provides full game state control.
 */
import { test, expect } from '@playwright/test'

const TESTNET_API = 'http://localhost:8080'
const CELL_SIZE = 60  // world pixels per spiral grid cell

// chainToVisual scale: blockchain grid coords → visual world coords
const CHAIN_SCALE = 4000 / 3240

// Round blockchain coord to nearest visual pixel (mirrors chainToVisual in testnetApi.ts)
function chainToVisual(n: number): number {
  return Math.round(n * CHAIN_SCALE)
}

const TESTERS = [
  {
    id: 'bt-free',
    name: 'BT_Free_01',
    faction: 'free_community' as const,
    walletIdx: 10,
    // Blockchain (-500, -500) → visual NW quadrant (upper-left on screen)
    homePos: { x: chainToVisual(-500), y: chainToVisual(-500) },
    description: 'free_community — NW spiral arm',
    tier: 'sonnet' as const,
  },
  {
    id: 'bt-treasury',
    name: 'BT_Treasury_01',
    faction: 'treasury' as const,
    walletIdx: 20,
    // Blockchain (500, 0) → visual E quadrant (right on screen)
    homePos: { x: chainToVisual(500), y: 0 },
    description: 'treasury — E spiral arm',
    tier: 'sonnet' as const,
  },
  {
    id: 'bt-founder',
    name: 'BT_Founder_01',
    faction: 'founder_pool' as const,
    walletIdx: 30,
    // Blockchain (0, 500) → visual S quadrant (lower on screen)
    homePos: { x: 0, y: chainToVisual(500) },
    description: 'founder_pool — S spiral arm',
    tier: 'sonnet' as const,
  },
  {
    id: 'bt-pro',
    name: 'BT_Pro_01',
    faction: 'professional_pool' as const,
    walletIdx: 40,
    // Blockchain (-500, 0) → visual W quadrant (left on screen)
    homePos: { x: chainToVisual(-500), y: 0 },
    description: 'professional_pool — W spiral arm',
    tier: 'opus' as const,
  },
] as const

// Run all 4 testers in parallel within this file
test.describe.configure({ mode: 'parallel' })

for (const tester of TESTERS) {
  test(`[${tester.name}] ${tester.description}`, async ({ page }) => {
    console.log(`\n🤖 ${tester.name} starting simulation...`)

    // ── 1. Load game and wait for store ────────────────────────────────────
    await page.goto('/game')

    await page.waitForFunction(() => {
      const store = (window as any).__gameStore
      if (typeof store !== 'function') return false
      return !store.getState().isInitializing
    }, { timeout: 25_000 })

    // ── 2. Seed homenode at faction visual position ─────────────────────────
    const { homePos, id, name, faction, tier } = tester
    await page.evaluate(
      ({ homePos, id, name, faction, tier }) => {
        const store = (window as any).__gameStore
        if (!store) return

        store.setState({
          agents: {
            [`${id}-homenode`]: {
              id: `${id}-homenode`,
              userId: id,
              position: homePos,
              tier,
              isPrimary: true,
              planets: [],
              createdAt: Date.now(),
              username: name,
              bio: undefined,
              introMessage: `${name} — ${faction} faction homenode`,
              borderRadius: 30,
              borderPressure: 0,
              cpuPerTurn: 10,
              miningRate: 1,
              energyLimit: 1000,
              stakedCpu: 200,
              parentAgentId: undefined,
              density: 0.6,
              storageSlots: 10,
            },
          },
          currentUserId: id,
          primaryAgentId: `${id}-homenode`,
          currentAgentId: `${id}-homenode`,
          selectedAgentId: `${id}-homenode`,
          userFaction: faction,
          energy: 1000,
        })
      },
      { homePos, id, name, faction, tier },
    )
    await page.waitForTimeout(300)

    // ── 3. Claim 2 neighboring nodes (E + S adjacent cells) ────────────────
    const neighbors = [
      { x: homePos.x + CELL_SIZE, y: homePos.y,             label: 'E' },
      { x: homePos.x,             y: homePos.y + CELL_SIZE,  label: 'S' },
    ]

    for (let i = 0; i < neighbors.length; i++) {
      const pos = neighbors[i]
      await page.evaluate(
        ({ id, i, pos }) => {
          const store = (window as any).__gameStore
          if (!store) return
          const neighborId = `${id}-neighbor-${i}`
          store.setState((s: any) => ({
            agents: {
              ...s.agents,
              [neighborId]: {
                id: neighborId,
                userId: id,
                position: { x: pos.x, y: pos.y },
                tier: 'haiku' as const,
                isPrimary: false,
                planets: [],
                createdAt: Date.now(),
                username: `${id}-node-${i}`,
                bio: undefined,
                introMessage: undefined,
                borderRadius: 20,
                borderPressure: 0,
                cpuPerTurn: 5,
                miningRate: 1,
                energyLimit: 500,
                stakedCpu: 100,
                parentAgentId: `${id}-homenode`,
                density: 0.4,
                storageSlots: 5,
              },
            },
          }))
        },
        { id, i, pos },
      )
      console.log(`  📍 ${name}: claimed ${pos.label} neighbor at (${pos.x}, ${pos.y})`)
    }

    // ── 4. Assert all 3 nodes in store ─────────────────────────────────────
    const agentCount = await page.evaluate(
      ({ id }) => {
        const store = (window as any).__gameStore
        if (!store) return 0
        return Object.keys(store.getState().agents).filter((k: string) => k.startsWith(id)).length
      },
      { id },
    )
    expect(agentCount).toBe(3)
    console.log(`  ✅ ${name}: ${agentCount}/3 nodes confirmed in store`)

    // ── 5. Navigate terminal → Blockchain Protocols → Secure ────────────────
    await expect(page.getByRole('button', { name: /Agent Terminal/i })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Agent Terminal/i }).click()
    await expect(page.getByText('Blockchain Protocols')).toBeVisible({ timeout: 8_000 })
    await page.getByText('Blockchain Protocols').first().click()
    await expect(
      page.locator('.glass-panel-floating').getByRole('button', { name: /Secure/i }).first()
    ).toBeVisible({ timeout: 5_000 })
    console.log(`  ⛓️  ${name}: Blockchain Protocols → Secure reachable`)

    // ── 6. Mine one live block via API ──────────────────────────────────────
    let mineResult: { block_number?: number; total_mined?: number } | null = null
    try {
      mineResult = await page.evaluate(async () => {
        const r = await fetch('http://localhost:8080/api/mine', { method: 'POST' })
        if (!r.ok) return null
        return r.json()
      })
    } catch {
      // testnet offline — skip
    }

    if (mineResult) {
      const blockNum = mineResult.block_number ?? '?'
      const mined   = typeof mineResult.total_mined === 'number'
        ? mineResult.total_mined.toFixed(4)
        : '?'
      console.log(`  ⛏️  ${name}: mined block #${blockNum} — cumulative ${mined} AGNTC`)
    } else {
      console.log(`  ⚡ ${name}: chain offline — skipping live mine`)
    }

    // ── 7. Verify TESTNET / OFFLINE badge visible ───────────────────────────
    const badge = page.getByText('TESTNET').or(page.getByText('OFFLINE'))
    await expect(badge.first()).toBeVisible({ timeout: 8_000 })

    console.log(`  🎮 ${name}: simulation complete\n`)
  })
}
