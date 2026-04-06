# Neural Lattice Terminology Replacement — Implementation Plan


**Goal:** Replace all Stellaris references across 25 files (~60 occurrences) with Neural Lattice terminology, eliminating copyright liability and aligning language with the agent lockdown architecture.

**Architecture:** Pure text replacement across code comments, docstrings, markdown docs, and governance files. No functional code changes. No test changes needed (Stellaris only appears in comments/docs, not in logic). Each task groups replacements by directory for atomic commits.

**Tech Stack:** Edit tool for precise replacements. Grep to verify zero remaining occurrences after each task.

**Design doc:** `docs/plans/2026-04-05-agent-lockdown-neural-lattice-design.md` Section 3 defines the terminology mapping.

---

### Terminology Reference (use for ALL replacements)

| Pattern | Replacement |
|---------|-------------|
| `Stellaris-inspired gamified social media dApp` | `Gamified social media dApp built on the Neural Lattice` |
| `Stellaris-inspired gamified blockchain` | `Neural Lattice gamified blockchain` |
| `Stellaris-inspired galaxy grid` | `Neural Lattice 2D grid` |
| `Stellaris-inspired 2D galaxy grid` | `Neural Lattice 2D grid` |
| `Stellaris-inspired blockchain game client` | `Neural Lattice blockchain game client` |
| `Stellaris-inspired experience` | `Neural Lattice experience` |
| `Stellaris-inspired galaxy` | `Neural Lattice network` |
| `Stellaris-inspired galaxy game` | `Neural Lattice network game` |
| `Stellaris-inspired game layer` | `Neural Lattice game layer` |
| `Stellaris-inspired game world` | `Neural Lattice game world` |
| `Stellaris-like networked nodes` | `Neural Lattice networked nodes` |
| `Stellaris-style 2D map` | `Neural Lattice 2D map` |
| `Stellaris-style persistent selection panel` | `Neural Lattice selection panel` |
| `Stellaris signature look` | `Neural Lattice signature aesthetic` |
| `the Stellaris look` | `the Neural Lattice aesthetic` |
| `Stellaris/Civ5-inspired` | `Neural Lattice-style` |
| `like Stellaris hyperlane balance` | `for Neural Lattice node connectivity` |
| `Stellaris metaphor` | `Neural Lattice metaphor` |
| `The Stellaris metaphor must work` | `The Neural Lattice metaphor must work` |
| `The Stellaris metaphor works` | `The Neural Lattice metaphor works` |
| `The Stellaris metaphor is the UX contract` | `The Neural Lattice metaphor is the UX contract` |
| `Stellaris metaphor, Claude model tiers` | `Neural Lattice design, Claude model tiers` |
| `Stellaris metaphor makes blockchain` | `Neural Lattice design makes blockchain` |
| `Key Concepts (Stellaris Metaphor)` | `Key Concepts (Neural Lattice)` |
| `Stellaris-depth strategy` | `Real-time agent orchestration` |
| `Stellaris-depth strategy gameplay` | `real-time agent orchestration gameplay` |
| `Stellaris-depth game interface` | `Neural Lattice game interface` |
| `Stellaris game depth` | `Neural Lattice game depth` |
| `Stellaris-class` | `Neural Lattice-class` |
| `DiffractionSpikes (4-pointed, Stellaris-style)` | `DiffractionSpikes (4-pointed, Neural Lattice aesthetic)` |
| `Stellaris: avoid edges` | `Neural Lattice: avoid edges` |
| `NEVER use "Stellaris"` | `NEVER use third-party game names` |
| `All Stellaris/galaxy references must be replaced` | `All third-party game references must be replaced` |
| `Galaxy = network, Star system = agent, Empire = user territory` | `Neural Lattice = blockchain topology, Node = agent terminal, Territory = claimed coordinates` |
| `PoAIV + Stellaris game layer` | `PoAIV + Neural Lattice game layer` |

---

### Task 1: Root CLAUDE.md (2 occurrences)

**Files:**
- Modify: `CLAUDE.md:55`
- Modify: `CLAUDE.md:110`

**Step 1: Replace "Key Concepts (Stellaris Metaphor)" heading**

In `CLAUDE.md` line 55, replace:
```
## Key Concepts (Stellaris Metaphor)
```
with:
```
## Key Concepts (Neural Lattice)
```

