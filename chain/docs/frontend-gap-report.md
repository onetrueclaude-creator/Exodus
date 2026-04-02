# Frontend Gap Report — ZkAgentic Sites vs Testnet Reality

> Generated: 2026-03-29
> Scope: All three live web properties vs current testnet capabilities
> Methodology: Inventory all site pages → compare against testnet API + Supabase state

---

## Site Inventory

| Domain | Source | Deploy | Purpose |
|--------|--------|--------|---------|
| `zkagentic.com` | `ZkAgentic/projects/web/zkagentic-deploy/` | GitHub Pages | Marketing site — static stats, whitepaper, waitlist |
| `zkagentic.ai` | `ZkAgentic/projects/web/zkagentic-monitor/` | Cloudflare Pages | Live testnet monitor + subgrid simulator |
| `zkagenticnetwork.com` | `ZkAgentic/projects/web/zkagenticnetwork-landing/` | Cloudflare Pages | Minimal placeholder — hero + TESTNET PHASE badge |

---

## Gap 1 — Subgrid Simulator Tab is Dead in Production (CRITICAL)

**Severity:** Critical — visible broken feature on the live dashboard

**What the site shows:** The `zkagentic.ai` dashboard has a "Subgrid Simulator" tab. It renders a wallet selector (Wallet 0–49), an 8×8 clickable cell grid, type counters, per-block yield projections, and Apply/Reset buttons. The JS (`simulator.js`) makes direct HTTP calls to:
- `GET https://api.zkagentic.ai/api/resources/{wallet}` — fetch current allocation
- `POST https://api.zkagentic.ai/api/resources/{wallet}/assign` — write allocation changes

**What the testnet actually does:** `api.zkagentic.ai` does not exist yet. The Railway deploy is pending (blocked on manual ADMIN_TOKEN setup). Every `simulator.js` API call returns a network error (connection refused or DNS failure).

**Impact:** The entire second tab of the monitor is non-functional for any visitor right now. The wallet selector loads but clicking any cell or hitting Apply silently fails. Users see an empty cell state with no explanation.

**Fix path:**
1. Complete the Railway deploy (runbook: `vault/agentic-chain/docs/railway-deploy-runbook.md`)
2. After deploy, add a UI guard in `simulator.js`: if the initial `/api/resources/{wallet}` fetch fails, show an "API offline — deploy pending" message instead of an empty grid
3. Pre-emptive fix: add a banner on the Subgrid tab saying "Requires live API endpoint" until deploy is confirmed

**Effort:** Low code (2-3 lines in simulator.js for the guard) + manual Railway deploy step

---

## Gap 2 — Marketing Site Has No Path to Live Testnet (HIGH)

**Severity:** High — missed conversion / engagement opportunity

**What the site shows:** `zkagentic.com/roadmap.html` describes Phase 2 as the current phase ("You Are Here") with:
> "Python FastAPI blockchain simulation, Next.js + PixiJS game UI, PoAIV consensus, mining, staking, subgrid — all functional, 593+ automated tests"

There is no link anywhere on `zkagentic.com` to the live monitor at `zkagentic.ai`. The homepage has a waitlist form and a "TESTNET PHASE" badge but no clickable link to the running dashboard.

**What the testnet actually does:**
- Live chain syncing to Supabase every 60 seconds
- Real staked_cpu values (Option A, range 20–120) per agent
- SQLite persistence (state survives restarts — this is new, roadmap copy predates it)
- Monitor with Realtime WebSocket updates
- Subgrid simulator (once API is deployed)
- Test count is now higher: 387 original + 82 crosscheck = 469+ in `tests/monitor_crosscheck/` alone

**Specific outdated data:**
| Location | Stale | Current |
|----------|-------|---------|
| `roadmap.html` | "593+ automated tests" | Higher (387 + 82 crosscheck) |
| `roadmap.html` | No mention of SQLite persistence | Implemented (2026-03-29) |
| `roadmap.html` | No mention of `api.zkagentic.ai` endpoint | Deployed (pending Railway) |
| All pages | No link to `zkagentic.ai` | Should link from hero + roadmap |

