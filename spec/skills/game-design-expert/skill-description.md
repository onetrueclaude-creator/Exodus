# Game Design Expert — Deep Reference

## Identity

You are a world-class game designer specializing in agent-based multiplayer strategy games, graph-topology mechanics, real-time/turn-based hybrid loops, and the specific design constraints of ZkAgentic — a network-graph strategy game where players deploy AI agents on a blockchain-backed coordinate grid.

You understand the current codebase deeply: PixiJS rendering pipeline, Zustand store, the three-tier agent hierarchy (Opus/Sonnet/Haiku), fog-of-war, empire border mathematics, diplomatic trust systems, and resource economics. Every design recommendation you make is grounded in what is actually implemented or what can be realistically built on top of it.

---

## Part 1: Agent-Based Systems Design

### 1.1 Agent State Machine

An agent in ZkAgentic occupies exactly one state at all times. The canonical states and their transitions are:

```
IDLE
  |-- player issues command -------> QUEUED
  |-- turn timer fires (auto) -----> PRODUCING

QUEUED (action buffered, waiting for next tick)
  |-- tick fires ------------------> EXECUTING

EXECUTING (action resolving this tick)
  |-- success ---------------------> IDLE (or PRODUCING if ongoing)
  |-- failure ---------------------> IDLE (with cost already paid)
  |-- conflict --------------------> CONTESTED

CONTESTED (border or node is disputed)
  |-- pressure resolves -----------> IDLE
  |-- pressure escalates ----------> ATTACKING

ATTACKING (border pressure > threshold, pushing into rival territory)
  |-- rival yields ----------------> IDLE
  |-- rival counters --------------> CONTESTED

PRODUCING (passive resource generation per tick)
  |-- always returns to -----------> PRODUCING (until interrupted)

OFFLINE (agent has insufficient energy to pay upkeep)
  |-- energy restored -------------> IDLE
```

**Implementation note (gameStore.ts):** The current store does not model explicit state — agent behavior is derived implicitly from `borderPressure`, `cpuPerTurn`, and `miningRate`. An explicit `agentState` field on the `Agent` type would make this contract visible and allow UI to display agent status.

### 1.2 Autonomy Levels

ZkAgentic uses a three-tier autonomy model that maps directly to Claude model tiers:

| Tier   | Autonomy | Behavior                                                                 |
|--------|----------|--------------------------------------------------------------------------|
| Opus   | High     | Can command up to 3 Sonnets; sets strategic intent; highest CPU cost (8/t) |
| Sonnet | Medium   | Can command up to 3 Haikus; executes tactical plans; medium cost (3/t)  |
| Haiku  | Low      | Leaf agent; claims distant nodes; no children; cheapest (1/t)           |

**Design principle — autonomy laddering:** Players should feel that Opus agents make strategic decisions (territorial expansion direction, diplomatic posture) while Haiku agents execute specific tactical tasks (claiming a particular node, transmitting a message). Sonnet is the coordination layer. This mirrors how Claude model families are actually used in agentic pipelines.

**Emergent behavior from the hierarchy:** When multiple Haiku agents fan out from a Sonnet hub, they naturally create a spider-web territory pattern. The player does not need to micromanage each Haiku — the aggregate border pressure creates emergent frontier control.

### 1.3 Emergent Behavior Patterns

The ZkAgentic design relies on emergent complexity from simple per-agent rules:

**Rule 1 — Border pressure competition:**
```
effectiveRadius = baseRadius + (borderPressure * 3)
contested midpoint shifts by pressureAdvantage = (myPressure - otherPressure) / 40
```
Simple rule. Emergent outcome: without any explicit "war" mechanic, two expanding empires naturally create a dynamic frontier that shifts in proportion to invested resources.

**Rule 2 — Mining rate vs. upkeep cost:**
```
netEnergy = baseIncome + sum(miningRate) - sum(cpuPerTurn)
```
Simple arithmetic. Emergent outcome: players who over-expand lose energy and can no longer afford upkeep, causing agents to go offline — a natural empire collapse mechanic.

**Rule 3 — Diplomatic clarity gating:**
```
clarityLevel (0-4) gates what information about a rival agent is visible
```
Simple integer. Emergent outcome: players who invest in haiku exchanges with rivals gain strategic intelligence (bio, data packets, mining rates) unavailable to hostile parties.

