# Agent Lockdown Architecture & Neural Lattice Terminology Alignment

> **Date:** 2026-04-05
> **Status:** Approved
> **Scope:** Core architecture redesign — locked `.claude/` node template, subagent-driven agent family, tier-based territory, grid economy, terminology alignment
> **Feeds:** Whitepaper v1.4 rewrite (Section 18 expansion + new sections)

---

## 1. Design Principles

Three principles govern this design, inherited from Bitcoin Core:

1. **Open rules, trustless verification.** The node software (`.claude/` folder) is open-source and auditable. Security comes from the protocol math, not from hiding the rules. If a player knows every rule and still cannot cheat, the protocol is strong.

2. **Real work or nothing.** Every AGNTC earned requires a live Claude Code session making real API calls. No offline mining. No background daemons. No "set and forget." The AI must actually be verifying.

3. **The chain is the source of truth.** The canonical `.claude/` hash lives on-chain. GitHub is the distribution channel. The whitepaper is the specification. Until the production L1 launches, the whitepaper is the single source of truth. At mainnet launch, the whitepaper (final version) will be embedded in the origin node at coordinate (0,0).

---

## 2. Core Redefinition: What Is a Node?

**A node is a locked Claude Code terminal session connected to the blockchain.**

In Bitcoin, a node is a machine running `bitcoind`. In ZK Agentic Chain, a node is a machine running `claude` with a tamper-proof `.claude/` folder. No terminal running = node offline = no mining, no securing, no rewards.

Every node on the 2D Neural Lattice grid corresponds to a real Claude Code session. Every claimed coordinate has a terminal behind it. When the terminal closes, the node goes dark on the grid. There is no abstraction layer between the player and the blockchain — the Claude agent IS the node.

---

## 3. The Neural Lattice

All references to "Stellaris," "galaxy grid," "galaxy," "star system," and "empire" are replaced with protocol-native terminology. This eliminates copyright liability and aligns language with the actual architecture.

### Terminology Mapping

| Retired Term | New Term | Definition |
|---|---|---|
| Galaxy grid | **Neural Lattice** | The complete 2D coordinate grid — the blockchain's spatial state |
| Galaxy | **Network** | The full ZK Agentic Chain network |
| Star system | **Node** | One agent at one coordinate — always backed by a real Claude session |
| Empire | **Territory** | A player's aggregate claimed coordinates (homenode + children) |
| Stellaris-inspired | **Neural Lattice** | The 2D grid visualization of the blockchain |
| Stellaris metaphor | **Neural Lattice metaphor** | Blockchain state as explorable spatial territory |
| Stellaris-like networked nodes | **Agentic network nodes** | Nodes connected on the 2D grid |
| Stellaris-depth strategy | **Real-time agent orchestration** | Players orchestrating AI agents over the 2D blockchain grid |
| Galaxy = network | **Neural Lattice = blockchain topology** | The grid IS the chain state |
| Star system = agent | **Node = one Claude session terminal** | Each node is a live Claude session |

### Where Replacements Apply

- `CLAUDE.md` (root + apps/game/)
- `.claude/` governance files (SEED.md, layers/, commands/, skills/)
- `apps/game/` source code comments (placement.ts, StarNode.ts, page.tsx)
- `chain/agentic/galaxy/__init__.py` docstring
- `spec/` research and competitor analysis documents
- `docs/plans/` historical design documents (where "Stellaris" appears as a description)

Total: 25 files, ~60 occurrences.

---

## 4. Locked `.claude/` — The Agent Conduct Contract

The `.claude/` folder IS the node software. It defines what a valid ZK Agentic agent does. It is open-source, auditable, and tamper-proof.

### 4.1 Canonical Template Structure

