# Galaxy Grid Redesign — Design Document

**Date:** 2026-02-24
**Branch:** exodus-dev
**Status:** Approved, ready for implementation planning

---

## Overview

A complete visual and mechanical redesign of the ZK Agentic Network 2D galaxy grid. The grid becomes a **live spatial visualization of the blockchain ledger** — every pixel represents real on-chain data, every interaction is a blockchain action executed by a locally-running Claude terminal constrained to game-mode selection trees.

---

## Section 1: Grid Architecture

### Two-Level Coordinate System

**Macro grid** — the galaxy view.
Each cell is one NODE_GRID_SPACING (10×10 blockchain coordinates). Macro position `(gx, gy)` covers blockchain coordinates `(gx×10, gy×10)` through `(gx×10+9, gy×10+9)`. The galaxy spans ±324 macro cells, covering the full ±3240 blockchain range.

**Minigrid** — inside every macro cell.
Every grid square (claimed or unclaimed) contains an 8×8 = 64 sub-cell minigrid. Sub-cells map directly to blockchain coordinate slots within the node's 10×10 block. The minigrid is a spatial blockchain explorer — it shows what data lives at each coordinate.

### Spiral Classification (SpiralClassifier Module)

Logarithmic spiral: `r = a·e^(bθ)` with 0.5-turn left-handed (counterclockwise) twist.

For each macro cell `(gx, gy)`:
- `r = sqrt(gx² + gy²)`
- `θ = atan2(gy, gx)`
- Spiral angle at this radius: `θ_spiral = (π / ln(r_max/r_min)) × ln(r)` (0.5 turns = π total)
- Cell belongs to nearest arm if `|θ - θ_arm - θ_spiral| < 25°` (medium width)

**Arm → Faction mapping (arm angle at center):**

| Arm angle (center) | Faction | Color |
|---|---|---|
| 90° (North) | Free Community | Teal |
| 0° (East) | Treasury | Reddish Purple |
| 270° (South) | Founder Pool | Gold-Orange |
| 180° (West) | Professional Pool | Blue |

With a 0.5-turn CCW twist, the Free Community arm sweeps from N at center to S at edge — placing it in the upper-left quadrant at mid-radius, matching the golden prompt spec.

### Zoom Levels

| Level | Trigger | What renders |
|---|---|---|
| 1 (default) | Starting view | Macro grid, spiral fog, nodes as stars |
| 2 | Zoom ×3+ | Minigrid lines visible within each macro cell |
| 3 | Zoom ×8+ | Individual sub-cells fully visible, fill state + data indicators |

### New Modules

- **`SpiralClassifier.ts`** — pure math, no PixiJS dependency. Pre-computes arm/faction/fog classification for every visible macro cell. Cached and recalculated on viewport change.
- **`MinigridLayer.ts`** — new PixiJS layer. Renders 8×8 sub-cells per macro cell at zoom level 2+. Driven by chain state (fill level per coordinate).
- **`GalaxyGrid.tsx`** — extended (not replaced). Reads from SpiralClassifier for fog coloring and spiral arm visibility. Existing StarNode, ConnectionLine, EmpireBorders kept intact.

---

## Section 2: Data & Energy Model

### Minigrid = Blockchain Ledger Visualization

Each of the 64 sub-cells per macro cell represents one blockchain slot:

- **Empty sub-cell** — no on-chain data at this coordinate
- **Active sub-cell** — user has secured this slot; draining CPU Energy per turn
- **Filled sub-cell** — data packet written on-chain (NCP, transaction, stake record, or mining record)
- **Max data packet value** — storage capacity per slot, scales with `resource_density(x, y)`. Slots near the spiral arm spine have higher capacity.

### Data Packet Size (TBD — tier-scaled, to be set in implementation)

Data packet size scales with subscription tier:
- **Community** — small (exact size TBD)
- **Professional** — medium (exact size TBD)
- **Max** — large (exact size TBD)

### CPU Energy — Real Compute Proof

**Energy is not a regenerating timer resource.** It is earned by running Claude locally.

**Generation:** Every action taken in any in-game agent terminal makes a real Claude API call. The API response includes `usage.input_tokens + usage.output_tokens`. Backend converts:
```
cpu_energy_awarded = (input_tokens + output_tokens) × energy_rate
```
Energy rate is tunable per tier. Awarded immediately after each terminal interaction.

**Spending:** Each active (secured) sub-cell costs X Energy per blockchain block (turn). Block time starts at 10s and grows per Proof of Energy difficulty curve (params.py).

**Proof on-chain:** Each blockchain record includes `{coordinate, owner, token_count, timestamp}`. The token count is the verifiable Proof of Energy — it proves real compute was spent.

### Reward Loop

Active sub-cells with data → `MiningEngine.compute_block_yields()` → AGNTC per block → ResourceBar updates.

---

## Section 3: Action Layer

**The 2D galaxy grid is display-only.** All game actions flow through the agent terminal.

The terminal presents structured multi-choice menus at every step. Claude receives the selection, executes the blockchain action, responds with result, presents next choices. No free text. Every action is a numbered selection or bubble click.