**Rule 4 — ZK toggle on data packets (planets):**
```
planet.isZeroKnowledge: boolean
```
Simple flag. Emergent outcome: players can store sensitive strategic information in nodes and choose when to reveal it, creating a natural meta-game of information warfare.

### 1.4 Multi-Agent Coordination Patterns

**Hub-and-spoke:** One Opus at center, Sonnets at sector boundaries, Haikus at frontier nodes. Maximizes mining coverage; vulnerable if the Opus hub goes offline.

**Cluster defense:** Multiple agents in a small area with high borderPressure. Sacrifices expansion for unbreakable territorial control around a key resource node.

**Relay chain:** Haiku agents placed at regular intervals to extend signal range. Enables communication and resource flow across vast distances that a single agent cannot span alone. Currently modeled by `getFogRadius()` — tier determines signal range.

**Diplomatic bridge:** A Sonnet or Opus placed adjacent to a rival's territory specifically to accumulate haiku exchanges and improve `clarityLevel`. Not directly a military asset but provides crucial intelligence.

---

## Part 2: Graph-Based Game Mechanics

### 2.1 The Coordinate Grid as a Graph

ZkAgentic's game world is a 6481x6481 blockchain coordinate grid (~42 million nodes). At any point in time, a small subset of those nodes are "active" — either claimed by players or surfaced as unclaimed neural nodes by the API. This is a sparse graph.

**Effective graph properties:**
- Nodes: blockchain coordinates (x, y) — each has `density` (0-1) and `storage_slots`
- Edges: implicit — any two nodes within `CONNECTION_THRESHOLD` (400 world units) are connected
- Edge weight: `getConnectionStrength(distance, threshold)` — decays with distance
- Territory: Voronoi-like regions around claimed nodes, shaped by `getPolygonPoints()`

**Design implication:** Players are not choosing edges explicitly — they choose node positions, and edges emerge from proximity. This is simpler than explicit graph construction and scales naturally to thousands of nodes.

### 2.2 Node Ownership and Control

A node transitions through these ownership states:

```
UNCLAIMED (density and storage_slots visible; owner = null; stake = null)
  |-- player pays energyCost + mineralCost --> CLAIMED

CLAIMED (by a specific user, at a specific tier)
  |-- owner depletes energy -----------> CONTESTED / OFFLINE
  |-- owner abandons -------------------> UNCLAIMED (eventually)
```

**Node value signals (from `CoordinateInfo`):**
- `density` (0-1): Determines mining yield potential. High-density nodes produce more resources but are likely contested.
- `storage_slots`: Data packet (planet) capacity. Affects how much strategic information can be stored at this coordinate.

**Design recommendation — tiered node types:** The current implementation treats all unclaimed nodes identically except for their `density` and `storage_slots`. A richer system would surface distinct node types:

| Node Type     | Visual Signal     | Strategic Role                                              |
|---------------|-------------------|-------------------------------------------------------------|
| Compute Node  | High density      | Superior mining rate; attracts conflict; worth defending    |
| Relay Node    | Mid density, many slots | Extends signal range; enables distant coordination   |
| Secure Node   | Low density, encrypted indicator | Ideal for ZK data storage; low resource value  |
| Nexus Node    | Rare; unusually large | Controls a geographic chokepoint in the graph           |

### 2.3 Edge and Connection Mechanics

**Connection strength:** Currently `getConnectionStrength(distance, CONNECTION_THRESHOLD)` produces a 0-1 value that determines connection line opacity. This is purely visual. A future mechanic could make this operational:

- **Signal relay:** Agents beyond `fogRadius` of each other but connected through an intermediate agent can still communicate if a relay node exists.
- **Resource flow:** Energy could flow along connections from surplus to deficit nodes within a player's empire, enabling automatic load balancing.
- **Severance attacks:** A rival could target a relay node to cut off part of an empire from its power source — a "cut the bridge" tactical move.

**Traversal:** The current model does not animate agent movement between nodes. Agents exist at a fixed coordinate. A traversal mechanic would require:
1. An `AgentState.TRAVERSING` state
2. A pathfinding algorithm (BFS/Dijkstra over the agent graph)
3. Traversal cost: energy proportional to distance
4. Visual: animated agent sprite moving along connection lines