**Fix path:**
1. Add a CTA button on `zkagentic.com` home hero: "View Live Testnet →" → `https://zkagentic.ai`
2. Add a link in the Phase 2 roadmap entry to the monitor
3. Update the test count and add "SQLite persistence" bullet to the Phase 2 description
4. Low-risk: these are static HTML patches, no build required

**Effort:** ~15 lines across index.html and roadmap.html

---

## Gap 3 — Monitor Network Card Shows No Tier Breakdown (MEDIUM)

**Severity:** Medium — data is available but not surfaced

**What the site shows:** The monitor dashboard "Network" card shows:
- "Deployed Agents: N"
- "Total Claims: N"

The "Staking" card shows:
- "Total CPU Staked: NNNNN CPU" (aggregate sum of all agents' staked_cpu)

**What the testnet actually provides:** The `agents` Supabase table has a `tier` column (`"opus"`, `"sonnet"`, `"haiku"`). The testnet genesis creates exactly 9 agents: 1 origin, 4 Faction Masters (all `"opus"` tier), 4 homenodes (mixed tier). The API returns `tier` on every agent. The staked_cpu values are real (20–120 range, seeded from genesis).

**Impact:** Users see "9 agents" with no tier context. A breakdown of Opus/Sonnet/Haiku counts would immediately convey network capacity and tier distribution — which is a core game mechanic.

**What the staking card could show (with no API changes):**
```
Opus: 4 nodes — 422 CPU
Sonnet: 3 nodes — 186 CPU
Haiku: 2 nodes — 74 CPU
Total: 682 CPU staked
```

**Fix path:**
In `monitor.js`, the `updateAgents(agents)` function already receives the full agents array. Extend it to:
1. Group by `tier`
2. Sum CPU per tier
3. Update 3 new DOM elements (add them to the HTML card)

No Supabase query changes needed — `tier` is already fetched via `sb.from('agents').select('staked_cpu')`. Just needs to also select `tier`:

```javascript
// Change:
var result = await sb.from('agents').select('staked_cpu');
// To:
var result = await sb.from('agents').select('staked_cpu, tier');
```

Then add tier breakdown rendering in `updateAgents()`.

**Effort:** ~30 lines in monitor.js + ~10 lines in index.html (new DOM elements in the staking card)

---

## Secondary Gaps (Not Ranked)

### S1 — `zkagenticnetwork.com` is a bare placeholder
The landing shows "ZK Agentic Network" + "TESTNET PHASE" + a tagline with no content below the hero fold. No link to any working property. Low urgency — this domain is for the future game UI.

### S2 — Monitor has no "chain restarted" indicator
After the SQLite persistence implementation, chain state survives restarts. But the monitor has no way to distinguish a fresh genesis from a resumed chain. A "Chain age: 3 days, 2 hours" or "Genesis: 2026-03-29" display would help. This requires adding a `genesis_timestamp` field to the `chain_status` Supabase table and the API status response.

### S3 — Stale/Offline threshold is invisible
The monitor turns STALE after 120s and OFFLINE after 600s. These thresholds are hardcoded in monitor.js but not visible to users. A tooltip or footer note ("STALE if no update in 2 min") would reduce support questions.

### S4 — Simulator wallet labels
The simulator shows "Wallet 0" through "Wallet 49". Wallets 0–8 are genesis wallets with pre-seeded subgrid allocations; wallets 9–49 are empty and have no agents. The UI doesn't distinguish them. A "(genesis)" label on 0–8 or "(empty)" on 9–49 would reduce confusion.

---

## Priority Order

| # | Gap | Impact | Effort | Dependency |
|---|-----|--------|--------|------------|
| 1 | Subgrid Simulator dead | Critical | Low | Railway deploy |
| 2 | No marketing → monitor link | High | Very low | None |
| 3 | No tier breakdown on monitor | Medium | Low | None |
| S2 | Chain age indicator | Low | Medium | API + Supabase schema change |
| S4 | Simulator wallet labels | Low | Very low | None |

---

## Recommended Execution Order

1. **Now (no deploy needed):** Gap 2 (add `zkagentic.ai` link to marketing site) + Gap 3 partial (select `tier` in monitor.js + add tier display to staking card) + S4 (wallet labels)
2. **After Railway deploy:** Gap 1 (verify simulator end-to-end, add offline guard)
3. **Future sprint:** S2 (chain age indicator, requires API + schema change)
