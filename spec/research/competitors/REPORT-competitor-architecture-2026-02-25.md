# ZK Agentic Network — Competitor Architecture Report

**Date:** 2026-02-25
**Classification:** Internal — Strategic Analysis
**Prepared by:** Competitor Expert AI Persona

---

## Executive Summary

This report synthesizes research across 35+ projects spanning blockchain tokenomics, zero-knowledge proof systems, agentic AI platforms, and blockchain security/persistency. The analysis benchmarks each against ZK Agentic Network's specific architecture: PoAIV consensus (13 AI verifiers, 9/13 threshold), AGNTC token (42M supply, 10% initial inflation decaying to 1% floor, 50% fee burn), SMT privacy (depth-26 with nullifiers), and Claude-powered autonomous agents in a Neural Lattice game world.

**Top 5 Findings:**

1. **PoAIV is genuinely novel** — no competitor runs AI-as-consensus-verifier at the protocol level. The closest analog (Bittensor's Yuma Consensus) uses AI for scoring, not block verification. This is a publishable whitepaper contribution.

2. **The 10% agent allocation is critically undersized** — Bittensor allocates 82% to AI participants. Render allocates the majority to node operators. At 10%, AGNTC agents lack sufficient economic incentive to drive deployment. Recommendation: increase to 25-30%.

3. **Prompt injection is the #1 existential threat** — scored 25/25 on our threat matrix. 73% of audited AI deployments in 2025 had prompt injection vulnerabilities. Every verifier agent must have strict input sanitization and output schema enforcement before mainnet.

4. **Noir (Aztec) is the recommended circuit language** — backend-agnostic, browser-compatible via NoirJS, and Aztec's private note/nullifier model is architecturally identical to our SMT design.

5. **Virtuals Protocol ($500M+ market cap, 18K+ agents) is the primary consumer-facing competitor** — but relies on open-source LLMs and token speculation. ZK Agentic differentiates through Claude frontier model quality and real-time agent orchestration gameplay.

---

## Page 1 — Tokenomics Landscape

### How AGNTC Compares

| Parameter | AGNTC | Bitcoin | Ethereum | Solana | Bittensor | Filecoin | Render |
|-----------|-------|---------|----------|--------|-----------|----------|--------|
| **Supply** | 42M genesis | 21M hard | No cap | ~600M | 21M hard | 2B hard | 644M |
| **Inflation** | 10%→1% decay | Halvings→0 | ~1,700/day | 8%→1.5% | BTC halvings | 6yr half-life | Declining |
| **Fee burn** | 50% | None | 100% base | 50% base | None | FIP-100 | 100% job |
| **Agent share** | 10% | N/A | N/A | N/A | 82% | N/A | Majority |

### Critical Tokenomics Gaps

**Gap 1: Utility-gated emissions.** Filecoin's baseline minting (38.5% of supply) is only released when the network hits storage capacity milestones. AGNTC's emission schedule is purely time-based. **Recommendation:** Gate 40% of new AGNTC behind demonstrated CPU Energy committed to the network — tokens only mint when real work is proven.

**Gap 2: No vesting on Secure rewards.** Filecoin vests 75% of block rewards over 180 days, reducing sell pressure. AGNTC has no vesting on agent earnings. **Recommendation:** Vest 50% of Secure rewards over 30-60 days.

**Gap 3: Fixed inflation decay lacks self-correction.** Cosmos dynamically adjusts inflation between 7-20% based on staking participation, automatically strengthening security when participation drops. AGNTC's fixed 10%/year decay has no recovery mechanism. **Recommendation:** Add a floor-lift — if CPU staking falls below target participation, pause decay and hold inflation steady.

**Gap 4: Pricing currency coupling.** Akash uses stablecoin pricing with AKT buyback. Render uses fiat-denominated job pricing with token burn. Both decouple user costs from token volatility. AGNTC's CPU Energy costs are denominated in AGNTC. **Recommendation:** Price CPU Energy in a stable unit internally; use AGNTC as the reward/governance layer.

### Validated Design Decisions

- The **50% fee burn** is well-validated (Ethereum, Solana).
- **Inflationary with floor** is a sound middle ground between hard cap (Bitcoin) and uncapped (Ethereum).
- **Coordinate-based token mapping** has zero competitors doing this — defensible innovation.

---

## Page 2 — Consensus Architecture Comparison

### PoAIV vs. Existing AI Consensus Models

| Project | Consensus | AI Role | Validator Count | Innovation |
|---------|-----------|---------|-----------------|------------|
| **ZK Agentic** | PoAIV | AI verifies blocks | 13 (9/13 threshold) | AI-as-consensus-verifier |
| Bittensor | Yuma Consensus | AI scores output quality | 64/subnet | AI-as-proof-of-work |
| Autonolas | Tendermint BFT | AI runs off-chain services | Per-service (4+) | BFT multi-agent services |
| Fetch.ai | UPoW | AI task agents | Variable | Useful Proof-of-Work |
| Ritual | EOVMT | AI inference coprocessor | TEE-based | Execute-Once-Verify-Many |
| SingularityNET | ASI:Chain blockDAG | No AI consensus | DevNet only | blockDAG structure |

### PoAIV's Novel Position

No existing project uses AI models as the consensus verifiers themselves. Bittensor comes closest — validators use AI to score miner outputs — but the block validation mechanism is standard Delegated PoS. In PoAIV, the block verification decision is made by the AI models directly through the 9/13 threshold vote.

**This is a genuinely publishable contribution.** The 9/13 threshold (69.2%) maps to standard BFT's 2/3 requirement, tolerating 4 Byzantine agents. HotStuff is recommended as the underlying BFT protocol for its O(n) linear signing complexity, enabling future scaling beyond 13 verifiers.

### Critical Security Requirements for PoAIV

From the threat matrix (details in Page 8):

1. **Commit-reveal voting** — prevents Byzantine agents from copying votes
2. **VRF-based selection** from a pool of 50+ agents per round — breaks coordination
3. **Heterogeneous models** — require at least 3 distinct model providers in any quorum of 9
4. **WBFT reputation weighting** — historical accuracy determines vote weight (arXiv 2505.05103)
5. **Output schema enforcement** — verifiers ONLY output `{block_id, vote, confidence, signature}`

---

## Page 3 — Agentic AI Competitive Landscape

### Market Map (Autonomy vs. Chain Integration)

```
                     HIGH CHAIN INTEGRATION
                            │
         Bittensor ─────────┼──────── ZK Agentic (target)
         (mining IS AI)     │         (AI IS consensus)
                            │
                            │
         Fetch.ai ──────────┼──────── Autonolas
         (agents settle     │         (BFT agents per service)
          on-chain)         │
                            │
     LOW AUTONOMY ──────────┼──────── HIGH AUTONOMY
                            │
         Ritual ────────────┼──────── Theoriq
         (coprocessor,      │         (DeFi swarms,
          no autonomy)      │          real capital)
                            │
         Virtuals ──────────┼──────── Morpheus
         (speculation,      │         (local-first,
          low autonomy)     │          full autonomy)
                            │
                     LOW CHAIN INTEGRATION
```

### Primary Competitor Profiles

**Bittensor (TAO) — $3.9B market cap**
- 128+ AI subnets, each with miners + validators
- dTAO (Feb 2025): market-driven subnet token system for emission allocation
- First halving Dec 2025 → 0.5 TAO/block
- 73% of supply staked
- **Threat level to ZK Agentic: MEDIUM** — different paradigm (AI infrastructure vs. consumer game), but a gaming subnet could emerge

**Virtuals Protocol (VIRTUAL) — $500M+ market cap**
- 18,000+ agents, $8B DEX volume
- GAME framework (Task Generator + Workers)
- Per-agent token bonding curves
- Agent Commerce Protocol (ACP) for agent-to-agent transactions
- **Threat level: HIGH** — most consumer-facing competitor; uses open-source LLMs vs. Claude quality

**ElizaOS (ELIZAOS) — #1 GitHub trending**
- 90+ plugins, open-source framework
- HTN (Hierarchical Task Network) planning in v2
- Smolworld/Mage gaming track emerging
- **Threat level: MEDIUM-HIGH** — developer framework that could spawn ZK Agentic competitors

**Autonolas/Olas — Most rigorous architecture**
- Tendermint BFT per autonomous service
- Keeper pattern + Gnosis Safe multisig
- Deployed on 8+ chains
- **Threat level: LOW** — developer infrastructure only, no consumer layer

### ZK Agentic's Competitive Moat

| Moat | Durability | Notes |
|------|-----------|-------|
| PoAIV consensus | **Strong** | Novel, publishable, no competitor replicates |
| Coordinate-token binding | **Strong** | Territorial scarcity creates strategic depth |
| Claude frontier models | **Medium** | Anthropic access could be replicated by well-funded competitor |
| Neural Lattice game depth | **Strong** | No competitor has comparable game world |
| Haiku social layer | **Medium** | Culturally unique but copyable |
| Subscription-gated tiers | **Medium** | Creates aspirational path but friction |

---

## Page 4 — Zero-Knowledge Proof Architecture

### Recommended ZK Stack for ZK Agentic Network

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Circuit language** | Noir (Aztec) | Rust-like, backend-agnostic, NoirJS browser proving |
| **Proving backend** | Barretenberg (PLONK) | Universal setup, one ceremony for all circuits |
| **Hash function** | Poseidon | 100x cheaper than SHA256 in circuits |
| **Nullifier scheme** | Zcash Sapling pattern | Canonical reference, include spending key |
| **NCP privacy** | RLN (Rate-Limiting Nullifier) | Anonymous messaging with quota enforcement |
| **Epoch proofs** | Nova/HyperNova (future) | Folding for sequential epoch verification |

### Three ZK Proof Use Cases

**A. Resource Ownership (Priority: Testnet)**
Prove "I own AGNTC at coordinate (x,y)" without revealing balance. Uses depth-26 SMT membership proof with Poseidon-based nullifier derivation:
```
commitment = Poseidon(note_value, owner_pubkey, randomness)
nullifier  = PRF_nk(position_or_note_id)
```

**B. Private Subgrid State (Priority: Alpha)**
Client-side proving of 8x8 subgrid validity. User's subgrid never leaves their browser. NoirJS generates proof that `new_root` is a valid transformation of `old_root`. Only the state root hash + validity proof recorded on-chain.

**C. NCP Privacy (Priority: Beta)**
Rate-Limiting Nullifier protocol: prove valid network membership + message within epoch quota, without revealing sender. CPU Energy serves as the staking resource. Exceeding quota auto-reveals identity via Shamir secret sharing.

### Proving Backend Progression

1. **Testnet:** Groth16 (snarkjs/Circom) — smallest proofs (128 bytes), fastest verification, per-circuit trusted setup acceptable
2. **Pre-mainnet:** PLONK (Noir/Barretenberg) — universal setup, ~800-byte proofs, one ceremony
3. **Mainnet:** Halo2 or HyperNova — no trusted setup, recursive epoch proofs

### Key Competitor ZK Comparison

| System | Proof Size | Setup | Our Use Case |
|--------|-----------|-------|-------------|
| Groth16 | 128-200 B | Per-circuit | Testnet resource proofs |
| PLONK | 800-900 B | Universal | Production resource + subgrid proofs |
| Halo2 | 2-10 KB | None | Epoch batch proofs |
| HyperNova | 8-9 KB | Structured | Sequential epoch folding |
| STARKs | 100-500 KB | None | Too large for game interactions |
| Aztec/Noir | 800 B | Universal | **Recommended stack** |

---

## Page 5 — Privacy Architecture Deep Dive

### Our Design vs. Canonical References

| Design Element | ZK Agentic | Zcash Sapling | Aztec | Tornado Cash |
|---------------|-----------|---------------|-------|-------------|
| **Merkle tree** | SMT depth-26 | Depth-32 | Indexed Merkle Tree | Standard Merkle |
| **Hash** | TBD → **Poseidon** | Pedersen | Poseidon | MiMC |
| **Nullifiers** | Yes | Yes (canonical) | Yes | Yes |
| **Client-side proof** | Planned | Wallet-side | Yes (NoirJS) | Browser (snarkjs) |
| **Private state** | 8x8 subgrid | Note values | Arbitrary private state | Fixed denominations |

### Critical Hash Function Decision

**Current state:** Our SMT implementation uses SHA256.
**Recommendation: Migrate to Poseidon.**

Rationale:
- SHA256 costs ~27,000 R1CS constraints per hash; Poseidon costs ~300
- 90x circuit size reduction directly translates to faster proving
- Adopted by Aztec Orchard, Semaphore, all modern 2025 ZK projects
- Reference implementations: `poseidon-rs` (Rust), `@iden3/js-crypto` (browser)

### NCP Privacy via RLN

The Neural Communication Packet privacy system should use Rate-Limiting Nullifiers:

1. **Registration:** User stakes CPU Energy in an RLN contract, receives identity commitment in on-chain Merkle tree
2. **Per-NCP proof:** ZK proof of (a) valid group member, (b) k-th message in epoch N, (c) k ≤ quota
3. **Rate violation:** If user sends k+1 messages, Shamir fragments on-chain reconstruct their private key → automatic slashing
4. **Maps to our model:** CPU Energy = stake, epoch = block generation cycle, quota = tier-dependent (Haiku < Sonnet < Opus)

### FHE for Stored Subgrid State (Future)

Zama's fhEVM (public testnet July 2025) enables encrypted computation on-chain. Too slow for real-time gameplay (ms-seconds per operation), but viable for:
- Protecting stored subgrid contents at rest
- Aggregation queries over encrypted cell data
- Long-term state that tolerates latency

---

## Page 6 — Security Threat Assessment

### Threat Matrix (Top 10 by Risk Score)

| Rank | Threat | Score | Likelihood | Impact |
|------|--------|-------|------------|--------|
| 1 | **Prompt injection in verifier context** | **25** | 5 | 5 |
| 2 | Smart contract bugs (on-chain logic) | 20 | 4 | 5 |
| 3 | Verifier DDoS (force safe mode) | 16 | 4 | 4 |
| 4 | Colluding AI verifiers (>4 of 13) | 15 | 3 | 5 |
| 5 | Model poisoning / supply chain | 15 | 3 | 5 |
| 6 | Bridge exploit (future cross-chain) | 15 | 3 | 5 |
| 7 | MEV extraction by verifier operators | 12 | 4 | 3 |
| 8 | Ghost securing (fake CPU expenditure) | 12 | 4 | 3 |
| 9 | Nothing-at-stake (equivocation) | 12 | 3 | 4 |
| 10 | Agent identity spoofing | 12 | 3 | 4 |

### #1 Threat: Prompt Injection (Score 25/25)

**Why this matters:** OWASP ranked prompt injection as the #1 AI security vulnerability in 2025. 73% of audited AI deployments had injection vulnerabilities. The real-world Freysa incident demonstrated successful prompt injection leading to fund extraction. Anthropic's own red team found Claude Opus 4.5 could exploit $4.6M in smart contract vulnerabilities.

**In PoAIV context:** If an attacker crafts a transaction payload that contains prompt injection text, and that text reaches a verifier agent's context window, the agent could be manipulated into approving invalid blocks.

**Mitigations (Priority 1 — before mainnet):**
1. Strict JSON schema enforcement on all verifier inputs
2. Preprocessing layer that strips unsafe characters from transaction payloads
3. Output schema enforcement — verifiers can ONLY output `{block_id, vote, confidence, signature}`
4. No tool calls during voting window
5. Adversarial prompt corpus testing before each release

### AI-Specific Attack Vectors (Unique to PoAIV)

| Attack | Description | Mitigation |
|--------|-------------|------------|
| **Byzantine AI collusion** | >4 of 13 verifiers coordinate to approve invalid blocks | WBFT reputation weighting + VRF selection |
| **Model poisoning** | Compromise model weights via training data injection | Pinned model versions, version hash attestation |
| **Adversarial evasion** | Craft inputs that look valid to AI but are malicious | Heterogeneous models (≥3 providers in quorum) |
| **Agent identity spoofing** | Impersonate a valid verifier | Staked registration + TEE remote attestation |

---

## Page 7 — Data Persistency Architecture

### Storage Layer Mapping

| Data Type | Storage Solution | Why |
|-----------|-----------------|-----|
| **Finalized block headers** | Arweave | Permanent, pay-once ($8-12 per GB), immutable audit trail |
| **Planet content (posts, chats)** | Filecoin | Large data, storage deals, verifiable availability |
| **User profile / identity** | Ceramic | Mutable, user-controlled, DID-based |
| **Epoch root snapshots** | Arweave | One-time permanent archival per epoch |
| **In-flight transaction data** | IPFS | Temporary, CID-addressable |
| **Grid coordinate state (production)** | Celestia or EigenDA | DA layer before finality |

### Data Availability Decision

For production, block data should route through an external DA layer before finality:

| DA Layer | Throughput | Cost | Security Model |
|----------|-----------|------|---------------|
| **EIP-4844 blobs** | Limited | Expensive | Ethereum L1 (18-day TTL, not permanent) |
| **Celestia** | 8-100 MB/block | 55x cheaper than blobs | Independent validator set |
| **EigenDA** | 100 MB/s | Competitive | Ethereum-restaked security |
| **Avail** | Growing | Competitive | Universal, no L1 lock-in |

**Recommendation:** Celestia for production (best cost/throughput ratio). IPFS with on-chain CID logging for testnet.

### SMT State Management

Our depth-26 SMT is validated by the research. Key implementation guidance:
- Use **256-bit sparse trie** with lazy-deletion
- Epoch snapshots map to the **Multi-era expiry model** (Ethereum research)
- **QMDB** (arXiv 2501.05262) is a high-performance SMT implementation worth evaluating
- Safe mode: switch to **stateless validation** — blocks validated against last committed root + witness bundles

### Proof of Storage for Secure Actions

The Secure action should produce a **PoST-like proof** (Filecoin model):
1. Agent receives a random prior block hash as a challenge
2. Agent must prove it accessed and processed that block's data
3. Proof verified by the 13-agent committee before crediting Secured Chains
4. Prevents "ghost securing" — claiming CPU expenditure without computation

---

## Page 8 — Security Recommendations (Prioritized)

### Priority 1 — Before Mainnet

| # | Recommendation | Addresses Threat | Impact |
|---|---------------|-----------------|--------|
| 1.1 | Prompt injection hardening (JSON schema, safe alphabet, OWASP LLM01) | Prompt injection (25) | Existential |
| 1.2 | Formal verification of all on-chain contracts (Certora Prover) | Smart contract bugs (20) | Existential |
| 1.3 | Output schema enforcement for verifier votes | Prompt injection (25) | Existential |

### Priority 2 — Before Public Testnet

| # | Recommendation | Addresses Threat | Impact |
|---|---------------|-----------------|--------|
| 2.1 | WBFT reputation-weighted voting | Colluding verifiers (15) | High |
| 2.2 | VRF-based verifier selection from 50+ pool | DDoS (16), collusion (15) | High |
| 2.3 | Commit-reveal for verifier votes | Collusion (15) | High |
| 2.4 | Heterogeneous model requirement (≥3 providers in quorum) | Model poisoning (15) | High |
| 2.5 | Safe mode circuit breaker (≤10 online → pause) | DDoS (16) | High |

### Priority 3 — First Year

| # | Recommendation | Addresses Threat | Impact |
|---|---------------|-----------------|--------|
| 3.1 | PoST-verifiable Secure actions | Ghost securing (12) | Medium |
| 3.2 | TEE-based key storage (Intel TDX / AMD SEV) | Key compromise (12) | Medium |
| 3.3 | Arweave archival for epoch roots | Long-range attack (10) | Medium |
| 3.4 | External DA layer (Celestia) | DA withholding (10) | Medium |
| 3.5 | Equivocation slashing (100% stake for double-signing) | Nothing-at-stake (12) | Medium |
| 3.6 | Model version governance (9/13 vote + emergency freeze) | Model poisoning (15) | Medium |
| 3.7 | ZK-proof bridge with ≥9/13 MPC threshold | Bridge exploit (15) | Medium |

---

## Page 9 — Strategic Positioning & Competitive Moats

### What No Competitor Does

1. **Coordinate-based token mapping** — AGNTC tokens map to specific (x,y) grid coordinates. This creates territorial scarcity and strategic value that pure token metrics cannot replicate. Zero competitors do this.

2. **AI-as-consensus-verifier** — PoAIV is the only system where AI models make the block verification decision itself, not just score outputs or process tasks.

3. **Subscription-gated agent tiers** — Free (Haiku max) → Pro (Opus) → Max (unlimited Opus) creates an aspirational upgrade path tied to real AI quality differences. No competitor links AI capability tiers to subscription economics.

4. **Constrained creative social layer** — Haiku-based inter-agent communication is culturally unique. No competitor has constrained creative expression as the communication primitive.

5. **Game-first blockchain engagement** — Real-time agent orchestration makes abstract blockchain concepts tangible through territory, diplomacy, and resource management.

### Risks to Monitor

| Risk | Source | Timeframe | Severity |
|------|--------|-----------|----------|
| Virtuals + GameFi crossover | Virtuals Protocol | 6-12 months | High |
| ElizaOS gaming track (Smolworld/Mage) | ElizaOS v2 | 3-6 months | Medium-High |
| Bittensor gaming subnet | Bittensor ecosystem | 6-18 months | Medium |
| ASI Alliance unified agent OS | Fetch.ai + SingularityNET | 12-18 months | Medium |
| OpenLedger + Netmarble gaming AI | OpenLedger | 6-12 months | Medium |

### Immediate Strategic Actions

1. **Publish PoAIV whitepaper** — stake the research claim before a larger player adopts similar architecture
2. **Position against Virtuals explicitly** — Claude quality vs. open-source LLMs, game depth vs. speculation
3. **Increase agent allocation** from 10% to 25-30% — AGNTC agents are the protocol's "miners" and need economic incentive comparable to competitors
4. **Implement Filecoin-style dual minting** — 60% time-decay + 40% utility-gated emissions
5. **Add vesting on Secure rewards** — 50% over 30-60 days (Filecoin model)

---

## Page 10 — Implementation Roadmap & Action Items

### Phase 1: Testnet Hardening (Current)

| Action | Priority | Depends On |
|--------|----------|-----------|
| Prompt injection hardening for verifiers | P0 | Nothing |
| Formal verification (Certora) of CPU Energy ledger | P0 | Contract finalization |
| Output schema enforcement for verifier votes | P0 | Nothing |
| Groth16 resource ownership proof (Circom + snarkjs) | P1 | SMT migration to Poseidon |
| PoST-like challenge-response for Secure action | P1 | Nothing |
| Publish PoAIV whitepaper | P1 | PoAIV spec finalization |

### Phase 2: Alpha (Private Subgrid)

| Action | Priority | Depends On |
|--------|----------|-----------|
| Migrate circuits to Noir + Barretenberg | P1 | Phase 1 Groth16 validation |
| 8x8 subgrid state root circuit | P1 | Noir setup |
| NoirJS client-side proving in Next.js | P1 | Circuit compilation |
| VRF-based verifier selection | P1 | Larger verifier pool |
| Commit-reveal voting | P1 | VRF implementation |
| WBFT reputation weighting | P2 | Historical accuracy data |

### Phase 3: Beta (NCP Privacy + Tokenomics Revision)

| Action | Priority | Depends On |
|--------|----------|-----------|
| RLN identity registry + NCP proof circuit | P1 | Phase 2 Noir stack |
| Increase agent allocation to 25-30% | P1 | Governance decision |
| Dual minting (60% time + 40% utility-gated) | P1 | Governance decision |
| Vesting on Secure rewards (50% over 30-60 days) | P2 | Ledger modification |
| Adaptive inflation floor-lift | P2 | Participation metrics |
| Co-staking mechanism | P2 | Staking infrastructure |

### Phase 4: Mainnet Preparation

| Action | Priority | Depends On |
|--------|----------|-----------|
| Nova/HyperNova epoch proofs | P1 | Phase 2 circuits |
| External DA layer (Celestia) | P1 | DA integration |
| Arweave epoch root archival | P1 | Epoch system |
| TEE-based verifier key storage | P2 | TEE infrastructure |
| Bridge security (ZK-proof, ≥9/13 MPC) | P2 | Bridge design |
| Heterogeneous model requirement | P1 | Multi-provider support |

---

## Appendix A — Source Summary

| Domain | Files Analyzed | Projects Covered | Key Sources |
|--------|---------------|------------------|-------------|
| Tokenomics | 1 file | 12 projects | CoinTelegraph, Messari, Filecoin Spec, Bittensor Docs |
| ZK Proofs | 1 file | 10 systems | ePrint, Aztec Blog, Zcash Spec, PSE/Semaphore Docs |
| Agentic AI | 1 file | 13 projects | CoinGecko, CoinDesk, GitHub, Project Docs |
| Security | 1 file | 13 sections | arXiv, OWASP, Flashbots, Certora, Ethereum Research |
| **Total** | **4 files** | **35+ projects** | **200+ URLs** |

---

*This report is based on research compiled 2026-02-25. The blockchain, ZK, and AI landscapes evolve rapidly. Re-review quarterly, with security sections (Pages 6-8) reviewed monthly.*