**Example flow — securing minigrid slots:**
```
[BLOCKCHAIN PROTOCOLS]
① Secure
② Write Data On Chain
③ Read Data On Chain
④ Transact
⑤ Stats

> ①

[SECURE — Node (0,10) — 24 slots available]
How many sub-cells to activate?
① 8 slots  (-80 Energy/turn,  +0.8 AGNTC/block)
② 16 slots (-160 Energy/turn, +1.6 AGNTC/block)
③ 32 slots (-320 Energy/turn, +3.2 AGNTC/block)

> ②  → 16 slots secured. Minigrid updates live.
```

Token spend from each exchange → CPU Energy delta shown in ResourceBar immediately.

---

## Section 4: Multi-Agent Terminal Architecture

**One terminal per deployed agent.** Each terminal is a separate Claude conversation running `ZKAGENTIC.md`. Clicking a node on the 2D grid opens or focuses that agent's terminal.

### Terminal List Panel (sidebar)
Shows all active agents: name, node coordinate, status (ACTIVE / IDLE), current Energy balance, secured slot count.

### Energy Economics Per Agent
- Each terminal interaction → tokens → CPU Energy added to shared pool
- Each active minigrid slot → Energy drained per turn
- More agents = more Energy generated AND more Energy consumed
- Strategy: balance agents running vs mining yield vs Energy drain

### Node Click Behavior
- **Own agent's node** → focus that agent's terminal
- **Unclaimed node** → show Deploy Agent flow
- **Other faction's node** → read-only stats (no action)

### UI Layout
```
┌─────────────────────────────────────────────┐
│  RESOURCE BAR: [Energy ⚡840] [Chains 🔗16]  │
├──────────────────────┬──────────────────────┤
│                      │  AGENT LIST          │
│   2D GALAXY GRID     │  ★ Sonnet-1  ACTIVE  │
│   (display only)     │  ✦ Haiku-A   IDLE    │
│                      │  ✦ Haiku-B   IDLE    │
│   ★ nodes            ├──────────────────────┤
│   spiral arms        │  TERMINAL            │
│   faction fog        │  [Node (0,10)]       │
│   minigrid cells     │  ① Blockchain Proto. │
│                      │  ② Deploy Sub-Agent  │
│                      │  ③ Securing Rate     │
│                      │  ④ View Minigrid     │
│                      │  ⑤ Settings          │
└──────────────────────┴──────────────────────┘
```

---

## Section 5: ZKAGENTIC.md & Terminal Enforcement

### ZKAGENTIC.md

A project-level instruction file (like `CLAUDE.md`) that every agent terminal loads automatically. It configures Claude as a **constrained game terminal** — not a chat assistant.

**Instructions it enforces:**
- Connect to ZK Agentic Network blockchain API on startup
- Query current state (Energy, minigrid fill, tier, available actions)
- **ONLY** present numbered or bubble-click choices — never respond to free text
- **NEVER** chat, explain, or improvise outside the choice tree
- Route every action through the smart contract validation layer
- Report token usage to the Energy tracking system after each response

### UI — No Text Input

The terminal renders clickable bubbles only. Keyboard input: numbers 1–9 only (mapped to menu choices). No text box. No send button for free text.

### Smart Contract Enforcement

Backend validates every action against current chain state before execution:
- Insufficient Energy → choice greyed out / error returned
- Invalid tier action → choice not shown
- All actions logged to blockchain with token proof

### Per-Agent Context

Each agent's ZKAGENTIC.md session loads at start:
- Node coordinates + tier
- Current Energy share
- Minigrid state (filled / active / empty sub-cells)
- Available actions for this agent tier

---

## Fog System

| Territory | Render |
|---|---|
| Own faction arm | Fully visible — clear, colored per tier |
| Adjacent faction arms | Dim glow in that faction's color (faction-tinted fog) — arm shape visible, no node stats |
| Inter-arm void | Near-black with faint star scatter |
| Other faction's node | Silhouette only through faction fog |

Free Community (Community tier) users: camera starts upper-left, origin at lower-right of viewport. Only NW quadrant initially visible.

---

## Implementation Approach

**Option 2 — Layer on top of existing renderer** (chosen)

- Keep `GalaxyGrid.tsx`, `StarNode.ts`, `ConnectionLine.ts`, `EmpireBorders.ts` intact
- Add `SpiralClassifier.ts` — pure math, no PixiJS
- Add `MinigridLayer.ts` — new PixiJS layer, zoom-level triggered
- Extend fog rendering in `GalaxyGrid.tsx` to use SpiralClassifier output
- Extend `/api/grid/region` to return per-coordinate fill levels
- Add `ZKAGENTIC.md` to project root
- Refactor terminal UI to bubble-click only (no free text input)
- Add token-usage → Energy conversion in backend API layer

All 22 existing Playwright tests must remain green throughout.

---

## Open Items

- [ ] Exact data packet size per tier (Community / Professional / Max)
- [ ] Energy rate conversion (tokens → CPU Energy units)
- [ ] Energy cost per secured sub-cell per turn
- [ ] AGNTC reward rate per filled sub-cell per block
- [ ] Whether unsecured data is at risk (lost) or just stops earning rewards
