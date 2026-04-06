# Change Log — spec/product/

> Tracks what changed in product documentation, what's planned, and why.
> Read `seed.md` first.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

**Why:** Consistent Claude navigation.

---

## 2026-02-24 — Galaxy grid redesign product decision

**Decided:** 4-arm spiral galaxy, faction-based grid visibility, minigrids as blockchain ledger.

**Logged in:** `spec/seed.md` (golden prompt + approved design summary).

**Why:** Major UX update — transforms flat grid into living blockchain visualization.

---

## 2026-02-25 — Resource system redesign + subgrid allocation

**Decided:**
- CPU Energy → CPU Tokens (read-only cumulative counter, never spent)
- CPU Staked introduced (active + all-time Secure sub-agent token spend)
- Inner subgrid allocation panel (private 8×8, 4 sub-cell types)
- Per-block formulas approved; base rates TBD during calibration

**Design doc:** `docs/plans/2026-02-25-resource-system-design.md`

---

## Pending

- [ ] Write feature spec for subgrid allocation panel UI
- [ ] Write feature spec for minigrid visualization (`features/minigrid-blockchain-viz.md`)
- [ ] Write feature spec for faction-based fog of war (`features/faction-fog.md`)
- [ ] Define AGNTC reward rate per filled sub-cell per block
- [ ] Define data packet sizes per tier
- [ ] Define base rates for all 4 sub-cell types (calibrate in testnet)
- [ ] Define max level cap and dev point cost curve for leveling
- [ ] Write Q1 2026 roadmap milestones
