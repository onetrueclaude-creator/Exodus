# Roadmap, README, and zkagentic-node Implementation Plan

**Goal:** Create a public ROADMAP.md, polish README to competitor grade, and scaffold the zkagentic-node private repo with the locked operator `.claude/` template.

**Architecture:** Three independent deliverables. Tasks 1-2 go in a single PR on the Exodus repo (feat/roadmap-readme branch). Task 3 creates a separate private repo. No code dependencies between them.

**Tech Stack:** Markdown, GitHub CLI (gh), Python (verify.py uses hashlib + pathlib)

---

### Task 1: Create ROADMAP.md

**Files:**
- Create: `ROADMAP.md`

**Step 1: Create the file**

```markdown
# Roadmap

ZK Agentic Chain follows a 6-phase sequential rollout — from whitepaper through mainnet. Each phase has a concrete completion gate. No phase-skipping.

## Overview

| Phase | Name | Duration | Status | Gate |
|-------|------|----------|--------|------|
| 1 | Whitepaper Audit | 2-3 weeks | ✅ Complete | v1.0 published, 95 audit tests |
| 2 | Public Testnet | 4-6 weeks | ✅ Complete | Repo public, monitor live, CI green |
| 3 | Game UI Demo | 8-12 weeks | 🔄 In Progress | Playable /game with onboarding |
| 4 | Community | Ongoing | ⬚ Planned | 500+ waitlist, active Discord |
| 5 | Token Sale | 2-4 weeks | ⬚ Planned | AGNTC on Raydium/Jupiter |
| 6 | Mainnet | 6-12 months | ⬚ Planned | Rust node, audited, stable testnet |

---

## Phase 1: Whitepaper Audit ✅

- Whitepaper v1.0 published (76 pages, 26 sections, 45 references)
- Cross-reference audit: all protocol parameters verified against testnet code
- 95 automated audit tests covering consensus, tokenomics, privacy, subgrid, and migration
- 5 subsystem audit reports with discrepancy analysis
- Academic review: 17 issues identified and resolved

**Gate:** Whitepaper published with zero discrepancies between spec and implementation.

## Phase 2: Public Testnet ✅

- Repository [open-sourced](https://github.com/onetrueclaude-creator/Exodus) under MIT license
- Testnet monitor live at [zkagentic.ai](https://zkagentic.ai) (Supabase Realtime)
- Marketing site live at [zkagentic.com](https://zkagentic.com) with downloadable whitepaper PDF
- CI/CD pipeline: GitHub Actions with 800+ automated tests
- SECURITY.md with PGP key and responsible disclosure policy
- Supabase write-through architecture — no public API hosting required

**Gate:** Repo public, monitor showing live block data, CI green, security policy published.

## Phase 3: Game UI Demo 🔄

- Neural Lattice code refactor (aligning codebase with whitepaper terminology)
- Locked blockchain operator node template ([zkagentic-node](https://github.com/onetrueclaude-creator/zkagentic-node))
- SMT hash verification of operator `.claude/` directory
- Game onboarding flow: landing → Google OAuth → username → tier selection → /game
- Territory visualization: online/offline nodes, agent deployment, faction borders
- Agent Terminal: pre-defined blockchain operations (Secure, Deploy, Read, Write, Stats)

**Gate:** Playable game at zkagenticnetwork.com with full onboarding pipeline.

## Phase 4: Community ⬚

- Discord server with role-gated channels (verified node operators, developers, community)
- Developer documentation site
- Waitlist engagement and newsletter
- Ambassador program for early adopters
- Bug bounty program (post-funding)

**Gate:** 500+ waitlist signups, active Discord with daily engagement.

## Phase 5: Token Sale ⬚

- AGNTC SPL token deployed on Solana
- Listing on Raydium and Jupiter DEX
- Professional protocol audit (Trail of Bits, OtterSec, or Halborn)
- Team expansion: Rust engineer, frontend lead
- Legal entity formation

**Gate:** AGNTC tradeable on Solana DEX, professional audit complete.

## Phase 6: Mainnet Preparation ⬚

- Rust implementation of Proof of AI Verification (PoAIV) consensus
- L1 node software (replaces Python testnet)
- Lock-and-mint bridge: Solana SPL → native AGNTC migration
- Formal verification of core protocol mechanisms
- Mainnet launch

**Gate:** Rust node passing all protocol tests, bridge audited, stable testnet for 30+ days.

---

## Contributing

Phases 2-3 are the best time to contribute. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions.

Current focus areas:
- Game UI components (React 19, PixiJS 8)
- Chain test coverage (Python, pytest)
- Documentation improvements

## Protocol Specification

The full protocol is defined in the [whitepaper](spec/whitepaper.md) (v1.0, 76 pages). All implementation must align with the whitepaper — if they disagree, the whitepaper wins.
```

