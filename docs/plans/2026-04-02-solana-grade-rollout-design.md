# Solana-Grade Rollout Design — ZK Agentic Chain

> **Date:** 2026-04-02
> **Status:** Approved
> **Approach:** A (Lean Sequential)
> **Funding Model:** Hybrid — solo founder + AI agents until SPL token sale funds team
> **Estimated Timeline:** 12-18 months to token sale, 6-12 months post-sale to mainnet

---

## Executive Summary

A 6-phase sequential rollout to bring ZK Agentic Chain from its current Python testnet to a Solana-grade production L1 blockchain. Each phase has a concrete completion gate. No phase-skipping. Modeled on Solana's proven trajectory (whitepaper Nov 2017 → mainnet Mar 2020, ~$22M raised, team of 6→25).

Key strategic decisions:
- **Railway hosting eliminated** — writes route through Supabase, miner stays local
- **"Stellaris" removed globally** — visualization renamed to "Neural Lattice"
- **Brand hierarchy:** ZK Agentic Chain (protocol) → ZK Agentic Network (dApp) → AGNTC (token)
- **Datalog adopted** for Phase 6 rule engine (Crepe/Datafrog in Rust)
- **TerminusDB rejected** — dying project, use Merkle trie + RocksDB instead
- **GraphQL free via Supabase** — pg_graphql already enabled, use opportunistically

---

## Naming Hierarchy

| Layer | Name | What It Is |
|-------|------|-----------|
| Protocol | **ZK Agentic Chain** | The L1 blockchain (consensus, PoAIV, tokenomics) |
| Application | **ZK Agentic Network** | The flagship dApp (game UI, agent interaction) |
| Visualization | **Neural Lattice** | The 2D graph view of chain state within the Network |
| Token | **AGNTC** | Native token (SPL on Solana, migrates to L1) |

All references to "Stellaris", "galaxy grid", "galaxy" in code and docs will be replaced with the appropriate term from this hierarchy.

---

## Phase Structure

```
Phase 1: WHITEPAPER AUDIT     (2-3 weeks)   ──gate──▶  v1.3 whitepaper published
Phase 2: PUBLIC TESTNET        (4-6 weeks)   ──gate──▶  Live monitor with real data
Phase 3: GAME UI DEMO          (8-12 weeks)  ──gate──▶  Playable /game with onboarding
Phase 4: COMMUNITY             (ongoing)     ──gate──▶  500+ waitlist, active Discord
Phase 5: TOKEN SALE            (2-4 weeks)   ──gate──▶  AGNTC on Raydium/Jupiter
Phase 6: MAINNET PREP          (6-12 months) ──gate──▶  Rust node, audited, stable testnet
```

---

## Child Agent Registry

| Child | Domain | Role | Status |
|-------|--------|------|--------|
| `agentic-chain` | `vault/agentic-chain/` | Testnet API, protocol validation, persistence | Exists |
| `zkagenticnetwork` | `apps/zkagenticnetwork/` | Game UI, PixiJS, React, onboarding | Exists |
| `whitepaper-audit` | `vault/` | Whitepaper verification, math checking | **New — bootstrap in Phase 1** |

Exodus orchestrates all three. User handles strategic decisions, community, legal, and treasury.

---

## Phase 1: Whitepaper Audit (2-3 weeks)

### Audit Sequencing
- **A (now):** Internal AI-assisted audit — every parameter, formula, mechanism checked against code
- **B (parallel):** Academic peer review — submit to ePrint/crypto venues
- **C (post-token-sale):** Professional protocol audit — Trail of Bits, OtterSec, or Halborn ($50-150K)

### Megatask 1.1: Cross-Reference Audit (Whitepaper vs Testnet Code)

| # | Subtask | Deliverable |
|---|---------|-------------|
| 1.1.1 | Verify all 40+ protocol parameters (Section 22) match `params.py` | Parameter concordance table |
| 1.1.2 | Verify consensus mechanics (Section 5) match `consensus/` | Discrepancy report |
| 1.1.3 | Verify tokenomics (Sections 9-14) match `economics/` | Discrepancy report |
| 1.1.4 | Verify privacy architecture (Section 6) match `privacy/` + `ledger/` | Discrepancy report |
| 1.1.5 | Verify galaxy grid mechanics (Section 4) match `galaxy/` | Discrepancy report |
| 1.1.6 | Verify subgrid allocation (Sections 16-17) match `galaxy/subgrid.py` | Discrepancy report |
| 1.1.7 | Verify migration path (Section 20) is consistent and feasible | Feasibility note |