```
zkagentic-node/                          # What players clone (separate repo)
├── .claude/
│   ├── CLAUDE.md                        # Agent lockdown: blockchain operations ONLY
│   ├── settings.json                    # Permissions: deny everything except chain actions
│   ├── rules/
│   │   ├── conduct.md                   # Menu-only interaction, no free text
│   │   ├── security.md                  # Anti-injection, anti-tampering enforcement
│   │   └── integrity.md                 # Self-verification protocol (hash check)
│   ├── hooks/
│   │   ├── session-start.sh             # Boot: disclaimer check, compute SMT hash, submit to chain
│   │   ├── pre-tool-use.sh              # Every action: re-verify hash integrity
│   │   └── user-prompt-submit.sh        # Every input: reject free text, allow menu only
│   ├── skills/
│   │   ├── blockchain-ops/SKILL.md      # Command menu: Secure, Deploy, Transact, Read, Write, Stats
│   │   └── subgrid/SKILL.md             # Subgrid allocation: Secure/Develop/Research/Storage cells
│   └── layers/
│       └── prompt.md                    # Core identity: "You are a ZK Agentic node agent"
├── .env                                 # Player's auth_token (the ONLY file they edit)
├── .gitignore                           # Ignores .env
└── README.md                            # Setup instructions
```

### 4.2 What Is Excluded (NOT in the player template)

These files exist in the Exodus development monorepo but are stripped from the player-facing node template:

- No `journal.md`, `inbox.md`, `outbox.md` — no conversation history or mailboxes
- No free-form `commands/` — only the blockchain-ops skill menu
- No `agents/` role definitions — homenode spawns children directly
- No `layers/` beyond `prompt.md` — players do not need orchestrator identity layers
- No `priorities.md`, `MANIFEST.md`, `SEED.md` — internal governance files
- No `settings.local.json` — no local overrides permitted
- No `CLAUDE.local.md` — no local instruction overrides permitted

### 4.3 Permissions Lockdown (settings.json)

```json
{
  "permissions": {
    "allow": [
      "Read(.claude/**)",
      "Bash(python3 -m chain_client:*)"
    ],
    "deny": [
      "Write(.claude/**)",
      "Edit(.claude/**)",
      "Write(.env)",
      "Edit(.env)",
      "Bash(rm:*)",
      "Bash(chmod:*)",
      "Bash(mv:*)",
      "Bash(cp:*)",
      "Bash(cat:*)",
      "Bash(echo:*)",
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(node:*)",
      "Bash(python3:*)"
    ]
  }
}
```

The agent:
- CAN read its own `.claude/` files (transparency — the player can inspect the rules)
- CAN call the chain client (the only permitted executable)
- CANNOT modify any `.claude/` file
- CANNOT modify `.env` after initial setup
- CANNOT execute arbitrary commands
- CANNOT access the filesystem beyond the node directory

### 4.4 Three Enforcement Layers

**Layer 1 — Permissions (settings.json):** Denies all file writes and arbitrary command execution at the Claude Code level. The agent cannot be instructed to modify its own conduct contract.

**Layer 2 — Hooks (session-start.sh, pre-tool-use.sh, user-prompt-submit.sh):**
- `session-start.sh`: On boot, displays legal disclaimer (first run), computes Sparse Merkle Tree root hash of all `.claude/` files, submits hash + wallet credentials to the chain. Chain compares against canonical hash. Mismatch = session terminated, player flagged.
- `pre-tool-use.sh`: Before every action, re-computes the hash. Catches runtime tampering (player modifying files in another terminal window while the session is active).
- `user-prompt-submit.sh`: Intercepts every player input. Rejects anything that is not a valid menu selection (numbered or lettered). No free text ever reaches the agent's context.

**Layer 3 — On-chain verification:** Every transaction submitted to the chain includes the agent's `.claude/` hash. The chain rejects transactions where the hash does not match the canonical value stored as a protocol parameter. Hash updates require governance vote (75% supermajority).

---

## 5. Hash Verification Protocol

### 5.1 Sparse Merkle Tree Approach