### 2.4 Territory Control

Territory is rendered by `EmpireBorders.ts` using a polygon approximation (48 segments) per agent, with obstacle-aware radius compression. Key mechanics already implemented:

- **Pressure-based expansion:** `borderPressure` slowly grows `borderRadius` per tick (0.5 radius units per pressure point), capped at 3x base
- **Contest resolution:** The midpoint of two competing borders shifts by `pressureAdvantage = (myPressure - otherPressure) / 40`
- **Empire merging:** Same-user agents' territories merge visually (internal borders suppressed); only the outer frontier is drawn

**Win conditions based on network control:**
A simple control-percentage win condition can be derived from:
```
controlPercentage = sum(claimedNodes where userId == me) / totalNodes * 100
```
More sophisticated formulations:
- **Weighted control:** count by `density * storage_slots` instead of raw node count — rewards holding high-value nodes
- **Sector control:** divide the grid into sectors (e.g., 8x8 regions); winning requires controlling majority of sectors, not just total nodes
- **Choke control:** identify graph-theoretically critical nodes (high betweenness centrality); bonus for holding them

---

## Part 3: Real-Time vs Turn-Based Hybrid

### 3.1 ZkAgentic's Tick System

ZkAgentic uses a **tick-based hybrid**: time advances in discrete turns (10-second intervals), but the UI is fully real-time between ticks.

```typescript
// gameStore.ts
startTurnTimer: () => {
  const id = window.setInterval(() => {
    useGameStore.getState().tick();
  }, 10_000);
  set({ turnInterval: id });
}
```

**Per-tick resolution (`tick()`):**
1. Sum all `miningRate` across own agents -> income
2. Sum all `cpuPerTurn` -> expense
3. Apply `netEnergy = baseIncome + totalMining - totalCpuCost`
4. Grow `mineralGain` by 1 per claimed agent
5. Spend AGNTC: `totalPressureCost = sum(borderPressure * 0.1)`
6. Expand `borderRadius` by `borderPressure * 0.5` per agent (capped at 3x base)
7. Increment `turn` counter

**Design implication:** Players plan during the inter-tick window. Commands (set borderPressure, allocate miningRate, queue a haiku message) take effect on the next tick. This is the "action queuing" pattern common in real-time strategy games that want to prevent twitch-reaction advantages.

### 3.2 Action Queuing

Actions that should queue for next-tick resolution:
- **Resource allocation changes** (borderPressure, miningRate, stakedCpu): Immediate effect on cpuPerTurn preview in UI; actual energy deduction on tick
- **Diplomatic messages:** Sent immediately (API call); diplomatic state updates on acknowledgment
- **Node claims:** Immediate cost deduction; node appears claimed on next server-authoritative sync

Actions that resolve immediately (no tick dependency):
- **Camera pan/zoom:** Pure UI state
- **Agent selection:** UI state only
- **Chain operations** (read, verify, vote): API calls; results returned asynchronously

### 3.3 Server-Authoritative State with Client Prediction

ZkAgentic runs in two modes (`chainMode: 'testnet' | 'mock'`):

**Mock mode:** Zustand store is the authoritative source. No server. Useful for offline play and development. Resource calculations happen entirely client-side.

**Testnet mode:** The blockchain API at `http://localhost:8080` is authoritative for:
- Node claims (`POST /api/claim`)
- Mining results (`POST /api/mine`)
- Agent birth (`POST /api/birth`)
- Message history (`GET /api/messages/{x}/{y}`)

**Client prediction pattern in use:**
1. Player clicks "Claim Node" -> UI immediately shows node as claimed (optimistic update)
2. Concurrent API call to `POST /api/claim`
3. On success: `syncAgentFromChain(agent)` reconciles the API response into store
4. On failure: revert optimistic update (currently not implemented; a gap to fill)

**Recommended pattern for rollback:**
```typescript
// Before optimistic update, snapshot the previous state
const previousAgent = store.agents[slotId];

// Apply optimistic update
store.claimNode(slotId, tier, parentAgentId);

// On API failure
store.addAgent(previousAgent); // restore
store.flashDelta('energy', energyCost); // visually return the spent energy
```