### Megatask 1.2: Math Verification

| # | Subtask | Deliverable |
|---|---------|-------------|
| 1.2.1 | Verify effective stake formula: `S_eff = 0.4T + 0.6C` | Proof check |
| 1.2.2 | Verify hardness formula: `H(N) = 16N` disinflation curve | Simulation output |
| 1.2.3 | Verify supply dynamics: genesis 900 → soft cap 5% ceiling | Growth model check |
| 1.2.4 | Verify fee burn equilibrium: 50% burn sustains deflation | Economic model check |
| 1.2.5 | Verify Gini coefficient stays below dangerous thresholds | Simulation output |
| 1.2.6 | Verify VRF selection produces fair committee distribution | Statistical test |

### Megatask 1.3: Whitepaper Polish → v1.3

| # | Subtask | Deliverable |
|---|---------|-------------|
| 1.3.1 | Fix all discrepancies (code wins if correct, whitepaper wins if code is wrong) | Updated sections |
| 1.3.2 | Replace all "Stellaris"/"galaxy grid" with "Neural Lattice" terminology | Updated language |
| 1.3.3 | Update version to v1.3, add changelog | Version bump |
| 1.3.4 | Verify all ASCII diagrams match current architecture | Diagram review |
| 1.3.5 | Review Limitations section (Section 24) — 7 open problems still accurate? | Updated limitations |
| 1.3.6 | Prepare ePrint-ready formatting | Clean markdown/LaTeX |
| 1.3.7 | Update PDF on zkagentic.com | Deploy |

### Gate
- [ ] Zero discrepancies between whitepaper v1.3 and testnet code
- [ ] All math formulas verified with simulation output
- [ ] Updated PDF live on zkagentic.com
- [ ] ePrint submission prepared

---

## Phase 2: Public Testnet (4-6 weeks)

### Megatask 2.1: Supabase Write-Through Path (Eliminates Railway)

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 2.1.1 | Create `pending_transactions` Supabase table (anon INSERT, service_role SELECT) | agentic-chain | Migration SQL |
| 2.1.2 | Add polling loop to miner: fetch pending txns, execute, mark processed | agentic-chain | Updated api.py |
| 2.1.3 | Update monitor simulator to POST to Supabase instead of direct API | agentic-chain | Updated simulator.js |
| 2.1.4 | Update game UI ChainService to write via Supabase client | zkagenticnetwork | Updated service |
| 2.1.5 | Test full loop: UI → Supabase → miner → sync back → UI reads | Both | Integration test |

### Megatask 2.2: Testnet Hardening

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 2.2.1 | SQLite persistence: verify restart recovery with 100+ blocks | agentic-chain | Test output |
| 2.2.2 | Auto-miner crash recovery: restart on failure, structured logging | agentic-chain | Updated miner |
| 2.2.3 | Supabase sync error handling: retry with backoff | agentic-chain | Updated sync |
| 2.2.4 | Rate limiting on Supabase writes (prevent abuse) | agentic-chain | RLS policy |
| 2.2.5 | Monitor STALE/OFFLINE detection when miner hasn't synced >5 min | agentic-chain | Updated monitor |

### Megatask 2.3: Public Documentation

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 2.3.1 | API documentation page (Swagger-like) | agentic-chain | Static HTML |
| 2.3.2 | "How the Testnet Works" explainer on zkagentic.com | Exodus | Marketing update |
| 2.3.3 | Open-source testnet code (LICENSE, README, clean repo) | Exodus | GitHub repo |

### Megatask 2.4: Monitor & Deploy

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 2.4.1 | Deploy patched monitor to zkagentic.ai | Exodus | Cloudflare deploy |
| 2.4.2 | Deploy updated marketing site to zkagentic.com | Exodus | GitHub Pages deploy |
| 2.4.3 | Verify end-to-end: marketing → monitor → live data | Exodus | Smoke test |

### Gate
- [ ] Monitor at zkagentic.ai shows live block data from local miner
- [ ] Subgrid simulator works via Supabase write-through
- [ ] Miner survives restart with full state recovery
- [ ] API docs publicly accessible
- [ ] Testnet code open-sourced on GitHub

---

## Phase 3: Game UI Demo (8-12 weeks)

### Megatask 3.1: Onboarding Flow

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 3.1.1 | Landing page (/) — Google OAuth login | zkagenticnetwork | Working route |
| 3.1.2 | Username selection (/onboard) — real-time uniqueness check | zkagenticnetwork | Working route |
| 3.1.3 | Subscription tier (/subscribe) — 2 cards (Community, Professional) | zkagenticnetwork | Working route |
| 3.1.4 | Redirect to /game with session state | zkagenticnetwork | Working auth |
| 3.1.5 | Docker + PostgreSQL setup documented | zkagenticnetwork | README |

