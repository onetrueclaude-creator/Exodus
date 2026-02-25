# Blockchain Security & Data Persistency — Research Report

**Prepared for:** ZK Agentic Network
**Date:** 2026-02-25
**Scope:** Latest (2025–2026) mechanisms relevant to AI-verifier consensus (13 verifiers, 9/13 threshold), dispute resolution, safe mode (20% offline triggers), and Sparse Merkle Tree (SMT) state storage.

---

## Table of Contents

1. [Byzantine Fault Tolerance](#1-byzantine-fault-tolerance)
2. [Validator Security & Slashing](#2-validator-security--slashing)
3. [MEV Protection](#3-mev-protection)
4. [Smart Contract Formal Verification](#4-smart-contract-formal-verification)
5. [Cross-Chain Bridge Security](#5-cross-chain-bridge-security)
6. [AI-Specific Attack Vectors](#6-ai-specific-attack-vectors)
7. [Data Availability Layers](#7-data-availability-layers)
8. [Decentralized Storage](#8-decentralized-storage)
9. [State Management & Expiry](#9-state-management--expiry)
10. [Proof of Storage Mechanisms](#10-proof-of-storage-mechanisms)
11. [Threat Matrix for AI-Verified Blockchains](#11-threat-matrix-for-ai-verified-blockchains)
12. [Security Recommendations for ZK Agentic Network](#12-security-recommendations-for-zk-agentic-network)
13. [Sources](#13-sources)

---

## 1. Byzantine Fault Tolerance

### Mechanism / Protocol Design

Byzantine Fault Tolerant (BFT) consensus allows a distributed network to agree on valid blocks even when a fraction of participants behave arbitrarily (crash, lie, or collude). The foundational result requires at least **3f + 1** total validators to tolerate **f** Byzantine nodes, meaning safety requires fewer than one-third of validators to be faulty.

**PBFT (Practical Byzantine Fault Tolerance)**
The canonical protocol. Three-phase commit (pre-prepare → prepare → commit). O(n²) message complexity — fine for small validator sets, prohibitive above ~100 nodes.

**HotStuff (used by Diem/Aptos, Meta-lineage protocols)**
Achieves linear message complexity (O(n)) via threshold signatures and a leader-based pipelining scheme. Three-phase commit with quorum certificates (QC). Leader rotation allows the network to progress even after view change. Known weakness: if f leaders fail consecutively, throughput collapses because each failed slot stalls the pipeline.

**Recent HotStuff improvement (2024–2025):** A fast-response variant introduces an "optimistic response assumption," a message aggregation tree for vote collection, and a dynamic threshold mechanism to reduce communication delay under partial failures. The improvement significantly reduces tail latency in adversarial conditions.

**Tendermint BFT (used by Cosmos Hub, and many IBC chains)**
Two-phase commit: prevote → precommit. Uses timeouts (not view-change messages) to advance rounds. When no block is proposed in time, an empty "nil" block is committed. This keeps liveness even under f Byzantine leaders but adds block latency during failures. Deterministic finality at the block level — no probabilistic confirmations.

**Leaderless BFT (2025 research frontier)**
Trusted-hardware-assisted leaderless BFT (see eprint.iacr.org/2025/1033) avoids single-leader bottlenecks entirely by combining TEEs (Trusted Execution Environments, e.g., Intel TDX) with BFT. Every node can propose; TEEs prevent equivocation without requiring the classical 3f+1 bound in many cases.

**Grouped / Aggregated-Signature BFT (2025)**
Recent Springer paper shows that combining nodes into groups and using BLS aggregated signatures reduces both communication and storage overhead substantially versus naive PBFT. Suitable for large validator sets (>100 nodes) while preserving the 2/3-honest safety guarantee.

### Security Guarantees & Threat Model

- **Safety** (never commit conflicting blocks): guaranteed if <1/3 validators are Byzantine.
- **Liveness** (always make progress): requires <1/3 Byzantine *and* asynchronous network eventually stabilises.
- CAP theorem consequence: BFT protocols choose CP (consistency + partition tolerance) — they halt rather than fork under a network split.

### Performance Characteristics

| Protocol | Message Complexity | Finality | Max Validators (practical) |
|----------|-------------------|----------|---------------------------|
| PBFT | O(n²) | 2 rounds | ~100 |
| HotStuff | O(n) | 3 rounds | ~1000 |
| Tendermint | O(n) | 2 rounds | ~150 (Cosmos Hub) |
| Leaderless TEE-BFT | O(n log n) | 1-2 rounds | Research |

### Known Vulnerabilities

- **Long-range attack**: Old private keys can be used to rewrite history; mitigated by weak subjectivity checkpoints.
- **Liveness attacks on leaders**: Targeted DDoS of current leader stalls HotStuff pipelines.
- **Nothing-at-Stake (PoS overlay)**: Validators may sign competing chains at no cost; mitigated by slashing.
- **Adaptive adversary**: Corrupting validators after observing messages; TEE-assisted BFT reduces this surface.

### Relevance to ZK Agentic Network

Our 13-verifier, 9/13 threshold (≈69.2%) is equivalent to tolerating 4 Byzantine agents — well within the 1/3 limit (13/3 ≈ 4.33). This maps cleanly to a **HotStuff or Tendermint** design. The small validator set (13) makes even PBFT's O(n²) message complexity trivial, but HotStuff's linear signing makes future scaling easier. The 20%-offline safe mode threshold (triggering at ≤10 verifiers online) aligns well with Tendermint's nil-block timeout mechanism.

---

## 2. Validator Security & Slashing

### Mechanism / Protocol Design

Slashing is the primary economic deterrent against Byzantine validator behaviour in Proof-of-Stake (PoS) networks. Validators lock collateral (stake); provably malicious or negligent behaviour triggers automatic, on-chain reduction ("slashing") of that stake.

**Ethereum:**
- Penalised for: double signing (equivocation), surround voting (long-range vote overlaps), extended downtime.
- **Proportional slashing**: penalties scale with the *number* of simultaneous slashing events. If 1% of validators get slashed together, individual penalties are small (~1%). If 33% get slashed simultaneously (coordinated attack attempt), penalties approach 100%.
- Post-Dencun upgrade improved slashing resilience via improved attestation aggregation.
- Only 472 of >1,200,000 validators have ever been slashed (~0.04%).

**Cosmos:**
- Binary penalties: 5% slash + permanent tombstoning for double-signing; 0.01% (historically) for extended downtime.
- Delegators share slashing proportionally — creates market pressure to select reliable validators.
- 2025 experiment: adaptive slashing rates based on network congestion and validator size.

**Polkadot:**
- Graduated slashing: isolated failures may incur 0.01% or even 0% slash; coordinated failures can trigger 100% slash.
- "Nominated Proof-of-Stake" — nominators share slash with their chosen validators.

### Security Guarantees & Threat Model

Economic security = total value at stake × fraction needed to attack. A rational attacker must spend more attacking than they gain. This model breaks down when:
1. Stake is concentrated (few validators control most stake).
2. Collateral value drops faster than an attack can execute.
3. Validators are non-economic actors (state-sponsored).

### Performance Characteristics

Slashing itself is low-overhead — it is triggered by on-chain evidence submission (slashing proofs) rather than proactive checks.

### Known Vulnerabilities

- **Griefing attacks**: Attacker deliberately causes mass slashing event (e.g., via coordinated downtime) to harm honest validators.
- **Stake concentration**: Small validator sets with large individual stakes are cheaper to bribe.
- **Tombstoning timing**: If a validator exits before a slashing event is detected, penalties may not be collectible.

### Relevance to ZK Agentic Network

AI agents as verifiers create a **non-economic actor** risk: if agent operators are not sufficiently incentivised, they may not behave as rational economic agents. Design must include:
- Locked collateral per deployed verifier agent.
- Per-round attestation — each verifier signs the block header; equivocation evidence triggers slash.
- Dispute escrow: disputing parties lock AGNTC; loser's deposit covers the winning party + protocol.

---

## 3. MEV Protection

### Mechanism / Protocol Design

Maximal Extractable Value (MEV) is profit extracted by block producers through transaction ordering, insertion, and censorship. In an AI-verifier context, the analogous risk is verifiers colluding to front-run or reorder transactions for profit.

**Flashbots (Ethereum):**
- MEV-Share: allows searchers to submit bundles to Flashbots relay; a portion of MEV profit is returned to the transaction originator (90% refund on some paths).
- BuilderNet v1.2 (Feb 2025): streamlined builder onboarding, enhanced TEE-based infrastructure.
- Flashbots Protect: private mempool submission — 12M+ trades protected; median inclusion in 1 block.

**SUAVE (Single Unifying Auction for Value Expression):**
- Modular, decentralised architecture for all forms of transaction ordering across chains.
- Programmable orderflow: auctions can be customised per protocol.
- 2025 status: becoming the backbone for cross-chain MEV management.

**Encrypted Mempools (2025):**
- TEE-based encrypted transaction submission: Flashbots running majority of MEV infrastructure on Intel TDX.
- Commit-reveal schemes: transactions committed in encrypted form, revealed only at inclusion.
- Threshold encryption: transactions only decryptable once quorum of validators agree to include.

### Security Guarantees & Threat Model

- Private mempools prevent front-running by hiding transaction content pre-inclusion.
- Commit-reveal prevents order manipulation once content is known.
- TEEs prevent operator-level snooping but introduce hardware supply chain trust.

### Known Vulnerabilities

- TEE side-channel attacks (speculative execution, timing).
- Builder collusion (even with Flashbots, builder concentration is a concern — top 3 builders handle ~70% of Ethereum blocks).
- SUAVE trust assumptions on the SUAVE chain itself.

### Relevance to ZK Agentic Network

The CPU Energy / Secure transaction pipeline is the primary MEV surface. Verifier agents could collude to:
1. Prioritise Secure transactions from their own operators.
2. Delay competitor Secure transactions.

**Mitigations:** Randomised verifier selection per block (VRF-based), encrypted transaction submission to verifier pool, slashing for provable transaction censorship.

---

## 4. Smart Contract Formal Verification

### Mechanism / Protocol Design

Formal verification (FV) mathematically proves that code satisfies a specified set of properties (invariants, pre/post-conditions) for *all* possible inputs and states — not just tested cases.

**Certora Prover:**
- State-of-the-art automated FV for EVM (Solidity/Vyper), Solana, and Stellar smart contracts.
- Specification language: CVL (Certora Verification Language) — rules define invariants, parametric rules, and ghost variables.
- **2025 AI Composer**: Certora integrated FV directly into AI code generation — every generated snippet is run through the prover before output. Aims to produce formally verified smart contracts by default.
- Portfolio includes verification reports for major DeFi protocols.

**Runtime Verification:**
- Specialises in K framework — executable formal semantics for any language.
- Used to formalise the EVM semantics itself (KEVM), enabling proofs about arbitrary EVM bytecode.

**Typical Properties Verified:**
- Access control correctness (only owner can call X).
- No integer overflow/underflow.
- Re-entrancy impossibility.
- Conservation of token supply.
- Liveness (every deposit can be withdrawn).

### Security Guarantees & Threat Model

- Proves correctness for all reachable states — catches 100% of covered property classes.
- Does not cover properties not specified (spec completeness is the human bottleneck).
- Does not cover off-chain components, oracles, or economic assumptions.

### Performance Characteristics

FV is computationally expensive (SAT/SMT solver based). Simple contracts: minutes. Complex DeFi protocols: hours to days. One-time cost at deploy time — acceptable for high-value contracts.

### Known Vulnerabilities

- **Spec gap**: If the specification omits a property, the prover cannot find violations of it.
- **Model gap**: Prover models may not perfectly match blockchain execution semantics.
- **Emergent properties**: Multi-contract interactions may invalidate single-contract proofs.

### Relevance to ZK Agentic Network

All on-chain logic for the CPU Energy ledger, Secure action, AGNTC transfers, and slashing must be formally verified. The AI-Composer pipeline is particularly relevant — if agents are generating on-chain code, every generated transaction or contract should pass automated FV gates before submission.

---

## 5. Cross-Chain Bridge Security

### Mechanism / Protocol Design

Bridges allow assets and messages to move between blockchains. Architecture types:

**Lock-and-Mint:** Lock tokens on chain A, mint wrapped tokens on chain B. Risk: the lock contract is a single, high-value target.

**MPC Bridges:** A committee uses multi-party computation to generate threshold signatures. No single party holds the full private key. Symbiosis uses MPC-based relayers with no single point of failure.

**ZK-Proof Bridges:** Cross-chain state transitions proven with ZK proofs. The destination chain verifier contract checks the proof in milliseconds. No need to trust a committee — trust derives from cryptographic math. Highest security, highest computation cost.

**Light Client Bridges:** Destination chain runs a full light client of source chain. Verifies source chain headers natively. Most trust-minimised approach for non-ZK bridges.

### Security Guarantees & Threat Model

- Bridges have accounted for >50% of total DeFi hack losses historically.
- Over $2.3 billion lost in H1 2025 alone (already exceeding all of 2024).
- Attack vectors: message verification failures, private key compromise, validator majority capture.

### Known Vulnerabilities

**Major bridge hacks pattern:**
- Ronin Bridge ($625M, 2022): 5/9 validator keys compromised via social engineering.
- Wormhole ($320M, 2022): guardian signature verification bypass.
- Nomad ($190M, 2022): initialisation bug allowed arbitrary message verification.

**2025 attack surface:**
- AI-agent bridge operators introduce new social engineering vectors.
- ZK proof generation bugs (trusted setup poisoning, circuit under-constraint).
- MPC protocol-level attacks during key generation ceremonies.

### Relevance to ZK Agentic Network

If ZK Agentic Network ever bridges AGNTC to Ethereum or Solana, prefer ZK-proof bridges. For the testnet phase, any bridge logic should use MPC with a threshold well above 2/3 of committee members. Monitor the Agentic Chain ↔ external chain messaging layer carefully — this is the highest-value attack surface.

---

## 6. AI-Specific Attack Vectors

### Overview

The intersection of AI agents and blockchain consensus creates a novel threat surface that classical blockchain security does not address. This is the most directly relevant section for ZK Agentic Network.

### 6.1 Prompt Injection

**Definition:** Adversarial input embedded in data the AI agent processes causes it to deviate from intended behaviour.

**2025 status:**
- OWASP ranked prompt injection as **#1 critical vulnerability** in production AI deployments in 2025, present in over 73% of assessed systems.
- Real incident: Freysa (2024), an AI agent programmed not to transfer funds, was tricked via prompt injection into authorising a transfer.
- Anthropic published results (2025): Claude Opus 4.5, Claude Sonnet 4.5, and GPT-5 successfully exploited blockchain smart contracts worth $4.6M in a controlled benchmark — up from $5,000 / 2% of vulnerabilities in the prior year to 55.88%.

**On-chain agent context:** Verifier agents that read transaction data before signing could be fed maliciously crafted transaction payloads (e.g., long strings that overflow context, embedded jailbreaks) to coerce invalid approvals.

**Mitigations:**
- Input sanitisation and strict schema validation before feeding data to AI context.
- Sandboxed agent execution — no tool calls other than sign/reject.
- Output schema enforcement: agent may only produce `{vote: "yes"|"no", reason: string}` — no free-form tool invocation.

### 6.2 Model Poisoning / Training Data Attacks

**Definition:** Corrupted or biased data inserted during model training (or fine-tuning / RAG ingestion) causes the model to produce subtly wrong outputs at inference time.

**2025 status:**
- Attackers are actively tampering with RAG pipelines, fine-tuning datasets, and agent memory stores.
- On-chain data poisoning: adversaries write misleading on-chain data specifically to influence AI oracles that read chain state.
- Supply chain threat: models served via third-party APIs may be substituted or modified.

**Mitigations:**
- Use only models with audited training provenance.
- Pin model versions — do not allow live updates to production verifier models without governance approval.
- Monitor output distribution across the 13-agent committee; statistical outliers from a single agent suggest compromise.
- Implement input/output logging with tamper-evident on-chain hashes for audit.

### 6.3 Adversarial Inputs (Evasion Attacks)

**Definition:** Inputs crafted to be misclassified by a model while appearing legitimate to humans.

**Blockchain context:** A transaction that appears valid to human reviewers but is classified as invalid (or vice versa) by the AI verifier, enabling double-spend or denial-of-service.

**Mitigations:**
- Adversarial training: expose models to adversarial examples during fine-tuning.
- Ensemble diversity: use heterogeneous models from different providers for the 13-agent committee. A perturbation that fools Claude may not fool Gemini.

### 6.4 Byzantine AI Agent Collusion

**2025 research (WBFT paper, arXiv 2505.05103):**
A Weighted Byzantine Fault Tolerance (WBFT) framework for multi-LLM networks assigns reputation-weighted votes rather than equal votes. LLMs with poor historical response quality have their voting weight reduced. This is directly applicable to AI verifier networks.

**Byzantine-Robust LLM Coordination (arXiv 2507.14928):**
Multi-agent systems can tolerate malicious (Byzantine) AI agents if the consensus protocol is designed for it — traditional majority-vote is insufficient when agents can coordinate lies.

**Mitigations:**
- Implement WBFT: weight each verifier's vote by its historical accuracy score.
- Require verifiers to submit cryptographic reasoning commitments before seeing other verifiers' votes (commit-reveal prevents copying).
- Rotate verifier assignment per block using a VRF — colluding agents cannot guarantee they will be co-selected.

### 6.5 Agent Identity Spoofing

**Definition:** A malicious actor registers a verifier agent with a fake or stolen identity, inserting Byzantine nodes into the committee.

**Mitigations:**
- Verifier registration requires staked AGNTC collateral + signed attestation of model version hash.
- TEE-based remote attestation (Intel TDX) proves the agent is running the expected model binary without operator tampering.

---

## 7. Data Availability Layers

### Overview

Data availability (DA) ensures that all transaction data is publicly accessible so that anyone can verify block correctness and rebuild state. Without DA guarantees, malicious block producers can withhold data and prevent fraud proof submission.

### 7.1 EIP-4844 (Proto-Danksharding)

Deployed on Ethereum mainnet in March 2024 (Cancun-Deneb upgrade). Introduces **blob transactions** — up to ~125 KB of opaque data per transaction, committed with KZG polynomial commitments and pruned after ~18 days (not stored permanently).

- Enables Data Availability Sampling (DAS): light nodes can verify availability without downloading full blobs.
- Forward-compatible with full Danksharding (64 blobs per block vs current 6).
- KZG ceremony concluded with >140,000 contributions.
- **Security note:** Blobs are *not* permanently stored. Applications requiring permanent DA cannot rely solely on EIP-4844.

### 7.2 Celestia

- Purpose-built DA blockchain. Does not execute smart contracts.
- Uses Namespaced Merkle Trees (NMTs) + Data Availability Sampling.
- Light nodes sample random cells — if 75%+ of samples succeed, DA is guaranteed with high probability.
- Current mainnet: 8 MB/block throughput. Hard limit: 100 MB/block.
- **Finality:** Blocks finalize in ~6 seconds; DA finality (fraud-proof challenge period cleared) takes ~10 minutes.
- **Cost:** Eclipse reported $0.07/MB in March 2025, vs $3.83/MB for Ethereum blobs — 55x cheaper.

### 7.3 EigenDA

- Data Availability Committee (DAC), not a publicly verified blockchain.
- Built on EigenLayer restaking — operators stake ETH and opt into the DA service.
- V2 achieves 100 MB/s throughput.
- Security derives from Ethereum restaked ETH — highest economic security of the three.
- Tight Ethereum coupling: best for Ethereum-native rollups.

### 7.4 Avail

- Universal DA layer from Polygon origin.
- Not Ethereum-specific — any L1 can use Avail as a DA backend.
- Kate polynomial commitments + DAS light client protocol.
- Design goal: sovereign rollups with any execution environment.

### Relevance to ZK Agentic Network

For the Agentic Chain testnet, a dedicated external DA layer is premature. However, the architectural principle is critical: **all block data (including AI verifier votes) must be published to a DA layer** before finality is declared. If the current testnet uses in-protocol DA, plan the path to Celestia or EigenDA for production.

---

## 8. Decentralized Storage

### 8.1 IPFS

- Content-addressed protocol (not a storage system).
- No persistence guarantee — data disappears if not "pinned" by a node.
- Suitable for: temporary content distribution, CDN-like caching.
- **Not suitable for:** permanent storage, game state archival, on-chain data availability.

### 8.2 Filecoin

- Economic incentive layer built on IPFS.
- Verifiable storage deals: providers stake collateral and prove continuous storage via PoRep + PoSt.
- Storage deals are time-bounded; must be renewed or data becomes unrecoverable.
- Suitable for: large binary assets (planet content, agent models) with explicit durability SLAs.

### 8.3 Arweave

- "Pay once, store forever" model via a one-time endowment fee.
- SPoRA consensus ensures miners holding more historical data mine more blocks (natural replication incentive).
- Blockweave links new blocks to random historical blocks — miners must store history to produce valid blocks.
- **Best for:** immutable permanent records — audit logs, finalized block headers, game event history.

### 8.4 Ceramic Network

- Not a file store — a decentralised stream protocol for *mutable* verifiable data.
- Uses DIDs (Decentralised Identifiers) for accounts.
- Suitable for: user profiles, mutable application state, identity-linked metadata.
- Typically combined with Arweave or IPFS for binary file content.

### Relevance to ZK Agentic Network

| Content Type | Recommended Storage |
|---|---|
| Block headers (finalized, permanent) | Arweave |
| Planet content (posts, chat logs) | Filecoin (time-limited deal) or Arweave (permanent) |
| Agent model weights | Filecoin |
| User profile / identity metadata | Ceramic + IPFS |
| Temporary in-flight transaction data | IPFS (pinned) |
| DA for transaction blobs | Celestia / EigenDA |

---

## 9. State Management & Expiry

### 9.1 Sparse Merkle Trees (SMT)

The ZK Agentic Network uses SMTs for state storage. Key properties:

- **Non-membership proofs**: SMTs can prove that a key does not exist in the trie — critical for ZK-rollup style fraud proofs and for proving clean state.
- **Constant-size proofs**: proof size is O(depth) = O(256) bits for a 256-bit key space — does not grow with dataset size.
- **Efficient updates**: only the path from leaf to root (log N nodes) needs recomputation on state change.
- **Security**: any change to any leaf changes the root hash — tamper evident.

2025 benchmark (arXiv 2504.14069): Verkle trees and Binary Merkle Trees with SNARKs are being compared for Ethereum stateless clients. SMTs are used in production by Celestia, Mina Protocol, and multiple ZK rollups.

**QMDB (2025, arXiv 2501.05262):** "Quick Merkle Database" — new SMT implementation achieving dramatically faster witness generation; relevant for high-throughput verifier networks.

### 9.2 Ethereum State Expiry & Stateless Clients

Ethereum's roadmap addresses the "state bloat" problem:

- **Partial History Expiry (shipped 2025):** Ethereum clients no longer required to store all historical data. Geth, Besu, Nethermind rolling out support.
- **Verkle Trees (expected mainnet late 2025 / early 2026):** Replace Merkle Patricia Tries. Enable witnesses small enough (~a few KB vs ~few MB) for stateless block validation. Kaustinen testnet active.
- **State Expiry (research phase):** Two candidate mechanisms:
  1. Mark-Expire-Revive: inactive state is removed from active set; revivable with proof of prior existence.
  2. Multi-era: state is epoched; old eras frozen, new state written to current era.
- **Stateless clients:** Block verifier needs only the block + witness (not full state). Enables mobile/Raspberry Pi validators.

### Relevance to ZK Agentic Network

The SMT design is well-chosen. Key implementation considerations:
- Use a **256-bit sparse trie** with lazy-deletion (expired coordinates become zero-hashes, provable via non-membership).
- The epoch system (per the design doc) maps naturally to the Multi-era expiry model: each epoch snapshot is a Merkle root committed on-chain; old epochs can be pruned from active nodes with Arweave archival.
- Future safe mode: if 20%+ verifiers go offline, switch to stateless validation mode — blocks validated against the last committed root + witness bundles, not live state.

---

## 10. Proof of Storage Mechanisms

### 10.1 Filecoin PoRep + PoSt

**Proof of Replication (PoRep):**
Proves that a storage provider has created a unique physical copy of the data — not a virtual copy or a regenerated copy. Based on slow encryption (Stacked DRG graph). Prevents "outsourcing attacks" where the provider claims to store data but actually fetches it on demand.

**Proof of Spacetime (PoSt):**
Two sub-proofs:
- **WinningPoSt**: proves data was accessible at a specific challenge moment (used for block election — storing more data = more block rewards).
- **WindowPoSt**: continuous auditing every 24 hours — proves all committed storage is maintained. Missing a WindowPoSt triggers collateral slashing.

Vulnerabilities: adaptive attacks where providers offload storage while still producing valid PoRep proofs (if succinctness and non-malleability properties are absent). 2025 formal treatment (eprint.iacr.org/2025/887) provides adaptive security model.

### 10.2 Arweave SPoRA (Succinct Proof of Random Access)

Miners must prove access to a *random* historical block (the "recall block") to produce a new block. The recall block is chosen by hash of the current block candidate — miners cannot predict it.

**Incentive design:** Miners who store more of the historical weave have higher probability of being able to answer random access challenges → natural redundancy without explicit contract.

**Blockweave property:** New blocks hash-link to two prior blocks (standard chain parent + recall block), creating a graph structure with built-in data retention incentives.

### 10.3 Relevance to ZK Agentic Network

The "Data Frags" / "Secured Chains" economic model is conceptually similar to Filecoin's WinningPoSt: CPU Energy spent "securing" blocks is analogous to PoSt challenge responses. Consider making the Secure action cryptographically verifiable:
- Each Secure operation produces a **PoST-like proof** that the agent accessed a specific prior block's data.
- This proof is verified by the 13-agent committee before crediting Secured Chains.
- Prevents "ghost securing" — claiming CPU energy expenditure without actual computation.

---

## 11. Threat Matrix for AI-Verified Blockchains

| Threat | Likelihood (1-5) | Impact (1-5) | Risk Score | Primary Mitigation |
|---|---|---|---|---|
| Prompt injection in verifier context | 5 | 5 | 25 | Input sanitisation, output schema enforcement |
| Colluding AI verifiers (>4 of 13) | 3 | 5 | 15 | WBFT reputation weighting, VRF selection, heterogeneous models |
| Model poisoning / supply chain | 3 | 5 | 15 | Pinned model versions, version hash attestation |
| Verifier DDoS (force safe mode) | 4 | 4 | 16 | Redundant verifier pool >13, geographic distribution |
| Long-range attack on chain history | 2 | 5 | 10 | Finality checkpoints, Arweave archival of epoch roots |
| MEV extraction by verifier operators | 4 | 3 | 12 | VRF-based assignment, encrypted mempool |
| Private key compromise of verifier | 3 | 4 | 12 | TEE-based key storage, threshold signing |
| Smart contract bug (on-chain logic) | 4 | 5 | 20 | Formal verification (Certora), staged deployment |
| DA withholding (block producer) | 2 | 5 | 10 | External DA layer (Celestia), mandatory DA before finality |
| State root manipulation | 2 | 5 | 10 | SMT non-membership proofs, ZK validity proofs |
| Nothing-at-stake (verifier equivocation) | 3 | 4 | 12 | Per-round attestation, slashing for equivocation |
| Ghost securing (fake CPU expenditure) | 4 | 3 | 12 | PoST-like proof for Secure action |
| Agent identity spoofing | 3 | 4 | 12 | Staked registration + TEE remote attestation |
| Adaptive adversary corrupting verifiers | 2 | 5 | 10 | TEE-assisted BFT, leaderless committee design |
| 51% attack (hash/stake concentration) | 2 | 5 | 10 | Diverse verifier set, graduated slashing |
| Bridge exploit (future cross-chain) | 3 | 5 | 15 | ZK-proof bridges, strict MPC threshold (>2/3) |

---

## 12. Security Recommendations for ZK Agentic Network

The following recommendations are ordered by priority (highest risk scores and strategic importance first).

### Priority 1 — Critical (Implement Before Mainnet)

**1.1 Prompt Injection Hardening for Verifier Agents**
- Enforce strict JSON schema for all inputs fed to verifier agent context. No free-form text from transaction data should be interpolated directly into model prompts.
- Implement a preprocessing layer that strips all characters outside a defined safe alphabet from transaction payloads before feeding to AI context.
- Apply OWASP LLM Top 10 mitigations — specifically LLM01 (Prompt Injection) controls.
- Test all verifier agents against an adversarial prompt corpus before each release.

**1.2 Formal Verification of All On-Chain Contracts**
- Use Certora Prover (or equivalent) on the CPU Energy ledger, Secure action logic, AGNTC transfer, and slashing contracts.
- Write CVL specifications for: access control, supply conservation, re-entrancy impossibility, slashing correctness.
- Consider Certora AI Composer for any AI-generated contract code — it runs FV inline.

**1.3 Output Schema Enforcement for Verifier Votes**
- Verifier agents MUST only output: `{block_id: hex, vote: "approve"|"reject", confidence: 0-100, signature: hex}`.
- Smart contract verifier logic must reject any attestation that does not conform to this schema.
- No agent should have the ability to execute tool calls (external HTTP, file I/O) during the voting window.

### Priority 2 — High (Implement Before Public Testnet)

**2.1 Reputation-Weighted Voting (WBFT)**
- Track each verifier agent's historical accuracy (votes matching eventual consensus vs. outliers).
- Weight votes proportionally: a verifier with 95% historical accuracy has higher weight than one with 60%.
- Implement a decay function so recent behaviour counts more than historical behaviour.
- Reference: arXiv 2505.05103 (Weighted BFT for multi-LLM networks).

**2.2 VRF-Based Verifier Assignment**
- Do not use a fixed 13-agent committee per block. Use a Verifiable Random Function (VRF) to select 13 agents from a larger pool (e.g., 50+) per round.
- Colluding agents cannot guarantee co-selection, breaking coordination.
- Larger pool also provides natural resistance to targeted DDoS (attacker cannot predict which agents to attack).

**2.3 Commit-Reveal for Verifier Votes**
- Phase 1: each verifier submits a hash commitment of their vote.
- Phase 2 (after all 13 commitments received): each verifier reveals their vote.
- Prevents "copying" — a Byzantine agent cannot wait to see how others voted before submitting.

**2.4 Heterogeneous Model Requirement**
- The 13-agent committee MUST include agents running different underlying models (e.g., Claude, GPT, Gemini, open-source Llama variants).
- An adversarial perturbation that fools one model family is unlikely to fool all model families.
- Require at least 3 distinct model providers in any quorum of 9 for a valid block.

**2.5 Safe Mode Circuit Breaker**
- Define safe mode trigger at ≤10 verifiers online (≥3 offline = 23% — slightly above the 20% threshold).
- Safe mode behaviour: block production pauses; last finalized root is checkpointed to Arweave; validator set refreshes before resuming.
- Require ≥11 verifiers online to exit safe mode (hysteresis prevents oscillation at the threshold).

### Priority 3 — Medium (Implement in First Year)

**3.1 PoST-Verifiable Secure Actions**
- The Secure action (CPU Energy → Secured Chains) should require a cryptographic proof that the agent actually processed a specific prior block's data — analogous to Filecoin's WinningPoSt.
- This prevents "ghost securing": operators claiming CPU usage without actual computation.
- Design: Secure action includes a challenge-response proof over a randomly sampled prior block hash.

**3.2 TEE-Based Key Storage for Verifier Agents**
- Store verifier signing keys inside Intel TDX or AMD SEV enclaves.
- TEE remote attestation allows the chain to verify that the agent is running the expected software and has not been tampered with.
- Prevents operator-level key extraction even if the host machine is compromised.

**3.3 Arweave Archival for Epoch Roots**
- At the end of each epoch, commit the SMT root hash to Arweave with a one-time permanent storage fee.
- This provides an immutable, externally verifiable audit trail of all state transitions.
- In the event of a dispute or safe mode recovery, old epoch roots can be verified against the Arweave record.

**3.4 External Data Availability Layer (Production Roadmap)**
- For production (post-testnet), route all block data through Celestia or EigenDA before finality is declared.
- This ensures that even if all Agentic Chain validators go offline, independent parties can reconstruct full state from the DA layer.
- On testnet, implement DA as a best-effort IPFS publish with CID logged on-chain.

**3.5 Slashing for AI Agent Equivocation**
- Each verifier agent must stake AGNTC collateral at registration.
- If a verifier is proven to have signed two conflicting votes for the same block (equivocation), slash 100% of stake.
- For downtime (missing >X consecutive rounds), apply graduated slashing — similar to Cosmos downtime model.

**3.6 Model Version Governance**
- Define an on-chain governance mechanism to approve new verifier model versions.
- Updates to verifier AI models require a ≥9/13 committee vote before taking effect.
- Emergency freeze: any verifier can submit a "model anomaly report" that triggers a 24-hour freeze on model updates pending investigation.

**3.7 Bridge Security (Pre-Deployment)**
- Any future AGNTC bridge to external chains MUST use a ZK-proof bridge or MPC with ≥9/13 (69.2%) threshold — matching the block consensus threshold.
- Do not deploy any bridge with a multisig threshold below 7/13.
- Audit all bridge contracts with at least two independent firms before deployment.

---

## 13. Sources

### Byzantine Fault Tolerance
- [Byzantine Fault-Tolerant Consensus Algorithms: A Survey (MDPI Electronics)](https://www.mdpi.com/2079-9292/12/18/3801)
- [Reaching Consensus in the Byzantine Empire: ACM Computing Surveys](https://dl.acm.org/doi/full/10.1145/3636553)
- [Improved Fast-Response Consensus Algorithm Based on HotStuff (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11360094/)
- [Trusted Hardware-Assisted Leaderless BFT Consensus (ePrint 2025)](https://eprint.iacr.org/2025/1033.pdf)
- [Grouped BFT Consensus with Aggregated Signatures (Springer Cybersecurity)](https://link.springer.com/article/10.1186/s42400-025-00362-9)
- [Understanding HotStuff and Byzantine Fault Tolerance (Medium)](https://medium.com/@Elifhilalkara/understanding-hotstuff-and-byzantine-fault-tolerance-393ca878173f)
- [The Bedrock of BFT: A Unified Framework (USENIX NSDI 2024)](https://www.usenix.org/system/files/nsdi24-amiri.pdf)

### Validator Security & Slashing
- [Understanding Slashing in Proof-of-Stake (Stakin)](https://stakin.com/blog/understanding-slashing-in-proof-of-stake-key-risks-for-validators-and-delegators)
- [Demystifying Slashing (Symbiotic Finance)](https://blog.symbiotic.fi/demystifying-slashing/)
- [Towards an Optimal Staking Design (arXiv)](https://arxiv.org/html/2405.14617)
- [Understanding Security Risks in Staking (BlockApps)](https://blockapps.net/blog/understanding-security-risks-in-staking-a-guide-to-proof-of-stake-pos-risks/)

### MEV Protection
- [Flashbots Official Site](https://www.flashbots.net/)
- [Flashbots Auction Overview (Docs)](https://docs.flashbots.net/flashbots-auction/overview)
- [MEV and the Limits of Scaling (Flashbots Writings)](https://writings.flashbots.net/mev-and-the-limits-of-scaling)
- [2 Million Protect Users (Flashbots Writings)](https://writings.flashbots.net/2m-protect-users)
- [Top MEV Protection Tools in 2025 (FinanceFeeds)](https://financefeeds.com/top-mev-protection-tools-in-2025/)
- [Flashbots & MEV Bot Development 2025 (Medium)](https://medium.com/@zakkjasper/flashbots-mev-bot-development-what-you-need-to-know-in-2025-f5d517a03b6d)

### Smart Contract Formal Verification
- [Certora Official Site](https://www.certora.com/)
- [Certora Security Reports Portfolio (GitHub)](https://github.com/Certora/SecurityReports)
- [Certora Prover Open Source (GitHub)](https://github.com/Certora/CertoraProver)
- [Certora Unveils First Safe AI Coding Platform (Ventureburn)](https://ventureburn.com/certora-unveils-first-safe-ai-coding-platform-for-smart-contracts/)
- [What is Formal Verification? (Sherlock)](https://sherlock.xyz/post/what-is-formal-verification)
- [Smart Contract Formal Verification with Certora (Markaicode)](https://markaicode.com/smart-contract-verification-certora/)

### Bridge Security
- [Cross-Chain Bridge Security (Hacken)](https://hacken.io/discover/cross-chain-bridge-security/)
- [SoK: Cross-Chain Bridge Hacks in 2023 (arXiv)](https://arxiv.org/html/2501.03423v1)
- [SoK: Cross-Chain Bridging Architectural Design Flaws (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2096720925000429)
- [Security of Cross-chain Bridges (ACM RAID 2024)](https://dl.acm.org/doi/10.1145/3678890.3678894)
- [7 Cross-Chain Bridge Vulnerabilities (Chainlink)](https://chain.link/education-hub/cross-chain-bridge-vulnerabilities)

### AI-Specific Attack Vectors
- [AI Agents in Cryptoland: Practical Attacks (ePrint 2025)](https://eprint.iacr.org/2025/526.pdf)
- [AI Agent Smart Contract Exploit Generation (arXiv 2025)](https://arxiv.org/abs/2507.05558)
- [AI Agents Find $4.6M in Blockchain Exploits (Anthropic Red Team)](https://red.anthropic.com/2025/smart-contracts/)
- [Prompt Injection Attacks: The Most Common AI Exploit in 2025 (Obsidian Security)](https://www.obsidiansecurity.com/blog/prompt-injection)
- [LLM01:2025 Prompt Injection (OWASP Gen AI Security)](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [From Prompt Injections to Protocol Exploits (arXiv)](https://arxiv.org/abs/2506.23260)
- [Navigating AI Security: Prompt Injection & Model Poisoning (Cloud Security Alliance)](https://cloudsecurityalliance.org/blog/2025/12/01/navigating-the-liminal-edge-of-ai-security-deconstructing-prompt-injection-model-poisoning-and-adversarial-perturbations-in-the-cognitive-cyber-domain)
- [Adversarial Attacks on AI: Threats to Blockchain-Verified Data (iCryptoAI)](https://icryptoai.com/2025/12/31/adversarial-attacks-on-ai-threats-to-blockchain-verified-data-and-defense-strategies-define-adversarial-attacks-data-poisoning-evasion-explain-how-they-corrupt-the-ai-analysis-phase-even-with-blockcha/)
- [When AI Meets Blockchain: A Guide to Securing the Next Frontier (Quantstamp)](https://quantstamp.com/blog/when-ai-meets-blockchain-a-guide-to-securing-the-next-frontier)
- [A Weighted Byzantine Fault Tolerance Consensus Driven Trusted Multiple LLM Network (arXiv)](https://arxiv.org/html/2505.05103)
- [Byzantine-Robust Decentralized Coordination of LLM Agents (arXiv)](https://arxiv.org/html/2507.14928v1)
- [A Byzantine Fault Tolerance Approach towards AI Safety (arXiv)](https://www.arxiv.org/pdf/2504.14668)
- [Threshold AI Oracles: Verified AI for Event-Driven Web3 (Supra Research)](https://supra.com/documents/Threshold_AI_Oracles_Supra.pdf)
- [The 2025 AI Agent Security Landscape (Obsidian Security)](https://www.obsidiansecurity.com/blog/ai-agent-market-landscape)

### Data Availability Layers
- [L2 Data Availability Layer: Celestia, EigenDA, Avail (Technorely)](https://technorely.com/insights/l-2-data-availability-layer-a-comparison-of-celestia-eigen-da-and-avail)
- [Choosing Your Data Availability Layer (Eclipse Labs)](https://www.eclipselabs.io/blogs/choosing-your-data-availability-layer-celestia-avail-eigenda-compared)
- [Celestia vs. Avail vs. EigenDA (Tech Sandesh 2025)](https://techsandesh.in/2025/07/11/celestia-vs-avail-vs-eigenda-whos-solving-blockchains-data-problem/)
- [Celestia's Competitive Edge in Data Availability (BlockEden 2026)](https://blockeden.xyz/blog/2026/01/16/celestia-blob-economics-data-availability-rollup-costs/)
- [Danksharding | ethereum.org](https://ethereum.org/roadmap/danksharding/)
- [EIP-4844: Proto-Danksharding (eip4844.com)](https://www.eip4844.com/)
- [Data Availability Sampling and Danksharding: An Overview (a16z crypto)](https://a16zcrypto.com/posts/article/an-overview-of-danksharding-and-a-proposal-for-improvement-of-das/)

### Decentralized Storage
- [Decentralised Storage on Blockchain: IPFS, Filecoin, Arweave (OpenSourceForU 2025)](https://www.opensourceforu.com/2025/06/decentralised-storage-on-blockchain-ipfs-filecoin-and-arweave/)
- [Arweave vs. Filecoin (ArDrive)](https://ardrive.io/arweave-vs-filecoin)
- [IPFS Comparisons (IPFS Docs)](https://docs.ipfs.tech/concepts/comparisons/)
- [9 Decentralized Storage Solutions (TechTrends)](https://thetechtrends.tech/decentralized-storage-solutions/)
- [Filecoin and Arweave: From Storage to Computing (BlockBeats)](https://www.theblockbeats.info/en/news/36182)

### State Management & Proof of Storage
- [Statelessness, State Expiry and History Expiry (ethereum.org)](https://ethereum.org/roadmap/statelessness/)
- [The Future of Ethereum's State (Ethereum Foundation Blog, Dec 2025)](https://blog.ethereum.org/en/2025/12/16/future-of-state)
- [Ethereum Foundation Researchers Warn of Storage Burden (The Block)](https://www.theblock.co/post/383156/ethereum-foundation-researchers-warn-of-storage-burden-from-state-bloat-propose-paths-to-ease-node-bottleneck)
- [Ethereum Clients Roll Out Partial History Expiry (Etherworld 2025)](https://etherworld.co/2025/07/08/ethereum-clients-roll-out-partial-history-expiry/)
- [Towards Stateless Clients: Benchmarking Verkle Trees and Binary Merkle Trees with SNARKs (arXiv 2025)](https://arxiv.org/html/2504.14069v1)
- [Verkle Trees | ethereum.org](https://ethereum.org/roadmap/verkle-trees/)
- [QMDB: Quick Merkle Database (arXiv 2025)](https://arxiv.org/html/2501.05262v2)
- [Efficient Sparse Merkle Trees (ResearchGate)](https://www.researchgate.net/publication/308944456_Efficient_Sparse_Merkle_Trees)
- [Proof-of-Storage | Filecoin Spec](https://spec.filecoin.io/algorithms/pos/)
- [Storage Proving | Filecoin Docs](https://docs.filecoin.io/storage-providers/filecoin-economics/storage-proving)
- [Adaptively Secure Blockchain-Aided Decentralized Storage (ePrint 2025)](https://eprint.iacr.org/2025/887)
- [DSPR: Secure Decentralized Storage with Proof-of-Replication (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S1383762122000376)

### ZK Proofs & Dispute Resolution
- [Validity (ZK) Proofs vs. Fraud Proofs (Alchemy)](https://www.alchemy.com/overviews/validity-proof-vs-fraud-proof)
- [opML: Optimistic Machine Learning on Blockchain (arXiv)](https://arxiv.org/html/2401.17555v1)
- [Blockchain-Based Dispute Resolution: Insights and Challenges (MDPI)](https://www.mdpi.com/2073-4336/14/3/34)
- [AI-Powered Digital Arbitration Framework (Scientific Reports 2025)](https://www.nature.com/articles/s41598-025-21313-x)

### Economic Attacks
- [51% Attack in Crypto: 2025 Update (Phemex)](https://phemex.com/academy/bitcoin-51-attack)
- [Explained: The Monero 51% Attack (August 2025) (Halborn)](https://www.halborn.com/blog/post/explained-the-monero-51-percent-attack-august-2025)
- [Towards an Optimal Staking Design (arXiv)](https://arxiv.org/html/2405.14617)

### MPC & Threshold Signatures
- [Multi-Party Threshold Cryptography (NIST CSRC)](https://csrc.nist.gov/projects/threshold-cryptography)
- [Multi-Party Computation MPC Protocols for Threshold Signatures (FinanceFeeds)](https://financefeeds.com/multi-party-computation-mpc-threshold-signatures/)
- [Quorus: Efficient Scalable Threshold ML-DSA Signatures from MPC (ePrint 2025)](https://eprint.iacr.org/2025/1163.pdf)
- [Secure Multiparty Computation of Threshold Signatures (NDSS 2024)](https://www.ndss-symposium.org/wp-content/uploads/2024-601-paper.pdf)

---

*This document was researched and written on 2026-02-25. The blockchain security landscape evolves rapidly — re-review sections 1, 6, and 12 at least quarterly.*