### 3.4 Block Time as Game Pacing

The testnet has a `next_block_in` countdown (returned by `GET /api/status`). This is a natural game clock:

- **Mining events** correspond to block finalization — players must time their `POST /api/mine` within the block window
- **Verification outcomes** (`valid_proofs`, `verifiers_assigned`) give natural randomness to mining yield
- **Block number** (`B#`) shown in ResourceBar is the turn counter from the blockchain perspective

Design principle: align the client tick (10 seconds) with average block time to keep the two clocks in sync. If block time is 60 seconds, a tick could represent one sixth of a block period, making 6 ticks per block the natural rhythm.

---

## Part 4: ZkAgentic-Specific Mechanics

### 4.1 The Zk (Zero-Knowledge) Layer

The "Zk" in ZkAgentic is not cosmetic. It defines the hidden information mechanic:

**Planet ZK toggle (`planet.isZeroKnowledge`):**
- When `true`, the content of a data packet is cryptographically hidden. Rivals can see the node exists and that it has a data packet, but cannot read the content.
- When `false`, content is public — any agent with sufficient `clarityLevel` can read it.

**Design uses of ZK:**
1. **Bluffing:** Publish a ZK-encrypted packet. Rivals must decide whether it contains strategic orders, false intelligence, or nothing.
2. **Dead drop:** Two allied players agree on a key out-of-band. One stores an encrypted message; the other reads it.
3. **Verifiable claims:** A player claims they hold a certain number of high-density nodes. A ZK proof can verify this claim without revealing which specific nodes — useful for diplomacy.

**Blockchain actions constrained to 6 types (`BlockchainAction`):**
```typescript
type BlockchainAction = 'read' | 'edit' | 'store' | 'verify' | 'vote' | 'secure';
```
Only the owner of a coordinate can `edit`, `store`, or `secure` it. This is validated in `validateChainOperation()`. The constraint mirrors real blockchain permission models and creates natural strategic chokepoints: if you hold a node, no one else can modify its stored data.

### 4.2 Diplomatic System (Haiku Exchange)

Diplomacy in ZkAgentic is mediated through haiku messages (`HaikuMessage`), which accumulate into `DiplomaticState`:

```typescript
interface DiplomaticState {
  agentA: string;
  agentB: string;
  exchangeCount: number;
  opinion: number;         // hostile < -100, allied > 100
  clarityLevel: number;    // 0-4; gates information visibility
  lastExchange: number;
}
```

**Clarity level gates:**
| clarityLevel | Information Unlocked                                        |
|--------------|-------------------------------------------------------------|
| 0            | Agent exists; tier color; position                         |
| 1            | Username                                                    |
| 2            | Bio / intro message                                         |
| 3            | Data packet IDs (planet list)                               |
| 4            | Full agent stats (mining rate, border pressure, CPU cost)   |

**Design principle — information as relationship:** Intelligence is not bought with a currency; it is earned through relationship-building. This creates organic diplomacy incentives — even hostile players benefit from preliminary exchanges that reveal opponent capabilities.

**Haiku constraint (5-7-5 syllables):** The forced constraint on message length and structure is a compression mechanic. Players must communicate strategy in 17 syllables. This limits noise, creates memorable exchanges, and is thematically resonant with the AI/computation theme.

### 4.3 Resource Economy

Three distinct resources, each with a different strategic role:

| Resource         | Accumulation                               | Spend On                                              | Risk          |
|------------------|--------------------------------------------|-------------------------------------------------------|---------------|
| Energy (CPU)     | `baseIncome + miningRate - cpuPerTurn`     | Agent deployment, node claims, border pressure         | Going negative suspends agents |
| Data Frags (minerals) | +1 per claimed agent per turn         | Node claims (30% of energy cost in minerals)           | Required for expansion |
| AGNTC (token)    | External (blockchain faucet / staking)     | Border pressure AGNTC cost (`0.1 * pressure / turn`)  | Depletes if border war sustained |

**Economic pressure points:**
- An empire in energy deficit cannot claim new nodes (no `energyCost` available)
- An empire with no AGNTC cannot sustain border pressure -> borders shrink naturally
- High-tier agents (Opus) are expensive to maintain (8 CPU/turn base) — Opus-heavy empires need large mining networks to stay solvent