### Megatask 3.2: Neural Lattice Polish

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 3.2.1 | Camera auto-focus on user's homenode | zkagenticnetwork | Working |
| 3.2.2 | Faction-colored nodes (NW teal, NE pink, SE amber, SW blue) | zkagenticnetwork | Visual |
| 3.2.3 | Node connections (same-faction lines) clean | zkagenticnetwork | Visual |
| 3.2.4 | Click node → coordinate, density, claimed status | zkagenticnetwork | Interaction |
| 3.2.5 | Homenode tier-colored border | zkagenticnetwork | Visual |
| 3.2.6 | Smooth pan/zoom | zkagenticnetwork | UX |
| 3.2.7 | Background star field or nebula effect | zkagenticnetwork | Polish |

### Megatask 3.3: Agent Terminal

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 3.3.1 | Terminal with agent portrait + tier badge | zkagenticnetwork | UI |
| 3.3.2 | Menu: Deploy Agent, Blockchain Protocols, Securing, Network, Settings | zkagenticnetwork | Menu |
| 3.3.3 | Secure flow: choose cycles, CPU cost, resource delta animation | zkagenticnetwork | Flow |
| 3.3.4 | Stats: live data from chain via Supabase | zkagenticnetwork | Display |
| 3.3.5 | Deploy Agent: select unclaimed → pick model → confirm → appears on lattice | zkagenticnetwork | Flow |

### Megatask 3.4: Resource HUD & Timechain Stats

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 3.4.1 | ResourceBar: CPU Energy (yellow), Secured Chains (green) with deltas | zkagenticnetwork | HUD |
| 3.4.2 | Timechain Stats: genesis, epoch, blocks mined, next block ETA | zkagenticnetwork | Panel |
| 3.4.3 | Live data from Supabase Realtime | zkagenticnetwork | Real-time |

### Megatask 3.5: Tab System

| # | Subtask | Child | Deliverable |
|---|---------|-------|-------------|
| 3.5.1 | Network tab: Neural Lattice (default active) | zkagenticnetwork | Tab |
| 3.5.2 | Account tab: profile, wallet, subscription | zkagenticnetwork | Tab |
| 3.5.3 | Research tab: tech tree (already built) | zkagenticnetwork | Verify |
| 3.5.4 | Skills tab: skill matrix (already built) | zkagenticnetwork | Verify |

### Gate
- [ ] New user: land → login → username → tier → lattice → terminal → Secure → see delta
- [ ] Neural Lattice visually impressive (first-impression test)
- [ ] Timechain Stats live
- [ ] All 4 tabs render
- [ ] Works on Chrome desktop

---

## Phase 4: Community Building (Ongoing)

### Megatask 4.1: Platform Setup

| # | Subtask | Who |
|---|---------|-----|
| 4.1.1 | Discord server (announcements, testnet-feedback, dev-chat, governance) | User |
| 4.1.2 | Twitter/X account with consistent cadence | User |
| 4.1.3 | Waitlist conversion emails | User + Exodus |
| 4.1.4 | GitHub: open-source repo, README, contributing guide | Exodus |

### Megatask 4.2: Content Assets

| # | Subtask | Who |
|---|---------|-----|
| 4.2.1 | Architecture diagram SVG | Exodus |
| 4.2.2 | "How PoAIV Works" explainer | Exodus |
| 4.2.3 | Tokenomics infographic | Exodus |
| 4.2.4 | Neural Lattice screenshots/GIFs | zkagenticnetwork |
| 4.2.5 | Testnet walkthrough video script | Exodus |

### Megatask 4.3: Beta Tester Program

| # | Subtask | Who |
|---|---------|-----|
| 4.3.1 | Invite 10-20 early users from waitlist/Discord | User |
| 4.3.2 | Bug reporting channel | User |
| 4.3.3 | Feedback triage | Exodus |

### Gate
- [ ] 500+ waitlist/Discord members
- [ ] Active testnet users
- [ ] 3+ published content pieces
- [ ] External GitHub stars/forks

---

## Phase 5: SPL Token Sale (2-4 weeks)

### Megatask 5.1: Token Preparation

| # | Subtask | Who |
|---|---------|-----|
| 5.1.1 | Verify SPL mint address active on Solana mainnet | User |
| 5.1.2 | Token metadata (name, symbol, logo) on registry | User |
| 5.1.3 | Liquidity pool size and price discovery | User |
| 5.1.4 | Legal review (jurisdiction, classification, disclaimers) | User + legal |

