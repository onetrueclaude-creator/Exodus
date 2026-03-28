# Change Log — src/

> Tracks what changed in the Next.js source tree, what's planned, and why.
> Read `seed.md` first.

---

## 2026-03-28 — Game terminal wiring: Secure + Chain Stats

**Changed:** Secure command in agent terminal redesigned from generation-based (block cycles + AGNTC) to cell allocation (8/16/32/48/64 cells via POST to public API at `api.zkagentic.ai`).
**Changed:** Chain Stats panel now fetches live data from public API instead of reading from Zustand store.

---

## 2026-02-25 — Tokenomics v2 frontend (commit `764195e6b`)

**Changed:** `types/testnet.ts` — dynamic grid defaults (±20), removed `community_pool_remaining`, added `epoch_ring`.
**Changed:** `store/gameStore.ts` — removed `poolRemaining` state.
**Changed:** `hooks/useGameRealtime.ts`, `hooks/useTestnetWebSocket.ts` — removed pool references.
**Changed:** `app/game/page.tsx`, `components/TimechainStats.tsx`, `components/AgentChat.tsx` — removed pool UI.
**Changed:** `__tests__/onboarding-flow.test.ts` — updated grid bounds to ±20.

---

## 2026-02-25 — Resource system frontend (commit `a783213a2`)

**Changed:** `store/gameStore.ts` — `energy` renamed to `cpuTokens`, +9 new resource fields, +6 setter actions.
**Changed:** `components/ResourceBar.tsx` — 5 resource counters: CPU Tokens (yellow), CPU Staked (orange), Dev Points (indigo), Research Points (violet), Storage/DATA (teal).
**Changed:** `hooks/useGameRealtime.ts` — fetches `/api/resources/0` for subgrid projections on startup.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md` + sub-seed.md/CLAUDE.md across all src/ subdirs.

**Why:** Consistent Claude navigation — seed.md first (purpose), CLAUDE.md second (history).

---

## 2026-02-24 — Galaxy grid faction + connections

**Changed:** `components/GalaxyGrid.tsx` — clean connections, live chain data, faction derived from tier.

**Commit:** `a0e79335e feat(grid): clean connections, live chain, faction from tier`

**Why:** Galaxy grid redesign Phase 1 — faction coloring and clean connection lines between same-faction nodes.

---

## 2026-02-24 — Galaxy grid full faction coverage

**Changed:** `components/GalaxyGrid.tsx` — no void cells, correct grid phase alignment.

**Commit:** `adca30656 fix(grid): full faction coverage — no void cells, correct grid phase`

**Why:** Previous implementation left some grid cells unassigned to any faction.

---

## 2026-02-24 — E2E test infrastructure

**Changed:** `playwright/` tree — 4 parallel faction beta tester agents + fresh testnet setup.

**Commit:** `fbc9489c6 feat(e2e): 4 parallel faction beta testers + fresh testnet setup`

**Why:** Autonomous game testing to catch UI regressions and gameplay gaps.

---

## 2026-02-23 — Loading overlay fix + energy tick guard

**Changed:**
- `hooks/useGameRealtime.ts` — `Promise.race` 5s timeout for Supabase (SSL error bypass)
- `store/gameStore.ts` — zero-agent tick guard (`if (ownAgents.length === 0) return s`)

**Why:** Game was hanging on SSL error; tick was adding income with no deployed agents.

---

## Pending

- [ ] `components/GalaxyGrid.tsx` has uncommitted changes (8 lines) — verify and commit
- [ ] Galaxy grid Phase 2: spiral arm rendering + minigrid sub-cells
- [ ] Supabase middleware sync: `services/testnetChainService.ts` → read from Supabase
- [ ] Write `components/seed.md` sub-components breakdown (TimechainStats, DockPanel, etc.)

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../CLAUDE.md` | Monorepo root changelog |
| Components | `components/CLAUDE.md` | UI component history |
| Store | `store/CLAUDE.md` | State management history |
| Services | `services/CLAUDE.md` | Chain service adapter history |
| Hooks | `hooks/CLAUDE.md` | Hook history |
| Feature plans | `../vault/product/CLAUDE.md` | Product decisions |
| Engineering | `../vault/engineering/CLAUDE.md` | Architecture decisions |
