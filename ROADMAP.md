# Roadmap

ZK Agentic Chain follows a 6-phase sequential rollout — from whitepaper through mainnet. Each phase has a concrete completion gate. No phase-skipping.

## Overview

| Phase | Name | Duration | Status | Gate |
|-------|------|----------|--------|------|
| 1 | Whitepaper Audit | 2-3 weeks | ✅ Complete | v1.6 published, 108 audit tests |
| 2 | Public Testnet | 4-6 weeks | ✅ Complete | Repo public, monitor live, CI green |
| 3 | Game UI Demo | 8-12 weeks | 🔄 In Progress | Playable /game with onboarding |
| 4 | Community | Ongoing | ⬚ Planned | 500+ waitlist, active Discord |
| 5 | Token Readiness | — | ⬚ Planned | Independent audit + legal review complete |
| 6 | Mainnet | 6-12 months | ⬚ Planned | Rust node, audited, stable testnet |

---

## Phase 1: Whitepaper Audit ✅

- Whitepaper v1.6 published (Fixed-Supply Tokenomics Revision)
- Cross-reference audit: all protocol parameters verified against testnet code
- 108 automated audit tests covering consensus, tokenomics, privacy, subgrid, and migration
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

- Neural Lattice code refactor (aligning codebase with whitepaper terminology) ✅
- Locked blockchain operator node template ([zkagentic-node](https://github.com/onetrueclaude-creator/zkagentic-node)) ✅
- SMT hash verification of operator `.claude/` directory ✅
- Hard wrapper enforcement: Python CLI with menu-only input (74 tests) ✅
- All 4 node operations implemented: Secure, Read, Deploy, Write ✅
- Tier model restrictions removed: any tier, any Claude model (API cost-gated) ✅
- Game onboarding flow: landing → Google OAuth → username → tier selection → /game
- Territory visualization: online/offline nodes, agent deployment, identity-class borders
- Agent Terminal: pre-defined blockchain operations (Secure, Deploy, Read, Write, Stats)

**Gate:** Playable game at zkagenticnetwork.com with full onboarding pipeline.

## Phase 4: Community ⬚

- Discord server with role-gated channels (verified node operators, developers, community)
- Developer documentation site
- Waitlist engagement and newsletter
- Ambassador program for early adopters
- Bug bounty program (post-funding)

**Gate:** 500+ waitlist signups, active Discord with daily engagement.

## Phase 5: Token Readiness ⬚

- Independent professional protocol audit
- Legal review: token classification, KYC/AML, and earned-distribution characterization
- Team expansion: Rust engineer, frontend lead
- Legal entity formation
- Earned-distribution readiness: the 250M participation pool is earned through testnet contribution and identity-gated at migration — never sold; no public token sale pre-mainnet

**Gate:** Independent audit complete and legal review of the earned-distribution model complete.

## Phase 6: Mainnet Preparation ⬚

- Rust implementation of Proof of AI Verification (PoAIV) consensus
- L1 node software (replaces Python testnet)
- Lock-and-mint bridge: Solana SPL → native AGNTC migration
- Quantum-resistant hashing: SHA-3 (SHAKE256) for node verification, SPHINCS+ for identity proofs
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

The full protocol is defined in the [whitepaper](spec/whitepaper.md) (v1.6). All implementation must align with the whitepaper — if they disagree, the whitepaper wins.