### Megatask 5.2: DEX Listing

| # | Subtask | Who |
|---|---------|-----|
| 5.2.1 | AGNTC/SOL pool on Raydium | User |
| 5.2.2 | Jupiter aggregator (auto-detects) | Automatic |
| 5.2.3 | DEXScreener, Birdeye, SolScan listings | User |
| 5.2.4 | CoinGecko / CoinMarketCap application | User |

### Megatask 5.3: Launch Marketing

| # | Subtask | Who |
|---|---------|-----|
| 5.3.1 | Token launch announcement | User + Exodus |
| 5.3.2 | Update zkagentic.com with token info | Exodus |
| 5.3.3 | Simplified tokenomics page | Exodus |

### Gate
- [ ] AGNTC tradeable on Raydium/Jupiter
- [ ] Initial liquidity established
- [ ] Token on explorers and aggregators
- [ ] Revenue sufficient to begin hiring

---

## Phase 6: Mainnet Preparation (6-12 months, funded)

### Megatask 6.1: Team Building

| # | Role | Count |
|---|------|-------|
| 6.1.1 | Rust developers (core node, consensus, networking) | 2-3 |
| 6.1.2 | ZK engineer (Noir/Barretenberg) | 1 |
| 6.1.3 | DevOps/infra (validators, deployment, monitoring) | 1 |
| 6.1.4 | Security researcher (optional) | 0-1 |

### Megatask 6.2: Rust Node — Core Architecture

| # | Subtask | Deliverable |
|---|---------|-------------|
| 6.2.1 | State model decision: graph-native vs Merkle trie + RocksDB | Architecture doc |
| 6.2.2 | Consensus: BFT + PoAIV committee selection | Module |
| 6.2.3 | Datalog rule engine (Crepe/Datafrog) | Rule module |
| 6.2.4 | VRF: Ed25519, RFC 9381 compliant | Crypto module |
| 6.2.5 | P2P networking: QUIC or libp2p | Network layer |
| 6.2.6 | JSON-RPC + GraphQL API | Public API |
| 6.2.7 | Port 798+ Python tests to Rust | Test parity |
| 6.2.8 | Feature parity with Python testnet | Milestone |

### Megatask 6.3: ZK Proof System (Whitepaper Section 21.1)

| # | Phase | System | Deliverable |
|---|-------|--------|-------------|
| 6.3.1 | 1 | Circom + Groth16 | PoC circuits |
| 6.3.2 | 2 | Noir + Barretenberg (PLONK) | Production proofs |
| 6.3.3 | 3 | RLN for NCP privacy | Anonymous messaging |
| 6.3.4 | 4 | Nova/Halo2 epoch proofs (post-mainnet) | Recursive composition |

### Megatask 6.4: Security

| # | Subtask | Deliverable |
|---|---------|-------------|
| 6.4.1 | Internal security review | Report |
| 6.4.2 | Professional audit (Trail of Bits / OtterSec / Halborn) | Audit report |
| 6.4.3 | Bug bounty (Immunefi) | Public bounty |
| 6.4.4 | Formal verification (TLA+ / Dafny) | Proof artifacts |

### Megatask 6.5: Public Testnet → Mainnet

| # | Subtask | Deliverable |
|---|---------|-------------|
| 6.5.1 | Deploy 3-5 self-hosted validators | Running network |
| 6.5.2 | Incentivized testnet ("Tour de AGNTC") | Validator community |
| 6.5.3 | 3+ months stability with no critical incidents | Stability proof |
| 6.5.4 | Mainnet genesis | Launch |
| 6.5.5 | Solana→L1 bridge (lock-and-mint, whitepaper Section 20.4) | Bridge contract |

### Gate
- [ ] Rust node passes all Python testnet tests
- [ ] Professional audit: no critical findings
- [ ] Public testnet 3+ months stable
- [ ] Bridge tested and audited
- [ ] Mainnet genesis block produced

---

## Technology Stack — Current vs Production

| Component | Current (Testnet) | Production (Phase 6) |
|-----------|------------------|---------------------|
| Language | Python 3 | **Rust** |
| Consensus | Simulated PoAIV (SHA-256 VRF) | Real PoAIV (Ed25519 VRF, RFC 9381) |
| Networking | Single HTTP (FastAPI) | **QUIC** or libp2p (P2P mesh) |
| State | SQLite + Supabase sync | **Merkle trie + RocksDB** (or graph-native) |
| Crypto | Poseidon + BLAKE2b + simulated ZK | Poseidon + Ed25519 + **Noir/PLONK** |
| Rules | Implicit Python logic | **Datalog** (Crepe/Datafrog) |
| API | REST (FastAPI) | **JSON-RPC + GraphQL** |
| Frontend | Next.js 16 + PixiJS 8 | Same (connects to Rust node RPC) |
| ZK Proofs | SimulatedZKProof | **Groth16 → PLONK → Nova/Halo2** |