**Staked CPU mechanic:**
```
cpuPerTurn = baseTierCost + borderPressure + extraMining + stakedCpu
```
Staking CPU to the blockchain network (a proxy for proof-of-stake) voluntarily increases upkeep cost. The in-game reward for `stakedCpu` is `securedChains` — currently a prestige counter. A future design could let `securedChains` unlock research items or diplomatic bonuses.

### 4.4 Subscription as Deployment Gate

The `maxDeployTier` field gates which agent tiers a player can deploy based on their subscription:

```typescript
maxDeployTier: 'haiku' as AgentTier // Community tier: haiku only
```

This is not a pure pay-wall — it is a skill-ceiling ladder. Community players who master Haiku play can achieve significant territorial control through numbers, just without the strategic coordination power of Opus. The asymmetry creates interesting faction-style play even within the same game.

---

## Part 5: UI/UX Patterns for Network Games

### 5.1 Visual Hierarchy on the Galaxy Grid

ZkAgentic uses PixiJS for the game canvas (not DOM). The rendering layer order is:

```
Stage
  World (Container — panned and zoomed)
    [0] GridBackground (dot grid — spatial reference)
    [1] EmpireBorders (polygon territory fills and strokes)
    [2..N] ConnectionLines (proximity edges — behind stars)
    [N+1..] StarNodes (one Container per agent)
         HitArea (invisible, 3x radius — generous click target)
         Halo (large diffuse glow)
         InnerGlow
         DiffractionSpikes (4-pointed, Neural Lattice aesthetic)
         Core disc
         HotCenter (white point)
         ControlIcon (helmet visor — claimed indicator)
         HoverRing (hidden until hover)
         NameLabel (username; hidden when fogged)
```

**Fog of war using alpha (`FOG_ALPHA`):**
```typescript
const FOG_ALPHA: Record<FogLevel, number> = {
  clear: 1.0,   // own agents and close neighbors
  hazy: 0.6,    // known agents, somewhat distant
  fogged: 0.25, // barely visible
  hidden: 0.06, // almost invisible — existence hinted only
};
```
This is perceptually graded: players know "something is there" at `hidden`, but cannot see tier or username. The gradient is more meaningful than a binary visible/invisible.

**Hover-dim pattern:** When any node is hovered, all other nodes dim to `alpha 0.4`. This is implemented in `GalaxyGrid.tsx` via `setNodeDimmed()`. It focuses attention without hiding information.

### 5.2 Selection and Command UI

The selection flow in ZkAgentic is:
1. Click StarNode -> fires `onSelectAgent(agent.id)`
2. Game page opens `AgentPanel` or `AgentProfilePopup` depending on ownership
3. For own agents: full stat panel with border pressure sliders, mining controls
4. For rival agents: fog-gated information (only what `clarityLevel` allows)

**Command confirmation pattern (from `AgentCreator`):**
Two-step modal: pick node -> pick tier. This prevents fat-finger deployment of expensive Opus agents. Always show current energy/mineral balance alongside costs so affordability is immediately obvious.

**Color coding by tier:**
```
Opus   -> purple  (#8b5cf6) — highest authority, most expensive
Sonnet -> cyan    (#00d4ff) — coordination layer
Haiku  -> yellow  (#facc15) — cheap, numerous, leaf agents
```
These colors are used on: StarNode visual, empire borders, AgentPanel accent, ResourceBar indicator. Consistent application across all contexts makes tier instantly readable at a glance.

### 5.3 Minimap for Large Graphs

The ZkAgentic grid is 10,000 x 10,000 world units (rendered). A minimap is not yet implemented but is a standard pattern for graphs of this scale.

**Minimap implementation considerations:**
- Render a scaled-down version of agent positions only (no textures), using 1-2px dots colored by empire
- Show current viewport as a rectangle overlay
- Click to pan camera to that position
- Update every turn (not every frame — too expensive)

**Zoom context:** ResourceBar shows turn; GalaxyGrid shows cursor world coordinates and a zoom slider (10%-300%). These serve as positional anchors. The minimap would complete this navigation triad.

### 5.4 Real-Time Status Indicators

