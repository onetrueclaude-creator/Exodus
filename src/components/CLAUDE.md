# Change Log — src/components/

> Tracks what changed in React components, what's being built, and why.
> Read `seed.md` first.

---

## 2026-02-25 — ResourceBar: 5-counter resource HUD (commit `a783213a2`)

**Changed:** `ResourceBar.tsx` — expanded from single CPU Energy counter to 5 resource counters:
CPU Tokens (yellow), CPU Staked (orange), Dev Points (indigo), Research Points (violet), Storage/DATA (teal).
All values sourced from `gameStore`; labels and colors match subscription tier theming.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

**Why:** Consistent Claude navigation.

---

## 2026-02-24 — GalaxyGrid: faction + connections (committed)

**Changed:** `GalaxyGrid.tsx`
- Clean connection lines (same-faction only)
- Live chain data integration
- Faction derived from subscription tier
- Full faction coverage — no void/unassigned cells
- Correct grid phase alignment

**Commits:** `a0e79335e`, `adca30656`

**Why:** Phase 1 of galaxy grid redesign — 4-faction spiral implementation.

---

## 2026-02-25 — GalaxyGrid: 8 lines modified (UNCOMMITTED)

**Changed:** `GalaxyGrid.tsx` — 8 lines, +6/-2 (git diff shows modified but not staged).

**Status:** NOT committed. Needs review before commit.

**Why:** Continuation of galaxy grid work from previous session.

---

## 2026-02-23 — DockPanel architecture

**Established:** Zustand-driven dock state (`activeDockPanel`). Panels are orthogonal to tab navigation.

**Why:** Any part of the component tree can open a dock panel without prop drilling.

---

## Pending

- [ ] Commit/review `GalaxyGrid.tsx` uncommitted changes
- [ ] Phase 2: Spiral arm rendering + logarithmic spiral coordinates
- [ ] Phase 2: Minigrid sub-cells (8×8 per macro cell) — blockchain ledger visualization
- [ ] Phase 2: Faction fog-of-war tinting (rival arms → fog; same faction → visible)
- [ ] `TimechainStats.tsx` — add next-block countdown timer

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../CLAUDE.md` | src/ changelog |
| State driving this | `../store/CLAUDE.md` | Zustand game store changes |
| Hooks feeding this | `../hooks/CLAUDE.md` | Hook changes |
| Visual design spec | `../../vault/seed.md` | Galaxy grid redesign golden prompt |
| Product decisions | `../../vault/product/CLAUDE.md` | Feature decisions |
