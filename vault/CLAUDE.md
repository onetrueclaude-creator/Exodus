# Change Log — vault/

> Tracks what changed in the knowledge vault, what will be added, and why.
> Format: `YYYY-MM-DD — [summary]`
> Read `seed.md` first to understand vault structure before reading this log.

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

## Pending

- [ ] Write Proof of Energy (PoE) whitepaper section in `engineering/`
- [ ] Fill `research/competitors/` with competitor landscape analysis
- [ ] Write `product/roadmap/` milestones for Q1 2026
- [ ] Define base rates: BASE_SECURE_RATE, BASE_DEVELOP_RATE, BASE_RESEARCH_RATE, BASE_STORAGE_RATE
- [ ] Define max subsquare level and dev point cost formula for leveling
- [ ] Define Storage unit (bytes vs abstract data blocks)