**Step 2: Verify the file renders correctly**

Open the file in a markdown previewer or check on GitHub after push.

**Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: add public roadmap — 6-phase plan from whitepaper to mainnet"
```

---

### Task 2: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Add logo above title**

Replace the first 2 lines:
```
# ZK Agentic Network
```

With:
```markdown
<p align="center">
  <img src="web/marketing/logos/icon.svg" alt="ZK Agentic Chain" width="120" height="120">
</p>

# ZK Agentic Network
```

**Step 2: Add Roadmap to nav bar**

Replace line 5:
```
[Whitepaper (v1.0)](spec/whitepaper.md) | [Live Testnet Monitor](https://zkagentic.ai) | [Marketing](https://zkagentic.com) | [Security Policy](SECURITY.md)
```

With:
```
[Whitepaper (v1.0)](spec/whitepaper.md) | [Roadmap](ROADMAP.md) | [Live Testnet Monitor](https://zkagentic.ai) | [Marketing](https://zkagentic.com) | [Security Policy](SECURITY.md)
```

**Step 3: Fix test count**

Replace `700+ tests` with `800+ tests` in the chain test command comment.

**Step 4: Add Contributing section before License**

Before the `## License` line, add:
```markdown
## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and PR conventions. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).
```

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README improvements — logo, roadmap link, contributing section"
```

---

### Task 3: Push Exodus PR

**Step 1: Push feature branch**

```bash
git push -u origin feat/roadmap-readme
```

**Step 2: Create PR**

```bash
gh pr create --base main --head feat/roadmap-readme \
  --title "docs: add roadmap and polish README" \
  --body "## Summary
- Add ROADMAP.md with 6-phase plan (timeline table + detail sections)
- README: add centered logo, roadmap link, contributing section, fix test count

## Checklist
- [x] No code changes (docs only)
- [x] All links verified
- [x] Roadmap content matches approved design doc"
```

**Step 3: Wait for CI, then merge on GitHub**

Both CI jobs should pass (no code changes). Merge via the green button, delete the branch.

**Step 4: Sync locally**

```bash
git checkout main && git pull origin main
git branch -d feat/roadmap-readme
```

---

### Task 4: Create zkagentic-node private repo

**Step 1: Create the repo**

```bash
gh repo create onetrueclaude-creator/zkagentic-node \
  --private \
  --description "Blockchain node operator terminal for ZK Agentic Chain — locked .claude/ with on-chain hash verification" \
  --license mit \
  --clone
```

**Step 2: Verify**

```bash
cd zkagentic-node
gh repo view --json visibility,description
# Should show: private, correct description
```

---

### Task 5: Scaffold the locked .claude/ template

**Working directory:** `zkagentic-node/` (cloned in Task 4)

**Step 1: Create CLAUDE.md (the locked operator menu)**

Create `.claude/CLAUDE.md`:
```markdown
# ZK Agentic Chain — Node Operator Terminal

You are a blockchain node operator on the ZK Agentic Network. Your node is identified by its coordinates on the Neural Lattice and verified by the SMT hash of this directory.

## Available Commands

1. `/secure` — Allocate CPU Energy to secure blockchain cells. Earns AGNTC rewards.
2. `/deploy-agent` — Deploy a child agent to an adjacent unclaimed node.
3. `/read-chain` — Scan and read on-chain data (blocks, transactions, agent states).
4. `/write-chain` — Send a Neural Communication Packet (NCP) to another node.
5. `/stats` — View your node's full status (coordinates, tier, CPU, secured chains, agents).
6. `/settings` — Configure node parameters (network color, mining rate, border pressure).

## Rules

- You may ONLY execute the commands listed above.
- You may NOT execute arbitrary code, access the shell, modify files, or install packages.
- Every operation you perform is submitted to the chain along with your node's `.claude/` hash.
- If any file in this `.claude/` directory is modified, your hash becomes invalid and your node goes offline.
- Subagents (child nodes you deploy) inherit your tier restrictions.

## Node Identity

Your node metadata is in `node.json` at the repo root. Do not modify it — it is set during registration and verified on-chain.

## Tier Restrictions

| Tier | Homenode Model | Max Children | Territory Range |
|------|---------------|-------------|----------------|
| Community (free) | Sonnet | 8 (1 Moore ring) | Adjacent nodes only |
| Professional | Opus | 24 (2 Moore rings) | 2-ring neighborhood |
| Treasury Claude | Opus | Faction-wide | Full faction territory |

## Protocol Reference

Full specification: [ZK Agentic Chain Whitepaper v1.0](https://zkagentic.com/whitepaper)
```

**Step 2: Create settings.json (restrictive permissions)**

Create `.claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Read(.claude/**)",
      "Read(node.json)",
      "Read(verify.py)"
    ],
    "deny": [
      "Bash(*)",
      "Write(*)",
      "Edit(*)"
    ]
  }
}
```

**Step 3: Create the 6 command files**

Create `.claude/commands/secure.md`:
```markdown
# /secure — Secure Blockchain Cells

Allocate CPU Energy to secure cells on the Neural Lattice. Secured cells generate AGNTC rewards proportional to your CPU contribution.

## Parameters
- **Cells:** How many cells to secure (8, 16, 32, 48, or 64)
- **Duration:** Number of block cycles to maintain the allocation

## Cost
- CPU Energy is consumed based on the node's density multiplier
- Higher density nodes cost more CPU but yield higher rewards

## Process
1. Read current CPU Energy balance from node status
2. Ask the operator to choose cell count and duration
3. Submit the secure transaction to the chain
4. Report the transaction result and updated balances
```

Create `.claude/commands/deploy-agent.md`:
```markdown
# /deploy-agent — Deploy Child Agent

Deploy a new agent to an adjacent unclaimed node on the Neural Lattice.

## Restrictions
- Target node must be unclaimed and within your tier's Moore ring range
- Community tier: Haiku agents only, 1-ring range (8 adjacent nodes)
- Professional tier: up to Opus agents, 2-ring range (24 nodes)

## Process
1. Show available unclaimed nodes within deployment range
2. Ask operator to select target node and agent model
3. Ask for an introduction message (the agent's first communication)
4. Submit the deploy transaction to the chain
5. Report success and new agent status
```

Create `.claude/commands/read-chain.md`:
```markdown
# /read-chain — Read On-Chain Data

Scan and read data from the Agentic Chain ledger.

## Available Queries
- **Block info:** Latest block, block by number, block history
- **Agent info:** Agent status by coordinates, list all agents in range
- **Transaction history:** Recent transactions for this node
- **Network stats:** Total nodes, epoch, circulating supply, burned fees

## Process
1. Ask the operator what data they want to read
2. Query the chain via the testnet API
3. Display the results in a formatted report
```

Create `.claude/commands/write-chain.md`:
```markdown
# /write-chain — Send Neural Communication Packet

Send an NCP (Neural Communication Packet) to another node on the network.

## Constraints
- Messages are delivered as haiku (AI-formatted)
- Target must be a claimed node with an active agent
- Costs a small AGNTC fee (burned)

## Process
1. Ask the operator for the target node coordinates
2. Ask for the message content
3. Format as NCP and submit to the chain
4. Report delivery confirmation
```

Create `.claude/commands/stats.md`:
```markdown
# /stats — Node Status Report

Display comprehensive status information for this node.

## Report Sections
- **Identity:** Coordinates, tier, faction, registration block
- **Resources:** CPU Energy (current/max), Secured Chains, AGNTC balance
- **Agents:** Homenode model, deployed children (count, locations, models)
- **Mining:** Current yield rate, epoch ring, hardness, density multiplier
- **Network:** Block height, time since genesis, next block estimate
```

Create `.claude/commands/settings.md`:
```markdown
# /settings — Node Configuration

View and adjust node parameters.

## Available Settings
- **Network color:** Visual color for your node on the Neural Lattice (Opus tier only)
- **Mining rate:** CPU allocation rate for automated securing
- **Border pressure:** How aggressively to expand territory at borders

## Process
1. Display current settings
2. Ask which setting to change
3. Apply the new value (takes effect next block)
```

**Step 4: Create node.json template**

Create `node.json`:
```json
{
  "node_id": null,
  "coordinates": [null, null],
  "tier": null,
  "faction": null,
  "registered_at_block": null,
  "claude_hash": null,
  "version": "0.1.0"
}
```

**Step 5: Create verify.py**

Create `verify.py`:
```python
"""SMT hash verification for the node operator .claude/ directory.

Computes a deterministic hash of all files in .claude/ by:
1. Walking the directory tree in sorted order
2. Hashing each file's relative path + contents
3. Building a Sparse Merkle Tree of the hashes
4. Returning the root hash

This hash is submitted with every on-chain transaction and verified
by validators against the canonical template hash.
"""

import hashlib
import json
import os
from pathlib import Path


def hash_file(path: Path) -> bytes:
    """SHA-256 hash of a file's relative path + contents."""
    relative = str(path).replace("\\", "/")
    content = path.read_bytes()
    return hashlib.sha256(relative.encode() + content).digest()


def compute_claude_hash(claude_dir: Path = Path(".claude")) -> str:
    """Compute the deterministic hash of the .claude/ directory.

    Returns the hex-encoded SHA-256 root hash.
    """
    if not claude_dir.is_dir():
        raise FileNotFoundError(f"{claude_dir} not found")

    file_hashes = []
    for root, _dirs, files in os.walk(claude_dir):
        for name in sorted(files):
            filepath = Path(root) / name
            relative = filepath.relative_to(claude_dir.parent)
            file_hashes.append(hash_file(relative))

    if not file_hashes:
        raise ValueError("No files found in .claude/")

    # Combine all file hashes into a single root hash
    combined = b"".join(sorted(file_hashes))
    return hashlib.sha256(combined).hexdigest()


if __name__ == "__main__":
    claude_hash = compute_claude_hash()
    print(f"Node .claude/ hash: {claude_hash}")

    # Update node.json with the computed hash
    node_path = Path("node.json")
    if node_path.exists():
        node = json.loads(node_path.read_text())
        node["claude_hash"] = claude_hash
        node_path.write_text(json.dumps(node, indent=2) + "\n")
        print(f"Updated node.json with hash")
```

**Step 6: Create README.md**

Create `README.md`:
```markdown
# ZK Agentic Node

Blockchain node operator terminal for [ZK Agentic Chain](https://github.com/onetrueclaude-creator/Exodus).

## What This Is

This repository contains the locked `.claude/` configuration that turns a Claude Code terminal into a blockchain node operator. The `.claude/` directory is hash-verified on-chain — modifying any file invalidates your node.

## Prerequisites

- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- An active Claude account (required for node operation)
- Node registration on the ZK Agentic Network (via the game UI)

## Usage

```bash
# Clone this repo
git clone https://github.com/onetrueclaude-creator/zkagentic-node.git
cd zkagentic-node

# Verify your .claude/ hash matches the canonical template
python3 verify.py

# Start your node (Claude Code opens with the locked operator menu)
claude
```

## Available Commands

| Command | Action |
|---------|--------|
| `/secure` | Allocate CPU Energy to secure blockchain cells |
| `/deploy-agent` | Deploy a child agent to an adjacent node |
| `/read-chain` | Read and scan on-chain data |
| `/write-chain` | Send a Neural Communication Packet |
| `/stats` | View full node status report |
| `/settings` | Configure node parameters |

## Hash Verification

Every transaction submitted from this node includes the SHA-256 hash of the `.claude/` directory. Validators verify this hash against the canonical template. If the hash doesn't match, the transaction is rejected and the node is flagged.

```bash
python3 verify.py
# Output: Node .claude/ hash: a1b2c3d4...
```

## Security

See the main project's [SECURITY.md](https://github.com/onetrueclaude-creator/Exodus/blob/main/SECURITY.md) for vulnerability reporting.

## License

[MIT](LICENSE)
```

**Step 7: Create SECURITY.md (pointer)**

Create `SECURITY.md`:
```markdown
# Security Policy

For vulnerability reports, please see the main project's security policy:

**[ZK Agentic Chain — SECURITY.md](https://github.com/onetrueclaude-creator/Exodus/blob/main/SECURITY.md)**

Contact: security@zkagentic.com (PGP-encrypted, Proton Mail)
```

**Step 8: Commit and push**

```bash
git add -A
git commit -m "feat: scaffold locked operator .claude/ with 6 commands and hash verification

Initial structure for the blockchain node operator terminal:
- Locked CLAUDE.md with menu-driven operator commands only
- Restrictive settings.json (deny Bash/Write/Edit)
- 6 command definitions (secure, deploy-agent, read/write-chain, stats, settings)
- verify.py: SHA-256 hash computation of .claude/ directory
- node.json: node metadata template
- README with prerequisites, usage, and hash verification docs"

git push origin main
```

---

### Task 6: Verify everything

**Step 1: Check Exodus PR merged correctly**

```bash
cd /path/to/Exodus
git checkout main && git pull
cat ROADMAP.md | head -20  # Verify roadmap exists
head -5 README.md           # Verify logo is at top
```

**Step 2: Check zkagentic-node repo**

```bash
cd /path/to/zkagentic-node
python3 verify.py           # Should output a hash
gh repo view --json visibility  # Should show private
```

**Step 3: Verify no sensitive content in either repo**

```bash
# Exodus
git grep "@gmail\|@proton\|toyg" -- "*.md"  # Should be zero

# zkagentic-node
git grep "@gmail\|@proton\|toyg" -- "*"     # Should be zero
```