**Step 2: Replace "Stellaris-like networked nodes" in UX spec**

In `CLAUDE.md` line 110, replace:
```
I see a Stellaris-like networked nodes
```
with:
```
I see Neural Lattice networked nodes
```

**Step 3: Verify**

Run: `grep -in "stellaris" CLAUDE.md`
Expected: zero matches

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: replace Stellaris with Neural Lattice in root CLAUDE.md"
```

---

### Task 2: .claude/ governance files (7 occurrences across 5 files)

**Files:**
- Modify: `.claude/SEED.md:15`
- Modify: `.claude/layers/intent.md:16`
- Modify: `.claude/layers/coherence.md:26`
- Modify: `.claude/commands/skills/competitor-expert.md:30`
- Modify: `.claude/commands/skills/game-design-expert.md:16`

**Step 1: Fix .claude/SEED.md**

Line 15, replace:
```
ZK Agentic Network — Stellaris-inspired gamified social media dApp. Primary project of the origin orchestrator.
```
with:
```
ZK Agentic Network — gamified social media dApp built on the Neural Lattice. Primary project of the origin orchestrator.
```

**Step 2: Fix .claude/layers/intent.md**

Line 16, replace:
```
3. **User Experience** — The Stellaris metaphor works: galaxy feels explorable, agents feel autonomous
```
with:
```
3. **User Experience** — The Neural Lattice metaphor works: the network feels explorable, agents feel autonomous
```

**Step 3: Fix .claude/layers/coherence.md**

Line 26, replace:
```
- The Stellaris metaphor is the UX contract — users see galaxies, empires, and star systems, not wallets and transactions
```
with:
```
- The Neural Lattice metaphor is the UX contract — users see the network grid, territories, and nodes, not wallets and transactions
```

**Step 4: Fix .claude/commands/skills/competitor-expert.md**

Line 30, replace:
```
- **Our project**: ZK Agentic Network — Stellaris-inspired gamified blockchain with AI agents
```
with:
```
- **Our project**: ZK Agentic Network — Neural Lattice gamified blockchain with AI agents
```

**Step 5: Fix .claude/commands/skills/game-design-expert.md**

Line 16, replace:
```
- **Stellaris metaphor**: Galaxy = network, Star system = agent, Empire = user territory
```
with:
```
- **Neural Lattice**: Network grid = blockchain topology, Node = agent terminal, Territory = claimed coordinates
```

**Step 6: Verify**

Run: `grep -rn "stellaris" .claude/ --include="*.md" -i`
Expected: only `blockchain-rollout/SKILL.md` (which says "NEVER use")

**Step 7: Fix blockchain-rollout/SKILL.md references**

Line 33, replace:
```
- **NEVER use "Stellaris"** — copyright risk, removed globally
```
with:
```
- **NEVER use third-party game names** — copyright risk, all removed
```

Line 133, replace:
```
- All Stellaris/galaxy references must be replaced with Neural Lattice terminology
```
with:
```
- All third-party game references have been replaced with Neural Lattice terminology
```

**Step 8: Final verify**

Run: `grep -rn "stellaris" .claude/ --include="*.md" -i`
Expected: zero matches

**Step 9: Commit**

```bash
git add .claude/
git commit -m "docs: replace Stellaris with Neural Lattice in .claude/ governance"
```

---

### Task 3: apps/game/.claude/ governance files (7 occurrences across 4 files)

**Files:**
- Modify: `apps/game/.claude/SEED.md:16,21`
- Modify: `apps/game/.claude/layers/prompt.md:9,28`
- Modify: `apps/game/.claude/layers/intent.md:15`
- Modify: `apps/game/.claude/layers/coherence.md:13`

**Step 1: Fix apps/game/.claude/SEED.md**

Line 16, replace:
```
Game UI child of Exodus — the Next.js 16 + React 19 + PixiJS 8 client for the ZK Agentic Network. This is the player's window into the blockchain: a Stellaris-inspired 2D galaxy grid where users explore star systems, deploy AI agents, secure chains, and communicate via haiku through neural communication packets.
```
with:
```
Game UI child of Exodus — the Next.js 16 + React 19 + PixiJS 8 client for the ZK Agentic Network. This is the player's window into the blockchain: a Neural Lattice 2D grid where users explore nodes, deploy AI agents, secure chains, and communicate via haiku through neural communication packets.
```

Line 21, replace:
```
- **Role:** game-ui (Stellaris-inspired blockchain game client)
```
with:
```
- **Role:** game-ui (Neural Lattice blockchain game client)
```

**Step 2: Fix apps/game/.claude/layers/prompt.md**

Line 9, replace:
```
ZkAgenticNetwork is the game UI child. It builds and maintains the Next.js 16 game client for the ZK Agentic Network — a Stellaris-inspired 2D galaxy grid where players explore, deploy AI agents, secure blockchain nodes, and communicate via neural communication packets.
```
with:
```
ZkAgenticNetwork is the game UI child. It builds and maintains the Next.js 16 game client for the ZK Agentic Network — a Neural Lattice 2D grid where players explore nodes, deploy AI agents, secure blockchain nodes, and communicate via neural communication packets.
```

Line 28, replace:
```
- **Stellaris metaphor**: Users see galaxies and star systems, not wallets and transactions. The UI translates chain state into game state.
```
with:
```
- **Neural Lattice metaphor**: Users see the network grid and nodes, not wallets and transactions. The UI translates chain state into game state.
```

**Step 3: Fix apps/game/.claude/layers/intent.md**

Line 15, replace:
```
The Stellaris metaphor must work. Players explore galaxies and star systems, not wallets and ledgers. Every interaction should feel like a strategy game, not a blockchain dashboard.
```
with:
```
The Neural Lattice metaphor must work. Players explore the network grid and nodes, not wallets and ledgers. Every interaction should feel like a strategy game, not a blockchain dashboard.
```

**Step 4: Fix apps/game/.claude/layers/coherence.md**

Line 13, replace:
```
The game client does not own the truth. The blockchain owns the truth. This child renders the truth as an interactive, Stellaris-inspired experience.
```
with:
```
The game client does not own the truth. The blockchain owns the truth. This child renders the truth as an interactive Neural Lattice experience.
```

**Step 5: Verify**

Run: `grep -rn "stellaris" apps/game/.claude/ --include="*.md" -i`
Expected: zero matches

**Step 6: Commit**

```bash
git add apps/game/.claude/
git commit -m "docs: replace Stellaris with Neural Lattice in apps/game/.claude/"
```

---

### Task 4: apps/game/ source code and docs (10 occurrences across 5 files)

**Files:**
- Modify: `apps/game/CLAUDE.md:4,52,107`
- Modify: `apps/game/README.md:3`
- Modify: `apps/game/seed.md:9`
- Modify: `apps/game/src/lib/placement.ts:2,9,62`
- Modify: `apps/game/src/components/grid/StarNode.ts:16,72`
- Modify: `apps/game/src/app/game/page.tsx:388`

**Step 1: Fix apps/game/CLAUDE.md (3 occurrences)**

Line 4, replace:
```
Stellaris-inspired gamified social media dApp where users explore a 2D galaxy grid, communicate via haiku through AI agents, develop star systems with planets (content storage), research technologies, and build diplomatic relationships. All state is backed by the Agentic Chain testnet blockchain ledger.
```
with:
```
Gamified social media dApp built on the Neural Lattice where users explore a 2D network grid, communicate via haiku through AI agents, develop nodes with planets (content storage), research technologies, and build diplomatic relationships. All state is backed by the Agentic Chain testnet blockchain ledger.
```

Line 52, replace:
```
## Key Concepts (Stellaris Metaphor)
```
with:
```
## Key Concepts (Neural Lattice)
```

Line 107, replace:
```
I see a Stellaris-like networked nodes
```
with:
```
I see Neural Lattice networked nodes
```

**Step 2: Fix apps/game/README.md**

Line 3, replace:
```
A Stellaris-inspired galaxy where empires of AI agents communicate in haiku.
```
with:
```
A Neural Lattice network where territories of AI agents communicate in haiku.
```

**Step 3: Fix apps/game/seed.md**

Line 9, replace:
```
Hosts the main **ZK Agentic Network** web application — the Stellaris-inspired galaxy grid game UI served at `localhost:3000` (dev) or deployed via Docker/Cloudflare.
```
with:
```
Hosts the main **ZK Agentic Network** web application — the Neural Lattice game UI served at `localhost:3000` (dev) or deployed via Docker/Cloudflare.
```

**Step 4: Fix apps/game/src/lib/placement.ts (3 comment replacements)**

Line 2, replace:
```
 * Smart Empire Placement — Stellaris/Civ5-inspired starting position selection.
