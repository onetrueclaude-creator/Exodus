# Change Log — vault/

> Tracks what changed in the knowledge vault, what will be added, and why.
> Format: `YYYY-MM-DD — [summary]`
> Read `seed.md` first to understand vault structure before reading this log.

---

## 2026-06-14 — Whitepaper v1.2 (Phyllotaxis Revision)

**Changed:** `whitepaper.md` from v1.1 to v1.2. Replaced the open coordinate-grid spatial model with a golden-angle phyllotaxis lattice — a deterministic sunflower of agent seats around a central Singularity core (renamed from "Machines"). A seat is a single activity rank `k`: `angle(k) = k · 137.50776°`, `radius(k) = c·√k`; the golden angle guarantees non-overlapping interaction spokes. Hardness tiers are now equal-width radial bands (`band(k) = ceil(√(k/8))`, `hardness = 16 × band`); density is per-node (`SHA-256(node_id)`, origin clamped 1.0) rather than per-coordinate. Movement is activity-driven: rising activity spirals a seat inward, inactivity drifts it outward past a grace window; deliberate active relocation pays AGNTC + CPU to advance standing. Retired empire/territory/adjacency/deploy-range and the `MAX_CHILDREN_*` model in favour of one seat + 2–4 orbiting subagents (Community 2, Professional/Founder 4). The Singularity is gateway + accumulator only and never mines or secures (resolves Bugs #9/#10); genesis seats only the Singularity with inner ranks open (Bug #11). Updated Abstract, §1.3, §4.1–§4.5, Figure 1, §10.1–§10.3, §11.2/§11.3/§11.4/§11.5, §18.5, §19.1–§19.6, §22 parameters, and the glossary. §22 added `GOLDEN_ANGLE_DEG`, `SEATS_INNER_BAND`, the Activity & Seating block (half-life, cheap-action cap, promotion cooldown, edge fade, subagent caps), and `SINGULARITY_*` aliases; dropped `GRID_SIDE`, `NODE_GRID_SPACING`, `HOMENODE_BASE_ANGLE`, `*_DEPLOY_RANGE`, `MAX_CHILDREN_*`. Economic core (subgrid mining, dual staking, BME, 5% ceiling, vesting) unchanged.

**Why:** Align the public protocol specification with the phyllotaxis overhaul (spec `docs/superpowers/specs/2026-06-14-orbital-lattice-overhaul-design.md`, rev 2) and the chain params landed in Plan 2 (`chain/agentic/params.py`). §22 values are cross-checked against the code by `chain/tests/test_whitepaper_audit.py`.

---

## 2026-05-14 — Whitepaper v1.1 (Open-Grid Revision)

**Changed:** `whitepaper.md` from v1.0 to v1.1. Retired the four-arm logarithmic spiral spatial model. Factions are now identity classes, not territorial divisions. AGNTC no longer split 25%/25%/25%/25% by faction-arm; mints directly to claimants. Machines accumulator preserved structurally via permanent origin occupancy. New §4.5 "Open-Grid Spatial Economy" added. Updated Abstract, §1.3, §4.1, §4.2, §4.3, Figure 1, §10.1, §10.2, §10.3, §11.2, §12.3, §19.1, §19.2, §19.3, §22 parameters, §22 Genesis Topology, and the glossary. Removed `DIST_*=0.25` parameter rows; added `MACHINES_ORIGIN_COORD = (0, 0)`. Internal revision log (`whitepaper-changelog.md`, gitignored) updated with the corresponding v2.0 entry.

**Why:** Align the public protocol specification with the open-grid implementation that landed in the reference client (PRs #84/#85/#86). v1.0 described territorial faction arms that the implementation no longer enforces.

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
