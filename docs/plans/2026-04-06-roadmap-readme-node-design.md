# Roadmap, README, and zkagentic-node — Design

> **Date:** 2026-04-06
> **Status:** Approved
> **Scope:** Public ROADMAP.md, README improvements, zkagentic-node repo scaffold

---

## Context

Exodus repo is public at v0.1.0-testnet. Phase 2 complete. Three deliverables needed:
1. A public roadmap showing the 6-phase plan
2. README polish to match competitor presentation (Solana, Ethereum grade)
3. The zkagentic-node private repo — foundation for the locked operator `.claude/`

## 1. ROADMAP.md

**File:** `ROADMAP.md` at repo root.

**Audience:** Both developers and community (C approach).

**Format:** Timeline table at top (quick scan) + section-per-phase below (detail).

**Timeline specificity:** Relative durations + status markers (B approach). No exact dates.

### Timeline Table

| Phase | Name | Duration | Status | Gate |
|-------|------|----------|--------|------|
| 1 | Whitepaper Audit | 2-3 weeks | Complete | v1.0 published, 95 audit tests pass |
| 2 | Public Testnet | 4-6 weeks | Complete | Repo public, monitor live, CI green |
| 3 | Game UI Demo | 8-12 weeks | In Progress | Playable /game with onboarding |
| 4 | Community | Ongoing | Planned | 500+ waitlist, active Discord |
| 5 | Token Sale | 2-4 weeks | Planned | AGNTC on Raydium/Jupiter |
| 6 | Mainnet | 6-12 months | Planned | Rust node, audited, stable testnet |

### Phase Detail Sections

Each phase gets:
- 3-5 bullet deliverables (public-appropriate, no internal strategy)
- Gate criteria (what must be true to move to next phase)
- Status badge (Complete/In Progress/Planned)

#### Phase 1: Whitepaper Audit (Complete)
- Whitepaper v1.0 published (76 pages, 26 sections, 45 references)
- Cross-reference audit: all protocol parameters verified against code (95 tests)
- 5 subsystem audit reports (consensus, tokenomics, privacy, subgrid, migration)
- Academic review: 17 issues identified and fixed

#### Phase 2: Public Testnet (Complete)
- Repository open-sourced with MIT license
- Testnet monitor live at zkagentic.ai
- Marketing site live at zkagentic.com with whitepaper PDF
- CI/CD pipeline (GitHub Actions, 800+ tests)
- SECURITY.md with PGP key and responsible disclosure policy
- Supabase write-through architecture (no public API hosting needed)

#### Phase 3: Game UI Demo (In Progress)
- Neural Lattice code refactor (galaxy → lattice terminology in code)
- Locked blockchain operator node template (zkagentic-node repo)
- SMT hash verification of node .claude/ directory
- Game onboarding: landing → OAuth → username → tier selection → /game
- Territory visualization: online/offline nodes, agent deployment, faction borders

#### Phase 4: Community (Planned)
- Discord server with role-gated channels
- Developer documentation site
- Waitlist engagement and newsletter
- Ambassador program
- Bug bounty program (post-funding)

#### Phase 5: Token Sale (Planned)
- AGNTC SPL token on Solana
- Listing on Raydium/Jupiter DEX
- Professional protocol audit (Trail of Bits, OtterSec, or Halborn)
- Team expansion (first hires: Rust engineer, frontend lead)

#### Phase 6: Mainnet Preparation (Planned)
- Rust implementation of PoAIV consensus
- L1 node software (replaces Python testnet)
- Lock-and-mint bridge (Solana SPL → native AGNTC)
- Formal verification of core protocol
- Mainnet launch

### Contributing Section at Bottom

```
## Contributing

Phases 2-3 are the best time to contribute. See the main repo's
CONTRIBUTING.md for setup instructions.

Current focus areas:
- Game UI components (React 19, PixiJS 8)
- Chain test coverage (Python, pytest)
- Documentation improvements
```

---

## 2. README Improvements

