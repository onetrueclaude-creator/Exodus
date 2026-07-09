# Change Log — tests/

> Tracks what E2E tests changed, what's passing, and what's planned.
> Read `seed.md` first.
> **2026-07-09 note:** this log stops at the Feb-2026 22-test era. The suite has since grown: `tests/visual/` (visual regression, `playwright.visual.config.ts`), `playtest/` agents, and E2E-in-CI (W4, 2026-06-29). Trust `npx playwright test --list` for counts, not this file.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

---

## 2026-02-24 — 4 parallel faction beta testers

**Added:** `scripts/` + faction beta tester specs — 4 parallel autonomous agents testing each faction's game path.

**Commit:** `fbc9489c6 feat(e2e): 4 parallel faction beta testers + fresh testnet setup`

**Why:** Manual testing doesn't scale; autonomous agents catch edge cases faster.

---

## 2026-02-23 — All 22 tests passing

**Fixed:**
- `02-terminal.spec.ts` — strict mode: `.or()` locator → `.first()` (button + inner span conflict)
- `03-blockchain.spec.ts` — pointer-events: `getByText` → `.glass-panel-floating button[name=Secure]`
- `fixtures.ts` — `waitForTimeout(500)` after `store.setState` for React re-render

**Status:** All 22 tests green. ✓

**Commit:** Before `fbc9489c6`.

---

## Pending

- [ ] Add E2E test for galaxy grid spiral rendering (Phase 2)
- [ ] Add E2E test for faction fog-of-war visibility
- [ ] Add E2E test for minigrid sub-cell clicks
- [ ] Capture test gaps from beta tester runs in `vault/research/users/`

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../CLAUDE.md` | Monorepo root instructions |
| Game app under test | `../apps/game/CLAUDE.md` | UI gotchas + component patterns |
| Spec tree | `../spec/CLAUDE.md` | Protocol revision changelog |