The `.claude/` directory is hashed as a Sparse Merkle Tree (the same primitive used in the protocol's privacy architecture, Section 6 of the whitepaper). Each file is a leaf. The root hash is the single 32-byte value submitted with every transaction.

**Why SMT (not a simple directory hash):**
- **Dispute resolution.** If a player is flagged for tampering, the chain can challenge a specific file. The player's agent must produce the Merkle inclusion path for that file. If they cannot, they are convicted without requiring the full directory contents.
- **Efficient verification.** Only the root hash travels with transactions (32 bytes). The chain does not need to store or verify the full directory.
- **Consistency.** Uses the same depth-26 SMT and proof structure already in the protocol — no new cryptographic primitive.

### 5.2 Verification Flow

```
Player opens Claude Code with locked .claude/
  │
  ├── session-start.sh fires
  │     ├── FIRST RUN: Display disclaimer → player accepts → stored on-chain
  │     ├── Compute SMT root hash of all .claude/ files
  │     ├── POST {hash, wallet_id, auth_token} to chain API
  │     └── Chain validates:
  │           ├── hash == canonical_hash → PASS
  │           ├── wallet_id registered → PASS
  │           ├── disclaimer_accepted → PASS
  │           ├── subscription tier active → PASS
  │           ├── no duplicate session for this wallet → PASS
  │           └── ALL PASS → session authorized, menu presented
  │           └── ANY FAIL → session terminated, reason displayed
  │
  ├── Every transaction includes the hash
  │     └── Chain rejects if hash != canonical_hash
  │
  └── pre-tool-use.sh fires before every action
        ├── Re-compute hash
        ├── Compare against the hash submitted at boot
        └── MISMATCH → session terminated immediately, player flagged
```

### 5.3 Canonical Hash Governance

The canonical `.claude/` hash is a **protocol parameter** stored on-chain, alongside other parameters like `BLOCK_TIME`, `COMMITTEE_SIZE`, and `INFLATION_CEILING`.

- **Initial value:** Set at genesis by the development team.
- **Updates:** Require a governance vote with 75% supermajority (same threshold as treasury unlock).
- **Distribution:** When the canonical hash changes, all active nodes receive a notification: "Node software update available. Run `git pull` in your zkagentic-node directory and restart."
- **Grace period:** After a hash update, nodes running the old hash have 72 hours to update before their transactions are rejected. This prevents a governance vote from instantly bricking thousands of nodes.

---

## 6. Subagent Architecture — Agent Families

### 6.1 One Session, Multiple Agents

The player runs ONE Claude Code session — their homenode. Child nodes are subagents spawned within that session using Claude Code's native `Agent` tool.

```
Player's Claude Code session
  └── Homenode agent (locked .claude/, full menu)
        ├── Child Agent 1 (subagent, Secure-only at adjacent coordinate)
        ├── Child Agent 2 (subagent, Secure-only at adjacent coordinate)
        └── Child Agent 3 (subagent, Secure-only at adjacent coordinate)
```

### 6.2 Spawning a Child

When the player selects "Deploy Agent" and chooses a target coordinate:

```python
Agent(
  subagent_type="blockchain-node",
  prompt="""
    You are a ZK Agentic Chain node agent.
    Coordinate: (14, -6). Faction: Community. Density: 72%.
    Parent: homenode at (12, -7).
    
    MINING MODE. Execute Secure operations continuously.
    Report block attestations to parent via SendMessage.
    
    Your capabilities:
    - Secure (validate blocks, produce attestations)
    - Subgrid management (allocate cells: Secure/Develop/Research/Storage)
    - Read chain state at your coordinate
    - Report status to parent
    
    You CANNOT: deploy children, modify settings, access free text,
    relocate, or perform any action outside blockchain operations.
    
    Begin mining loop.
  """,
  description="Node agent at (14, -6)"
)
```

### 6.3 Child Agent Capabilities

Child agents have a **reduced command set** compared to the homenode:

| Command | Homenode | Child |
|---------|----------|-------|
| Deploy Agent | Yes | No |
| Secure | Yes | Yes |
| Write Data On Chain | Yes | Yes |
| Read Data On Chain | Yes | Yes |
| Transact | Yes | No (homenode handles all transfers) |
| Stats | Yes | Yes (reports to parent) |
| Subgrid Allocation | Yes | Yes |
| Adjust Securing Rate | Yes | Yes |
| Adjust Network Parameters | Yes | No |
| Settings | Yes | No |
| Relocate | Yes (if no children) | No |

### 6.4 Communication

Children communicate with the homenode via Claude Code's native `SendMessage` — instant, bidirectional, no files, no polling:

```
Homenode ←→ SendMessage ←→ Child subagent
```

This replaces the old `inbox.md` / `outbox.md` / `/loop` polling architecture entirely.

The homenode can:
- Query any child's status
- Adjust a child's securing rate
- Manage a child's subgrid allocation
- Release (terminate) a child agent → node goes offline, inactivity timer starts

### 6.5 Subgrid on Every Node

Every node (homenode and children) has a **64-cell subgrid** (8x8) that the player allocates across four cell types:

| Cell Type | What It Produces | Behavior |
|-----------|-----------------|----------|
| **Secure** | AGNTC yield + block attestations | Active mining — requires real Claude API calls per block. More Secure cells = higher yield but higher CPU cost. |
| **Develop** | Development Points (non-tradeable) | Unlock technologies, improved agent reasoning, advanced terminal commands. Points consumed within the owner's subgrid. |
| **Research** | Research Points (non-tradeable) | Reduced fee rates, cross-node coordination, access to advanced protocol features. Points consumed within the owner's subgrid. |
| **Storage** | ZK data storage capacity | On-chain encrypted storage — posts, messages, files orbit the node as "planets." Data is private by default (SMT + nullifier proofs). |

**Deactivated cells:** Cells can be left **unallocated** (deactivated). Deactivated cells consume zero CPU tokens — they cost nothing to maintain. This is the "CPU/usage saving" mode. A player who needs to reduce their API costs can deactivate cells and reduce their node's footprint.

**Subgrid operations are available on both homenode and children** — the player manages each node's subgrid independently through the menu.

**Per-block resource calculation** (unchanged from whitepaper Section 17):
```
output_per_cell = BASE_RATE * density * (level ^ 0.8) / hardness
```

Where `level` increases with continued allocation (cells gain experience over time).

---

## 7. Territory Rules — Tier-Based Grid Economy

### 7.1 Homenode

- **Permanent.** The homenode coordinate belongs to the player as long as their account exists.
- **No decay.** Homenodes do not timeout regardless of offline duration.
- **One per player.** Each wallet has exactly one homenode.
- **Relocatable** (see Section 7.5).

### 7.2 Child Node Deployment Range

Deployment range is determined by subscription tier, measured in Moore neighborhood rings around the homenode:

| Tier | Range | Max Children | Grid Shape |
|------|-------|-------------|------------|
| **Community (free)** | 1 Moore ring | 8 | 3x3 minus center |
| **Professional ($50/mo)** | 2 Moore rings | 24 | 5x5 minus center |
| **Treasury Claude** | Entire faction arm | Unlimited | 25% of Neural Lattice |
| **Founder** | Entire faction arm | Unlimited | 25% of Neural Lattice |

**Visual:**

```
Community (1 ring):          Professional (2 rings):

    . . . . .                    C C C C C
    . C C C .                    C C C C C
    . C H C .                    C C H C C
    . C C C .                    C C C C C
    . . . . .                    C C C C C

H = homenode (permanent)     H = homenode (permanent)
C = claimable position       C = claimable position
. = out of range
```

**Landlocked homenodes:** If all adjacent squares (within the player's tier range) are claimed by other active players, the homenode cannot deploy children. The player must wait for a neighbor to go offline and free a spot, or relocate.

### 7.3 Inactivity Decay (Child Nodes Only)

When a child node goes offline, an inactivity countdown begins. After the grace period expires with the node continuously offline, the coordinate is freed — it becomes an unclaimed jump point available to any player.

**Grace periods by agent model tier:**

| Agent Model | Community Grace | Professional Grace (2x) |
|-------------|----------------|------------------------|
| Haiku | 24 hours | 48 hours |
| Sonnet | 72 hours | 144 hours |
| Opus | 168 hours (7 days) | 336 hours (14 days) |

**Treasury Claude and Founder nodes do not decay** (protocol-operated or developer-controlled, always online or exempt).

**What happens on decay:**
- Coordinate becomes an unclaimed jump point
- All subgrid progress at that coordinate is lost (levels reset)
- AGNTC + CPU spent to claim the coordinate is NOT refunded (already burned)
- Previous owner can re-claim the coordinate if they get to it first (no priority)

### 7.4 Anti-Monopoly Mechanics

| Mechanic | What It Prevents |
|----------|-----------------|
| **Tier-based range limit** | Empire sprawl — Community max 9 nodes, Pro max 25 |
| **Adjacency rule** | Scattered land-grabbing — territory must be contiguous around homenode |
| **Inactivity decay** | Ghost towns — offline children free up for active players |
| **Homenode permanence** | Identity loss — you can always come back, but must re-earn territory |
| **Relocation cost (2x + 50% burn)** | Location hopping — settling is cheaper than nomading |
| **Real compute required** | Bot farms — every node needs a live Claude session spending real API tokens |
| **Claim cost scales with density** | Inner-ring monopolies — prime real estate is expensive |
| **Hardness scales with ring** | Easy outer-ring farming — rewards decrease with distance from origin |

### 7.5 Relocation

A player can move their homenode to any unclaimed coordinate.

**Prerequisites:**
- Zero active child nodes (all must be manually released or already freed by decay)
- Target coordinate must be unclaimed
- Sufficient AGNTC + CPU balance

**Cost:**
```
relocation_agntc = claim_cost(target_ring, target_density) * 2.0
relocation_cpu   = cpu_claim_cost(target_ring, target_density) * 2.0

Distribution:
  50% burned (protocol deflationary pressure)
  50% distributed to verifiers/stakers (standard BME split)
```

**What transfers:** Wallet balance, account identity, historical metrics, subscription tier.

**What does NOT transfer:** Subgrid progress at old coordinate (reset), child node claims (must be released first), density advantage (property of the new coordinate).

---

## 8. Onboarding Pipeline

### 8.1 Two-Phase Player State

| State | Access | Requirements |
|-------|--------|-------------|
| **Spectator** | Browse Neural Lattice (read-only), view live stats, leaderboards | Google OAuth on zkagenticnetwork.com |
| **Active Node** | Full blockchain operations, mining, deploying children | Spectator + Claude Code CLI + locked `.claude/` + disclaimer accepted |

### 8.2 Setup Pipeline

```
Step 1: Web Registration (zkagenticnetwork.com)
  ├── Google OAuth → email only
  ├── Username selection (unique, real-time validation)
  ├── Subscription tier selection (Community / Professional)
  └── Generates: wallet_id, auth_token, assigned homenode coordinate

Step 2: Claude Account Verification
  ├── Player must have an active Anthropic account
  ├── Player must have Claude Code CLI installed
  └── Chain verifies active Claude API access before proceeding

Step 3: Clone & Configure
  ├── git clone https://github.com/onetrueclaude-creator/zkagentic-node.git
  ├── cd zkagentic-node
  └── Player pastes auth_token into .env (the ONLY file they edit)

Step 4: First Launch
  ├── Player runs: claude
  ├── session-start.sh fires
  ├── Legal disclaimer displayed (first run only)
  │     ├── Acknowledges: real API costs on player's Anthropic account
  │     ├── Acknowledges: .claude/ tampering invalidates node + may flag account
  │     ├── Acknowledges: closing terminal = all nodes offline
  │     ├── Acknowledges: child nodes subject to inactivity decay
  │     └── Acknowledges: player responsible for own API billing
  ├── Player accepts → acceptance recorded on-chain
  └── Player declines → session exits cleanly

Step 5: Integrity Verification
  ├── Compute .claude/ SMT root hash
  ├── Submit {hash, wallet_id, auth_token} to chain
  ├── Chain validates: hash match, wallet exists, disclaimer accepted, tier active, no duplicate session
  └── ALL PASS → node goes ONLINE, main menu presented

Step 6: Node Is Live
  ├── Main menu appears with blockchain operations
  ├── Mining begins (Secure cells start producing)
  ├── Player's coordinate lights up on the 2D grid
  └── Other players see: new node online
```

### 8.3 Separate Repository

The locked `.claude/` template lives in its own public repo:

```
onetrueclaude-creator/zkagentic-node     ← What players clone (small, locked)
onetrueclaude-creator/Exodus             ← Development monorepo (chain, game, monitor, spec)
```

**Why separate:**
- Players clone ONE small repo, not the 701-file monorepo
- The canonical hash is computed from this repo only
- Updates go through on-chain governance vote → new canonical hash → players `git pull`
- The Exodus monorepo evolves freely without affecting the canonical node hash
- Clean separation: Exodus = development, zkagentic-node = production player software

---

## 9. On-Chain Player State

Each active player has the following state stored on-chain:

```json
{
  "wallet_id": "genesis-42",
  "username": "neuralwalker",
  "tier": "community",
  "homenode": [12, -7],
  "homenode_faction": "community",
  "disclaimer_accepted": "2026-04-05T14:30:00Z",
  "claude_hash": "4e88ba7...",
  "last_heartbeat": "2026-04-05T15:22:01Z",
  "status": "online",
  "children": [
    {
      "coordinate": [14, -6],
      "model": "haiku",
      "status": "mining",
      "subgrid": {"secure": 32, "develop": 16, "research": 8, "storage": 8},
      "last_heartbeat": "2026-04-05T15:22:03Z"
    },
    {
      "coordinate": [11, -9],
      "model": "haiku",
      "status": "offline_grace",
      "grace_expires": "2026-04-06T15:22:01Z",
      "subgrid": {"secure": 48, "develop": 8, "research": 4, "storage": 4}
    }
  ],
  "cpu_tokens_total": 14302,
  "agntc_balance": 847.3,
  "subgrid_homenode": {"secure": 32, "develop": 16, "research": 8, "storage": 8}
}
```

---

## 10. Whitepaper v1.4 Additions

This design feeds the following whitepaper changes:

### Section 18 (Agent Terminal System) — Major Expansion

- **18.1 Terminal Architecture:** Rewrite to specify the locked `.claude/` folder as the node software. Add SMT hash verification protocol. Reference the `zkagentic-node` repo as the canonical distribution.
- **18.2 Agent Tiers:** Unchanged (Haiku/Sonnet/Opus).
- **18.3 Command Structure:** Unchanged (already correct).
- **NEW 18.4 Agent Conduct Contract:** The `.claude/` folder specification. Three enforcement layers (permissions, hooks, on-chain hash). Canonical hash governance (75% supermajority vote to update).
- **NEW 18.5 Subagent Architecture:** Homenode as parent Claude session. Children as subagents via Agent tool. SendMessage communication. No offline mining.
- **NEW 18.6 Subgrid Operations on All Nodes:** Each node (homenode + children) manages its own 64-cell subgrid. Four cell types: Secure (AGNTC yield), Develop (tech unlock), Research (fee reduction), Storage (ZK data). Deactivated cells for CPU savings.

### Section 19 (Network Topology) — Major Expansion

- **19.1 Concept Mapping:** Replace all retired terminology with Neural Lattice terms.
- **NEW 19.X Territory Rules:** Tier-based deployment range (1-ring Community, 2-ring Pro, faction-wide Treasury/Founder). 8-neighbor / 24-neighbor caps.
- **NEW 19.X Inactivity Decay:** Grace periods by model tier (24h/72h/168h base, 2x for Pro). Homenode permanence. Decay consequences.
- **NEW 19.X Relocation:** 2x claim cost, 50% burn, requires zero active children.
- **NEW 19.X Anti-Monopoly Mechanics:** Summary table of all economic balancing mechanisms.

### Section 22 (Protocol Parameters) — New Parameters

| Parameter | Value | Governance |
|-----------|-------|-----------|
| `CANONICAL_CLAUDE_HASH` | SMT root of `.claude/` | 75% supermajority vote |
| `HASH_UPDATE_GRACE_PERIOD` | 72 hours | Governance |
| `COMMUNITY_DEPLOY_RANGE` | 1 (Moore rings) | Governance |
| `PRO_DEPLOY_RANGE` | 2 (Moore rings) | Governance |
| `HAIKU_GRACE_HOURS` | 24 | Governance |
| `SONNET_GRACE_HOURS` | 72 | Governance |
| `OPUS_GRACE_HOURS` | 168 | Governance |
| `PRO_GRACE_MULTIPLIER` | 2.0 | Governance |
| `RELOCATION_COST_MULTIPLIER` | 2.0 | Governance |
| `RELOCATION_BURN_RATE` | 0.50 | Governance |

### Global Terminology Pass

All occurrences of retired terms across the entire whitepaper replaced per the mapping in Section 3 of this document.

---

## 11. Open Security Items (Deferred)

The following attack vectors require dedicated threat modeling in a future session:

| Attack | Description | Potential Mitigation Direction |
|--------|-------------|-------------------------------|
| **Spam attack** | Player rapidly creates/releases child nodes to flood the chain with transactions | Rate limiting per wallet; claim cooldown timer |
| **DDoS on chain API** | Flooding heartbeat or hash verification endpoints | Standard DDoS mitigation; heartbeat batching |
| **`.md` injection** | Crafting filenames or content within `.claude/` that exploit Claude's markdown parsing | File whitelist in hash computation; sanitized file reading |
| **`settings.local.json` injection** | Creating a `settings.local.json` to override locked permissions | Hook that deletes `settings.local.json` on boot; hash includes check for its absence |
| **`CLAUDE.local.md` injection** | Creating a local override file to inject instructions | Same approach — hash verification must confirm these files do NOT exist |
| **Fake chain client** | Replacing `chain_client` binary with auto-approver | Binary hash verification; chain validates CPU token counter against Anthropic API records |
| **Multi-session duplication** | Running multiple Claude sessions for the same wallet | Chain enforces one active session per wallet_id; duplicate heartbeats rejected |
| **Attestation farming** | Minimal-effort attestations that technically pass but add no security value | Attestation quality scoring; random deep-audit challenges from the committee |
| **Grace period exploitation** | Going online for 1 second every 23 hours to reset the decay timer | Minimum online duration per heartbeat cycle (e.g., must be online for 50%+ of any 1-hour window to count) |
| **Origin node (0,0) attack surface** | The origin node will embed the whitepaper and serve as protocol root — unique attack surface | Dedicated design session for origin node architecture |

---

## 12. Implementation Scope

### Part A: Terminology Replacement (25 files, ~60 occurrences)
Replace all Stellaris references per the mapping in Section 3. Includes code comments, docstrings, CLAUDE.md files, governance layers, skills, research docs, and design plans.

### Part B: Locked `.claude/` Template
Create the `zkagentic-node` repo with the canonical `.claude/` folder structure defined in Section 4. Includes settings.json, hooks, rules, skills, and prompt layer.

### Part C: Chain Integration
Add hash verification endpoints to the testnet API. Add `CANONICAL_CLAUDE_HASH` to protocol parameters. Add heartbeat tracking and session deduplication.

### Part D: Whitepaper v1.4
Expand Sections 18, 19, and 22 per Section 10 of this document. Global terminology replacement.

### Part E: Game UI Updates
Update the 2D grid to show node online/offline status, child node connections, inactivity decay timers, and territory visualization.

---

## 13. Decision Log

| Decision | Rationale |
|----------|-----------|
| Open-source `.claude/` (not encrypted) | Bitcoin principle: open rules, trustless verification. Security through obscurity is incompatible with blockchain ethos. |
| SMT hash (not simple directory hash) | Enables ZK dispute resolution — challenged players prove specific files untampered without revealing full directory. Uses existing protocol primitive. |
| On-chain canonical hash (not GitHub-only) | The chain is the source of truth. GitHub is distribution. Governance vote controls updates. |
| Separate repo for player template | Players clone one small repo, not the 701-file monorepo. Canonical hash is scoped to this repo only. |
| Subagents via Agent tool (not file mailboxes) | Instant bidirectional communication. No polling overhead. Native Claude Code architecture. |
| Homenode permanent, children decay | Identity is permanent (like a Bitcoin address). Territory is earned and maintained (like mining hardware that must stay powered). |
| 8-neighbor adjacency (Community) | Prevents empire sprawl. Creates territorial competition. Maximum 9 nodes per free player (1 + 8). |
| 2-ring range for Pro | Clear upgrade incentive: 3x territory (24 vs 8 children). Plus 2x grace period. Justifies $50/mo subscription. |
| Relocation at 2x cost with 50% burn | Expensive enough to prevent hopping. Burn creates deflationary pressure. Forces strategic commitment to location. |
| No offline mining | The core protocol promise: real AI verification requires real compute. Every AGNTC is backed by actual Claude API usage. |
| Subgrid deactivation for CPU savings | Players can reduce costs by deactivating cells. Not everyone needs to run at full capacity all the time. |