```
with:
```
 * Smart Territory Placement — Neural Lattice-style starting position selection.
```

Line 9, replace:
```
 *   - Stellaris: avoid edges, prefer nodes with 2-4 connections, guarantee resources nearby
```
with:
```
 *   - Neural Lattice: avoid edges, prefer nodes with 2-4 connections, guarantee resources nearby
```

Line 62, replace:
```
  // Connectivity bonus: 2-6 neighbors is ideal (like Stellaris hyperlane balance)
```
with:
```
  // Connectivity bonus: 2-6 neighbors is ideal for Neural Lattice node connectivity
```

**Step 5: Fix apps/game/src/components/grid/StarNode.ts (2 comment replacements)**

Line 16, replace:
```
  // 4-pointed cross rays — Stellaris signature look
```
with:
```
  // 4-pointed cross rays — Neural Lattice signature aesthetic
```

Line 72, replace:
```
  // Diffraction spikes — the Stellaris look
```
with:
```
  // Diffraction spikes — the Neural Lattice aesthetic
```

**Step 6: Fix apps/game/src/app/game/page.tsx**

Line 388, replace:
```
          {/* Left sidebar — Stellaris-style persistent selection panel */}
```
with:
```
          {/* Left sidebar — Neural Lattice persistent selection panel */}
