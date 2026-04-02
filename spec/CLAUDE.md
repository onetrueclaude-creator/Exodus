# Change Log — vault/

> Tracks what changed in the knowledge vault, what will be added, and why.
> Format: `YYYY-MM-DD — [summary]`
> Read `seed.md` first to understand vault structure before reading this log.

---

## 2026-03-28 — Security hardening + Supabase sync additions

**Changed:** `agentic-chain/agentic/testnet/supabase_sync.py` — removed hardcoded service_role key, moved to env vars via python-dotenv. Added sync functions for new `subgrid_allocations` and `resource_rewards` tables.
**Changed:** `agentic-chain/agentic/testnet/api.py` — CORS restricted to specific origins, admin-gated `/api/reset` and `/api/automine`, rate limiting via SlowAPI, WebSocket cap at 50.

---

## 2026-02-25 — Hierarchical memory system initialized

**Added:**
- `seed.md` (existed, updated with navigation header — vault/seed.md contains canonical game design vision)
- `CLAUDE.md` (this file) — changelog tracking for the vault directory tree
- Sub-CLAUDE.md and seed.md files added across all vault subdirectories

**Why:** Establish hierarchical Claude navigation — seed.md describes purpose, CLAUDE.md tracks history. Claude reads seed.md first, then CLAUDE.md, when entering any directory.

---

## 2026-02-24 — Galaxy grid redesign vision captured

**Added:** `seed.md` — galaxy grid redesign golden prompt recovered from session transcript (was silently dropped by 1500-char watcher limit). Approved design summary added (4-arm spiral, faction system, minigrids as blockchain ledger visualization).

**Why:** The original spec (3217 chars) was lost during compaction. Recovered from `compacted.md` and saved permanently.

---

## 2026-02-23 — Vault knowledge structure established

**Added:** All top-level vault subdirectories (`engineering/`, `product/`, `research/`, `collaborate/`, `ideas/`, `reviews/`, `skills/`, `prompts/`, `_templates/`). Template files in `_templates/` for consistent document formatting.

**Why:** Centralized knowledge base for the ZK Agentic Network project — all non-code artifacts (decisions, research, specs) live here.

---

## 2026-02-25 — Tokenomics v2: organic growth model

**Design:** `docs/plans/2026-02-25-tokenomics-v2-design.md`
**Impl plan:** `docs/plans/2026-02-25-tokenomics-v2-impl.md` (10 tasks, TDD)

**Key changes:**
- Removed scheduled inflation — minting IS inflation (1 AGNTC per coordinate claimed)
- 25/25/25/25 faction distribution (Community/Machines/Founders/Professional)
- Hardness = 16N (grows 2× faster than grid expansion)
- Dynamic grid bounds (no fixed ±3240)
- Genesis supply = 900 AGNTC (9 nodes × 100 coords)
- Machines Faction: AI agents, hardcoded never-sell-below-acquisition-cost
- 50% fee burn on chat/storage/secure/transact
- CommunityPool removed entirely

**Backend commits:** `788b9cb38`..`7f5a00950` (8 files, 26 new tests)
**Frontend commit:** `764195e6b` (11 files — dynamic grid defaults, removed pool references)

---

## 2026-02-25 — Epoch + subgrid implementation complete (commit `a783213a2`)

**Added (backend):** `EpochTracker` (`agentic/galaxy/epoch.py`) — ring-based mining expansion, hardness divides yield. `SubgridAllocator` (`agentic/galaxy/subgrid.py`) — 4-type sub-cell allocation (Secure/Develop/Research/Storage), 64 cells, `level^0.8` scaling.
**Added (API):** `/api/epoch`, `/api/resources/{wallet_index}`, `/api/resources/{wallet_index}/assign`.
**Added (frontend):** `gameStore.ts` `energy`→`cpuTokens` rename + 9 new resource fields; `ResourceBar.tsx` 5-counter HUD; `useGameRealtime.ts` chain resource fetch.

---

## 2026-02-25 — Resource system redesign approved

**Added:** `docs/plans/2026-02-25-resource-system-design.md` — full resource model revision.

**Key decisions:**
- CPU Energy renamed to **CPU Tokens** (read-only cumulative proof-of-work counter)
- **CPU Staked** introduced (active + all-time, driven by Secure sub-agent token spend)
- **Subgrid allocation panel** — private 8×8 inner grid assigns sub-cells to 4 autonomous agent types
- 4 types: Secure (AGNTC), Develop (dev points), Research (research points), Storage (ZK data on-chain)
- Level scaling: `output = base × level^0.8`
- Canonical design captured in `vault/seed.md` under "Resource System Redesign"

**Also updated:** `vault/seed.md` with approved design summary.

---

## 2026-03-09 — Whitepaper v1.1 academic upgrade + companion documents

**Changed:** `whitepaper.md` upgraded from v1.0 to v1.1 (1964 -> 2413 lines). Major additions:
- Formal adversary model and 3 security properties (VER-INT, VER-PRIV, COM-UNBIAS)
- PoAIV pseudocode (committee selection, attestation protocol)
- Per-mechanism attack analysis (5 attack vectors with mitigations)
- 6 ASCII diagrams (grid, block lifecycle, staking, subgrid, ZK pipeline, migration)
- Competitor comparison table (vs Bitcoin, Ethereum, Solana, Zcash, Bittensor)
- Limitations and Open Problems section (7 honest disclosures incl. ZKML gap)
- VRF specification (Ed25519, RFC 9381), ZK circuit architecture overview
- Completed APY table, fixed Gini coefficient formula, fixed VRF selection formula
- CPU measurement trust assumptions and mitigation roadmap
- 7 new references [29]-[35]

**Added:**
- `vault/poaiv-formal.md` — PoAIV formal paper (~20 pages, security games, proofs, anti-injection)
- `vault/feasibility-report.md` — technology assessment, risk analysis, competitor positioning (~15 pages)
- `vault/litepaper.md` — 6-page investor-friendly overview
- `vault/whitepaper-v1-0.md` — backup of v1.0

**Design:** `docs/plans/2026-03-09-whitepaper-v1-1-academic-upgrade-design.md`
**Plan:** `docs/plans/2026-03-09-whitepaper-v1-1-academic-upgrade-impl.md`

---

## Pending

- [ ] Write Proof of Energy (PoE) whitepaper section in `engineering/`
- [ ] Fill `research/competitors/` with competitor landscape analysis
- [ ] Write `product/roadmap/` milestones for Q1 2026
- [ ] Define base rates: BASE_SECURE_RATE, BASE_DEVELOP_RATE, BASE_RESEARCH_RATE, BASE_STORAGE_RATE
- [ ] Define max subsquare level and dev point cost formula for leveling
- [ ] Define Storage unit (bytes vs abstract data blocks)