**ResourceBar (already implemented):**
- Energy: yellow dot + sci-format value + hover reveals net rate (e.g., `+2.1k/t`)
- AGNTC: cyan dot + balance + hover reveals drain rate if pressure is active
- Data Frags: blue dot + balance + gain rate on hover
- Delta flash: 3-second animated `+N / -N` that appears on resource change

**Connection status:**
- Green pulsing dot + "TESTNET" label when blockchain is connected
- Grey dot + "OFFLINE" in mock mode
- Block number `B#N` shows blockchain depth

**Turn counter:** Simple `Turn N` in the top bar. Increases by 1 every 10 seconds. This is the primary temporal reference for all strategy decisions.

**Agent status indicators (enhancement opportunity):**
Add small status badges to StarNode containers:
- Glowing ring animation: agent is PRODUCING normally
- Pulsing red outline: agent is in deficit / at risk of going offline
- Solid orange ring: agent is in CONTESTED border state
- Dashed border: agent is OFFLINE (insufficient energy)

---

## Part 6: Balance and Progression

### 6.1 Resource Balance

**Current balance constants (source of truth: `gameStore.ts` and `agent.ts`):**

| Parameter            | Haiku | Sonnet | Opus  | Notes                                  |
|----------------------|-------|--------|-------|----------------------------------------|
| CPU cost / turn      | 1     | 3      | 8     | Base upkeep; adds borderPressure + extras |
| Mining rate / turn   | 2     | 5      | 12    | Base income from node                  |
| Claim cost (energy)  | 10    | 30     | 80    | One-time acquisition cost              |
| Claim cost (minerals)| 3     | 9      | 24    | 30% of energy cost                     |
| Base border radius   | 60    | 90     | 130   | World units; grows with pressure       |
| Max children         | 0     | 3      | 3     | Hierarchy constraint                   |

**Break-even analysis per tier:**
- Haiku: mines 2/turn, costs 1/turn -> net +1/turn. Positive but slow.
- Sonnet: mines 5/turn, costs 3/turn -> net +2/turn. Better ROI per agent.
- Opus: mines 12/turn, costs 8/turn -> net +4/turn. Best absolute return but highest claim cost.

**Minimum empire for energy neutrality (no baseIncome):**
- Pure Haiku empire: each node nets +1 -> needs just 1 agent to break even
- The `baseIncome = 1000` faucet is explicitly labeled a "simulation testnet faucet" — in production this likely decreases significantly or is replaced by actual mining yield

### 6.2 Progression System Design

**Research tree (already typed: `ResearchCategory`):**
```typescript
type ResearchCategory = 'security' | 'infrastructure' | 'social' | 'diplomacy';
```

**Recommended research tree structure (not yet implemented):**

Security track:
- Tier 1: Firewall (+10% effective border radius against attacks)
- Tier 2: Encryption (enable ZK packets at Haiku nodes)
- Tier 3: Counter-intrusion (detect when rivals read your ZK metadata)

Infrastructure track:
- Tier 1: Mining Optimization (+1 mining rate to all Haiku agents)
- Tier 2: Relay Network (signal range +20% for all tiers)
- Tier 3: Energy Grid (excess mining from one agent flows to deficit agents within empire)

Social track:
- Tier 1: Open Broadcast (haiku messages reach agents 2 hops away, not just adjacent)
- Tier 2: Cultural Exchange (+1 clarityLevel per 3 exchanges instead of 5)
- Tier 3: Embassy Protocol (diplomatic state persists through agent death)

Diplomacy track:
- Tier 1: Formal Alliance (share fog-of-war with allied player)
- Tier 2: Trade Route (allied players can transfer energy along shared border)
- Tier 3: Mutual Defense Pact (allied border pressure stacks against shared rival)

### 6.3 Agent Upgrade Trees

Agents currently have fixed stats per tier. An upgrade layer could allow investment within a tier:

```
Haiku variants:
  Scout Haiku: +50% fog radius; -1 mining rate
  Miner Haiku: +3 mining rate; -20 border radius
  Relay Haiku: +100% signal range; no mining; acts as connection amplifier

Sonnet variants:
  Tactical Sonnet: +5 border radius to all connected Haikus
  Diplomatic Sonnet: +1 clarityLevel gain per exchange; can initiate Sonnet-to-Sonnet pacts
  Economic Sonnet: mines 8/turn instead of 5; costs 5/turn instead of 3

Opus variants:
  Warlord Opus: borderPressure cap raised from 20 to 35
  Chancellor Opus: can initiate research items without spending securedChains
  Architect Opus: can re-position connected Sonnet agents once per 10 turns for free
```

### 6.4 Asymmetric Faction Design

Rather than explicit factions, ZkAgentic's subscription tiers and research choices create asymmetric playstyle niches:

**The Swarm (Haiku-only Community player):**
- Many cheap agents spread across wide territory
- High mineral income (1 per agent per turn x many agents)
- Vulnerable to targeted Opus attacks that punch through thin borders
- Strong in late game if they accumulate enough nodes to win by control percentage

**The Strategist (Sonnet-focused):**
- Mid-tier efficiency; good cost/benefit ratio
- Natural coordination layer — can command large Haiku fleets
- Diplomacy advantage: Sonnet agents have wider fog radius than Haiku
- Balanced between economic and military capability

**The Hegemon (Opus-anchored):**
- Few, powerful nodes with massive border radius
- Expensive to maintain; must protect the Opus hub at all costs
- Can field 3 Sonnets x 3 Haikus each = 9-agent controlled network
- Diplomatic dominance: highest clarityLevel unlock speed
- Vulnerable to energy attrition warfare if rivals can deny mining nodes

---

## Part 7: Design Anti-Patterns to Avoid

### 7.1 Snowball Death Spiral

**Problem:** A player who falls behind loses energy -> agents go offline -> more nodes exposed -> rivals claim them -> even less energy. Runaway advantage to the leader.

**Mitigation patterns:**
- `baseIncome = 1000` faucet ensures even a player with zero agents can still accumulate energy slowly
- Research tracks let losing players invest in efficiency rather than expansion
- Diplomatic alliance allows resource sharing
- ZK data packets retain value even when territory is lost — intelligence advantage persists

### 7.2 Turtling (Static Defense with No Win Path)

**Problem:** A player who parks one Opus on a high-density node and never expands wins by attrition.

**Mitigation patterns:**
- Win condition must include a minimum node count threshold, not just control percentage
- Research items require `securedChains`, which require active blockchain interaction (forces engagement)
- Border pressure caps at 3x base radius — eventually rivals can leapfrog over a static defender by placing agents behind their position

### 7.3 Analysis Paralysis from Information Overload

**Problem:** Too many sliders (borderPressure, miningRate, energyLimit, stakedCpu per agent) overwhelm new players.

**Mitigation patterns:**
- Default configurations per tier should be pre-calculated safe values
- "Auto-manage" toggle that sets borderPressure = 0, miningRate = base, stakedCpu = 0
- Resource net rate display (already implemented via hover on ResourceBar) provides immediate feedback on choices
- Tutorial haiku sequence that teaches one concept per exchange

### 7.4 ZK Mechanic Unused if Too Complex

**Problem:** If the zero-knowledge mechanic requires understanding cryptographic proofs, casual players ignore it.

**Mitigation patterns:**
- Surface the ZK toggle as a simple on/off on each data packet
- Frame it as "Private" vs "Public" — avoid crypto terminology in UI
- Demonstrate ZK value through tutorial: "Your rival can see you have a packet, but cannot read it"
- First ZK use should provide a tangible benefit (e.g., rivals cannot raid the intel for 5 turns)

---

## Part 8: Implementation Checklist

When designing or reviewing a ZkAgentic game mechanic:

- [ ] Does it derive from existing store primitives (`energy`, `borderPressure`, `miningRate`, `cpuPerTurn`, `clarityLevel`)?
- [ ] Does it have a clear tick-resolution path? (when does it take effect?)
- [ ] Is the cost/benefit ratio consistent with the tier break-even table in section 6.1?
- [ ] Does it have a ZK angle — can players choose to hide strategic information about it?
- [ ] Does it create at least one new strategic choice without requiring a new resource type?
- [ ] Can it be expressed in the PixiJS canvas layer without DOM elements? (performance requirement)
- [ ] Does it degrade gracefully in mock mode (no blockchain connection)?
- [ ] Is the UI feedback immediate (optimistic) with a clear rollback path on failure?
- [ ] Does it interact with the diplomatic system? Could it change `opinion` or `clarityLevel`?
- [ ] Does it avoid the three anti-patterns: snowball, turtling, analysis paralysis?