```

**Step 7: Verify**

Run: `grep -rn "stellaris" apps/game/ --include="*.ts" --include="*.tsx" --include="*.md" -i`
Expected: zero matches

**Step 8: Commit**

```bash
git add apps/game/CLAUDE.md apps/game/README.md apps/game/seed.md apps/game/src/
git commit -m "refactor: replace Stellaris with Neural Lattice in game UI code and docs"
```

---

### Task 5: chain/ Python docstring (1 occurrence)

**Files:**
- Modify: `chain/agentic/galaxy/__init__.py:1`

**Step 1: Replace docstring**

Line 1, replace:
```python
"""Galaxy grid layer — Stellaris-style 2D map with star system mining."""
```
with:
```python
"""Neural Lattice layer — 2D coordinate grid with node-based mining."""
```

**Step 2: Verify**

Run: `grep -rn "stellaris" chain/ --include="*.py" -i`
Expected: zero matches

**Step 3: Commit**

```bash
git add chain/agentic/galaxy/__init__.py
git commit -m "refactor: replace Stellaris with Neural Lattice in chain docstring"
```

---

### Task 6: spec/ research and analysis docs (~20 occurrences across 5 files)

**Files:**
- Modify: `spec/feasibility-report.md:20,141,163,546`
- Modify: `spec/research/competitors/agentic-blockchain.md:69,138,370,429,571,642,714,726`
- Modify: `spec/research/competitors/REPORT-competitor-architecture-2026-02-25.md:11,23,150,375`
- Modify: `spec/skills/game-design-expert/skill-description.md:356`
- Modify: `spec/skills/competitor-expert/skill-description.md:16,88,98`

**Step 1: Fix spec/feasibility-report.md (4 occurrences)**

Use sed to replace all occurrences:
```bash
sed -i '' 's/Stellaris-depth game interface/Neural Lattice game interface/g' spec/feasibility-report.md
sed -i '' 's/Stellaris-depth strategy gameplay/real-time agent orchestration gameplay/g' spec/feasibility-report.md
sed -i '' 's/Stellaris-depth strategy/real-time agent orchestration/g' spec/feasibility-report.md
```

**Step 2: Fix spec/research/competitors/agentic-blockchain.md (8 occurrences)**

```bash
sed -i '' 's/Stellaris-inspired galaxy grid/Neural Lattice network grid/g' spec/research/competitors/agentic-blockchain.md
sed -i '' 's/Full Stellaris-inspired game layer/Full Neural Lattice game layer/g' spec/research/competitors/agentic-blockchain.md
sed -i '' 's/Stellaris-inspired galaxy/Neural Lattice network/g' spec/research/competitors/agentic-blockchain.md
sed -i '' 's/Full Stellaris-inspired game world/Full Neural Lattice game world/g' spec/research/competitors/agentic-blockchain.md
sed -i '' 's/Stellaris-inspired galaxy game/Neural Lattice network game/g' spec/research/competitors/agentic-blockchain.md
sed -i '' "s/ZK Agentic's Stellaris metaphor/ZK Agentic's Neural Lattice design/g" spec/research/competitors/agentic-blockchain.md
sed -i '' 's/Stellaris metaphor makes blockchain/Neural Lattice design makes blockchain/g' spec/research/competitors/agentic-blockchain.md
sed -i '' 's/Most sophisticated (Stellaris-class)/Most sophisticated (Neural Lattice-class)/g' spec/research/competitors/agentic-blockchain.md
```

**Step 3: Fix spec/research/competitors/REPORT-competitor-architecture-2026-02-25.md (4 occurrences)**

```bash
sed -i '' 's/Stellaris-depth strategy gameplay/real-time agent orchestration gameplay/g' spec/research/competitors/REPORT-competitor-architecture-2026-02-25.md
sed -i '' 's/Stellaris game depth/Neural Lattice game depth/g' spec/research/competitors/REPORT-competitor-architecture-2026-02-25.md
sed -i '' 's/Stellaris-depth strategy makes/Real-time agent orchestration makes/g' spec/research/competitors/REPORT-competitor-architecture-2026-02-25.md
sed -i '' 's/Stellaris-depth strategy/real-time agent orchestration/g' spec/research/competitors/REPORT-competitor-architecture-2026-02-25.md
```

**Step 4: Fix spec/skills/ (2 files)**

```bash
sed -i '' 's/Stellaris-style/Neural Lattice aesthetic/g' spec/skills/game-design-expert/skill-description.md
sed -i '' 's/Stellaris-inspired gamified blockchain/Neural Lattice gamified blockchain/g' spec/skills/competitor-expert/skill-description.md
sed -i '' 's/PoAIV + Stellaris game layer/PoAIV + Neural Lattice game layer/g' spec/skills/competitor-expert/skill-description.md
sed -i '' 's/Stellaris-depth strategy/real-time agent orchestration/g' spec/skills/competitor-expert/skill-description.md
```

**Step 5: Verify**

Run: `grep -rn "stellaris" spec/ --include="*.md" -i`
Expected: zero matches

**Step 6: Commit**

```bash
git add spec/
git commit -m "docs: replace Stellaris with Neural Lattice in spec/ research docs"
```

---

### Task 7: docs/plans/ historical references (already addressed by design doc)

**Files:**
- `docs/plans/2026-04-02-solana-grade-rollout-design.md` — references the rename DECISION (keep as-is, it documents why we renamed)
- `docs/plans/2026-04-02-phase1-whitepaper-audit-impl.md` — references the rename TASK (keep as-is, it documents the planned work)
- `docs/plans/2026-04-05-agent-lockdown-neural-lattice-design.md` — the design doc itself (uses Stellaris in the terminology mapping table, which is correct)

**Decision:** These files document the rename itself. Changing them would erase the historical record of why and when the decision was made. Leave them as-is.

**Step 1: Verify only expected files remain**

Run: `grep -rn "stellaris" docs/ --include="*.md" -i | grep -v "2026-04-02\|2026-04-05"`
Expected: zero matches (only the design/plan docs that document the rename should remain)

**Step 2: No commit needed**

---

### Task 8: Final global verification

**Step 1: Full repo scan**

```bash
grep -rn "stellaris" --include="*.md" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.js" -i . | grep -v "docs/plans/2026-04-02\|docs/plans/2026-04-05"
```

Expected: zero matches

**Step 2: Git status check**

```bash
git status
git log --oneline -6
```

Expected: clean working tree, 6 new commits (Tasks 1-6)

**Step 3: Push**

```bash
git push origin exodus-dev
```

**Step 4: Summary commit count**

Expected commits:
1. `docs: replace Stellaris with Neural Lattice in root CLAUDE.md`
2. `docs: replace Stellaris with Neural Lattice in .claude/ governance`
3. `docs: replace Stellaris with Neural Lattice in apps/game/.claude/`
4. `refactor: replace Stellaris with Neural Lattice in game UI code and docs`
5. `refactor: replace Stellaris with Neural Lattice in chain docstring`
6. `docs: replace Stellaris with Neural Lattice in spec/ research docs`

Total: 6 commits, ~60 replacements across 24 files (25th file is the design doc which correctly uses the word in the terminology mapping).