---

## Testnet Audit Summary (2026-04-02)

| Subsystem | Completeness | Production Ready? |
|-----------|-------------|-------------------|
| Galaxy Grid / Neural Lattice | 100% | Yes |
| State Storage (SQLite) | 85% | Partial |
| API Surface (27+ endpoints) | 85% | Partial (no auth) |
| Cryptography | 80% | Partial (real Poseidon, simulated VRF) |
| Testing (798+ tests, 68 files) | 80% | Good |
| Economics (tokenomics v2) | 75% | Partial (enforcement weak) |
| Privacy (ZK & nullifiers) | 75% | No (circuits missing) |
| Consensus (PoAIV) | 70% | No (signatures simulated) |
| **Networking** | **10%** | **No (single HTTP)** |

**Overall: 100% testnet-ready, 40% mainnet-ready.**

---

## Solana Comparison Points

| Metric | Solana | ZK Agentic Chain |
|--------|--------|-----------------|
| Whitepaper to mainnet | 2.5 years (Nov 2017 → Mar 2020) | Target: 2-3 years |
| Pre-mainnet funding | $22M (private sales + CoinList) | SPL token sale (Phase 5) |
| Initial team | 6 → 25 | 1 + AI agents → 4-6 post-sale |
| Language | Rust | Python (testnet) → Rust (mainnet) |
| Consensus | PoH + Tower BFT | PoAIV (AI verification) |
| Networking | UDP → QUIC (after outages) | FastAPI → QUIC/libp2p |
| State | Cloudbreak (custom) | SQLite → Merkle trie + RocksDB |
| Key differentiator | Speed (50K+ TPS) | AI consensus + privacy + Neural Lattice |
| Major lesson | Client diversity (Firedancer) | Plan for multiple implementations |

---

## Responsibility Matrix

| Domain | Exodus (AI) | User (Human) |
|--------|-------------|-------------|
| Code, test, audit | Yes | Review |
| Dispatch to children | Yes | — |
| Design docs, plans | Yes | Approve |
| Whitepaper math verification | Yes | Review |
| Community building | Content drafts | Social presence |
| Legal (token, jurisdiction) | — | Yes + counsel |
| Academic outreach | Draft submission | Submit + network |
| Treasury management | — | Yes |
| Hiring (Phase 6) | Job descriptions | Interviews + decisions |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Token sale underperforms | Medium | Delays Phase 6 | Keep team small, extend solo phase |
| Whitepaper inconsistencies found | High | Delays Phase 1 | Code is the tiebreaker — fix whichever is wrong |
| PixiJS performance on large grids | Medium | Degrades demo | Viewport culling, level-of-detail |
| Supabase write-through latency | Low | Slow simulator | Polling interval tuning, batch processing |
| Copyright claim on "Stellaris" | Low (mitigated) | Rebrand cost | Already renaming to Neural Lattice |
| Rust rewrite scope creep | High | Delays mainnet | Python tests define scope — feature parity only |
| Single-founder bus factor | High | Project stalls | AI agents maintain continuity, docs are comprehensive |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-02 | Approach A (Lean Sequential) | Solo founder constraint; Solana proved sequential works |
| 2026-04-02 | Skip Railway, use Supabase write-through | Zero cost, more secure (no public attack surface) |
| 2026-04-02 | Remove all "Stellaris" references | Copyright risk; evolved past space game metaphor |
| 2026-04-02 | "Neural Lattice" for visualization | Unique in crypto, ties to NCP protocol |
| 2026-04-02 | ZK Agentic Chain (protocol) / ZK Agentic Network (dApp) split | Clean brand architecture, future-proofs for third-party dApps |
| 2026-04-02 | GraphQL: use Supabase pg_graphql, don't build custom | Already free, zero dev time |
| 2026-04-02 | Datalog (Crepe/Datafrog) for Phase 6 rule engine | Proven in Rust compiler, guaranteed termination |
| 2026-04-02 | TerminusDB rejected | Dying project, can't embed in Rust, WOQL is liability |
| 2026-04-02 | Audit: internal now → academic parallel → professional post-sale | Capital-efficient, builds credibility progressively |