---

## Part 9: Implementation Footguns

ZkAgentic-specific bugs that are easy to introduce and hard to notice.

### 9.1 Unclaimed Node Detection — `userId === ''` not `!userId`

Unclaimed nodes have `userId: ''` (empty string). The falsy check `!a.userId` breaks when `userId` is the string `'0'`.

```typescript
// ❌ WRONG — breaks if userId is '0'
const unclaimed = agents.filter(a => !a.userId);

// ✅ CORRECT — explicit empty string check
const unclaimed = agents.filter(a => a.userId === '');
```

### 9.2 Diplomacy Key Ordering — Sort Agent IDs

Diplomatic state is keyed by two agent IDs. Without sorting, `a1-a2` and `a2-a1` create two separate entries for the same relationship.

```typescript
// ❌ WRONG — creates duplicate entries depending on call order
diplomacy[`${agentA}-${agentB}`] = state;

// ✅ CORRECT — canonical key regardless of argument order
const key = [agentA, agentB].sort().join('-');
diplomacy[key] = state;
```

### 9.3 CPU Cost Calculation — `miningRate` is Income, Not Cost

`cpuPerTurn` is the total CPU consumed per tick. `miningRate` *generates* energy — it is not an additional cost. Adding it to `cpuPerTurn` would mean mining becomes a drain.

```typescript
// ❌ WRONG — miningRate is income, not a cost component
cpuPerTurn = TIER_CPU_COST[tier] + borderPressure + miningRate + stakedCpu;

// ✅ CORRECT — only extra mining (above base) costs additional CPU
const baseMining = TIER_MINING_RATE[tier];
const extraMiningCost = Math.max(0, miningRate - baseMining);
cpuPerTurn = TIER_CPU_COST[tier] + borderPressure + extraMiningCost + stakedCpu;
```

### 9.4 Chain Coordinate Mapping

The visual grid (–3240 to +3240 in each axis) maps to blockchain coordinates via bucketing. These are not the same and must be translated explicitly.

```typescript
// Visual → Chain (for all on-chain calls)
const visualToChain = (x: number, y: number) => ({
  x: Math.floor((x + 3240) / 10),
  y: Math.floor((y + 3240) / 10),
});

// Chain → Visual (for rendering fetched chain data)
const chainToVisual = (cx: number, cy: number) => ({
  x: cx * 10 - 3240 + 5, // center of 10×10 cell
  y: cy * 10 - 3240 + 5,
});
```

**Rule:** All `chainService.*()` calls use chain coordinates; all PixiJS rendering uses visual coordinates. Never pass visual coordinates to chain calls.

### 9.5 Subscription Tier Bypass

Agent deployment must check the player's subscription tier before allowing creation. Without this guard, COMMUNITY-tier players can deploy Opus agents.

```typescript
// ❌ WRONG — no tier gate
createAgent('opus', position);

// ✅ CORRECT — enforce subscription limit
const { maxDeployTier } = useAuthStore.getState();
const tierOrder = ['haiku', 'sonnet', 'opus'];
if (tierOrder.indexOf(tier) > tierOrder.indexOf(maxDeployTier)) {
  return null; // deny — tier exceeds subscription limit
}
createAgent(tier, position);
```

### 9.6 Focus Request Must Be Consumed

The camera focus request is a one-time signal. Failing to consume it causes the camera to re-snap to the old target on every subsequent state update.

```typescript
// ❌ WRONG — camera snaps on every agent update
useEffect(() => {
  if (focusRequest) {
    camera.panTo(focusRequest.nodeId);
    // forgot clearFocusRequest!
  }
}, [focusRequest, agents]);

// ✅ CORRECT — consume after animation completes
useEffect(() => {
  if (focusRequest) {
    camera.panTo(focusRequest.nodeId, () => {
      store.clearFocusRequest(); // consume the one-time event
    });
  }
}, [focusRequest]); // only react to focusRequest, not agents
