---
name: blockchain-rollout
description: "Solana-grade rollout knowledge: architecture patterns, technology choices, phase gates, and best practices for building a production L1 blockchain from a Python testnet."
priority: 60
last_read: 2026-04-02T14:30:00Z
read_count: 0
---

# Blockchain Rollout — Solana-Grade Best Practices

## When to Use This Skill

Activate when:
- Making architecture decisions that affect the rollout plan
- Choosing technologies for any phase
- Evaluating build-vs-buy for infrastructure
- Comparing against other blockchain projects
- Planning team structure or hiring

## Rollout Design

**Design doc:** `docs/plans/2026-04-02-solana-grade-rollout-design.md`

6-phase lean sequential rollout:
1. Whitepaper Audit → 2. Public Testnet → 3. Game UI Demo → 4. Community → 5. Token Sale → 6. Mainnet

## Brand Hierarchy

- **ZK Agentic Chain** = blockchain protocol (L1, consensus, PoAIV)
- **ZK Agentic Network** = flagship dApp (game UI, agent interaction)
- **Neural Lattice** = 2D graph visualization of chain state
- **AGNTC** = native token (SPL on Solana, migrates to L1)
- **NEVER use "Stellaris"** — copyright risk, removed globally

## Solana Architecture Reference

### Core Innovations (8)
1. **Proof of History (PoH)** — SHA-256 hash chain as cryptographic clock
2. **Tower BFT** — optimized PBFT using PoH for vote timing
3. **Turbine** — BitTorrent-style block propagation with FEC
4. **Gulf Stream** — mempool-less transaction forwarding to next leader
5. **Sealevel** — parallel smart contract execution engine
6. **Pipelining** — hardware-level transaction processing pipeline
7. **Cloudbreak** — memory-mapped state storage with copy-on-write
8. **Archivers** — distributed ledger storage with Proof of Replication

### Solana Timeline
- Nov 2017: whitepaper (1 person)
- Feb 2018: first testnet (~6 people)
- Jul 2019: Tour de SOL incentivized testnet (~17 people)
- Mar 2020: mainnet beta (~25 people, $22M raised)
- Late 2022: QUIC migration (after spam outages)
- Dec 2025: Firedancer (second client, Jump Crypto)

### Key Lessons from Solana's 9 Outages
- 5/9 were client bugs, 2 were spam floods, 2 were edge-case protocol issues
- Spam incidents drove the QUIC migration (replaced raw UDP)
- Client diversity (Firedancer) is the ultimate resilience strategy
- Recovery time improved from 17h → 5h → coordinated patches with zero downtime

### Solana Staking Model
- Delegated PoS, no minimum stake to run validator
- Inflation: started 8%, decreases 15%/year, floor 1.5%
- 67.7% of supply staked
- Validator hardware: 12+ cores, 128-256GB RAM, NVMe SSDs (~$800-1200/mo)

## Technology Decisions (Locked)

### Phase 6 Production Stack
| Component | Choice | Why |
|-----------|--------|-----|
| Language | **Rust** | Memory safety, zero-cost abstractions, blockchain ecosystem standard |
| Consensus | **BFT + PoAIV** | Per whitepaper, 13-agent committee, 9/13 threshold |
| Rule Engine | **Datalog (Crepe/Datafrog)** | Guaranteed termination, used in Rust compiler (Polonius) |
| State Storage | **Merkle trie + RocksDB** | Proven (Solana, Ethereum), or graph-native (differentiator) |
| Networking | **QUIC** (preferred) or libp2p | QUIC: Solana's choice after outage lessons, better flow control |
| RPC | **JSON-RPC + GraphQL** | Industry standard + modern query flexibility |
| ZK Proofs | **Circom→Noir→RLN→Nova/Halo2** | Per whitepaper Section 21.1, progressive capability |
| VRF | **Ed25519, RFC 9381** | Cryptographic VRF replacing current SHA-256 simulation |

### Rejected Technologies
| Technology | Reason |
|-----------|--------|
| TerminusDB | Dying project, can't embed in Rust, WOQL is hiring liability |
| Custom GraphQL | Supabase pg_graphql is free and already enabled |
| Railway hosting | Supabase write-through eliminates need for public API |
| libp2p (initially) | Solana switched away; QUIC provides better spam resistance |
| Full Prolog | Non-terminating; Datalog subset is safe for on-chain rules |

## Testnet Audit Results (2026-04-02)

56 Python files, 798+ tests across 68 test files.

| Subsystem | Status | Completeness |
|-----------|--------|-------------|
| Neural Lattice (grid) | Complete | 100% |
| State (SQLite) | Strong | 85% |
| API (27+ endpoints) | Strong | 85% |
| Crypto (Poseidon, BLAKE2b) | Strong | 80% |
| Testing | Strong | 80% |
| Economics | Partial | 75% |
| Privacy (SMT, nullifiers) | Strong | 75% |
| Consensus (PoAIV) | Partial | 70% |
| Networking | **Stub** | **10%** |

**Overall: 100% testnet-ready, 40% mainnet-ready.**

### Critical Production Gaps
1. No P2P networking (single HTTP endpoint)
2. Signatures simulated (SHA-256, not Ed25519)
3. VRF is deterministic hash (not cryptographic)
4. ZK proofs are simulated (no actual circuits)
5. Slashing defined but never enforced
6. No transaction fees deducted in mining

## Comparable Project Patterns

| Pattern | Who Does It | Relevance |
|---------|-------------|-----------|
| Python prototype → Rust production | Ethereum (Python → Go/Rust) | Our exact path |
| Incentivized testnet | Solana (Tour de SOL), Cosmos (Game of Stakes) | Phase 6.5.2 |
| SPL token → L1 migration | Multiple projects | Our Phase 5→6 bridge |
| Client diversity | Ethereum (5 clients), Solana (Firedancer) | Post-mainnet goal |
| Datalog for rules | Rust compiler (Polonius), Facebook (Glean) | Phase 6 rule engine |
| Graph-native state | No major L1 (differentiator opportunity) | Phase 6 architecture decision |

## Constraints

- Solo founder until token sale — no parallelism, sequential phases
- AGNTC already minted on Solana — token ticker is fixed
- 4 domains are separate deploys — never cross-contaminate
- Whitepaper is law — code must match, deviations require whitepaper update
- All Stellaris/galaxy references must be replaced with Neural Lattice terminology
