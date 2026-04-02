/**
 * Playwright global setup — runs once before any test.
 *
 * 1. Verifies the testnet API is reachable.
 * 2. Resets the chain to a fresh genesis (block 0).
 * 3. Pre-claims one homenode per faction beta tester so the chain
 *    has 4 live nodes before the browser tests start.
 *
 * If the testnet is offline the setup exits gracefully — chain-dependent
 * tests will fall back to the OFFLINE badge / mock store path.
 */
import type { FullConfig } from '@playwright/test'

const TESTNET = 'http://localhost:8080'

// Blockchain grid coordinates for each faction homenode.
// Chosen to land in their respective spiral arm (well outside R_FLAT=3).
const FACTION_NODES = [
  { walletIdx: 10, x: -500, y: -500, label: 'BT_Free_01     (free_community  / NW)' },
  { walletIdx: 20, x:  500, y:    0, label: 'BT_Treasury_01 (treasury        / E) ' },
  { walletIdx: 30, x:    0, y:  500, label: 'BT_Founder_01  (founder_pool    / S) ' },
  { walletIdx: 40, x: -500, y:    0, label: 'BT_Pro_01      (professional_pool/ W)' },
]

export default async function globalSetup(_config: FullConfig) {
  console.log('\n🌌 ZK Agentic Network — Beta Tester Global Setup\n')

  // ── 1. Check testnet ──────────────────────────────────────────────────────
  let testnetUp = false
  try {
    const r = await fetch(`${TESTNET}/api/status`, { signal: AbortSignal.timeout(5_000) })
    testnetUp = r.ok
  } catch {
    // offline
  }

  if (!testnetUp) {
    console.warn('⚠️  Testnet not running at localhost:8080')
    console.warn('   To start: cd chain && uvicorn agentic.testnet.api:app --port 8080')
    console.warn('   Continuing — chain tests will use OFFLINE fallback\n')
    return
  }

  const { total_mined, blocks_processed } = await (await fetch(`${TESTNET}/api/status`)).json()
  console.log(`🔗 Testnet online — blocks: ${blocks_processed}, mined: ${total_mined} AGNTC`)

  // ── 2. Fresh genesis reset ────────────────────────────────────────────────
  console.log('🔄 Resetting to fresh genesis...')
  const resetRes = await fetch(`${TESTNET}/api/reset`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  })
  if (!resetRes.ok) {
    console.warn('⚠️  Reset failed — continuing with existing chain state')
  } else {
    const reset = await resetRes.json()
    console.log(`✅ ${reset.message}`)
  }

  // ── 3. Pre-claim faction homnodes ─────────────────────────────────────────
  console.log('\n🗺️  Claiming faction homenode coordinates...')
  for (const c of FACTION_NODES) {
    try {
      const r = await fetch(`${TESTNET}/api/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_index: c.walletIdx, x: c.x, y: c.y, stake: 200 }),
        signal: AbortSignal.timeout(5_000),
      })
      if (r.ok) {
        const result = await r.json()
        console.log(`  ✅ ${c.label} → (${result.coordinate.x}, ${result.coordinate.y}) density=${result.density.toFixed(2)}`)
      } else {
        const err = await r.text()
        console.warn(`  ⚠️  ${c.label}: ${err.slice(0, 100)}`)
      }
    } catch (e) {
      console.warn(`  ⚠️  ${c.label}: claim failed — ${e}`)
    }
  }

  console.log('\n🚀 Fresh testnet ready with 4 faction beta tester nodes\n')
}
