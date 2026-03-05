# Gameplay Flow Redesign — Design

**Date:** 2026-03-05
**Status:** Approved
**Scope:** Full onboarding redesign + Machine faction auto-spawn + dev fast path

---

## 1. Dev Mode Fast Path

In development (`NODE_ENV=development`), skip Google Auth and subscription entirely:

- **Faction**: Founders (S arm, red)
- **Tier**: MAX (Opus homenode)
- **Wallet index**: 3 (Founders Faction Master genesis position)
- **Effect**: Game page loads directly into grid — no `/subscribe`, no `/onboard`

The init function in `game/page.tsx` detects dev mode and bypasses the `/api/user/status` check, setting faction/tier/color immediately.

## 2. New User Auto-Spawn (Faction Arm Placement)

When a new user enters the grid (after auth+tier in prod, or immediately in dev):

### 2a. Placement Algorithm

Walk outward along the user's faction arm from the Faction Master homenode:

1. Start at the Faction Master coordinate (e.g., Founders = `(0, -10)`)
2. Step outward along the arm direction in increments of `NODE_GRID_SPACING` (10)
3. Find the first unclaimed grid-aligned position
4. Faction arm directions:
   - Community (N): `(0, +10)` steps → `(0, 20)`, `(0, 30)`, ...
   - Machines (E): `(+10, 0)` steps → `(20, 0)`, `(30, 0)`, ...
   - Founders (S): `(0, -10)` steps → `(0, -20)`, `(0, -30)`, ...
   - Professional (W): `(-10, 0)` steps → `(-20, 0)`, `(-30, 0)`, ...

### 2b. On-Chain Claim

Call `POST /api/claim` with the computed coordinate and wallet index. The node is registered on-chain before any animation plays. If the coordinate is already claimed (race condition), step to the next position.

### 2c. Spawn Animation

1. Camera starts showing the full galaxy (zoom level ~0.5)
2. Smooth zoom toward the faction arm over ~1 second
3. At the target coordinate, a "materialization" effect:
   - Node pulses from 0% to 100% opacity over ~1.5 seconds
   - Faction-colored ring expands outward from center
   - Connection line draws from new node to nearest same-faction neighbor (inward)
4. Camera settles at zoom level 2, centered on the new Homenode

### 2d. Post-Spawn

- Terminal dock panel auto-opens
- Homenode is set as primary agent
- Empire color set from subscription tier
- Pre-written Blockchain Protocols menu immediately available
- User's first natural action: click "Secure" in the terminal

### 2e. Faction Network Link

Each new node connects visually to the nearest same-faction node inward (toward the Faction Master). This creates a visible outward-growing chain per faction arm.

## 3. Machines Faction Auto-Spawn

### 3a. Trigger

One new Machine agent spawns per epoch ring expansion (when `epoch_ring` increments).

### 3b. Placement

Same algorithm as user placement (Section 2a), but on the Machines arm (E direction from `(10, 0)`).

### 3c. Agent Behavior Script

Each Machine agent runs a continuous behavior loop, executed during `_do_mine()` in the backend:

```
Every block tick:
  1. SECURE — Stake all available CPU Energy to earn AGNTC
  2. ASSESS — Check accumulated AGNTC against deployment threshold
  3. EXPAND — If threshold met, claim next unclaimed node on Machines arm
  4. HOLD — Never sell AGNTC (MACHINES_MIN_SELL_RATIO = 1.0)
```

The script is implemented as a `MachineAgentBehavior` class in `agentic/testnet/machines.py`, called from `_do_mine()` after block rewards are distributed.

### 3d. Frontend

When `epoch_advance` WebSocket event fires with a new Machine agent:
- Gold pulse animation on the Machines arm (E)
- New node materializes and connection line draws to faction neighbor
- No user interaction needed — purely visual

### 3e. Constraints

- Machine agents follow `MACHINES_MIN_SELL_RATIO = 1.0` — never sell below acquisition cost
- They are permanent network infrastructure — cannot be decommissioned
- One machine per epoch ring — scales linearly with network growth

## 4. Production Onboarding Flow

```
Landing (/) → Google OAuth → /onboard (unique username) → /subscribe (pick tier) → /game
```

Same structure as current spec. Changes to `/game` init:

1. ~~Manual node selection~~ → **Auto-spawn** via faction arm algorithm
2. ~~Camera centers on picked node~~ → **Spawn animation** (zoom-in + materialization)
3. Terminal **auto-opens** with Blockchain Protocols ready
4. No tutorial overlay — the terminal pre-written commands ARE the tutorial

## 5. Key Files

### Backend (new/modify)
- `vault/agentic-chain/agentic/testnet/machines.py` — NEW: MachineAgentBehavior class
- `vault/agentic-chain/agentic/testnet/api.py` — Wire machine behavior into `_do_mine()`
- `vault/agentic-chain/agentic/testnet/genesis.py` — Initialize first Machine agent at genesis

### Frontend (modify)
- `src/app/game/page.tsx` — Dev fast path, auto-spawn logic, remove manual node selection
- `src/lib/placement.ts` — Replace `pickBestStartingNode` with `computeFactionSpawnPoint`
- `src/components/GalaxyGrid.tsx` — Spawn animation (PixiJS pulse + zoom)
- `src/components/DockPanel.tsx` — Auto-open terminal on spawn completion

### Frontend (new)
- `src/lib/spawnAnimation.ts` — PixiJS spawn animation sequence (zoom + materialize + connect)
