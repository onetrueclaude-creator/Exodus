# Seed — spec/product/

> Product management knowledge base: feature specs, decisions, and roadmap.
> Read `CLAUDE.md` for what changed and what's being planned.

## What This Directory Serves

Houses all product-level documentation: feature specifications, product decisions (with rationale), and the development roadmap for ZK Agentic Network.

## Contents

| Dir/File | Description |
|----------|-------------|
| `features/` | Feature specifications and user stories |
| `decisions/` | Product decision log (what was decided and why) |
| `roadmap/` | Development milestones and phased delivery plan |
| `_index.md` | Directory index |

## Product Vision

ZK Agentic Network is a gamified blockchain social dApp where users manage AI agents across a 2D Neural Lattice (open-grid coordinate space). The canonical user story lives in `CLAUDE.md` (root) under "UX Design Spec."

## Key Decisions Already Made

> **Note:** Several 2026-02-24 / 2026-02-25 decisions were superseded by the v1.1 Open-Grid Revision (2026-05-14). Superseded items below are kept (with strikethrough) for audit trail and paired with the canonical current state.

- **Subscription tiers** (post-v1.1): **Community** (free, 1,000 CPU Energy), **Professional** ($50/mo, 5,000 CPU Energy). Any tier can deploy any Claude model (Haiku / Sonnet / Opus) — API cost is the natural gate, not the tier. Max tier (retired 2026-04) and Founders + Machines (closed dev-only factions) are not player-facing tiers.
- ~~4-faction galaxy grid with spiral arms~~ **RETIRED 2026-05-14** — v1.1 Open-Grid Revision (whitepaper §4.5, PRs #84 / #88) replaces the four-arm spiral with a single open coordinate grid. Factions persist as identity classes only (Community / Professional / Founders / Machines) — no territorial arms. Machines binds to origin (0, 0) only via PR #92.
- **Agent terminal** = constrained Claude API (no free text, only valid game choices). Unchanged from v1.0.
- **CPU Energy** = yellow HUD resource. Spendable pool fed by subscription regen (Community 100/turn, Professional 200/turn) + per-node `getNodeCpuPerTurn(level)`, drained by per-node mining/securing CPU allocations. *(The 2026-02-25 proposal to rename to "CPU Tokens" as a cumulative read-only counter was not adopted — actual implementation uses CPU Energy as a spendable pool.)*
- **Secured Chains** = green HUD counter — blocks secured by the player via the Secure action. Protocol-level: backed by the dual-staking CPU accumulator (alpha = 40% token, beta = 60% CPU per whitepaper §13). Replaces the 2026-02-25 "CPU Staked" naming.
- **Subgrid allocation** = private 8×8 inner panel — 4 types (Secure / Develop / Research / Storage) per whitepaper §16. Unchanged in v1.1.
- **Mining** (coordinate claims) and **Securing** (block defense via Secure action) are separate operations in v1.1's per-node model. Both use per-node CPU presets `{0, 100, 200, 500, 1000}` from the L2 Ogame economy (PR #91). *(Replaces the 2026-02-25 framing that "Mining = securing the chain.")*
- **Storage sub-agent** = ZK tunnel for private on-chain data (Filecoin PoST architecture reference). Unchanged.
- **Subgrid cell level scaling**: `output = base × level^0.8`, purchased with Development Points (per whitepaper §16).
- **Node level scaling** (separate from subgrid cell leveling): Synapse (L1-3, 1.0×) / Cortex (L4-6, 1.25×) / Lattice (L7-9, 1.5×) / Nexus (L10+, 2.0×) tier bands; upfront cost `floor(200 × 1.8^(L-1))` CPU + triangular wait time per L2 Ogame economy (PR #91). Source of truth: `apps/game/src/lib/nodeTier.ts`.
