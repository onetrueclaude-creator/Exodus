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

**⚠️ Partially superseded 2026-05-14:** See entry below.

---

## 2026-05-14 — Open-Grid Revision (v1.1) + L2 economy

**Decided (collected across PRs #84 / #88 / #89 / #90 / #91 / #92):**

- **4-arm spiral galaxy retired.** Replaced with single open coordinate grid. Factions persist as identity classes; no territorial arms. Machines binds permanently to origin (0, 0).
- **Per-node leveling** replaces the older subgrid-only progression at the *game-UI level*. Node tier bands Synapse / Cortex / Lattice / Nexus, upfront CPU cost `floor(200 × 1.8^(L-1))`, triangular wait. Source of truth: `apps/game/src/lib/nodeTier.ts`. *(Subgrid cell leveling under whitepaper §16 still uses `output = base × level^0.8` with Development Points — distinct system.)*
- **CPU Energy / Secured Chains** are the canonical HUD resource names. The 2026-02-25 proposal to rename CPU Energy → CPU Tokens (cumulative counter, never spent) was **not adopted** — implementation kept CPU Energy as a spendable pool. The 2026-02-25 "CPU Staked" naming was likewise reframed as "Secured Chains" in the HUD (CPU Staked persists at the protocol level via dual-staking accumulators per whitepaper §13).
- **Max tier retired** earlier in 2026-04 — only Community + Professional are player-facing tiers. Founders and Machines are closed dev-only factions. Tier-locked Claude models (Sonnet-only for Community, Opus-only for Professional) also retired — any tier may deploy any Claude model; API cost is the gate.
- **Mining ≠ Securing.** Per-node CPU presets `{0, 100, 200, 500, 1000}` apply independently to each operation in the L2 economy.

**Design + impl docs:**
- `spec/whitepaper.md` (v1.1 Open-Grid Revision)
- `docs/plans/2026-05-14-empire-progression-*` design + impl plans (gitignored)
- `apps/game/src/lib/nodeTier.ts` — canonical node-tier mapping

**Why:** Aligns the public protocol spec, the chain code, the game UI, and the persona skills around a single open-grid model. Removes contradictions that had accumulated between proposed (Feb-2026) and implemented (current) state.

---

## 2026-06/07 — Fixed-supply lock (v1.6) + real-resources direction

**Decided (June–July 2026, collected across the v1.5/v1.6 whitepaper revisions and the S1–S3 merge trains):**

- **Fixed-supply tokenomics locked (v1.6):** AGNTC = fixed 1,000,000,000 total supply across defined buckets; the 250M participation bucket distributes earned + pro-rata-capped; "5% ceiling" = per-epoch release rate, not open inflation. Supersedes all older "organic growth" notes above.
- **Finality firewall shipped (v1.5, 2026-06-22):** consensus finality selection weights token stake only; the CPU leg stays economic-only until PoRep-hardened.
- **Real-resources product direction (2026-07-01):** players contribute verifiable **Disk / CPU / Time**. S1 (beacon-seeded possession-proof audits + player pinning) and S2 (game-native vault surfacing with visible disclosure) shipped 2026-07-02; S3 (soulbound gates-only **Time** tenure ledger — single monotonic counter, √-influence, gate thresholds, never spent or transferred) built 2026-07-05.

**Why:** aligns product surface with the whitepaper's honesty ladder — every player-facing claim states exactly what is proven today.

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