### Add logo (centered, above title)

```markdown
<p align="center">
  <img src="web/marketing/logos/icon.svg" alt="ZK Agentic Chain" width="120" height="120">
</p>
```

### Add Roadmap to nav bar

```
[Whitepaper (v1.0)](spec/whitepaper.md) | [Roadmap](ROADMAP.md) | [Live Testnet Monitor](https://zkagentic.ai) | [Marketing](https://zkagentic.com) | [Security Policy](SECURITY.md)
```

### Add Contributing section before License

```markdown
## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and PR conventions.
Please read our [Code of Conduct](CODE_OF_CONDUCT.md).
```

### Fix test count

`700+ tests` → `800+ tests`

### No other changes

Architecture tree, quick start, protocol table, domains table, phase description, token section — all stay as-is.

---

## 3. zkagentic-node Repo

### Repo metadata

- **Name:** `onetrueclaude-creator/zkagentic-node`
- **Visibility:** Private (public at Phase 3 gate)
- **Description:** "Blockchain node operator terminal for ZK Agentic Chain — locked .claude/ with on-chain hash verification"
- **License:** MIT

### Directory structure

```
zkagentic-node/
├── .claude/
│   ├── CLAUDE.md              # Locked operator instructions (menu-driven)
│   ├── settings.json          # Restrictive permissions
│   └── commands/
│       ├── secure.md          # Secure blockchain cells
│       ├── deploy-agent.md    # Deploy child agent to adjacent node
│       ├── read-chain.md      # Read/scan on-chain data
│       ├── write-chain.md     # Send neural communication packet
│       ├── stats.md           # Full node status report
│       └── settings.md        # Node configuration
├── README.md                  # Installation, prerequisites, usage
├── LICENSE                    # MIT
├── SECURITY.md                # Points to main repo security policy
├── verify.py                  # SMT hash verification script
└── node.json                  # Node metadata template
```

### CLAUDE.md design (operator menu)

The locked CLAUDE.md presents ONLY pre-defined blockchain operations:

```
# ZK Agentic Chain — Node Operator Terminal

You are a blockchain node operator. You can ONLY execute the following commands:

1. /secure — Secure blockchain cells (costs CPU Energy)
2. /deploy-agent — Deploy a child agent to an adjacent node
3. /read-chain — Read and scan on-chain data
4. /write-chain — Send a neural communication packet
5. /stats — View full node status report
6. /settings — Configure node parameters

You cannot:
- Execute arbitrary code
- Access the terminal or shell
- Modify files outside this directory
- Install packages or dependencies
- Access the internet directly

All operations are submitted to the chain with your node's .claude/ hash.
Modifying any file in this directory will invalidate your hash and take
your node offline.
```

### settings.json design (restrictive)

```json
{
  "permissions": {
    "allow": [
      "Read(.claude/**)",
      "Read(node.json)"
    ],
    "deny": [
      "Bash(*)",
      "Write(*)",
      "Edit(*)"
    ]
  }
}
```

### Hash verification (verify.py)

Computes SMT root hash of all files in `.claude/`. This hash is:
- Submitted with every on-chain transaction
- Verified by validators against the canonical template hash
- If mismatch → transaction rejected, node flagged

Implementation details deferred to the writing-plans phase.

### Key constraints from whitepaper (Section 18)

- Node = locked Claude Code terminal. No terminal = no mining.
- `.claude/` is the "node software" — hash-verified, immutable after deployment
- Subagents spawned via Claude's Agent tool, communicate via SendMessage
- Tier-based territory: Community (1-ring, 8 children), Pro (2-ring, 24 children)
- Inactivity decay, relocation mechanics, anti-monopoly rules

---

## Implementation Order

1. Create ROADMAP.md and commit to Exodus (feature branch → PR)
2. Update README.md (same branch)
3. Create zkagentic-node private repo (separate)
4. Scaffold the locked .claude/ template
5. Implement verify.py (SMT hash computation)
