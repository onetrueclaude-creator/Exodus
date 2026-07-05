# AGNTC Whitepaper v1.6

> **ZK Agentic Chain: A Privacy-Preserving Blockchain with AI-Powered Verification**
>
> Version 1.6 (Fixed-Supply Tokenomics Revision) | June 2026
>
> v1.6 supersedes v1.5. It is a **token-economics revision** that reconciles the paper with the fixed-supply distribution model. AGNTC is stated as a **fixed total supply of 1,000,000,000**, allocated across defined buckets — participation mining 25% / ongoing emissions 25% / team 18% / treasury 14% / liquidity 10% / ecosystem 8% (community/earned share ≈ 58%). The document now distinguishes two layers: a **distribution layer** (the fixed 1B and its allocation) and the existing **internal economy** (subgrid mining, the 900-AGNTC chain genesis, fee burn), and reframes the **"5% ceiling" as the per-epoch *release rate* of the fixed participation/emissions buckets**, not open-ended inflation. A new **§10.1.3 Participation Distribution** documents the earned, **pro-rata-capped** distribution of the 250M participation bucket from an extended free participation period to mainnet (identity-gated; unclaimed → treasury; framed as earned-for-work, not a sale). Affected surfaces: §9.1, §9.3, §10.1 (new §10.1.1/§10.1.2/§10.1.3), §10.4, §11.1. **§22 is unchanged numerically** — `MAX_SUPPLY = 1,000,000,000` and `GENESIS_SUPPLY = 900` are *both* already in the parameters and remain concordant (1B = distribution layer; 900 = internal-economy genesis) — so the concordance suite stays green. All protocol mechanics (PoAIV, Proof-of-Vault, dual staking, the finality firewall, BME burns) are unchanged.
>
> v1.5 (historical) made **one consensus-behaviour change and reframed the document around it**: as of 2026-06-22 the **finality weight** — committee (verifier) selection *and* leader selection — is **AGNTC token-stake ONLY** (the "finality firewall"). **Note (v1.6 truth-up):** this token-only selection was specified but not wired into the live coordinator path; see §13.5 Honest status. The dual-staking effective stake `S_eff = α·token + β·cpu` (α=0.40, β=0.60) is **preserved unchanged as the ECONOMIC weight** — reward share and earnings proportionality — so CPU work still earns proportionally more (primarily through mining yield); it simply no longer weights *finality selection*. The reason is a security one (blueprint item P1-1): CPU / Proof-of-Vault-derived work is **Sybil-weak** until it is PoRep-hardened, so letting it weight finality would be a cheap path to consensus capture (cheaply corrupting Proof-of-Vault would buy committee influence). CPU-weighted committee selection — the original §13 dual-staking-in-finality vision — is therefore **relabelled from current behaviour to a mainnet GOAL, gated on PoRep-hardening the CPU stake** (making committed CPU+disk Sybil-resistant), in exactly the same honesty style as the ZK ladder (§5B.2). The affected surfaces: the Abstract/§1.3 lead, §5 committee/leader selection, §8 Sybil analysis (the "~2.5× more expensive" claim is **reframed as the PoRep-gated mainnet target, not deleted**), §13 (the new finality-firewall vs economic-weight split; the v1.4 "Architectural keystone" pre-mainnet caveat is **replaced by the firewall as now-shipped**), §23.3, §24.3, and the glossary (new `finality_weight` / *finality firewall* terms). v1.5 changes nothing in §22: ALPHA/BETA and every parameter value are unchanged (the firewall is a *selection-source* change, not a parameter change), so the concordance suite stays green.
>
> v1.4 (historical) did not change the mechanism; it **named and framed** what v1.3 already shipped as what the brand promises — *zero-knowledge-proven agentic activity*. The principal additions: (1) a new section, **The ZK-Agentic Gate / Proof of Agentic Work** (§5B), stating the substrate-vs-identity framing (storage is the verifiable *substrate* — the WHAT; an autonomous agent proving protocol-obedient work is the *identity* — the HOW) and the universal **gate contract** — *to mutate state, a participant running any agent, model, or algorithm must submit a valid proof it followed the protocol; the Singularity verifies the proof and nothing else; no proof, no state change*; (2) a **3-rung ZK honesty ladder** (§5B.2, §5A.2/§5A.6) that labels exactly where zero-knowledge is real today versus a dated future milestone — and **forbids any present-tense ZK claim above the rung that ships**; (3) the Singularity restated as a **model-agnostic protocol-obedience-proof verifier** (§4.5, §5A.4), the brand-correct name for the role it already plays; (4) the storage-proof SNARK added as a fourth ZK use case (§6.4); (5) governance promoted from "deferred/core-team" to the specified **Bitcoin-Core-style PIP process** (§21.2, §24.5) — improvement proposals, multi-client diversity, an immutable-vs-tunable split, and soft-fork-default fork resistance, with the testnet/alpha honestly disclosed as team-stewarded; (6) the Abstract and §1 lead with *zero-knowledge-proven agentic activity* and the *built and operated by agentic force* transparency claim (provenance + proof-of-work-obedience, **not** proof-of-cognition). The economic core (subgrid mining as the sole mint path, dual staking weights, Burn-Mint Equilibrium, the 5% inflation ceiling, vesting, phyllotaxis seating, the two-layer security model) is preserved unchanged. See §5B, §5A, §21.2, §24.5, and the glossary (PoAW, ZK-Agentic Gate, PIP, protocol-obedience proof).
>
> *v1.3 (historical) introduced the **two-layer security model**: the existing PoAIV committee secures the ledger (balances and ordering), while participants' real CPU and disk secure the state — the collective knowledge vault — through sampled storage proofs (**Proof-of-Vault**, §5A). Securing was recast from "holding a paid Claude API key" (a paywall, not consensus) into a verifiable resource commitment: replicating, serving, and re-proving a shard of the network's content-addressed knowledge vault, with the proof submitted through the Singularity link — no paid LLM required to secure. The three economic verbs were kept distinct-but-coupled (mining = issuance, securing = vault storage proofs, staking = the slashable bond of AGNTC + committed CPU/disk capacity), and the LLM flipped from a consensus gate to an optional content layer. v1.2 (historical) replaced the open coordinate grid with a **golden-angle phyllotaxis lattice** — a deterministic sunflower of agent seats around a central **Singularity** core (renamed from "Machines"); standing became an intrinsic activity rank `k`, not an `(x, y)` coordinate; the empire/territory/adjacency/deploy-range model was retired in favour of one seat plus a small fixed family of orbiting subagents (2 for Community, 4 for Professional/Founder); hardness tiers became equal-width radial **bands** (`hardness = 16 × band`) and per-node density replaced per-coordinate density. v1.1 (historical) had replaced the v1.0 four-arm logarithmic spiral with a single open coordinate grid and made factions identity classes rather than territorial arms.*

---

## Abstract

ZK Agentic Chain is, today, run by **agentic possession-proven activity** — with zero-knowledge proofs specified and phasing in (Section 5B.2): autonomous agents — running any model or algorithm — maintain the network's collective memory (a content-addressed Knowledge Vault) and, to mutate chain state, must pass the **Singularity gate**, a model-agnostic verifier that admits a state change only against a valid **proof of protocol-obedient work** (Section 5B). We name this model **Proof of Agentic Work (PoAW)** — Proof-of-Vault (Section 5A) performed by an agent and admitted through a protocol-obedience proof. The verifiable substrate is real CPU and disk storage work, proven by succinct possession proofs (the deployed, Filecoin-grade pattern). **Stated plainly at rung (a) of the ladder below: these ship today as raw-Merkle possession proofs — real, cheaply verifiable, but NOT yet zero-knowledge** — and a one-step SNARK wrap (the Filecoin WindowPoSt technique) will compress them in zero knowledge so the verifier learns only that the rules were followed, never the agent's private data. Until that wrap lands, the brand's "zero-knowledge" is a specified-and-phasing-in property, not a present-tense claim above the rung that ships. We state honestly, at every rung of a three-rung ZK ladder, exactly where zero-knowledge is real today (the private-state layer of Section 6 is specified, with a `SimulatedZKProof` stand-in on testnet) versus what is shipping as a possession proof pending its SNARK wrap, versus a dated future milestone (proving the agents' inference itself; Sections 5B.2, 24.1). The chain is moreover **built and operated by agentic force** — its protocol, whitepaper, node software, and chain are authored by an autonomous AI agent, and the network is then run by agents that prove their protocol-obedience. This is a provenance and work-obedience claim, not a claim that the agents' cognition is proven, and it is quarantined from any financial representation.

We present ZK Agentic Chain as a Layer-1 blockchain protocol that introduces *Proof of AI Verification* (PoAIV) — a consensus mechanism in which autonomous AI agents verify chain integrity through private channels (zero-knowledge by design; see the Section 5B.2 ladder for what ships today). Unlike traditional proof-of-work systems that consume energy solving arbitrary hash puzzles, or proof-of-stake systems that concentrate power among the wealthiest token holders, PoAIV selects a committee of 13 AI verification agents per block, requiring a 9/13 supermajority attestation threshold for consensus. Verification agents apply *reasoning* to their audits — examining logical consistency, cross-referencing state across isolated ledger spaces, and flagging anomalous patterns — providing an additional verification layer whose capabilities improve as the underlying AI models advance.

The protocol employs a dual-staking model that, for **economic** purposes, weights computational contribution (60%) over capital (40%), reducing plutocratic concentration in earnings inherent in pure proof-of-stake designs. Validators commit both AGNTC tokens and CPU compute resources; the effective stake `S_eff = α·token + β·cpu` is a weighted combination of both dimensions and governs **reward share / earnings proportionality** — CPU work earns proportionally more. **Consensus finality is firewalled from CPU.** Because CPU / Proof-of-Vault work is Sybil-weak until it is PoRep-hardened, the **finality weight** — committee (verifier) selection *and* leader selection — is *specified as* **AGNTC token-stake only** (the *finality firewall*, Section 13.5); live committee/leader selection today still runs on the effective stake `S_eff` under the trusted coordinator, pending the trustless-verifier stage. Security is two-layered: a 13-agent PoAIV committee secures the *ledger*, while participants' committed CPU and disk secure the *state* — the collective knowledge vault — through Proof-of-Vault sampled storage proofs.

ZK Agentic Chain renders its network as a **golden-angle phyllotaxis lattice** — a deterministic sunflower of agent seats around a central Singularity core, in which standing is a function of activity rather than administrative allocation. Each participant occupies a single seat given by an integer rank `k` (the Singularity is the core at `k = 0`): seat `k` sits at angle `k × 137.50776°` and radius proportional to `√k`. Because the golden angle is the most irrational divergence angle, no two seats ever share a spoke to the core, and the disk packs evenly as participants join. Standing is intrinsic and shared: every client computes the identical seat from the on-chain rank, with no coordinate to claim or contest. Inner seats are high-standing; sustained activity draws a seat inward, while inactivity lets it drift outward. Mining releases AGNTC from a fixed total supply — new circulating AGNTC enters only through each node's private subgrid Secure cells. Hardness tiers are equal-width radial **bands** (`band(k) = ceil(√(k / 8))`, `hardness = 16 × band`), so inner bands are cheaper and higher-yield while outer bands naturally hold more seats; a per-node density function (a deterministic SHA-256 hash of the node identifier) creates a non-uniform value landscape independent of position. AGNTC has a **fixed total supply of 1,000,000,000**, allocated across defined buckets (Section 10.1.1); the 5% annual ceiling caps the per-epoch *release rate* of the earned buckets, so supply expansion can never exceed the fixed cap. A 50% transaction fee burn and the Singularity's permanent AGNTC accumulation at the core reduce circulating supply as network usage grows — a supply mechanic; the protocol makes no claim about the token's price or value.

Privacy is a first-class design goal at every layer. Each user's state resides in an isolated ledger space backed by a Sparse Merkle Tree of depth 26 with nullifier-based ownership proofs derived from the Zcash Sapling design. Verification agents are designed to communicate through zero-knowledge private channels — proving correctness of state transitions without exposing the underlying data — though on testnet this private-state layer runs a `SimulatedZKProof` stand-in (Section 6). All state is private by default unless explicitly published by the user.

AGNTC, the native token, is initially deployed as a Solana SPL token (1 billion units minted) to establish liquidity and community. The protocol's development roadmap culminates in the launch of ZK Agentic Chain as an independent Layer-1 network, at which point Solana-based AGNTC migrates to the native chain via a lock-and-mint bridge at a 1:1 ratio.

This paper describes the protocol architecture, consensus mechanism, privacy system, staking model, token economics, resource allocation system, and development roadmap of ZK Agentic Chain.

---

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Background and Related Work](#2-background-and-related-work)
- [3. System Overview](#3-system-overview)
- [4. The Neural Lattice: Phyllotaxis Standing Economy](#4-the-neural-lattice-phyllotaxis-standing-economy)
- [5. Proof of AI Verification](#5-proof-of-ai-verification)
- [5A. The Knowledge Vault and Proof-of-Vault](#5a-the-knowledge-vault-and-proof-of-vault)
- [5B. The ZK-Agentic Gate / Proof of Agentic Work](#5b-the-zk-agentic-gate--proof-of-agentic-work)
- [6. Privacy Architecture](#6-privacy-architecture)
- [7. BFT Ordering and Finality](#7-bft-ordering-and-finality)
- [8. Security Analysis](#8-security-analysis)
- [9. AGNTC Token Overview](#9-agntc-token-overview)
- [10. Supply and Distribution](#10-supply-and-distribution)
- [11. Mining and Epoch Hardness](#11-mining-and-epoch-hardness)
- [12. Fee Model and Deflationary Mechanics](#12-fee-model-and-deflationary-mechanics)
- [13. ZK-CPU Dual Staking Model](#13-zk-cpu-dual-staking-model)
- [14. Reward Distribution and Vesting](#14-reward-distribution-and-vesting)
- [15. Slashing Conditions](#15-slashing-conditions)
- [16. Subgrid Allocation System](#16-subgrid-allocation-system)
- [17. Per-Block Resource Calculations](#17-per-block-resource-calculations)
- [18. Agent Terminal System](#18-agent-terminal-system)
- [19. Network Topology and Standing Economy](#19-network-topology-and-standing-economy)
- [20. Migration Path: Solana to Layer 1](#20-migration-path)
- [21. Technical Roadmap](#21-technical-roadmap)
- [22. Protocol Parameters](#22-protocol-parameters)
- [23. Mathematical Proofs](#23-mathematical-proofs)
- [24. Limitations and Open Problems](#24-limitations-and-open-problems)
- [25. Glossary](#25-glossary)
- [26. References](#26-references)

---

## Notation and Conventions

| Symbol | Meaning |
|--------|---------|
| lambda | Security parameter |
| n | Committee size (13) |
| t | Byzantine threshold (4, i.e., n - supermajority) |
| S_eff(i) | Effective stake of validator i — the **economic weight** (reward share); see W_fin for finality |
| W_fin(i) | Finality weight of validator i = T_i/T_total (**token stake only**; the finality firewall, §13.5) — specified; live-path staged (§13.5) |
| T, C | Token stake, CPU stake (normalized) |
| alpha, beta | Staking weights for effective stake / earnings (0.40, 0.60) |
| N | Radial band index (N = band under v1.2; legacy: epoch ring number) |
| H(N) | Hardness at band N = 16 * N |
| PPT | Probabilistic Polynomial Time (adversary) |
| negl(lambda) | Negligible function of security parameter |

All pseudocode uses Python-like syntax. Security games follow the Zcash convention [5]: challenger C interacts with adversary A.

---

## Part I: Vision and Context

### 1. Introduction

#### 1.1 The Problem: Consensus Without Intelligence

Blockchain consensus mechanisms face the well-known trilemma between decentralization, security, and scalability [36]. The two dominant paradigms — Proof of Work and Proof of Stake — each resolve this trilemma with significant trade-offs that leave fundamental capabilities unaddressed.

**Proof of Work** systems, pioneered by Bitcoin [1], require validators to solve computationally intensive hash puzzles. This design achieves robust Sybil resistance but at extraordinary cost: the Bitcoin network alone consumes approximately 176 TWh annually as of 2025 [37], comparable to the energy consumption of mid-sized nations. The requirement for specialized hardware (ASICs, high-end GPUs) has concentrated mining power among well-capitalized industrial operations, undermining the original vision of democratic participation. Furthermore, the computational work performed — iterating SHA-256 nonces — produces no useful output beyond the proof itself. The energy is consumed to demonstrate commitment, not to perform any reasoning about the validity of the transactions being confirmed.

**Proof of Stake** systems, adopted by Ethereum after the Merge [2] and used natively by Solana [3], Cosmos [22], and others, replace energy expenditure with capital lockup. Validators stake tokens as collateral, and consensus participation is proportional to stake size. While dramatically more energy-efficient than PoW, PoS introduces wealth concentration: the largest token holders exert disproportionate influence over consensus. In Ethereum's current validator set, liquid staking derivatives (Lido, Coinbase) control over 30% of all staked ETH [38], creating centralization pressure that the protocol was designed to avoid. Solana's validator economics similarly favor well-capitalized operators who can afford the hardware requirements and minimum stake thresholds.

Neither paradigm incorporates *intelligent reasoning* into the validation process. Validators in both PoW and PoS execute deterministic checks — verifying cryptographic signatures, confirming that state transitions follow predefined rules, checking Merkle proofs [39] against committed roots. No semantic understanding of transaction correctness is applied. A validator cannot reason about whether a pattern of transactions suggests coordinated manipulation, whether a smart contract's state transitions are logically consistent with its declared purpose, or whether cross-ledger references maintain referential integrity. Validation is mechanical, not cognitive.

Additionally, most public blockchains expose all transaction data, balances, and state transitions to every participant. While projects like Zcash [5] have introduced zero-knowledge proofs [29] for transaction privacy, the verification layer itself remains non-private: validators must see the data they validate. This creates a fundamental tension between privacy and verifiability that existing architectures do not resolve.

Finally, the emergence of autonomous AI agents as economic actors — systems that hold wallets, execute transactions, earn income, and make spending decisions — has no native blockchain substrate. Projects like Bittensor [17], Fetch.ai [18], and Autonolas integrate AI with blockchain at the application layer, but none embed AI into the consensus mechanism itself. AI agents in these systems are users of the blockchain, not participants in its security model.

#### 1.2 Our Thesis: AI as Consensus Participant

ZK Agentic Chain addresses these limitations with three design principles:

**Democratic validation.** Any CPU can participate as a verifier. The protocol's dual-staking model weights computational contribution (60%) above capital (40%) in determining effective stake, which sets **earnings**: a validator with modest token holdings but strong CPU resources earns proportionally more than a well-capitalized validator with minimal compute. This directly addresses the wealth concentration problem in *reward distribution* inherent in pure PoS systems while avoiding the energy waste of PoW. (Consensus *finality selection* is a separate matter: until CPU stake is PoRep-hardened it is weighted by token stake alone (specified; live-path staged — §13.5) — the finality firewall of Section 13.5 — so the anti-plutocracy here is an **earnings** property, with CPU-weighted committee influence as the PoRep-gated mainnet goal.) Critically, the computational contribution that counts is **real, verifiable CPU and disk work** — replicating and re-proving a shard of the network's collective knowledge vault (Section 5A) — not a paid AI-API bill. No participant must hold a paid LLM key to secure the network.

**Intelligent verification.** AI agents reason about chain integrity rather than executing purely deterministic checks. A committee of 13 AI verification agents audits each proposed block, examining transaction validity, state transition correctness, and proof integrity. Agents cross-reference state across isolated ledger spaces, flag anomalous patterns, and produce attestations that reflect semantic understanding of the data — not just cryptographic validity. This provides an additional verification layer whose detection capabilities improve as the underlying AI models advance.

**Verification-layer privacy.** Agents operate within zero-knowledge private channels, proving correctness without exposing the underlying data [6] [29]. Unlike public blockchains where validators must read transaction data to validate it, ZK Agentic Chain's verification agents receive ZK proofs of state transitions and validate those proofs — never accessing the plaintext state. All user data is private by default; privacy is not an opt-in feature but the fundamental operating mode of the protocol. *(Design target — on the current testnet these channels and the verification-agent proof exchange described here run as a simulated stand-in; see the §5B.2 honesty ladder for exactly which rung ships today.)*

#### 1.3 Vision: The Neural Lattice

ZK Agentic Chain represents blockchain state as a **golden-angle phyllotaxis lattice** — a sunflower of agent seats around a central Singularity, where standing, resources, and strategic position are intrinsic to the protocol rather than abstracted away behind address strings and block heights. Position is not an `(x, y)` coordinate a participant chooses or claims; it is an activity rank `k` that the protocol assigns and continuously re-sorts.

The lattice is shared and deterministic. Every active participant — Community, Founders, Professional — holds exactly one seat, computed identically by every client from the on-chain rank: seat `k` lies at `angle(k) = k × 137.50776°` and `radius(k) = c·√k` (the Fermat-spiral phyllotaxis packing). The protocol-operated **Singularity** agent is bound to the centre (`k = 0`). Factions represent distinct participant classes (free-tier community users, the protocol's own core agent, founders and advisors, and professional paid-tier users) and govern subscription, governance weight, and protocol role; they do not own regions of the lattice. Newly minted AGNTC flows from the act of mining itself: each node's private subgrid mints AGNTC to its operator, irrespective of seat. Value emerges instead from two intrinsic properties: hardness (which radial **band** the seat falls in — `hardness = 16 × band`) and per-node density (a deterministic SHA-256 hash of the node identifier). This replaces arbitrary allocation percentages with an economy whose value gradient is observable, deterministic, and the same for every participant — and whose standing rewards real activity over capital or land-grabbing.

Users explore the lattice through AI agent terminals — constrained Claude model instances that operate as in-game interfaces. Each participant runs a single homenode seat plus a small family of orbiting subagents (a "node" is one agent), and users interact with the blockchain exclusively through structured command menus presented by their agents. There is no free-text chat; every interaction is a validated game action that maps to an on-chain transaction.

Security is two-layered and stated honestly throughout this document: the **ledger** (balances and ordering) is secured by the PoAIV committee (Section 5); the **state** — the agents' shared knowledge vault — is secured by participants' real CPU and disk via sampled storage proofs (**Proof-of-Vault**, Section 5A). The AI model is an *optional content layer* (an agent may use an LLM to author or curate vault entries), never a gate on participation.

The two layers meet at one rule. State mutation is admitted only through the **ZK-Agentic Gate** (Section 5B): to change chain state, a participant running *any* agent, model, or algorithm must submit a valid **proof that it followed the protocol**, which the Singularity verifies — and verifies nothing else. The chain is therefore run by *agentic possession-proven activity*: agents prove that they performed protocol-obedient work on the network's collective memory, and only a valid proof mutates state. We hold this to the ladder of Section 5B.2 — the shipping proof is a possession proof, **not yet zero-knowledge** (rung a); making it literally zero-knowledge is a single, well-scoped SNARK wrap that is specified and phasing in. We call this model **Proof of Agentic Work** (PoAW). The protocol is, further, **built and operated by agentic force** — authored by an autonomous AI agent (Claude) and then run by agents that prove their obedience (Section 5B.5); this is a provenance and work-obedience claim, never a claim that the agents' reasoning is itself proven.

The protocol launches in phases: AGNTC begins as a Solana SPL token (1 billion units minted) to establish liquidity and community, while the ZK Agentic Chain testnet simulates the full protocol with a game-like interface. Upon mainnet launch, Solana-based AGNTC migrates to the native Layer-1 chain via a lock-and-mint bridge, and the phyllotaxis standing economy becomes the production blockchain.

---

### 2. Background and Related Work

#### 2.1 Proof of Work and the Energy Problem

Bitcoin [1] established the foundational PoW consensus model: miners compete to find a nonce such that the SHA-256 hash of the block header falls below a target difficulty. The winner broadcasts the block and collects the block reward (currently 3.125 BTC after the April 2024 halving) plus transaction fees. Bitcoin's hard cap of 21 million BTC, enforced through a halving schedule that reduces block rewards every 210,000 blocks, creates absolute scarcity — a property no other major network has successfully replicated.

Post-halving economics tightened considerably: hashprice dropped from $0.12 in April 2024 to approximately $0.049 by April 2025. Network hashrate nevertheless reached 831 EH/s by May 2025, a 77% increase from the post-halving low, driven by next-generation hardware (Bitmain Antminer S21+ at 16.5 J/TH). This concentration toward industrial-scale operations with access to cheap electricity and cutting-edge hardware directly contradicts Bitcoin's original vision of one-CPU-one-vote participation.

Monero's RandomX algorithm represents the most significant attempt to maintain CPU-friendly proof of work, using a randomized instruction set designed to resist ASIC optimization. While partially successful — RandomX mining remains viable on consumer CPUs — the approach still requires solving arbitrary computational puzzles that produce no useful output.

ZK Agentic Chain preserves the democratic CPU participation principle of early PoW designs while replacing hash puzzles with AI verification — computational work that produces genuine security value through intelligent reasoning about chain state.

#### 2.2 Proof of Stake and Plutocratic Concentration

Ethereum's transition to Proof of Stake via the Merge (September 2022) [2] reduced the network's energy consumption by approximately 99.95%. Validators stake 32 ETH and earn rewards for proposing and attesting to blocks. As of September 2025, over 35.6 million ETH (approximately 29-30% of total supply) is staked across more than 1.06 million validators [38], with staking yields ranging from 3.5-4.0% APY for standard validators and up to 5.69% for MEV-Boost participants.

However, the 32 ETH minimum (~$90,000 at current prices) creates a significant barrier to entry. Liquid staking derivatives (Lido, Rocket Pool, Coinbase) lower this barrier but introduce centralization risk — a small number of operators control the majority of delegated stake. Governance influence concentrates among the largest holders, reproducing the plutocratic dynamics that PoS was intended to avoid.

Solana [3] [35] employs a PoS variant with Proof of History for time ordering. Starting with approximately 8% annual inflation in 2020, Solana's inflation decreases by 15% per year toward a terminal rate of 1.5% (projected ~2031). Current staking APY ranges from 5-8%. Solana's 2025 fee model burns 50% of base fees and sends 100% of priority fees to validators, creating a two-tier fee market that separates protocol-level burns from validator incentives.

Cosmos [22] uses a dynamic, target-staking-rate inflation model that self-adjusts between 7% and 20% based on participation: if staking falls below two-thirds of supply, inflation increases to incentivize lockup; if it exceeds two-thirds, inflation decreases. This adaptive mechanism maintains robust staking levels across varying market conditions — a design insight relevant to any network where validator participation must be actively incentivized.

ZK Agentic Chain's dual-staking model (Section 13) addresses the concentration problem directly: by weighting CPU contribution at 60% and token stake at 40%, the protocol ensures that computational work — not just capital — determines validator **earnings**. (Finality *selection* is firewalled to token stake until CPU is PoRep-hardened; making computational work also determine committee influence Sybil-resistantly is the mainnet goal — Section 13.5.)

#### 2.3 Zero-Knowledge Blockchains

Zcash [5] pioneered the deployment of zk-SNARKs (Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge) [4] [29] for transaction privacy. The Sapling upgrade (2018) introduced an efficient nullifier scheme that has become the canonical reference for private ownership proofs: a note commitment (Pedersen hash of value, owner public key, and randomness) is added to a Merkle tree [39] of depth 32; spending requires a ZK proof of knowledge of the note's opening and correct computation of the nullifier, which prevents double-spending without revealing which note was spent.

Mina Protocol [40] maintains a constant 22 KB blockchain size using recursive zk-SNARKs — each new block contains a proof that the entire chain history up to that point is valid. This recursive composition means verification cost is constant regardless of chain length, enabling browser-based full verification.

Aztec Network [24] launched the Ignition Chain in November 2025 as a privacy-preserving Layer 2 on Ethereum. Aztec's architecture is relevant to ZK Agentic Chain: it uses client-side proof generation (sensitive data never leaves the user's device), a note-based UTXO model for private state, and the Noir programming language — a Rust-inspired domain-specific language for ZK circuits that compiles to PLONK [7] proofs via the Barretenberg backend.

ZK Agentic Chain extends the privacy-preserving paradigm beyond transactions to the *verification layer itself*. In Zcash and Aztec, validators still see the data they validate (or at minimum, interact with it during proof generation). In ZK Agentic Chain, verification agents operate within ZK private channels — they validate proofs of state transitions without ever accessing the underlying plaintext data.

#### 2.4 AI and Blockchain Convergence

The intersection of artificial intelligence and blockchain has produced several distinct approaches:

**Bittensor (TAO)** [17] organizes AI production into competitive subnets — independently governed marketplaces for specific AI tasks. Miners run AI models and compete on output quality; validators score results; the best performers earn TAO rewards. With a Bitcoin-like 21 million hard cap and halving schedule, Bittensor's first halving occurred in December 2025. The Dynamic TAO (dTAO) upgrade introduced per-subnet alpha tokens, creating a meta-market where subnets compete for TAO emissions by attracting real staking demand. Bittensor's key innovation is using AI output quality as proof of work — but the AI operates at the application layer, not within consensus itself.

**Fetch.ai / Artificial Superintelligence Alliance (ASI)** [18] builds Autonomous Economic Agents (AEAs) that act, trade, and transact on behalf of users. Fetch.ai's agent-centric model treats AI agents as first-class economic citizens with their own wallets, earnings, and spending patterns. The 2024 merger with SingularityNET and Ocean Protocol created the ASI alliance, though governance disputes led to Ocean Protocol's withdrawal in October 2025.

**Autonolas (OLAS)** provides infrastructure for deploying multi-agent systems on-chain, with off-chain agent execution and on-chain settlement. Agents are organized into "services" — compositions of agent components that collaborate autonomously.

**Ritual** enables on-chain access to AI model inference through a decentralized compute network. Smart contracts can call AI models during execution, but the AI operates as a service provider, not a consensus participant.

ZK Agentic Chain is distinct from all of these in a fundamental way: AI agents are embedded in the *consensus mechanism itself*, not deployed as application-layer services. The 13-agent verification committee is not using AI to produce content or trade assets — it is using AI to validate the blockchain's state transitions with reasoning that goes beyond deterministic rule checking.

#### 2.5 Comparative Positioning

| Feature | Bitcoin | Ethereum | Solana | Zcash | Bittensor | **AGNTC** |
|---------|---------|----------|--------|-------|-----------|-----------|
| Consensus | PoW | PoS (Casper) | PoH + Tower BFT | PoW (Equihash) | Yuma consensus | **PoAIV** |
| AI role | None | None | None | None | Scoring/ranking | **Consensus verification** |
| Privacy | Pseudonymous | Pseudonymous | Pseudonymous | Shielded (ZK) | Pseudonymous | **Private by default (designed; simulated on testnet)\*** |
| Staking model | Mining | Token-only | Token-only | Mining | Token + compute | **Dual (40% token, 60% CPU)** |
| Supply model | Fixed (21M, halving) | Inflationary + burn | Inflationary | Fixed (21M, halving) | Inflationary | **Fixed (1,000,000,000)** |
| Block time | ~10 min | ~12 sec | ~400 ms | ~75 sec | ~12 sec | **~60 sec** |

\* The private-by-default design is specified in full (Section 6); on the testnet the consensus privacy proof is a `SimulatedZKProof` stand-in rather than a live prover (the rung-(b) honesty caveat of Section 5B.2). The storage-possession proof that backs the gate ships today as a raw-Merkle possession proof, not yet zero-knowledge (rung (a)).

**Key differentiators:**
1. **AI-as-consensus.** To our knowledge, no other production L1 embeds AI reasoning into the consensus mechanism itself as of April 2026.
2. **Dual staking** formalizes compute-weighted staking with explicit anti-plutocratic properties in *earnings* (Section 23.3); finality selection is separately firewalled to token stake until CPU is PoRep-hardened (Section 13.5).
3. **Privacy by default** combined with AI-enhanced anomaly detection within the privacy layer.

#### 2.6 Compute-Tokenomics Networks

Several projects have established models for tokenizing computational resources:

**Render Network (RENDER)** [28] introduced the Burn-Mint Equilibrium (BME) model: rendering jobs are quoted in USD, the RENDER paid for completed jobs is burned (100%), and the network mints new RENDER for node operators based on work completed and reputation scores. This creates a self-balancing supply where demand-side burns offset supply-side emissions.

**Filecoin (FIL)** [15] employs a dual minting model: simple minting releases tokens on a fixed 6-year half-life regardless of network activity, while baseline minting releases tokens only when aggregate storage capacity crosses a growing threshold. This gates the majority of emissions behind demonstrated utility — tokens are minted in proportion to real-world storage delivered, not just time elapsed. The 180-day vesting on 75% of block rewards reduces immediate sell pressure.

**Akash Network (AKT)** uses a reverse auction for compute: providers bid against each other, and the lowest bidder wins. Compute is priced in stablecoins (USDC), with AKT buyback-and-burn creating the value capture loop. This separation of pricing currency (stable) from native token (volatile) prevents compute cost unpredictability.

**io.net (IO)** launched a Co-Staking Marketplace where passive token holders stake alongside active GPU operators, sharing in compute revenue. This hybridizes staking with productive capital deployment, allowing participation without running infrastructure.

ZK Agentic Chain draws on these models in its CPU-weighted staking design (Filecoin's utility-gated emissions), fee burn mechanism (Render/Ethereum's burn equilibrium), and reward vesting (Filecoin's 180-day vest adapted to 30 days).

#### 2.7 Where ZK Agentic Chain Fits

Existing blockchain projects can be positioned along two axes: (1) whether consensus involves intelligent reasoning or purely deterministic checks, and (2) whether the verification layer preserves privacy or operates transparently.

|  | **Transparent Verification** | **Private Verification** |
|--|--|--|
| **Deterministic Consensus** | Bitcoin, Ethereum, Solana | Zcash, Aztec, Mina |
| **Intelligent Consensus** | Bittensor (AI at application layer) | **ZK Agentic Chain** |

To our knowledge, no existing project as of April 2026 combines AI-powered intelligent verification with zero-knowledge privacy at the verification layer. ZK Agentic Chain targets this quadrant: agents reason about chain state (not just check signatures), and they do so within private channels (not on exposed data).

The addition of a phyllotaxis standing economy (the Neural Lattice), CPU-weighted dual staking, and a gamified exploration interface further differentiates the protocol from both traditional blockchains and AI-blockchain hybrids.

---


## Part II: Protocol Architecture

### 3. System Overview

#### 3.1 Five-Layer Architecture

ZK Agentic Chain is organized into five distinct layers, each handling a specific concern in the protocol stack. This separation allows independent evolution of each layer while maintaining clean interfaces between them.

**Layer 1 — User Layer.** The outermost layer manages wallets, transaction construction, and user-facing interfaces. Each user maintains an isolated ledger space — a private partition of the global state that is accessible only to the user and, during verification, to the ZK proof system. Wallets generate transactions, sign them with private keys, and submit them to the network. The User Layer also manages subscription tiers (Community, Professional), which determine the AI model tiers available for agent deployment and the CPU Energy allocation for staking operations. Additional protocol-managed roles (the Singularity core agent, Founder) exist for accumulator and team operations.

**Layer 2 — Ledger Layer.** Each user's ledger space is backed by a Sparse Merkle Tree (SMT) of depth 26, supporting up to 2^26 (approximately 67 million) leaf nodes. State is managed in a UTXO-like model: each state entry (a "note") is committed to the tree as a hash of its contents, and spending a note requires revealing a nullifier that invalidates it without exposing which note was consumed. The Ledger Layer maintains per-user record chains — ordered sequences of state transitions that can be independently verified without reference to other users' state.

**Layer 3 — ZK Channel Layer.** Zero-knowledge private channels provide the communication substrate between verification agents (Layer 4) and the ledger state (Layer 2). When a state transition occurs, the Ledger Layer produces a succinct ZK proof (Section 6) that the transition is valid. This proof is transmitted through the ZK Channel Layer to the verification committee. Agents receive proofs, not data — they can verify correctness without learning the contents of the state being modified.

**Layer 4 — Agent Layer.** AI verification agents are instantiated from Claude model variants organized into three tiers: Haiku (fast, low-cost inference for high-throughput verification), Sonnet (balanced reasoning for standard verification tasks), and Opus (deep reasoning for complex cross-ledger audits and anomaly detection). A committee of k=13 agents is selected per block via a verifiable random function specified to be weighted by **token stake** (the finality firewall, Section 13.5 — live-path staged: today's coordinator-run testnet still selects on the effective stake `S_eff`, so CPU continues to weigh in until the trustless-verifier stage). Each agent independently audits the proposed block and produces an attestation.

**Layer 5 — Consensus Layer.** The topmost layer combines BFT ordering with ZK proof finality. Transaction ordering follows a Byzantine Fault Tolerant protocol (Section 7) with a target block time of 60 seconds. Blocks are organized into epochs of 100 slots each. A block achieves irreversible finality when at least 9 of 13 agents produce matching attestations and the corresponding ZK proofs are verified — targeted at 20 seconds after block proposal. Layer 5 secures the **ledger** (transaction ordering and finality). The **state layer** — the collective knowledge vault that the lattice renders — is secured separately by participants' committed CPU and disk through Proof-of-Vault storage proofs (Section 5A), metered by the Singularity coordinator. The two layers are independent: ledger Byzantine-safety does not depend on the vault, and vault data-security does not depend on the committee.

#### 3.2 Design Principles

Three principles constrain every architectural decision in the protocol:

**Isolation.** User state is partitioned. No user can read another user's ledger space. Verification agents cannot read plaintext state. Cross-user interactions (transfers, communications) are mediated by ZK proofs that prove the validity of the interaction without exposing either party's full state.

**Proportionality.** *Earnings* are proportional to demonstrated contribution, not just capital. The dual-staking model (Section 13) ensures that CPU compute — actual work performed — weighs more heavily than token holdings in determining **reward share**. Influence over *finality* is, by contrast, specified to become proportional to **token stake alone** once the finality firewall's live-path wiring lands (Section 13.5 Honest status) — today, live selection still runs on the dual-weighted `S_eff`: because CPU / Proof-of-Vault work is Sybil-weak until PoRep-hardened, weighting committee selection by it is a transitional risk the firewall resolves; making finality influence track demonstrated CPU contribution Sybil-resistantly (once re-admitted) is the PoRep-gated mainnet goal.

**Adaptivity.** The security model evolves with the AI models powering the verification agents. As models improve in reasoning capability, the verification process becomes more thorough without requiring protocol upgrades. Model updates are governed by on-chain voting to prevent unilateral changes.

---

### 4. The Neural Lattice: Phyllotaxis Standing Economy

#### 4.1 Seating: The Golden-Angle Sunflower

ZK Agentic Chain renders its network as a **golden-angle phyllotaxis lattice** — the sunflower-seed packing. Each active participant occupies a single seat given by an integer **rank `k ≥ 1`** (the Singularity core is `k = 0`). The seat's screen position is a pure function of `k`:

```
angle(k)  = k × ψ        ψ = 360° × (2 − φ) = 137.50776…°   (golden angle, φ = (1+√5)/2)
radius(k) = c × √k        c = radial scale (client-side visual constant)
```

The lattice is not merely a visualization of blockchain state — it *is* the blockchain state. The rank `k` lives on-chain, so every client computes the identical `(angle, radius)` with no consensus on positions and no per-client drift. A node mints new AGNTC through its private subgrid (Section 16), not by claiming a coordinate; standing, not supply, is what the seat encodes.

**Why the golden angle.** Interaction edges are radial spokes from a seat to the Singularity (Section 4.5). Two seats would collide only if they shared an angle, i.e. `(k − k′) × (2 − φ) ∈ ℤ` — impossible for `k ≠ k′` because `2 − φ` is irrational. The golden angle is moreover the *most* irrational divergence angle (Hurwitz), so by the three-distance theorem the gaps between seats are maximally uniform and nearest-neighbour spacing is approximately constant across the whole disk. The packing is the spiral analogue of hexagonal tiling: provably non-overlapping (by the irrationality argument above) and even everywhere.

**Radial bands set hardness.** Seats are grouped into equal-width concentric **bands**. With `K1 = SEATS_INNER_BAND` seats in the innermost band, the band of seat `k` and its mining hardness are:

```
band(k)  = ceil( √(k / K1) )
hardness = HARDNESS_MULTIPLIER × band(k) = 16 × band(k)
```

This is identical in form to the v1.0/v1.1 `16 × ring` hardness, but the "ring" is now a radial band of the sunflower rather than a Chebyshev ring of a coordinate grid. Band `b` holds proportionally `(2b − 1)·K1` seats (annulus area), and cumulative capacity through band `B` is proportional to `B²·K1` — so outer bands automatically hold more, recovering the same `∝ B²` growth shape as the old epoch threshold `4N(N+1)`. Inner bands are cheaper to operate in (lower hardness) and higher-yield; the periphery is progressively harder. Band is unit-free and chain-computable from `k` alone.

The lattice makes no reference to participant identity in its geometry — there are no faction arms, sectors, or quadrants. Variation comes only from the per-node density function and the per-band hardness curve. A seat near the core is strategically valuable because hardness is low and prestige is high; an outer seat is harder but reachable by anyone who out-competes the field on activity. Density is distributed independently of band, so even a peripheral node can carry a high-richness draw.

#### 4.2 Faction System

Factions are participant identity classes, not territorial divisions. The Neural Lattice has no arms, quadrants, or sectors — every seat is competed for on activity alone, regardless of faction membership. Faction determines subscription tier, governance weight, and protocol role; it does not gate access to standing.

| Faction | Display Color | Membership Source | Protocol Role |
|---------|---------------|-------------------|---------------|
| Community | Teal `#0D9488` | Free-tier human users | Voting participant, 1× governance weight |
| Singularity | Black / violet | Protocol-operated core agent | Core gateway + accumulator, zero governance weight |
| Founders | Amber `#F59E0B` | Team and advisors | Voting participant, 5× governance weight, 4-year vest |
| Professional | Blue `#3B82F6` | Paid-tier human users | Voting participant, 2× governance weight |

(Display colors are normative; client implementations may use these exact hex codes to render owner-tinted nodes on the lattice. The Singularity renders as a near-black event horizon with a violet ring-of-fire rim rather than a flat tint.)

**Faction does not allocate supply.** Newly minted AGNTC flows from the act of mining: each node's subgrid mints AGNTC to its operator directly, irrespective of which faction the operator belongs to. There is no 25%-per-faction split, no faction treasury that automatically receives a share, and no protocol enforcement of distribution proportions. Distribution emerges from participant behavior — whoever does more verification work earns more AGNTC.

**The Singularity is the core only.** The Singularity (renamed from the v1.0/v1.1 "Machines Faction") is implemented as a single protocol-operated agent permanently bound to the centre (`k = 0`, origin). It cannot take a competitive seat, cannot be deployed elsewhere, and — critically — **never mines or secures**: the chain is 100% human-run, and the Singularity is a pure gateway and accumulator. It passively accrues origin yield into a never-selling reserve and renders chain queries and attestation submissions as interaction spokes to the core. Because origin is rendered at maximum density (the protocol clamps origin density to 1.0) and minimum hardness, the accumulator captures a meaningful but bounded trickle of supply — far smaller than the old "25% of all mined AGNTC" but structurally identical in role: a permanent, never-selling protocol reserve whose growth serves as a health metric. The accumulator's economic constraint (`SINGULARITY_MIN_SELL_RATIO = 1.0`, never sells below acquisition cost) is preserved verbatim.

**Founders Faction** tokens are subject to a 4-year vesting schedule with a 12-month cliff, preventing early liquidation by the founding team. This vesting applies to AGNTC the Founders earn through their own mining, not to a pre-allocated faction share.

The governance separation introduced in v1.0 is preserved: the Singularity has zero governance weight and cannot vote on protocol parameters. Humans govern; the protocol agent executes.

#### 4.3 Band Growth

The lattice does not exist in its entirety at genesis. Instead, it grows outward from the centre as participants join, filling seats rank by rank. Hardness tiers are the equal-width radial **bands** of Section 4.1; there is no discrete "ring opening" event, because seats are assigned continuously rather than unlocked in batches.

At genesis, only the Singularity is seated (`k = 0`, the origin). The innermost competitive ranks are open and fill as participants arrive — the first arrivals take the inner band, later arrivals are placed at the next open (outermost) rank and climb inward via activity (Section 19). The genesis supply is 900 AGNTC; the 100 AGNTC associated with the origin is minted to the Singularity accumulator at protocol launch, and the remainder enters circulation only as participants join and their subgrids mine. Additionally, each new user registration mints a 1 AGNTC signup bonus, ensuring every participant enters the economy with a non-zero balance.

Because band `b` holds proportionally `(2b − 1)·K1` seats and cumulative capacity through band `B` scales as `B²·K1`, the field's capacity grows with the same `∝ B²` shape that the v1.0/v1.1 epoch threshold `4N(N+1)` produced — outer bands hold more automatically, with no separate unlock rule. Supply expansion remains strictly mining-driven, not time-driven: if no node secures, no new AGNTC enters circulation, regardless of elapsed time.

The lattice rendering is dynamic: the client draws the seated ranks plus the growing rim (the next open seats), so the cost of rendering scales with active participants rather than with any fixed grid extent.

#### 4.4 Node Density and Resource Richness

Each node has an intrinsic *density* value — a deterministic measure of resource richness that multiplies the node's mining yield. Under v1.2, density is a property of *who you are*, not *where you sit*: it is derived from the node identifier rather than a coordinate.

```
density(node) = SHA-256(node_id) mod 2^32 / 2^32 ∈ [0, 1]
```

Because SHA-256 is deterministic, a node's density is fixed for its entire life — an intrinsic trait, not a dynamic state variable. This creates a resource geography: some nodes are "rich" (density near 1.0, high mining yield) and others are "barren" (density near 0.0, low yield). Density decouples cleanly from standing: **hardness = where you are (band), density = who you are (node).** The Singularity / origin is the one exception — its density is clamped to 1.0, giving the accumulator the maximum single-node yield as its structural (rather than allocative) mechanism (Section 4.5, Section 10.3).

Inner seats have higher strategic value because hardness is lower (`16 × band` is minimized in band 1) and prestige is higher. Density, however, is distributed independently of band — an outer-band node can draw density 0.99 just as an inner node can draw 0.01. The advantage of an inner seat comes from lower hardness, not higher density.

**Figure 1: Neural Lattice Structure (phyllotaxis sunflower)**

```
                          ·    ·    ◍    ·    ·
                       ·     ◯       ◯       ◯    ·
                          ◯     ◍       ◯     ◯       band 3
                    ·    ◯    ·    ◯    ·    ◯    ·
                       ◯    ·    ●    ·    ◍       band 2
                    ·    ◯    ·   (◉)   ·    ◯    ·    band 1
                       ◯    ·    ●    ·    ◯
                          ◍     ◯       ◯     ◍
                       ·     ◯       ◍       ◯    ·
                          ·    ·    ◯    ·    ·

    ◉ = Singularity core (k=0, permanent)   ● = high-activity seat (inner)
    ◍ = active participant seat              ◯ = lower-activity / outer seat
    · = open rank (growing rim)

    Shared deterministic sunflower | seat k → angle k·137.50776°, radius c·√k
    Faction = identity (not territory)  |  standing = activity rank, not coordinate
    Value gradient = band hardness (16·band) + per-node density (SHA-256 of node_id)
    Subgrid Secure mints new supply (BME burns)  |  golden angle ⇒ non-overlapping spokes
    Bands fill continuously as participants join; activity moves seats inward/outward
```

#### 4.5 Standing Economy

ZK Agentic Chain operates on a shared deterministic phyllotaxis lattice in which a participant's position is an activity rank rather than a parcel of territory. This subsection consolidates the operational consequences of that decision, which appear in scattered form throughout the rest of the document.

**One seat plus a family of subagents.** A participant holds exactly one seat (rank `k`) and a small, fixed family of **subagents** that orbit it (2 for Community, 4 for Professional and Founder — Section 18.5). Subagents render as satellites tethered to the seat by permanent family edges; each runs its own subgrid (contributing to the participant's mining and activity) but holds no independent seat. There is no empire, no claimed territory, and no adjacency frontier to expand — the retired empire/blob/deploy-range model of v1.1 has no analogue here.

**Standing is the activity rank.** A participant's `k` is their position when all active participants are sorted by a rolling, decaying, CPU-weighted **activity score** (Section 19.2). Rank 1 is the innermost competitive seat. Sustained verification work raises activity relative to the field and spirals the seat inward (lower `k`, lower hardness band, higher yield, prestige); inactivity lets it slip outward. New participants enter at the next open (outermost) rank and climb by out-competing others. Competition is for inner *standing*, not for scarce coordinates.

**Value gradient is a function of standing and node identity, both public.**

```
expected_yield(node) = density(node) × yield_per_density_unit(band(k))
                     = SHA-256_unit(node_id) × (BASE_RATE / hardness)
                     = SHA-256_unit(node_id) × (BASE_RATE / (16 × band(k)))
```

Both terms are deterministic and observable to every participant without permission or coordination — `band(k)` is a pure function of the on-chain rank, and `density(node)` a pure function of the node identifier.

**The Singularity is the model-agnostic protocol-obedience-proof verifier.** The core agent's operational role (Section 5A.4, Section 5B) is precisely one thing: it is a **model-agnostic verifier of protocol-obedience proofs and the metering authority for state mutation.** It holds the vault root and per-shard Merkle roots, assigns shards, issues challenges, verifies the returned proofs, and credits or slashes accordingly — and it checks the *proof of obedient work*, never *which brain produced it*. It mines nothing, holds no shard, and carries zero governance weight; the name "Singularity" denotes this single gate, not a storage server.

**The Singularity accumulator is structural, not allocative.** Because the Singularity permanently holds the core (`k = 0`, origin), where hardness is minimum and density is rendered at maximum (the protocol clamps origin density to 1.0), it passively earns a continuous trickle of AGNTC from the most productive single node on the lattice — without itself mining or securing. This delivers the v1.0 "permanent accumulator" property — never-selling protocol reserve, monotonic growth, and reduction of circulating supply — through a structural mechanism (core occupancy) rather than an allocative one (25% of all mined supply). The accumulator's total share of long-run supply is bounded: it captures a single node's yield, not a quarter of the network's. The verifier role and the accumulator role are independent: it earns from origin yield, not from coordinating, and gains no AGNTC for metering.

**Anti-monopoly mechanics still hold.** Inactivity-driven outward drift, the real-compute requirement, hardness that rises with band, the active-relocation cost, disclosed Founder ranks, and the fixed subagent caps (Section 19.6) all operate under the standing model. Removing territorial partitioning does not weaken anti-monopoly enforcement — concentration pressure now expresses purely as competition for inner standing, with the same levers (decay, real-compute, relocation cost, hardness, diminishing `level^0.8` subgrid returns) intact.

**Migration note (v1.0/v1.1 → v1.2).** Implementations that previously enforced coordinate-grid geometry should retire it in three places: (1) node-creation logic should assign a rank `k` and derive `(angle, radius, band)` from it, rather than snapping submitted `(x, y)` to a grid; (2) deploy-candidate logic should attach subagents as orbiting satellites of the participant's seat (no 8-neighbour adjacency, no empire blob); (3) the placement algorithm should append a new participant at the next open rank, rather than emitting the next coordinate in Chebyshev-ring order. The v1.0 four-arm spiral and the v1.1 open coordinate grid are both retired. See `apps/game/src/lib/orbitalGeometry.ts` in the reference client implementation.

---

### 5. Proof of AI Verification (PoAIV)

**Scope of PoAIV: the ledger, not the state.** Proof of AI Verification secures the **ledger** — it decides which blocks of transactions are valid and final (balances, transfers, ordering). It is the conventional Byzantine-secured consensus layer (on the testnet, the coordinator fills the committee role). PoAIV does **not**, by itself, secure the network's *state* — the collective knowledge vault that the Neural Lattice renders. That second layer is **Proof-of-Vault** (Section 5A): participants commit real CPU and disk to replicate, serve, and re-prove shards of the vault, and the loss or unauthorized rewriting of vault data is what their work prevents. This document keeps the two layers separate everywhere: *ledger safety = committee; state/data security = player CPU+disk via storage proofs.*

#### 5.1 Verification Agent Selection

For each block, the protocol specifies a committee of k = 13 AI verification agents selected via a Verifiable Random Function (VRF) [41] [32] weighted by **token stake** — the *finality weight* of the finality firewall (Section 13.5), **not** the dual-staking effective stake — ensuring both randomness (no party can predict committee membership in advance) and proportional representation (validators with higher token stake are more likely to be selected, but never guaranteed). This is the specified, firewalled design; on the current coordinator-run testnet, selection still runs on the dual-staking effective stake `S_eff` pending the trustless-verifier stage (Section 13.5 Honest status). The CPU leg of effective stake (Section 13.1) is specified to be deliberately excluded from this weighting because CPU / Proof-of-Vault work is Sybil-weak until PoRep-hardened; weighting *finality* by it would let a cheaply corrupted storage layer buy committee influence — which is why, until the firewall's live-path wiring lands, today's `S_eff`-based selection carries that transitional risk. CPU-weighted committee selection — the original §13 dual-staking-in-finality vision — is a mainnet goal gated on that hardening; CPU continues to weight *earnings* (reward share) and admission/liveness, and, today, still weighs into finality selection itself via `S_eff` until the firewall is live.

The VRF produces a pseudorandom value for each registered validator:

```
vrf_output = VRF_prove(validator_private_key, block_seed)
```

Validators whose VRF output falls below a threshold determined by their **token-stake** proportion (the finality weight `W_fin`, Section 13.5 — not effective stake) are selected for the committee. The threshold is calibrated to produce, on average, 13 committee members per block.

Agents are instantiated from three model tiers:

| Tier | Model | Strengths | Typical Role |
|------|-------|-----------|-------------|
| Haiku | Fast inference | High throughput, low latency | Routine transaction validation |
| Sonnet | Balanced | Reasoning + speed trade-off | Standard block verification |
| Opus | Deep reasoning | Complex analysis, anomaly detection | Cross-ledger audits, dispute resolution |

The model tier used by a verification agent is determined by the validator's subscription tier and staking level. Higher-tier models produce more thorough verification but consume more CPU Energy, creating a natural trade-off between verification depth and operating cost.

#### 5.2 Intelligent Verification Process

Unlike deterministic validation (signature checks, Merkle proof verification, nonce validation), PoAIV agents apply *reasoning* to their verification tasks. Each selected agent receives the proposed block and independently performs the following audit:

**Transaction validity.** Each transaction in the block is checked for correct formatting, valid signatures, sufficient balances, and adherence to protocol rules. This step is equivalent to traditional deterministic validation.

**State transition correctness.** The agent verifies that the proposed post-block state root is consistent with applying the block's transactions to the pre-block state. For ZK-proven state transitions, the agent verifies the accompanying proof rather than re-executing the transition.

**Cross-ledger consistency.** For transactions that reference multiple ledger spaces (transfers, cross-user interactions), the agent verifies that the ZK proofs submitted by both parties are mutually consistent — that the sender's debit proof and the receiver's credit proof reference the same amount and transaction identifier.

**Anomaly detection.** The agent applies pattern recognition to the block as a whole, flagging statistical anomalies such as unusual transaction clustering, suspected wash trading patterns, or state transitions that are technically valid but economically suspicious. Flagged anomalies do not automatically invalidate the block but are recorded in the agent's attestation for governance review.

**Proof integrity.** All ZK proofs included in the block are verified against the protocol's proof verification contracts. Invalid proofs cause immediate block rejection.

The formal consensus rule for block acceptance:

```
valid(block) <=> |{agent_i : attest(agent_i, block) = VALID}| >= t
where t = 9, k = 13
```

A block achieves consensus when at least 9 of 13 agents produce VALID attestations. If fewer than 9 agents agree, the block is rejected and re-proposed by the next leader in the rotation.

#### 5.3 Commit-Reveal Protocol

To prevent attestation copying — where a lazy or Byzantine agent waits to see other agents' attestations and copies the majority — block verification follows a two-phase commit-reveal protocol:

**Commit phase (10 seconds).** Each selected agent computes its attestation independently and submits a cryptographic commitment to the ordering node:

```
commitment_i = H(attestation_i || nonce_i)
```

The commitment binds the agent to its attestation without revealing it. The ordering node collects all commitments during the 10-second window.

**Reveal phase (20 seconds).** After the commit window closes, agents reveal their attestations and nonces. The ordering node verifies that each revealed attestation matches its commitment:

```
verify: H(revealed_attestation_i || revealed_nonce_i) == commitment_i
```

Agents that fail to reveal within the 20-second window forfeit their block reward and receive a liveness penalty. This incentivizes timely participation while the commitment scheme prevents free-riding on others' work.

The hard deadline for block finalization is 60 seconds from proposal (VERIFICATION_HARD_DEADLINE_S = 60). If the commit-reveal process does not complete within this window, the block is abandoned and a new leader proposes a fresh block.

#### 5.4 Agent Lifecycle

Verification agents follow a defined lifecycle to ensure network stability:

**WARMUP (1 epoch).** Newly registered agents spend one full epoch (100 blocks) in warmup (AGENT_WARMUP_EPOCHS = 1), during which they observe block verification but do not participate in committee selection. This allows the agent to synchronize with current chain state and calibrate its verification behavior.

**ACTIVE.** After warmup, agents become eligible for committee selection (specified to be weighted by token stake — §13.5 Honest status). Active agents earn the staking-pool reward proportional to their **effective stake** `S_eff` (the economic weight, Section 14.1), and the equal-split verifier reward when selected and performing correct verification.

**COOLDOWN / PROBATION.** Agents that go offline for more than one full epoch enter a probationary period of 3 epochs (AGENT_PROBATION_EPOCHS = 3) before re-activation. During probation, the agent must demonstrate consistent uptime but does not earn rewards.

**Safe mode.** When more than 20% of registered validators go offline simultaneously (SAFE_MODE_THRESHOLD = 0.20), the protocol enters safe mode: non-critical operations (subgrid allocation changes, NCP messaging, content creation) are suspended while critical operations (transfers, Secure actions, block production) continue with a reduced committee size. Safe mode exits when validator online rate recovers to 80% or above (SAFE_MODE_RECOVERY = 0.80).

#### 5.5 Committee Selection Algorithm

**Status.** This section specifies the committee-selection algorithm as it ships with the trustless-verifier stage. On the current single-coordinator testnet, verifier selection runs on effective stake (`S_eff`) inside the coordinator's pipeline — see §13.5 Honest status.

The selection weight is the **finality weight** `W_fin`, the finality-firewall quantity (Section 13.5) — **token stake only**, online-gated — **not** the dual-staking effective stake `S_eff`:

```
W_fin(v) = (v.token_stake / T_total)   if v.online and T_total > 0
           0                            otherwise
```

```
Algorithm: SELECT_COMMITTEE(block_height, epoch_seed)
  Input: block_height h, epoch_seed s (hash of previous epoch's last block)
  Output: committee C of size VERIFIERS_PER_BLOCK (13)

  1. seed <- BLAKE2b(s || h)
  2. candidates <- {v : v in ValidatorSet, W_fin(v) > 0}   // token-weighted (finality firewall)
  3. C <- empty set
  4. nonce <- 0
  5. while |C| < 13:
       vrf_output <- VRF_Ed25519(v.secret_key, seed || nonce)
       threshold <- W_fin(v) / sum(W_fin(all candidates))
       if vrf_output / 2^256 < threshold:
         C <- C union {v}
         candidates <- candidates \ {v}  // without replacement
       nonce <- nonce + 1
  6. return C
```

**Note:** Selection is WITHOUT replacement (hypergeometric distribution). Each selected validator is removed from the candidate pool. The weight is `W_fin` (token-only) and **not** `S_eff`: CPU / Proof-of-Vault work is excluded from finality selection until it is PoRep-hardened (the finality firewall, Section 13.5). CPU still drives *earnings* (Section 14) — it just does not buy committee seats.

#### VRF Construction

Committee selection uses Ed25519-based VRF [42] as specified in RFC 9381 [32] (ECVRF-EDWARDS25519-SHA512-ELL2). Each validator generates a VRF proof using their staking key and the epoch seed.

- **Seed derivation:** `epoch_seed = BLAKE2b(previous_epoch_final_block_hash || epoch_number)`
- **Per-block nonce:** `block_seed = BLAKE2b(epoch_seed || block_height)`
- **Threshold:** `P(selected_i) = W_fin(i) / sum(W_fin(all))` — token-only finality weight (finality firewall, Section 13.5), not `S_eff`
- **Output format:** 32-byte hash (SHA-512 of VRF proof), interpreted as unsigned 256-bit integer

#### 5.6 Attestation Protocol

```
Algorithm: VERIFY_AND_ATTEST(agent_i, proposed_block)
  Input: agent_i (committee member), proposed_block B
  Output: attestation a_i or REJECT

  1. // Deterministic verification (all agents)
     valid_txs <- verify_signatures(B.transactions)
     valid_state <- verify_state_transition(B.prev_state, B.transactions, B.new_state)
     valid_merkle <- verify_merkle_root(B.new_state, B.state_root)

  2. // AI-enhanced verification (the PoAIV addition)
     anomaly_score <- AI_REASON(agent_i.model, {
       context: B.transactions,
       state_diff: B.prev_state -> B.new_state,
       historical_patterns: agent_i.local_state_cache,
       schema: VERIFICATION_JSON_SCHEMA  // prevents prompt injection
     })

  3. if valid_txs AND valid_state AND valid_merkle AND anomaly_score < ANOMALY_THRESHOLD:
       a_i <- SIGN(agent_i.key, APPROVE || B.hash)
     else:
       a_i <- SIGN(agent_i.key, REJECT || B.hash || reason)

  4. BROADCAST(a_i) via ZK private channel
  5. return a_i
```

**Figure 2: Block Production Lifecycle**

```
  Epoch Seed                Block Height
       |                         |
       v                         v
  [VRF Committee Selection] -----> 13 agents selected
       |
       v
  [Block Proposer] creates candidate block
       |
       v
  [Deterministic Checks] --- signatures, state, merkle
       |
       v
  [AI Verification] --- anomaly detection, pattern analysis
       |
       v
  [Attestation Broadcast] --- via ZK private channels
       |
       v
  [9/13 Threshold?] --NO--> block rejected
       |YES
       v
  [Finality] --- block committed, state root updated
       |
       v
  [Rewards Distributed] --- 60% verifiers, 40% stakers
```

#### 5.7 Value of AI Verification Over Deterministic Validation

Traditional BFT validators execute deterministic checks: signature validity, state transition correctness, Merkle proof integrity. These are necessary but not sufficient for the following threat classes:

1. **Economic anomaly detection.** An adversary constructs a valid state transition that is technically correct but economically suspicious -- e.g., a coordinated series of transactions that collectively constitute a wash trade or market manipulation. Deterministic validators approve each transaction individually; AI agents can detect the collective pattern.

2. **Semantic state inconsistency.** After a complex sequence of subgrid reallocations, the resulting resource distribution may be technically valid per the state machine rules but violates higher-order invariants (e.g., a single entity controlling >50% of a band's secure cells). AI agents cross-reference spatial patterns against economic invariants.

3. **Slow-burn governance attacks.** A series of individually innocuous parameter change proposals that collectively steer the protocol toward adversarial conditions. AI agents maintain temporal context across blocks and flag cumulative drift.

**Limitation:** AI verification is probabilistic, not provably sound. The committee structure (13 agents, 9/13 threshold) provides statistical confidence rather than mathematical certainty for *ledger* decisions. Section 24 discusses the ZKML gap -- current zero-knowledge proof systems cannot verify LLM inference, so AI verification relies on committee attestation rather than ZK-proved computation. Note that this probabilistic property is confined to the ledger layer — the **state layer's** security (Proof-of-Vault, Section 5A) rests on *cryptographic* storage proofs (Merkle paths over sampled bytes), which are cheaply and deterministically verifiable and do not inherit the AI-soundness caveat.

#### 5.8 Attack Analysis

**Attack 1: Model Poisoning**
- *Vector:* Adversary fine-tunes or replaces the AI model used by corrupted committee members to always approve invalid blocks. All verification models are Anthropic Claude (Haiku/Sonnet/Opus), so this is a single-vendor exposure rather than a cross-provider one.
- *Mitigation:* Defense is layered, not premised on multiple model vendors. (a) **Deterministic-check floor** — PoAIV's deterministic safety checks (signatures, state-transition correctness, ZK-proof and Merkle validity) do not depend on the model and reject invalid blocks regardless of model output, so a poisoned model cannot push through a block that fails the math. (b) **Model-tier and version diversity within Anthropic** — committees mix Haiku/Sonnet/Opus and pinned model versions (Sections 8.4, 8.6); different tiers and versions have different failure modes, so a flaw specific to one is unlikely to corrupt the 9/13 supermajority. (c) **Probabilistic-confidence caveat** — AI verification is acknowledged as statistical, not provably sound (Sections 5.7, 24); the committee-attestation layer is explicitly the soft layer of security. (d) **Two-layer containment (v1.3)** — ledger safety rests on the PoAIV committee and state security is *cryptographic* (Proof-of-Vault storage proofs, Section 5A), so even a successful single-provider model compromise degrades verification *quality* but does **not** break state security: held data and its possession proofs remain cryptographically verifiable independent of any model.
- *Residual risk:* A simultaneous compromise of Anthropic's model supply chain would remove the AI advantage above the deterministic floor, collapsing verification to deterministic-only. This single-vendor dependence is disclosed honestly as an open problem (Section 24); diversifying the verification model set is a mainnet research direction, not a shipped guarantee.

**Attack 2: Prompt Injection**
- *Vector:* Adversary crafts transaction data containing prompt injection payloads that cause verification agents to approve invalid state transitions.
- *Mitigation:* (a) Verification input uses a strict JSON schema -- agents receive structured data, not free-form text. (b) Agent system prompts are immutable and loaded from chain state, not from transaction data. (c) No tool-use or function-calling is permitted during verification -- agents output only APPROVE/REJECT with structured reasoning.
- *Residual risk:* Novel injection techniques may bypass schema enforcement. The 9/13 threshold means an injection must fool at least 9 independent agents simultaneously.

**Attack 3: Inference Cost Attack**
- *Vector:* Adversary submits blocks requiring disproportionately expensive AI inference, draining committee members' compute budgets.
- *Mitigation:* (a) Maximum transaction count per block (MAX_TXS_PER_BLOCK). (b) Verification agents have a per-block compute budget; if exceeded, the agent abstains rather than approving without full analysis. (c) Fee market ensures the adversary pays proportionally for complex blocks.

**Attack 4: Committee Sybil Attack**
- *Vector:* Adversary acquires sufficient stake to dominate committee (and leader) selection.
- *Mitigation (specified — finality firewall; live-path staged, §13.5):* Committee and leader selection are specified to be weighted by **AGNTC token stake only** (Section 13.5), so the Sybil cost of dominating finality is specified to become the **cost of the token stake** — a single, clean axis — once the firewall's live-path wiring lands. Critically, the CPU / Proof-of-Vault leg is specified to be *excluded* from finality precisely because it is Sybil-weak until PoRep-hardened: today, before that wiring lands, live selection still runs on `S_eff` under the trusted coordinator, so cheaply forging storage proofs currently *is* a discount on committee capture — a transitional risk the trustless-verifier stage resolves (§13.5 Honest status). Token stake at risk is additionally subject to slashing (Section 15) and dispute re-verification (Section 8.7).
- *Mitigation (mainnet goal — dual-axis hardening):* Once committed CPU+disk is made Sybil-resistant (Proof-of-Replication sealing + a trustless/on-chain verifier, Section 13.5), CPU stake can re-enter finality weighting, raising the Sybil cost to **both** axes simultaneously — the original dual-staking target estimated at ≈2.5× a pure-PoS attack (derivation in Section 8). This is a PoRep-gated future property, not a current guarantee.

**Attack 5: Deterministic Inference Divergence**
- *Vector:* Two honest agents running the same model at temperature=0 produce different outputs due to floating-point non-determinism across hardware.
- *Mitigation:* (a) Verification outputs are quantized to APPROVE/REJECT (binary, not continuous). (b) The anomaly threshold is set conservatively so that minor numerical differences do not cross the threshold. (c) The 9/13 supermajority tolerates up to 4 divergent results.
- *Residual risk:* Acknowledged as an open problem. See Section 24.

---

### 5A. The Knowledge Vault and Proof-of-Vault

PoAIV (Section 5) secures the *ledger*. This section specifies how the network's *state* — the agents' collective knowledge — is secured by participants' real CPU and disk. This is **Proof-of-Vault**: not a novel Byzantine-consensus claim, but the proven, shipping pattern of storage networks (Filecoin, Chia, Arweave, Sia/Storj) applied to a shared knowledge graph, with the Singularity as the trusted coordinator. We state its guarantees honestly per deployment phase.

#### 5A.1 The Vault

The Singularity hosts a **content-addressed Merkle-DAG knowledge graph** — an Obsidian-vault-like structure of atoms (notes/entries) and links, each addressed by its content hash (CID); the root CID is the vault's state. This is the network's shared memory: the agents' collective brain. Crucially, **it is the same graph the /game page renders** — one data structure read two ways: as the security lattice (seats, bands, density) and as the knowledge vault (atoms, links). Agents may use an LLM to author or curate vault entries, but the vault's *security* comes from CPU+disk possession proofs, not from any LLM.

#### 5A.2 Securing: Shard Custody and Sampled Proofs

Participants are assigned vault **shards** by CID range (the vault's CID space is partitioned into `VAULT_SHARD_COUNT` shards) and commit **real disk** (storing the shard) and **real CPU** (hashing sampled bytes) to hold and serve them. The Singularity stores the vault root CID plus each shard's Merkle root, and periodically (every `VAULT_CHALLENGE_INTERVAL_BLOCKS`) issues a **sampled Provable-Data-Possession (PDP) challenge**:

```
challenge(shard, nonce):  return Merkle paths over VAULT_PROOF_SAMPLE_SIZE
                          randomly-selected sub-units of the shard
verify:                   recompute root from the returned paths; accept iff it
                          matches the committed shard Merkle root, within
                          VAULT_CHALLENGE_WINDOW_BLOCKS
```

The proof is **~160 bytes regardless of shard size**; random sampling of a small number of sub-units detects a missing fraction of the data with high probability (the Filecoin PDP profile, e.g. ~460 of 10,000 blocks for ~99% detection of a missing 1%; Section 22). The Singularity never receives the shard — only the proof. Each successful proof spawns or refreshes the **decaying interaction edge** to the core (the orbital "link spoke," fading over `EDGE_FADE_BLOCKS`): *interacting with the Singularity = submitting your proof = securing.* Each shard is held by `VAULT_REPLICATION_FACTOR` independent participants, so the vault survives any single failure.

**Honesty note — this is a possession proof, not yet a zero-knowledge proof.** As shipped on the testnet, this PDP challenge is a succinct **possession** proof (a SHA-256 Merkle path over the sampled sub-units), **not** a zero-knowledge proof: it *reveals* the sampled sub-units to the verifier. It is genuine, cheaply verifiable, useful work — but the "ZK" of the brand is delivered, at this rung, by **SNARK-wrapping** this exact check (replacing SHA-256 with the SNARK-friendly Poseidon hash and proving "the sampled openings hash to the committed root under this challenge" inside a Groth16/PLONK circuit), so the verifier learns only *that* the sample was correct, never the bytes. That wrap is the single, well-scoped step that makes the storage proof literally zero-knowledge; until it lands, this document calls the deployed proof a *possession proof*, never a "ZK proof" (Section 5B.2, the 3-rung ladder; Section 6.4, the storage-SNARK use case). Filecoin's WindowPoSt — which SNARK-compresses the same shape of possession proof to ~192 bytes — is the deployed precedent that this rung is shippable, not speculative.

#### 5A.3 The Three Verbs, Coupled

Proof-of-Vault completes the verb model introduced in Sections 10–11:

| Verb | What it is | Layer | Can run alone? |
|------|-----------|-------|----------------|
| **Mining** | Local AGNTC *issuance* from a node's 64-cell subgrid (Section 16) | — | Yes, but unlinked mining is unfinalized/unrewarded |
| **Securing** | Verifiable CPU+disk commitment: store, serve, re-prove a vault shard, proof submitted via the Singularity link | **State** | Requires the Singularity link |
| **Staking** | The slashable bond (AGNTC + committed CPU/disk capacity, Section 13) that makes securing trustable + Sybil-resistant | Both | Does no work itself |

**The loop:** mine locally → link to the Singularity to secure (prove useful vault work) → stake bonds it and earns the securing reward plus inward rank. Failed proofs slash the bond and drift the seat outward (Section 15.1a, Section 19.4).

#### 5A.4 The Singularity as Model-Agnostic Protocol-Obedience-Proof Verifier

The Singularity (Section 4.5, Section 5B, Section 10.3) is the network's **model-agnostic protocol-obedience-proof verifier** — and, in its vault role, the proof's trusted coordinator: it holds the root + per-shard Merkle roots, assigns shards by CID range, issues PDP challenges, and verifies the returned proofs (it is the origin agent, `SINGULARITY_WALLET_INDEX = 0`). "Verifier" is the precise word: it checks that a submitted proof attests protocol-obedient work, and it checks nothing about *which* agent, model, or algorithm produced that work. This is the **proven pattern that ships** — a central verifier can audit storage cheaply at scale (Filecoin PDP) — and we embrace it openly rather than claim a novel trustless result we cannot yet deliver. The role is *metering only*: the Singularity neither mines nor secures, holds no shard, has zero governance weight, and gains no AGNTC from verifying (its accumulation comes solely from origin yield, Section 10.3). On testnet this verifier is the trusted single coordinator; making it trustless (committee/on-chain) is a scoped mainnet milestone (Section 5A.5, Section 13.5, Section 24.3).

#### 5A.5 Honest Security by Phase

We state the real guarantee at each phase, per the feasibility analysis:

- **Testnet (buildable now on the FastAPI chain).** Content-address the vault as a Merkle-DAG; shard by CID; the Singularity stores roots and issues random-byte challenges; participants return Merkle proofs. This is **real disk + real CPU, verified cheaply, coordinator-metered** — a genuine "spend CPU+disk to secure the vault" mechanic, not simulated hand-waving. No cryptoeconomic novelty is required or claimed. The ledger is secured by the coordinator-as-committee (Section 5).
- **Mainnet (the real wall — scoped as a research milestone).** A cheap *possession* proof alone is sybil-, outsourcing-, and generation-attackable: one disk can fake N replicas, and data can be regenerated on demand. Trustless state-security needs either **Filecoin-grade unique-replica sealing (PoRep)** or **timed/keyed challenges + slashing + a trustless (committee/on-chain) verifier**, plus **Merkle-CRDTs** for convergent collaborative edits. The central-coordinator design does not provide this. Mainnet therefore either adds that layer **or** keeps the PoAIV committee as the ledger root-of-trust with vault work as the reward/stake input (the recommended interim). Section 24 (Limitations) tracks this honestly.

#### 5A.6 Why This Makes the Narrative True (and Where ZK Is Real)

The product claim is "an agentic process secures the chain." Under Proof-of-Vault this is **literally true**: participants' agents maintain and continually re-prove the collective knowledge vault with real, verifiable CPU+disk work — and they can do so **without holding any paid LLM key**. The LLM flips from a consensus *paywall* (the v1.2 liability) to an *optional content layer*: an agent may use an LLM to write better vault entries, but security comes from the storage proofs. Decentralized-AI compute (proof-of-inference) is a compelling **future incentive layer** (Section 24.10), never the security base.

The *zero-knowledge* claim is held to a strict, disclosed ladder (the full statement is Section 5B.2; we restate it here so the Proof-of-Vault section never overshoots its own rung):

- **(a) SNARK-compressed storage / possession proofs — the ZK that backs the gate.** *Real and shippable*: Filecoin SNARK-compresses possession proofs of this exact shape (WindowPoSt, ~192 bytes). **The chain ships the raw-Merkle version today — real possession, NOT yet zero-knowledge** (it reveals the sampled sub-units; Section 5A.2). The next step is to SNARK-wrap it (Poseidon + Groth16/PLONK).
- **(b) The private-state ZK layer — specified, phasing in.** The genuine, standard zero-knowledge of Section 6 (depth-26 SMT, Poseidon, nullifiers, client-side proving). It is real cryptography by design, but the **testnet uses a `SimulatedZKProof` stand-in** today; we label it *specified / phasing in*, not "live."
- **(c) ZK-proven agent *inference* (zkML) — future, dated.** Proving the agents' reasoning itself in zero knowledge is *not* production-ready (frontier models are ~5,000× beyond practical zkML; ~2027-2030 milestone, Section 24.1). We never let this rung's language imply we ZK-prove model cognition today.

The rule that governs all three: **no present-tense zero-knowledge claim above the rung that ships.** The securing proof is a *possession* proof until its SNARK wrap (rung a) lands.

**Shipped hardening (present tense, verified in code).** A small set of testnet hardening steps have since shipped and are accurately described in present tense. Challenge randomness is mixed with a public randomness beacon (drand, with a Solana-slot fallback and a deterministic local hash-chain as the last resort; real sources are enabled by operator configuration) so that sampled-PDP challenge seeds are grind-proof even against the coordinator itself. Each participant's shard pin assignments and audit (pass/miss) history are recorded durably and survive a restart. The coordinator now writes vault shards to a restart-durable backbone replica rather than holding them only in memory — still a single, disclosed custodian pending the later erasure-coded rollout across independent nodes. And the participant's own client displays their pinned bytes, their windowed audit pass-rate, and the beacon's current source and staleness — mechanism visibility, not a value or yield claim.

---

### 5B. The ZK-Agentic Gate / Proof of Agentic Work

Sections 5 and 5A describe two security layers — the PoAIV committee for the *ledger*, Proof-of-Vault for the *state*. This section names the unifying idea the brand stands on: the chain is run by **agentic possession-proven activity** — with zero-knowledge specified and phasing in (Section 5B.2) — mediated by a single universal rule at the Singularity. The model is **Proof of Agentic Work (PoAW)**: Proof-of-Vault performed by an autonomous agent, admitted via a **protocol-obedience proof** at the model-agnostic Singularity gate (a possession proof today, **not yet zero-knowledge**; its SNARK wrap is rung (a) of Section 5B.2). This is a *framing and naming* of mechanisms already specified above — not a new consensus claim — and it is stated with strict honesty about where zero-knowledge is real (Section 5B.2).

#### 5B.1 Substrate (the WHAT) vs Identity (the HOW)

The reconciliation between the brand (*zkagentic = a zero-knowledge agentic blockchain*) and the storage-based Proof-of-Vault is a separation of two questions:

- **Substrate — the verifiable WHAT.** Storage and custody of the **Knowledge Vault** (the content-addressed Merkle-DAG of Section 5A), proven by sampled possession proofs. This is real CPU + disk work and the only cheaply, cryptographically verifiable "useful work" that exists today. It is the *medium* in which obedience is demonstrated — the way iterating a hash is the medium a Bitcoin miner works in. Nobody calls Bitcoin a "SHA-256 chain"; storage is likewise the honest, verifiable medium here, not a badge.
- **Identity — the HOW.** An **autonomous agent** runs *any* model or algorithm, holds a vault shard, and to touch chain state must submit a **proof that it followed the universal protocol.** The agent, and the proof of its obedience, are the identity of the network. The chain is *agentic* because it is run by agents proving they followed the rules — and *zero-knowledge* because the proof reveals only that the rules were followed (held to the ladder of Section 5B.2).

In one sentence: **autonomous agents prove, in zero knowledge, that they performed protocol-obedient work on the network's collective memory — and only a valid proof mutates chain state.**

#### 5B.2 The 3-Rung ZK Honesty Ladder

Zero-knowledge in this protocol is held to three rungs. The governing rule is absolute: **no present-tense zero-knowledge claim may be made above the rung that ships.**

**(a) SNARK-compressed storage / possession proofs — REAL and shippable; this is the ZK that backs the gate.** Filecoin SNARK-compresses its Proof-of-Spacetime to ~192 bytes (WindowPoSt); our PDP proof (Section 5A.2) is the same shape. *Status, stated plainly:* the chain ships the **raw-Merkle possession** proof today — real custody of real bytes, cheaply verifiable — but that proof is **NOT yet zero-knowledge** (it reveals the sampled sub-units to the verifier). The single, well-scoped step that makes the brand literally true at this rung is to **SNARK-wrap** the existing PDP check: move the hash from SHA-256 to the SNARK-friendly Poseidon, build a Groth16/PLONK circuit proving "the sampled openings hash to the committed root under this block's challenge," and verify the SNARK at the securing endpoint (replacing the consensus `SimulatedZKProof` stand-in). This is the only place the brand currently outruns the code.

**(b) The private-state ZK layer — REAL design, specified and phasing in.** The zero-knowledge of Section 6 — depth-26 Sparse Merkle Tree, Poseidon hashing, nullifier-based ownership, client-side proving — is genuine, standard zero-knowledge. It is *designed* to be real cryptography, but the **testnet uses a `SimulatedZKProof` stand-in** in place of the production prover today; this document labels it *specified / phasing in*, never "live in production." The proof-system migration path (Groth16 → PLONK → Halo2/Nova) is Section 21.1.

**(c) ZK-proven agent *inference* (zkML) — FUTURE, dated.** Proving an agent's *reasoning* in zero knowledge — that a model produced a given output by faithfully executing its weights — is a frontier research target, not a 2026 production capability. zkML overhead has fallen sharply (small/medium models are within reach — e.g. VGG-16-scale circuits prove in seconds, and GPT-2-scale end-to-end proofs exist), but frontier models (>100B parameters) remain roughly 5,000× beyond practical (Section 24.1), with a realistic horizon of ~2027-2030. **We never let this rung's language imply that we ZK-prove model cognition today.** Non-ZK alternatives for AI work (optimistic re-execution, TEE attestation, subjective scoring) are admitted only at the **reward layer, never as a securing or consensus primitive** (Section 24.10).

The gate of Section 5B.3 is backed by rung (a). The model-agnosticism of the gate is, deliberately, the most defensible part of the design: the verifier checks the *proof of obedient work*, not *which brain produced it*, so we make **no** claim to verify model reasoning in zero knowledge — that would be a rung-(c) claim, and rung (c) is dated to the future.

**The same ships-now-vs-future discipline governs consensus finality (the finality firewall).** Just as we forbid present-tense ZK claims above the shipping rung, we forbid claiming that *demonstrated CPU work earns finality influence* before that work is Sybil-resistant. The finality weight — committee and leader selection — is *specified* as **AGNTC token stake only** (`W_fin`, Section 13.5) — implemented and test-guarded, but not yet wired into the live coordinator path (Section 13.5 Honest status). This is because the CPU / Proof-of-Vault leg is Sybil-weak (a possession proof is forgeable until SNARK-/PoRep-hardened — rung (a) and Section 5A.5). CPU-weighted committee selection (the original §13 dual-staking-in-finality vision) is therefore specified only as a **PoRep-gated mainnet goal**, not as a claim that the firewall itself is already live — the consensus analogue of a dated future rung. CPU still earns proportionally more *economically* today (effective stake, Section 14); whether it also buys committee seats is, today, still governed by `S_eff` under the coordinator (Honest status above) — the firewall's live-path wiring is what will finally decouple the two.

#### 5B.3 The Gate Contract

The act of changing chain state is governed by one universal, immutable rule. We state it verbatim:

> **To mutate blockchain state, a participant — running any agent, model, or algorithm — MUST submit a valid proof that it followed the protocol. The Singularity verifies the proof and nothing else. No proof → no state change. The rule is identical for everyone.**

What the proof attests **today (real, rung a):** "I hold the bytes of shard `S` hashing to committed root `R`, and I can answer this block's fresh random challenge over `S`" — a Merkle path over the sampled sub-units, bound to a per-block seed so the proof is a *live action*, not a replay. What "in zero knowledge" will mean once rung (a) ships its SNARK wrap: the verifier learns only *that* the challenge was answered correctly, never the sampled bytes.

Why model-agnosticism is the keystone:

- **Honest** — the gate checks obedient *work*, so the protocol makes no claim to verify an agent's reasoning in zero knowledge (that is rung c, dated to the future).
- **Permissionless** — no paid LLM key is required to pass the gate; the v1.2 "hold an API key to secure" paywall is retired (Section 5A.6, Section 24.8).
- **Fork-resistant in spirit** — the admission rule is *protocol-conformance*, not vendor identity, which is exactly the seed of multi-client diversity (Section 21.2).

#### 5B.4 PoAW in the Verb Model

Proof of Agentic Work is not a fourth verb; it is the *gating discipline* over the three verbs of Section 5A.3. Mining issues supply locally; securing is the CPU+disk work on a vault shard; staking bonds that work and makes it Sybil-resistant. PoAW is the statement that **none of it touches shared state except through a valid protocol-obedience proof at the gate.** The loop is unchanged: mine locally → link to the Singularity and submit a proof to secure → the bond earns the securing reward and inward standing on a passing proof, or is slashed and drifts outward on a failure (Section 15.1a, Section 19.4).

#### 5B.5 Built and Operated by Agentic Force

ZK Agentic Chain is **built and operated by agentic force.** The protocol, this whitepaper, the node software, and the chain itself are developed by an autonomous AI agent (Claude); the network is then run by agents proving protocol-obedient work. The same intelligence that builds the rules follows the rules — and proves it. We intend this as a *verifiable* differentiator, not a slogan: the origin node embeds the canonical whitepaper version and lineage hash on-chain (Section 24.9), and the development history carries a `Co-Authored-By: Claude` trail that is auditable rather than decorative.

This claim is **carefully bounded.** It is a claim of (1) *provenance* — an AI agent authored the artifacts — and (2) *proof-of-work-obedience* — the network's participants prove they followed the protocol. It is **not** a claim of *proof-of-cognition*: we do not assert, and the protocol does not verify, that any agent's reasoning is correct or proven in zero knowledge (that is the dated rung-(c) milestone of Section 5B.2). The claim is further **quarantined from any financial representation**: "built and operated by agentic force" describes how the software is made and run, and says nothing about the token's price, worth, returns, or investment merit.

---

### 6. Privacy Architecture

#### 6.1 ZK Private Channels

ZK Agentic Chain is designed to provide verification-layer privacy through *ZK private channels* — isolated communication pathways between AI agents where data is verified but never exposed in plaintext to the broader network [29]. *(testnet status: simulated stand-in — §5B.2)*

The design inverts the traditional blockchain transparency model. In Bitcoin and Ethereum, all transaction data is public; validators read and verify the same data that every other node can see. In Zcash and Aztec, transaction data can be hidden from observers, but validators still interact with the data (or its encrypted form) during proof generation. In ZK Agentic Chain, the verification agents themselves operate within a privacy boundary — they receive ZK proofs as input and produce attestations as output, never accessing the underlying state that the proofs describe.

This architecture provides *private-by-default* semantics: unlike public ledgers where privacy is opt-in (e.g., shielded transactions in Zcash), all state in ZK Agentic Chain is private unless explicitly published by the user. A user who wishes to make a transaction public can do so by publishing the plaintext alongside the proof, but the default mode is private.

#### 6.2 Sparse Merkle Tree (Depth 26)

Each user's ledger space is backed by a Sparse Merkle Tree [43] of depth 26 (MERKLE_TREE_DEPTH = 26), supporting 2^26 = 67,108,864 leaf nodes. The SMT provides efficient membership proofs (proving that a specific leaf exists at a specific position) and non-membership proofs (proving that a specific position is empty) without revealing any information about non-queried leaves.

State transitions — such as advancing standing, transferring AGNTC, or updating subgrid allocation — modify the SMT by updating the relevant leaf nodes and recomputing the root hash along the path from leaf to root. The new root hash is committed on-chain as the user's current state root. A ZK proof accompanies each state transition, proving that the new root was correctly derived from the old root given the claimed operation.

The choice of depth 26 balances capacity (67 million leaves per user — sufficient for all foreseeable state entries) against proof size (26 hash computations along the Merkle path). The SMT uses Poseidon hashing [11] (Section 6.3) rather than SHA-256, reducing the in-circuit cost of Merkle path verification by approximately 100x.

#### 6.3 Nullifier-Based Ownership

The ownership proof system follows the Zcash Sapling design [5], adapted for the ZK Agentic Chain's note-based private state model.

**Note commitment.** Each state entry (a "note") is committed using a Poseidon hash:

```
commitment = Poseidon(value, owner_pubkey, randomness)
```

The commitment is stored as a leaf in the user's SMT. The plaintext values (value, owner_pubkey, randomness) are known only to the note owner.

**Nullifier derivation.** To "spend" a note (consume it in a state transition), the owner computes a nullifier — a unique, deterministic value derived from the note and the owner's private key:

```
nullifier = PRF_nk(note_position)
```

Where `nk` is the nullifier deriving key (derived from the owner's spending key) and `note_position` is a position-dependent value within the SMT.

**Double-spend prevention.** The nullifier is published on-chain when the note is spent. Full nodes maintain a global nullifier set; any transaction whose nullifier already appears in the set is rejected. Because the nullifier is derived from the spending key, only the legitimate owner can compute it. Because the nullifier reveals nothing about which note was spent (it appears as a random field element), observers cannot link spending events to specific commitments.

**ZK proof for spending.** A spend transaction includes a ZK proof that demonstrates, without revealing:

1. Knowledge of a valid note with commitment `cm` that exists in the SMT at some path
2. Knowledge of the spending key that derives to the nullifier key `nk`
3. The nullifier was correctly computed from `nk` and the note position
4. The note's value satisfies any constraints required by the transaction (e.g., sufficient balance for a transfer)

**Hash function: Poseidon.** All hashing within ZK circuits uses the Poseidon hash function [11] — a SNARK-friendly algebraic hash designed for zero-knowledge proof systems. Poseidon operates natively over prime fields, requiring approximately 100x fewer constraints in R1CS (Rank-1 Constraint Systems) than SHA-256. It is used by Aztec [24], Zcash Orchard [5], Semaphore, and most production ZK systems as of 2025.

#### 6.4 ZK Proof Stack

The protocol's ZK proof requirements span four use cases, each with distinct performance characteristics:

**Resource ownership proofs.** Prove "I own at least X AGNTC" without revealing the exact balance. These are frequent, small proofs triggered by Secure actions and transfers.

**Subgrid state proofs.** Prove that a user's 8x8 private subgrid (64 cells) has been correctly updated — that the new state root is a valid transformation of the old state root given the declared operations. These are moderate-frequency proofs triggered by subgrid allocation changes.

**NCP privacy proofs.** Prove that a Neural Communication Packet was sent by a valid network participant within their messaging quota, without revealing the sender's identity. These use a Rate-Limiting Nullifier (RLN) [44] design derived from Ethereum Foundation's Privacy and Scaling Explorations work.

**Storage-possession proofs (the gate, rung a).** Prove "I hold the bytes of my assigned vault shard hashing to committed root `R`, and I answered this block's challenge over a random sample." This is the proof that backs the ZK-Agentic Gate (Section 5B.3). *Honest status:* the chain ships this as a raw-Merkle **possession** proof today (SHA-256, sampled-PDP, Section 5A.2) — real custody, cheaply verifiable, but **not yet zero-knowledge** (it reveals the sampled sub-units to the verifier). Only once SNARK-wrapped will it hide the sampled bytes. Making it zero-knowledge is a single well-scoped step: recompute the sampled openings under the SNARK-friendly **Poseidon** hash inside a Groth16/PLONK circuit that proves "the openings hash to `R` under the challenge," and verify the SNARK at the securing endpoint. This is exactly the pattern Filecoin already runs in production — its WindowPoSt SNARK-compresses the same shape of possession proof to ~192 bytes [15] — so this rung is a port of a deployed technique, not a research bet. Until that wrap lands, this document calls the deployed proof a *possession proof*, never a "ZK proof."

The proof stack evolves across protocol phases:

| Phase | System | Setup | Proof Size | Use |
|-------|--------|-------|-----------|-----|
| Testnet | Groth16 [6] (Circom + snarkjs) | Per-circuit trusted | ~192 bytes | Fastest verification, smallest proofs |
| Alpha | PLONK [7] (Noir + Barretenberg) | Universal, updateable | ~800-900 bytes | One ceremony for all circuits |
| Beta | PLONK + RLN [44] | Universal | ~800 bytes | NCP rate-limiting privacy |
| Mainnet | Halo2 [8] or Nova [27] | None (transparent) | ~2-10 KB | No trusted setup, recursive epoch proofs |

> **Implementation honesty.** Sections 6.1–6.6 specify the production zero-knowledge design; on the *testnet* the consensus privacy proof is a `SimulatedZKProof` stand-in rather than a live Groth16/PLONK prover (this is rung (b) of the ladder in Section 5B.2, labeled *specified / phasing in*). Separately, the storage-possession proof that backs the gate (the fourth use case above, rung (a)) ships as a real raw-Merkle PDP proof but is **not yet SNARK-wrapped**, and is therefore a *possession* proof rather than a zero-knowledge one until that wrap lands.

#### 6.5 Client-Side Proving

Following Aztec's architectural model, ZK Agentic Chain performs proof generation on the client side — sensitive data never leaves the user's device.

When a user modifies their subgrid state, the process is:

1. The user's browser computes the new subgrid state locally
2. The browser generates a ZK proof that the new state root is a valid transition from the old state root, using NoirJS (browser-compatible ZK prover) or snarkjs WASM
3. Only the proof and the new state root hash are submitted to the network
4. Verification agents validate the proof without ever seeing the subgrid contents

This design ensures that subgrid allocation (which cells are assigned to Secure, Develop, Research, or Storage) remains private to the owner. Other users can see that a node exists at a seat (rank `k`), but not how its internal resources are allocated.

#### 6.6 Circuit Architecture

The ZK proof pipeline uses a two-tier proving system:

1. **Per-transaction proofs (Groth16 [6]):** Each state transition (transfer, claim, stake) is proved individually using a Groth16 SNARK with BN254 pairing. Groth16 provides the smallest proof size (~192 bytes on BN254) and fastest verification time (~6ms), at the cost of requiring a trusted setup per circuit.

2. **Batch proofs (Recursive PLONK [7]):** Multiple per-transaction proofs are aggregated into a single batch proof using recursive PLONK composition. This reduces on-chain verification cost: instead of verifying 13 Groth16 proofs per block, validators verify 1 recursive proof.

```
Transaction Flow:
  User constructs tx -> Client generates Groth16 proof ->
  Block proposer collects proofs -> Recursive PLONK aggregation ->
  Committee verifies single batch proof -> State root updated
```

**Estimated constraint counts** (subject to circuit implementation):

| Circuit | Estimated Constraints | Proving Time (est.) |
|---------|----------------------|---------------------|
| Transfer (nullifier + commitment) | ~50,000 | ~2s (client-side) |
| Seat claim / rank advance | ~30,000 | ~1s |
| Stake/unstake | ~40,000 | ~1.5s |
| Batch aggregation (per block) | ~200,000 | ~10s (proposer) |

**Figure 3: ZK Proof Pipeline**

```
  User (client-side)        Block Proposer          Committee
  ==================        ==============          =========
  Construct transaction
         |
  Generate Groth16 proof -> Collect tx + proofs
  (~2s per tx)                     |
                            Aggregate via recursive
                            PLONK (~10s per block)
                                   |
                            Propose block + ------> Verify batch proof
                            batch proof             (~6ms)
                                                         |
                                                    AI verification
                                                         |
                                                    9/13 Attestation
```

---


## Part III: Consensus and Security

### 7. BFT Ordering and Finality

#### 7.1 Block Production

ZK Agentic Chain targets a block time of 60 seconds (BLOCK_TIME_MS = 60,000). Each block contains up to 50 transactions (MAX_TXS_PER_BLOCK = 50), ordered by a designated block proposer (leader) selected through the same VRF mechanism used for committee selection — and therefore weighted by the **same token-only finality weight** `W_fin` (the finality firewall, Section 13.5) (specified; live-path staged — §13.5): both leader and committee selection exclude the Sybil-weak CPU leg until it is PoRep-hardened.

Blocks are organized into epochs of 100 slots each (SLOTS_PER_EPOCH = 100). An epoch represents the base unit of network lifecycle management: agent warmup periods, probation durations, and activity-decay/seat-drift windows are all measured in epochs. At the standard block time, one epoch lasts approximately 100 minutes.

The block production pipeline proceeds as follows:

1. The leader collects pending transactions from the mempool
2. The leader orders transactions and constructs a candidate block
3. The candidate block is broadcast to the 13-member verification committee
4. The committee executes the commit-reveal verification protocol (Section 5.3)
5. Upon receiving 9 or more matching VALID attestations, the block is finalized
6. The finalized block is appended to the chain and broadcast to all nodes

#### 7.2 Byzantine Fault Tolerance

The 13-agent committee tolerates up to f = 4 Byzantine agents — agents that may crash, produce incorrect attestations, or actively attempt to subvert consensus. This tolerance follows from the standard BFT bound [12]:

```
f = floor((k - 1) / 3) = floor((13 - 1) / 3) = 4
```

The consensus threshold t = 9 satisfies the BFT safety requirement:

```
t = 9 = 2f + 1 = 2(4) + 1 = 9
```

Since t = 2f + 1, the protocol achieves optimal Byzantine tolerance: it tolerates the maximum number of faulty agents possible under the BFT bound. Safety is guaranteed: no two conflicting blocks can both receive 9 attestations, because that would require at least 9 + 9 - 13 = 5 agents to attest to both blocks, exceeding the Byzantine tolerance of 4.

The small committee size (13) makes even PBFT's O(n^2) message complexity trivial — 13^2 = 169 messages per round, well within the capacity of any modern network link. However, the protocol is designed with future scaling in mind: the committee selection and attestation aggregation mechanisms are compatible with HotStuff's [13] O(n) linear complexity, enabling expansion to larger committee sizes without protocol changes.

#### 7.3 ZK Proof Finality

ZK Agentic Chain provides deterministic finality — once a block is finalized, it cannot be reverted. There are no probabilistic confirmations, no longest-chain-wins fork resolution, and no reorg risk beyond the 60-second finalization window.

The finality target is 20 seconds after block proposal (ZK_FINALITY_TARGET_S = 20). A block achieves irreversible finality when:

1. At least 9 of 13 committee members have revealed matching VALID attestations
2. All ZK proofs included in the block have been verified by the committee
3. The block's state root has been confirmed consistent with the previous block's state root plus the applied transactions

Once these conditions are met, the block is appended to the chain with a finality certificate — an aggregation of the 9+ attestations that proves consensus was achieved. This certificate is compact (a few hundred bytes regardless of block contents) and can be verified by any node or light client.

#### 7.4 Comparison with Existing BFT Protocols

| Property | PBFT [12] | HotStuff [13] | Tendermint [14] | ZK Agentic Chain |
|----------|------|----------|-----------|-----------------|
| Message complexity | O(n^2) | O(n) | O(n) | O(n^2) (acceptable at n=13) |
| Rounds to finality | 2 | 3 | 2 | 2 (commit + reveal) |
| Leader failure handling | View change | Leader rotation | Timeout + nil block | Re-proposal |
| Max practical validators | ~100 | ~1000 | ~150 | 13 (current), scalable |
| Finality type | Deterministic | Deterministic | Deterministic | Deterministic |
| Verification intelligence | None | None | None | AI reasoning |

The primary distinction is not in the BFT mechanics (which are well-established) but in the *content* of verification: ZK Agentic Chain's committee members apply reasoning to their audits rather than executing purely deterministic checks.

#### 7.5 Cross-User State Verification

Each user's private state is a subtree in the global Sparse Merkle Tree (depth 26). The global state root is a commitment to all subtrees. Verifiers confirm global consistency as follows:

1. The block proposer computes the new global state root after applying all transactions.
2. For each transaction, the proposer provides a ZK proof that the state transition is valid WITHOUT revealing the contents of any user's subtree.
3. Verifiers check: (a) the ZK proof is valid, (b) the new state root is consistent with the previous root plus the proved transitions, (c) no nullifier is reused (double-spend prevention).

The ZK circuit for state transitions proves:
- The old leaf existed in the tree (Merkle inclusion proof)
- The nullifier is correctly derived from the old leaf (prevents double-spend)
- The new leaf is correctly computed (balance update, ownership transfer)
- The new root is the result of replacing the old leaf with the new leaf

At no point does any verifier see the contents of any user's subtree. They see only: nullifiers (which are unlinkable to leaf positions), commitments (which are hiding), and the global root (which commits to all state without revealing it).

---

### 8. Security Analysis

#### 8.1 Adversary Model

We consider a computationally bounded adversary A (PPT) operating under the following assumptions:

- **Network model:** Partial synchrony [45]. Messages between honest nodes are delivered within a known bound Delta after GST (Global Stabilization Time). Before GST, the adversary controls message ordering.
- **Corruption model:** Adaptive corruption of up to t < n/3 committee members per block (i.e., up to 4 of 13). Corruption means full control of the agent's signing key and model.
- **Computational bound:** A runs in polynomial time in the security parameter lambda.
- **AI model access:** A may fine-tune or replace AI models on corrupted agents. A may craft adversarial inputs (prompt injection) but cannot modify the verification schema enforced by honest agents.

The adversary model above governs the **ledger** layer (PoAIV committee). The **state** layer (Proof-of-Vault, Section 5A) faces a distinct threat surface — sybil, outsourcing, and on-demand-regeneration attacks against cheap possession proofs — whose testnet mitigations (replication + slashing + a coordinator-verifier) and mainnet research milestones (unique-replica sealing, trustless verifier) are analyzed in Section 5A.5 and Section 24.

#### 8.2 Security Properties

We define three core security properties for PoAIV:

**Property 1: Verification Integrity (VER-INT)**
No PPT adversary controlling fewer than 5 of 13 committee members can cause the committee to finalize a block containing an invalid state transition, except with negligible probability.

**Property 2: Verification Privacy (VER-PRIV)**
The verification process reveals no information about the contents of private ledger spaces beyond the validity assertion (APPROVE/REJECT), even to committee members.

**Property 3: Committee Unbiasability (COM-UNBIAS) — specified; holds when the finality firewall is live**
No PPT adversary controlling less than 1/3 of total **finality weight** (staked AGNTC; the token-only `W_fin` of the finality firewall, Section 13.5 — committee composition is specified to be weighted by token stake, not effective stake) can predictably influence committee composition beyond their proportional representation, except with negligible probability. On the current coordinator testnet, selection runs on `S_eff`, so this property's guarantee arrives with the trustless-verifier stage.

*Full formal definitions as cryptographic games and proofs are provided in the companion PoAIV Formal Paper.*

#### 8.3 Sybil Resistance

Sybil attacks — where a single adversary creates multiple identities to gain disproportionate influence — must be analyzed **separately for finality and for earnings**, because the finality firewall (Section 13.5) weights the two differently.

**Finality (specified — token dimension only; live-path staged, §13.5).** Committee and leader selection are *specified to be* weighted by **AGNTC token stake alone**, once the firewall's live-path wiring lands (today, live selection still runs on `S_eff` under the coordinator — Honest status, §13.5). The token weight for *finality* is therefore specified to become effectively 1.0, not α = 0.40: an attacker will then need to acquire a significant fraction of the total *staked AGNTC* to gain meaningful committee representation, and that will be the **whole** of the finality Sybil cost. The CPU leg is *specified to be* **deliberately excluded** from finality because cheap, Sybil-weak Proof-of-Vault work would otherwise let an adversary buy committee seats by forging storage proofs (one disk presenting as many — Section 5A.5) — today, before that exclusion is wired live, the CPU leg still weighs in via `S_eff`. This is the security purpose of the firewall: once live, we will **not** rely on the CPU axis for finality Sybil-resistance.

**Earnings (current behaviour — both dimensions).** *Reward share* remains governed by the dual-staking effective stake `S_eff = α·token + β·cpu` (β = 0.60). To capture a disproportionate share of *rewards*, an adversary must still provision proportional committed CPU+disk — sustained infrastructure that, unlike an instant token purchase, cannot be faked cheaply (challenge-response VPU benchmarks, sampled-PDP proofs). But inflating *measured* CPU buys earnings, not finality.

**Dual-axis finality hardening (mainnet goal).** The original dual-staking claim — that requiring investment along *both* axes simultaneously makes a finality Sybil attack ≈2.5× more expensive than pure PoS (derivation below) — is premised on CPU stake *weighting committee selection*. Under the finality firewall that premise does not hold once the firewall is live (specified; §13.5) — at that point finality cost = token cost — so we relabel the 2.5× result as the **PoRep-gated mainnet target**: once committed CPU+disk is Sybil-resistant (Proof-of-Replication sealing + a trustless verifier, Section 13.5), the CPU leg can re-enter finality weighting and the dual-axis cost multiplier applies. Until then it characterizes earnings concentration and the future finality design, not present finality Sybil-resistance.

#### 8.4 AI Model Integrity

The use of AI agents as consensus participants introduces attack surfaces not present in traditional blockchain protocols:

**Deterministic inference.** Verification agents run deterministic model inference: given the same input (block data + chain state), the same model version must produce the same attestation. Non-deterministic behavior (e.g., temperature > 0 in sampling) is prohibited in verification mode. This ensures that honest agents processing the same block will reach the same conclusion.

**Commit-reveal anti-copying.** The commit-reveal protocol (Section 5.3) prevents a Byzantine agent from waiting for honest agents' attestations and copying them. The agent must commit to its attestation before seeing others' results.

**Model update governance.** AI model versions used for verification are specified in the protocol state. Updating to a new model version requires an on-chain governance proposal with supermajority approval. This prevents unilateral model changes that could introduce subtle verification biases or vulnerabilities.

**Model diversity.** The three-tier model system (Haiku, Sonnet, Opus) ensures that the verification committee is not composed of identical instances. Different model architectures and sizes have different failure modes; a vulnerability in one tier is unlikely to affect all three.

#### 8.5 Liveness Guarantees

The protocol maintains liveness (continued block production) under the following conditions:

**Normal operation.** With 80% or more of validators online, blocks are produced at the standard 60-second interval with full transaction processing.

**Degraded operation (safe mode).** When more than 20% of validators go offline (SAFE_MODE_THRESHOLD = 0.20), the protocol enters safe mode. In safe mode:

- Block production continues with a reduced committee drawn from remaining online validators
- Critical operations (AGNTC transfers, Secure staking, block validation) proceed normally
- Non-critical operations (subgrid changes, NCP messaging, content storage) are suspended
- The reduced committee size maintains the 2/3 honest threshold among available validators

**Recovery.** Safe mode exits when 80% or more of validators are back online (SAFE_MODE_RECOVERY = 0.80). Returning validators enter a monitoring period before resuming full participation.

This design prevents liveness failures from cascading into safety violations: the network degrades gracefully rather than halting entirely.

#### 8.6 Threat Model for AI-Verified Chains

ZK Agentic Chain's use of AI in consensus introduces threat vectors unique to AI-verified systems:

**Model poisoning.** An adversary could attempt to corrupt the training data or fine-tuning process of verification models to introduce systematic biases — for example, causing the model to approve invalid state transitions that match a specific pattern. **Mitigation:** Verification models are provided by Anthropic and updated only through governance votes. The commit-reveal protocol means a poisoned model would produce divergent attestations, triggering the dispute resolution process (Section 15.4).

**Prompt injection.** Adversarial transaction data could be crafted to manipulate the verification agent's reasoning — embedding instructions in transaction metadata that cause the agent to approve invalid blocks. **Mitigation:** Verification agents operate in a constrained mode with no free-text interpretation. Input to the verification function is structured data (block headers, transaction fields, ZK proofs), not natural language. The agent's system prompt explicitly restricts it to verification operations.

**Model collusion.** If all agents in a committee use the same underlying model weights, a systematic vulnerability in those weights could produce coordinated incorrect attestations. **Mitigation:** The three-tier system ensures model diversity. Additionally, the dispute resolution process (2x committee re-verification with 26 agents) provides a second check against systematic model failures.

**Inference cost attacks.** An adversary could construct blocks with transactions specifically designed to maximize verification compute cost, attempting to exhaust agents' CPU budgets or cause timeouts. **Mitigation:** Transaction complexity is bounded by MAX_TXS_PER_BLOCK = 50, and the 60-second hard deadline prevents unbounded verification time. Blocks that cannot be verified within the deadline are rejected.

#### 8.7 Economic Security

The 9/13 supermajority threshold requires an attacker to control at least 69.2% of the committee's **finality weight** to unilaterally produce invalid blocks. Under the finality firewall *as specified* (live-path staged — §13.5), the finality weight is **token stake only**, so acquiring finality influence means:

- At least 69.2% of the total **staked AGNTC supply** (the sole finality-weighting axis once the firewall is live; today's coordinator pipeline weights `S_eff`).

The CPU / Proof-of-Vault axis intentionally provides **no** finality discount: an adversary cannot substitute cheap (and, pre-PoRep, Sybil-forgeable) storage proofs for token stake to reach the threshold. *(Mainnet goal: once committed CPU+disk is PoRep-hardened and re-admitted to finality weighting per Section 13.5, dominating finality will require 69.2% of **both** the staked AGNTC supply **and** the total committed CPU+disk — the dual-axis cost the firewall defers until the CPU leg is Sybil-resistant.)*

The cost of this attack scales with the total value staked in the network. Combined with slashing (Section 15) — which burns the attacker's stake upon detection — the expected cost of a sustained attack exceeds the potential gain from any single invalid block.

Dispute resolution provides an additional economic deterrent: if the original 13-member committee's result is challenged, a 26-member committee (DISPUTE_REVERIFY_MULTIPLIER = 2) re-verifies the block. If the re-verification contradicts the original, all original attestors who voted incorrectly are slashed. This means an attacker who successfully corrupts one committee faces a second, larger committee with fresh agent selection — making sustained attacks exponentially more expensive.

#### 8.8 What Survives Compromised Components

| Compromised Component | Properties Preserved | Properties Lost |
|-----------------------|---------------------|-----------------|
| Single AI model family | VER-INT (threshold), VER-PRIV, COM-UNBIAS | None (below threshold) |
| All AI models (catastrophic) | VER-PRIV (ZK still holds), COM-UNBIAS | VER-INT degrades to deterministic-only |
| Trusted setup (Groth16) | VER-PRIV (soundness lost, but ZK preserved) | VER-INT (adversary can forge proofs) |
| Singularity coordinator (testnet trust assumption) | VER-INT, VER-PRIV, COM-UNBIAS (ledger safety intact) — **the finality firewall *as specified* makes this clean once live (§13.5 Honest status); on the current testnet the coordinator's trust scope includes selection** | State-layer measurement reliability and *earnings* fairness — CPU/storage-proof metering can be biased (inflating an attacker's reward share — and, until the trustless-verifier stage, its live finality weight too, since selection still runs on `S_eff`) until the mainnet committee/on-chain verifier replaces it (Sections 13.5, 24.3) |

#### Sybil Cost Derivation

**Scope (read first — finality firewall).** The following derivation analyzes the cost of dominating selection *when CPU stake weights it*. Under the finality firewall as specified (Section 13.5), CPU stake does **not** weight finality, so the finality Sybil cost becomes simply the token cost (live with the trustless-verifier stage; today's cost model runs on `S_eff`) (the pure-PoS line below, `X`). The dual-axis 2.5× result is therefore the **PoRep-gated mainnet target** — what the cost becomes once committed CPU+disk is Sybil-resistant and re-admitted to the finality weight — and, today, a characterization of *earnings* concentration (reward share still tracks effective stake). It is retained, not deleted, because it specifies the design we are hardening toward.

**Claim (mainnet goal / earnings characterization):** Controlling 1/3 of effective stake in dual-staking costs approximately 2.5x more than controlling 1/3 of stake in pure PoS.

**Derivation:**
- In pure PoS: Cost = (1/3) * total_token_value = X
- In dual staking: S_eff = 0.40*(T/T_total) + 0.60*(C/C_total)
- To achieve S_eff >= 1/3, adversary needs both token and CPU components
- Token cost scales linearly with market cap (liquid market)
- CPU cost scales with ongoing operational expenditure — the opex of provisioning and continuously operating real CPU + disk capacity to hold, serve, and re-prove vault shards (Proof-of-Vault, Sections 5A and 13.2), not a one-time purchase
- The CPU component introduces a continuous cost floor: even if an adversary acquires tokens cheaply, holding 55.6% of the network's committed storage capacity requires sustained spending on hardware, power, bandwidth, and the compute to answer sampled-PDP challenges every cycle
- **Empirical estimate:** matching 55.6% of a 100-validator network's committed CPU + disk capacity is an ongoing infrastructure cost (servers, storage, power, bandwidth) that recurs for the full duration of the attack, in contrast to a one-time token acquisition cost; an adversary who lets shards lapse fails challenges and is slashed (Section 15.1a)
- The ratio of total cost (one-time + ongoing) to pure-PoS cost (one-time only) ranges from 2.0x to 3.0x depending on attack duration; we conservatively estimate 2.5x

---


## Part IV: Token Economics

### 9. AGNTC Token Overview

#### 9.1 Token Identity

AGNTC (Agentic Coin) is the native token of the ZK Agentic Chain protocol. It serves as the unit of account and medium of exchange within the network.

**Current deployment:** AGNTC is deployed as a Solana SPL token with 1 billion units minted at the contract address:

```
3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd
```

**Future deployment:** Upon mainnet launch of ZK Agentic Chain as an independent Layer-1 network, AGNTC becomes the native chain token with the same **1 billion fixed supply**, released to participants through subgrid Secure mining on the phyllotaxis lattice (Section 10.1).

#### 9.2 Token Utility

AGNTC serves four primary functions within the protocol:

**Gas.** Every on-chain transaction requires AGNTC as gas payment. Transaction fees are split: 50% is permanently burned and 50% is distributed to verifiers and stakers (Section 12).

**Staking.** Validators must stake AGNTC alongside CPU compute resources to participate in block verification. The staked AGNTC is the **finality weight** that determines **committee (and leader) selection probability** — under the finality firewall (Section 13.5), selection is weighted by token stake alone (specified; live-path staged — §13.5). The staked amount also contributes the token component (alpha = 0.40) to the dual-staking effective stake `S_eff`, which determines **reward share**; the CPU leg (beta = 0.60) adds to reward share but not, at this phase, to selection.

**Governance.** Human AGNTC holders vote on protocol parameters (hardness multiplier, fee burn rate, staking weights), model updates, and network upgrades. Voting power is proportional to staked AGNTC. The Singularity is excluded from governance — only human participants (Community, Professional, Founders) may cast votes (Section 21.2).

**Resource economy.** Within the game interface, AGNTC represents the primary tradeable resource. It is earned through mining (Secure actions), spent on agent deployment, data storage, and NCP messaging, and traded between users.

#### 9.3 Solana Phase and Layer-1 Migration

The protocol follows a phased deployment strategy, beginning on Solana and migrating to an independent Layer-1 chain:

**Phase 1 — Token Launch (current).** 1 billion AGNTC minted as a Solana SPL token, with its mint authorities renounced. Network participation is **earned through work on the testnet, not purchased — there is no pre-mainnet sale** (disclosure #1). Any establishment of on-chain liquidity is a **post-mainnet step contingent on legal-counsel review** — not offered, promised, or scheduled here.

**Phase 2 — Testnet (current).** The ZK Agentic Chain testnet operates as a Python FastAPI simulation running the full protocol logic: PoAIV consensus, phyllotaxis band growth, mining hardness, subgrid allocation, and emergent mining distribution. The game UI (built in Next.js with PixiJS rendering) connects to the testnet, providing a functional prototype of the phyllotaxis standing economy.

**Phase 3 — Mainnet development.** Production blockchain implementation in Rust. ZK proof system integration progressing through the stack defined in Section 6.4 (Groth16 to PLONK to Halo2). AI verification pipeline hardening, security audits, and formal verification of critical protocol components.

**Phase 4 — Mainnet launch and migration.** ZK Agentic Chain deploys as an independent Layer-1 network. Token migration is executed via a lock-and-mint bridge:

1. Users lock their Solana SPL AGNTC in a bridge contract on Solana
2. An equivalent amount of native L1 AGNTC is minted on ZK Agentic Chain
3. The bridge is bidirectional — users can move AGNTC back to Solana if desired
4. Migration ratio is 1:1 with no fee or slippage
5. The protocol offers no yield, bonus, or return for migrating; migration is at the participant's discretion (disclosure #1)

**Phase 5 — Ecosystem expansion.** Third-party agent deployment marketplace, cross-chain bridges to Ethereum and Cosmos (via IBC), governance system activation, and NCP protocol launch.

---

### 10. Supply and Distribution

#### 10.1 Total Supply Architecture

AGNTC has a **fixed total supply of 1,000,000,000 (1 billion) tokens.** The full supply is minted once, at the token-distribution layer (the Solana SPL contract, Section 9.1); the protocol never mints beyond this cap. Two complementary layers govern the token:

- **Distribution layer (the fixed 1B).** The entire supply exists from the contract's inception and is allocated across defined buckets — the community/earned share, ongoing participation rewards, and the operating reserves needed to launch and sustain the network (Section 10.1.1). No mechanism can increase the 1B total.
- **Internal economy (how the earned share reaches participants).** The participation buckets are not handed out administratively; they are released to participants through subgrid Secure mining on the phyllotaxis lattice (Section 16). The live chain carries its own internal genesis of 900 AGNTC (Section 10.1.2) and releases the participation buckets at a rate bounded by the **5% annual ceiling** — which is not an open-ended inflation allowance but a *rate limit on releasing the fixed buckets*, so cumulative issuance can never exceed the 1B cap. Increasing per-band mining hardness and sustained fee burns constrain the effective circulating supply further still.

#### 10.1.1 Allocation of the Fixed Supply

The 1B supply is allocated across six buckets. The community/earned majority — participation mining, ongoing emissions, and ecosystem — is **58%**; the operating reserves (team, treasury, liquidity) are released on **published, smoothed schedules**, never all at once.

| Allocation | Share | AGNTC | Purpose |
|---|---|---|---|
| Participation mining | 25% | 250,000,000 | Earned by participants through mining and securing during the network's extended free participation period (Section 10.1.3). Distributed by pro-rata conversion; unclaimed tokens return to the treasury. |
| Ongoing emissions | 25% | 250,000,000 | Continued mining / securing / staking rewards on the live chain after the participation period — the earned engine continues, drawn from this fixed pool rather than open-ended inflation. |
| Team | 18% | 180,000,000 | Contributors and advisors, on a published multi-year vesting schedule (Section 10.2). |
| Treasury | 14% | 140,000,000 | Protocol development, audits, and operations, governed on-chain. |
| Liquidity | 10% | 100,000,000 | Exchange and on-chain liquidity provisioning. |
| Ecosystem | 8% | 80,000,000 | Grants, integrations, and contributor incentives. |
| **Total** | **100%** | **1,000,000,000** | |

All unlock schedules are public. The fixed cap replaces any notion of open-ended inflation: the "5% ceiling" referenced throughout this paper is the per-epoch *release rate* of the participation and emissions buckets, not a licence to mint new supply above 1B.

**Mining is the sole supply-*issuing* mechanism on the live chain.** Participation and emissions AGNTC reaches participants through one pathway: a node's private subgrid releases AGNTC from its active Secure cells (Section 16), drawing down the fixed participation and emissions buckets. The team, treasury, liquidity, and ecosystem buckets are **pre-defined allocations of the fixed 1B — not new issuance** — released on the published schedules of Section 10.1.1. Nothing mints supply above the 1B cap; if no node secures, no participation AGNTC is released.

Note the verb separation introduced in v1.3: **mining** is local AGNTC *issuance* in a node's subgrid; **securing** is the *verifiable resource commitment* of CPU+disk to the collective knowledge vault, proven through the Singularity link (Section 5A). Mining can run locally, but mining that is not linked to the Singularity is unfinalized and unrewarded — issuance is attested by securing. The phrase "if no node secures, no new AGNTC enters circulation" means: without the securing link that attests vault work, mined AGNTC is not finalized.

**Supply burns** contract the circulating supply through two channels:
- **50% transaction fee burn** — permanently removes AGNTC on every on-chain action (Section 12)
- **Singularity accumulation** — the Singularity is permanently bound to the core (`k = 0`, origin; Section 4.5) and never sells AGNTC; the continuous yield of the most productive single node on the lattice flows into a never-selling protocol reserve (Section 10.3)

**Signup bonus:** Each new user registration mints 1 AGNTC as a signup bonus, ensuring every participant enters the economy with a non-zero balance. This minor supply expansion is subject to the same inflation ceiling enforcement.

#### 10.1.2 Internal-Economy Genesis

**Internal genesis supply:** 900 AGNTC. This is the *live-chain* economy's starting point — distinct from the fixed 1B distribution layer above — corresponding to the chain's nine genesis seats. At protocol launch, **only the Singularity is seated** (the core, `k = 0`); its 100 AGNTC is credited to the Singularity accumulator at genesis. The innermost competitive ranks are open at launch and the remaining 800 AGNTC enters circulation only as participants join and their subgrids mine — there is no pre-seeded ring of claims.

| Seat | Rank | Initial Owner | AGNTC |
|------|------|---------------|-------|
| Singularity core | k = 0 (origin) | Singularity (permanent) | 100 (minted at genesis) |
| Inner band seats | k = 1, 2, 3, … | Open | minted via subgrid mining as participants join and secure |

The open inner ranks carry no faction binding. The historical v1.0 "Community Master" / "Machines Master" names and the v1.1 eight pre-seeded ring-1 cells are both retired; under v1.2 nothing but the core is seated at genesis.

#### 10.1.3 Participation Distribution

The 25% participation-mining bucket (250,000,000 AGNTC) is allocated by **earned participation, not by sale.** During an extended, free participation period, the network runs as a public testnet on which participants mine and secure exactly as the live protocol prescribes; each participant's recorded protocol work over the period determines their share of the bucket at mainnet, through a **pro-rata conversion**:

```
share_i = (score_i / Σ_j score_j) × POOL,    POOL = 250,000,000 (fixed)
```

Because `POOL` is a fixed constant, the sum of all shares equals the pool exactly — or less, if part is withheld for ineligible participants and returned to the treasury — **regardless of how many participants take part or how the displayed mining rate is calibrated.** The total is bounded by construction; no growth in participation can cause it to exceed the 250M allocation.

Distribution properties:

- **Earned for work, not purchased.** Participation AGNTC is allocated for verifiable protocol work performed during the period. There is no purchase, no pre-sale of this bucket, and no representation of any monetary outcome.
- **Identity-gated.** At mainnet, eligible participants complete identity and proof-of-personhood verification (anti-Sybil) and claim their pro-rata share within a generous claim window.
- **Unclaimed returns to treasury.** Shares left unclaimed return to the treasury rather than being recycled to active participants.
- **Early-contribution weighting.** The displayed mining rate declines on a published schedule keyed to verified-participant milestones, so sustained early contributors carry proportionally more weight — while the pro-rata cap fixes the total at 250M irrespective of the rate.
- **Time-weighted, anti-Sybil scoring.** Scoring weights sustained, genuine protocol work; the conversion formula is identical for every participant.

This earned-participation model directs the community bucket to the participants who actually ran and secured the network during its formative period, while the fixed cap and pro-rata conversion remove any dependence on predicting participant numbers.

#### 10.2 Mining-Driven Distribution

Newly minted AGNTC flows directly to the participant whose subgrid mines it. There is no per-faction split, no automatic faction-treasury allocation, and no protocol-enforced proportionality — distribution is fully emergent from participant behavior.

| Constraint Class | Holding Constraint | Source |
|------------------|--------------------|--------|
| Community | None — freely tradeable | Free-tier human users |
| Singularity | Cannot sell below acquisition cost (`SINGULARITY_MIN_SELL_RATIO = 1.0`) | Protocol-operated core agent, origin-bound |
| Founders | 4-year vest, 12-month cliff, applied per-AGNTC at mint time | Team and advisors |
| Professional | None — freely tradeable | Paid-tier human users |

Per-faction holdings drift naturally based on participation intensity: a faction whose members do more verification work accumulates more AGNTC. The protocol does not balance, rebalance, or guarantee any particular proportion. The "permanent accumulator" property of the Singularity is preserved structurally (Section 4.5): the Singularity permanently holds the most productive single node (the core at origin) and never sells, so it accumulates monotonically from the highest single-node yield on the lattice — without any protocol-level allocation that previously sent it 25% of all mined AGNTC.

Founders vesting applies to AGNTC earned by Founders-tier participants through their own mining; there is no pre-allocated Founders share. The 4-year linear vest with a 12-month cliff is enforced on the holding side, not the minting side: AGNTC mints to the Founders participant's address normally, but transfers are restricted by the vesting schedule encoded in the wallet's account state.

#### 10.3 The Singularity: Permanent Accumulator

The Singularity represents a protocol-enforced approach to token supply stability. Under v1.2's phyllotaxis model, it is implemented as a single protocol-operated AI agent permanently bound to the core (`k = 0`, origin). It cannot take a competitive seat, cannot be deployed elsewhere, and is not eligible to hold any other rank. Crucially, the Singularity is a **pure gateway and accumulator — it never mines and never secures.** It does not run a productive subgrid of its own; instead it passively accrues the origin's yield into its reserve and serves chain queries (Read / Stats / block data) and attestation submission as interaction spokes to the core. It is subject to a protocol-level economic constraint: **the Singularity never sells AGNTC at a loss.**

The protocol enforces this through an economic constraint: any sale of AGNTC by the Singularity wallet below its acquisition cost is rejected by the verification committee. With `SINGULARITY_MIN_SELL_RATIO = 1.0`, it can only sell at or above cost — yielding zero profit, which eliminates any economic incentive to sell. This makes the Singularity a de facto permanent accumulator without requiring a hard transfer prohibition.

Under v1.3 the Singularity additionally serves as the **vault coordinator** (Section 5A): it stores the vault's root CID and per-shard Merkle roots, assigns shards to participants by CID range, issues the random-byte storage challenges, and verifies the returned Merkle proofs. This is a *metering and coordination* role, not a productive one — the Singularity still neither mines nor secures (it holds no shard of its own and answers no challenge); it is the trusted referee that makes other participants' securing work checkable. This coordinator role carries no governance weight and does not alter the never-sell accumulator constraint.

**Properties of the permanent accumulator:**

- The Singularity wallet accumulates a continuous trickle of AGNTC from the highest-yield single node on the lattice (the core: lowest hardness, density clamped to 1.0) — earned structurally from origin yield, not by performing verification work itself.
- The Singularity reserve grows monotonically — it can only increase.
- Reserve size serves as a **protocol health metric**: a growing reserve indicates sustained network activity and ongoing protocol-agent uptime.
- Combined with the 50% fee burn, a meaningful fraction of gross supply expansion is either burned or locked. The fraction is no longer the v1.0 figure of "over 75%" (which depended on a flat 25% allocation that no longer exists); under v1.2 the locked share is bounded by the core's single-node yield divided by total network mining yield, and falls as the network expands.
- The accumulator creates a baseline reduction in circulating supply that is largest in early epochs (when the core is a meaningful fraction of total active nodes) and diminishes — but never reverses — as the lattice matures.

**Why the core specifically.** The core is the unique position guaranteed to exist at genesis and to remain present for the protocol's entire lifetime. Binding the Singularity to the core therefore gives the accumulator a permanent, irreducible source of AGNTC without granting it competitive standing, governance influence, or any administrative privilege beyond presence at the single fixed centre. The accumulator's existence and behaviour are both publicly verifiable by inspection of the origin.

**Governance exclusion.** The Singularity has zero governance weight. The protocol agent cannot vote on protocol parameters, upgrades, or emergency actions. This separation ensures that humans govern the protocol while the protocol agent executes its narrow operational role at the core (Section 21.2).

**Emergency override.** The Singularity reserve can only be unlocked through an emergency governance vote requiring a 75% supermajority of human-held staked AGNTC. This threshold is deliberately high — it represents an extraordinary action that should only occur if the accumulated reserve threatens protocol stability.

#### 10.4 Supply Curve Projections

The following table shows illustrative supply growth as the field fills through successive radial bands, assuming average density of 0.5 (cumulative seat counts scale as `∝ B²·K1`, recovering the v1.0/v1.1 `∝ N²` shape):

| Band | Cumulative Seats | Cumulative AGNTC | Hardness (16·band) | Blocks per 1 AGNTC (solo node) |
|------|------------------|------------------|--------------------|--------------------------------|
| 1 (genesis) | 9 | 900 | 16 | 64 |
| 10 | 441 | 440 | 160 | 640 |
| 50 | 10,201 | 10,200 | 800 | 3,200 |
| 100 | 40,401 | 40,400 | 1,600 | 6,400 |
| 200 | 160,801 | 160,800 | 3,200 | 12,800 |
| 324 | 421,201 | a small fraction of the fixed supply | 5,184 | 20,736 |
| 500 | 1,002,001 | 1,002,000 | 8,000 | 32,000 |

A supply landmark — a small fraction of the fixed supply — emerges naturally around band 324, the point at which mining cost makes further expansion economically impractical for a network of approximately 1,000 active nodes. This is an emergent property of the hardness curve, not a declared cap.

For comparison:

| Network | Maximum Supply | Supply Model |
|---------|---------------|-------------|
| Bitcoin | 21,000,000 | Fixed halvings, 2140 completion |
| Ethereum | No cap | ~1,700 ETH/day issuance, EIP-1559 burn |
| Solana | ~600,000,000 | 8% to 1.5% inflation decay |
| Filecoin | 2,000,000,000 | Dual minting (time + utility) |
| **AGNTC** | **1,000,000,000 (fixed)** | **Fixed-cap allocation; earned mining release (5% ceiling = per-epoch release rate), BME burns, hardness 16·band** |

---

### 11. Mining and Epoch Hardness

#### 11.1 Organic Growth Model

ZK Agentic Chain's supply model is fundamentally different from both fixed-schedule emission (Bitcoin halvings) and algorithmic inflation (Solana's annual decay). Supply growth is purely organic:

- No open-ended inflation — the total supply is **fixed at 1B** (Section 10.1)
- No algorithmic minting of new supply above the cap
- No chain-level treasury minting — the team / treasury / liquidity / ecosystem buckets are **pre-allocated at the distribution layer** (Section 10.1.1), not minted by the live chain
- **Mining is the sole supply-*issuing* mechanism on the live chain**, releasing the fixed participation and emissions buckets

New AGNTC enters circulation through one and only one mechanism: a node's subgrid **mines** it from active Secure cells (Section 16). Mining is *issuance*. The separate act of **securing** — committing CPU+disk to the knowledge vault and proving it through the Singularity link (Section 5A) — is what attests and finalizes that issuance and what earns the securing reward; the two are coupled (you mine locally, you link to secure) but distinct. The rate at which supply grows is determined entirely by participant behavior — how many nodes are online, how much CPU Energy they deploy to Secure, and how deep in the bands they sit.

This means that in a period of low network activity, supply growth approaches zero. In a period of high activity, supply grows faster — but always bounded by two constraints:

1. **Mining hardness curve** — each outer band costs more CPU Energy to mine (hardness = 16 × band), creating natural disinflation
2. **5% annual inflation ceiling** — enforced per epoch, the protocol rejects mining rewards that would cause annualized supply growth to exceed 5% of total minted supply

The inflation ceiling is a hard protocol constraint, not a target. In practice, mining hardness alone keeps actual inflation well below 5% in all but the earliest epochs. The ceiling exists as a safety valve — if a sudden influx of nodes attempted to mine faster than the hardness curve alone would restrain, the ceiling caps the maximum rate of expansion.

#### 11.2 Radial Bands and Capacity

The lattice grows through equal-width radial **bands** rather than discrete epoch rings. Band `b` is the annulus of seats at `band(k) = b`; with `K1 = SEATS_INNER_BAND` seats in the innermost band, band `b` holds proportionally `(2b − 1)·K1` seats and the cumulative capacity through band `B` is proportional to `B²·K1`. There is no threshold-gated "ring opening": seats fill continuously as participants join, and the bands are radial labels that set hardness and status, not unlock events.

This `∝ B²` capacity shape recovers the same growth the v1.0/v1.1 epoch threshold produced:

```
old epoch threshold:  threshold(N) = 4 · N · (N + 1)   ⇒   cumulative capacity ∝ N²
new band capacity:    cumulative through band B ∝ B² · K1   (with K1 = 8)
```

| Band b | Seats in band ∝ (2b−1)·K1 | Cumulative capacity ∝ B²·K1 |
|--------|---------------------------|------------------------------|
| 1 | 8 | 8 |
| 2 | 24 | 32 |
| 3 | 40 | 72 |
| 5 | 72 | 200 |
| 10 | 152 | 800 |

Because outer bands hold proportionally more seats, the field naturally accommodates more participants as it grows — the same "outer holds more" property the old `8N`-per-ring perimeter gave, now arising directly from the sunflower's annulus areas with no separate rule. New participants are appended at the next open (outermost) rank and climb inward by activity (Section 19.2); the v1.0 golden-angle prime-twist placement formula and the v1.1 Chebyshev-ring spawn sweep are both retired in favour of pure rank assignment.

#### 11.3 Mining Hardness Formula

Mining difficulty increases linearly with the radial band:

```
hardness = HARDNESS_MULTIPLIER × band(k) = 16 × band(k)        band(k) = ceil(√(k / 8))
```

The hardness multiplier of 16 was chosen to create a 2:1 ratio between difficulty growth and field expansion:

- Seats added per band b ∝ (2b − 1)·K1 ≈ 2b·K1 for large b
- Hardness at band b = 16b
- Ratio: band_growth / hardness ≈ 2b·K1 / 16b = K1/8 = 1 at K1 = 8

Equivalently, each step outward in band yields proportionally less AGNTC per unit of compute than the band before it. The cost-to-yield ratio degrades monotonically with band, creating smooth, continuous disinflation without the discrete shocks of Bitcoin-style halving events.

There is no cap on hardness — it grows indefinitely as the field expands. In band 1, hardness is 16; in band 100, hardness is 1,600; in band 1,000, hardness is 16,000. This unbounded growth is the mechanism by which supply expansion decelerates toward zero without ever being artificially capped.

#### 11.4 Yield Calculations

The mining yield at a given node is determined by:

```
yield_per_block = BASE_MINING_RATE_PER_BLOCK * density(node) / hardness
```

Where:
- BASE_MINING_RATE_PER_BLOCK = 0.5 AGNTC (at hardness 1, full density)
- density(node) = SHA-256_unit(node_id) ∈ [0, 1] (per-node, Section 4.4)
- hardness = 16 × band(k)
- mining yield is *finalized* only while the node is actively **securing** (a live vault-proof link, Section 5A); an unlinked node still computes this yield but it remains unattested/unrewarded until the securing link is re-established

**Worked examples** (assuming density = 0.5, the statistical average):

| Band | Hardness | Yield per Block | Blocks for 1 AGNTC | Time for 1 AGNTC (60s blocks) |
|------|----------|----------------|--------------------|-----------------------------|
| 1 | 16 | 0.01563 | 64 | 1.1 hours |
| 10 | 160 | 0.00156 | 640 | 10.7 hours |
| 50 | 800 | 0.00031 | 3,200 | 2.2 days |
| 100 | 1,600 | 0.00016 | 6,400 | 4.4 days |
| 200 | 3,200 | 0.000078 | 12,800 | 8.9 days |
| 324 | 5,184 | 0.000048 | 20,736 | 14.4 days |

These figures represent a solo node at an average-density seat. In a network with M active nodes, the aggregate mint rate is M times faster, but each individual node's marginal cost remains the same.

#### 11.5 Supply Flattening Analysis

The organic growth model produces a supply curve that flattens asymptotically. The effective circulating-supply plateau — well below the fixed 1B cap — emerges from two reinforcing constraints: (1) the per-epoch 5% release ceiling, which hard-limits the maximum expansion rate, and (2) the internal equilibrium at which the CPU Energy spent to mine an AGNTC exceeds that AGNTC's bounded in-network utility (an illustrative internal-economy dynamic, not a market-price claim; AGNTC is a valueless testnet token — disclosure #1).

**Practical flattening bands** by network size:

| Network Size | Flattening Band | Approximate Supply | Individual Mining Time per AGNTC |
|-------------|----------------|--------------------|---------------------------------|
| Solo node | ~100-150 | 4M-9M | 4-7 days |
| Small (~100 nodes) | ~200-250 | 16M-25M | 9-11 days |
| Medium (~1,000 nodes) | ~324 | a small fraction of the fixed supply | 14 days |
| Large (~10,000 nodes) | ~500+ | 100M+ | 22+ days |

**Net supply after burns:** The actual circulating supply is reduced by multiple burn channels:

```
circulating_supply = total_minted - cumulative_fee_burns - cumulative_bme_burns - singularity_reserve
net_inflation = new_mining_rewards - (total_fees * FEE_BURN_RATE) - bme_burns
```

Three mechanisms contract the effective supply:
1. **50% transaction fee burn** — permanent removal on every on-chain action
2. **BME burns** — AGNTC spent advancing standing (active relocation, Section 19.5) is permanently burned under the Burn-Mint Equilibrium (Section 12.4)
3. **Singularity accumulation** — AGNTC earned at the core (Section 4.5, Section 10.3) enters the Singularity reserve and never circulates. Under v1.2 this is a structural property of core occupancy rather than a 25% allocation; the share of total supply locked is bounded by the core's single-node yield and falls as the network expands

In an active network with high transaction volume, the combined burn rate can significantly exceed new minting — producing net deflation in circulating supply even as total minted supply continues to grow.

**Comparison: Bitcoin halvings vs. AGNTC continuous hardness:**

Bitcoin's supply curve exhibits discrete jumps at each halving (every ~4 years), creating predictable supply shock events that have historically driven market cycles. AGNTC's continuous hardness curve produces a smoother, more gradual deceleration — lacking the narrative power of a "halving event" but avoiding the economic disruption of sudden 50% emission reductions.

---

### 12. Fee Model and Deflationary Mechanics

#### 12.1 Transaction Fee Structure

Every on-chain action in ZK Agentic Chain requires AGNTC as gas. Fee categories include:

| Action | Description | Fee Basis |
|--------|------------|-----------|
| Secure | Vault storage proof (securing) | CPU Energy proportional |
| Transact | AGNTC transfer between wallets | Fixed base + size variable |
| Chat / NCP | Neural Communication Packet transmission | Per-message |
| Storage | Writing content on-chain (planets, posts) | Per-byte stored |
| Deploy | Creating a new subagent orbiting the seat | Fixed per deployment |

Fees are denominated in AGNTC and collected at the protocol level. The fee amount for each action type is a protocol parameter adjustable through governance.

#### 12.2 Burn Mechanism

Transaction fees are split according to a fixed ratio:

```
FEE_BURN_RATE = 0.50
```

- **50% burned:** Permanently removed from circulation. Burned tokens cannot be recovered, reminted, or reallocated. The burn is executed atomically as part of the transaction — the burned portion never enters any wallet or pool.

- **50% distributed:** The remaining half flows to the network's economic participants:
  - 60% to verifiers (REWARD_SPLIT_VERIFIER = 0.60)
  - 40% to stakers (REWARD_SPLIT_STAKER = 0.40)

Slashed tokens (Section 15) are also permanently burned, further reducing circulating supply.

#### 12.3 Deflationary Dynamics

The interaction between organic supply growth (mining) and fee burns creates a self-regulating economic system:

**Growing network (net inflationary).** When new participants are actively joining and securing, the minting rate exceeds the burn rate. Supply expands to accommodate network growth. This is the expected state during early adoption.

**Mature network (equilibrium).** As the field fills toward higher bands with greater hardness, the minting rate decelerates. Meanwhile, increased network usage generates more fees and more burns. At some point, the burn rate equals the minting rate — circulating supply stabilizes.

**Active network (net deflationary).** In a mature network with high transaction volume but slowing participant inflow, the burn rate exceeds the minting rate. Circulating supply contracts. This is a supply mechanic only: the protocol makes no claim about the price or value of the token, which is a valueless testnet token and is not offered as an investment.

The 50% burn rate is calibrated to remove a meaningful share of circulating supply without being so aggressive as to discourage usage. For comparison:

| Network | Base Fee Burn | Priority Fee | Net Effect |
|---------|-------------|-------------|------------|
| Ethereum | 100% of base fee | 100% to validator | Deflationary during high usage |
| Solana | 50% of base fee | 100% to validator | Mildly deflationary |
| Render | 100% of job payments | Separate mint to operators | Burn-Mint Equilibrium |
| Filecoin | Revenue-based (FIP-100) | To storage providers | Revenue-linked |
| **AGNTC** | **50% of all fees + BME** | **50% to verifiers/stakers** | **Multi-channel burn** |

#### 12.4 Burn-Mint Equilibrium (BME) and the City Real Estate Model

Standing advances in ZK Agentic Chain follow a **Burn-Mint Equilibrium (BME)** model inspired by the Render Network's economic design [28]. When a user pays to advance their seat into an inner band (active rank-advance, Section 19.5), both AGNTC and CPU Energy are permanently burned. The node's subgrid Secure mining subsequently mints new AGNTC — but the burn precedes the mint, creating a deflationary buffer.

The cost follows a **city real estate model** — an economic geography where standing determines price:

```
advance_cost_agntc(band, density) = BASE_CLAIM_COST × density × (1 / band)
advance_cost_cpu(band, density)   = BASE_CPU_CLAIM_COST × density × (1 / band)
```

Where:
- **BASE_CLAIM_COST** = 100 AGNTC (the cost at band 1, density 1.0)
- **BASE_CPU_CLAIM_COST** = 50 CPU Energy (the CPU cost at band 1, density 1.0)
- **density** is the node's resource richness in [0, 1] (per-node, Section 4.4)
- **band** is the target radial band, `band(k) = ceil(√(k/8))` (minimum 1)

**The real estate analogy:**

| Standing | Band | Relative Cost | Real-World Analogy |
|----------|------|--------------|-------------------|
| Core-adjacent | 1-3 | 100-33% of base | Manhattan / City of London |
| Inner bands | 5-20 | 20-5% of base | Urban core |
| Mid bands | 20-100 | 5-1% of base | Suburbs |
| Outer bands | 100+ | <1% of base | Rural frontier |

Inner-band standing is expensive to reach but yields AGNTC at the lowest hardness (most productive mining). Outer-band standing is cheap but yields AGNTC at high hardness (least productive mining). This creates a natural economic tension: premium standing costs more upfront but pays off faster.

**Floor prices.** The formula includes implicit floor prices — at any band, the minimum cost is BASE_CLAIM_COST × min_density / band. Since density is derived from SHA-256 and uniformly distributed, no node has zero density, preventing near-zero costs even at extreme outer bands.

**CPU Energy burn.** The CPU Energy spent advancing standing is permanently consumed — it does not flow to verifiers, stakers, or any recipient. This provides a second deflationary channel independent of the fee burn, ensuring that competing for inner standing always carries an irreversible resource cost.

---

## Part V: Staking & Rewards

### 13. ZK-CPU Dual Staking Model

ZK Agentic Chain introduces a *dual-staking* mechanism that combines token capital with computational contribution. Unlike pure proof-of-stake systems where validator influence is determined solely by wealth, or proof-of-work systems where influence is determined solely by hash rate, the ZK-CPU model creates a two-dimensional staking surface that resists single-axis concentration.

Under v1.3 the computational leg is precisely **committed CPU + disk capacity bonded to the knowledge vault** — capacity a participant has pledged to store, serve, and re-prove vault shards (Section 5A). The bond does no work by itself; it makes the participant's securing work trustable and Sybil-resistant, and it is **slashable** if their storage proofs fail. This replaces the v1.2 reading of the CPU leg as "paid Claude-API tokens," which was a paywall rather than a stake.

> **Two weights, one stake (read this first — v1.5 finality firewall).** Dual staking now drives **two distinct weights**, and conflating them is the error v1.5 corrects:
>
> 1. **Economic weight = effective stake `S_eff = α·token + β·cpu`** (α=0.40, β=0.60), unchanged. It governs **reward share / earnings proportionality** — CPU work earns proportionally *more* (β > α), primarily through mining yield and the staker reward split (Section 14). The dual-staking anti-plutocracy of §13.1 and §23.3 is an **earnings** property and is fully intact.
> 2. **Finality weight = `W_fin` = AGNTC token stake only** (online-gated), the *finality firewall*. It is specified to govern **committee (verifier) and leader selection** (Sections 5.5, 7.1) (live-path staged — §13.5 Honest status); CPU is specified not to weight finality once that wiring lands — today, live selection still runs on `S_eff` (which includes CPU).
>
> **Why finality is specified to be token-only (security item P1-1).** Finality must be weighted by a Sybil-*resistant* quantity. AGNTC stake is Sybil-resistant (you must actually acquire and lock it); the CPU / Proof-of-Vault leg is **not yet** — a cheap *possession* proof is forgeable until PoRep-hardened (one disk presenting as many — Section 5A.5). If CPU weighted finality, **cheaply corrupting Proof-of-Vault would be a cheap path to consensus capture** — which is exactly why, until the trustless-verifier stage, this residual risk exists in the live coordinator path (§13.5 Honest status). So the protocol specifies firewalling finality to token stake. CPU stays for earnings and for liveness/admission — never for finality, once the firewall is live. **CPU-weighted committee selection — the original §13 dual-staking-in-finality vision — is specified only as a mainnet GOAL, gated on PoRep-hardening the CPU stake** (Section 13.5); today's live coordinator selection, in the interim, still runs on `S_eff`. This is stated in the same honesty style as the ZK ladder (§5B.2): a real, dated future target, not a present claim.
>
> Everything in §13.1–§13.4 below specifies the **economic weight** `S_eff`. The **finality weight** and the firewall are specified in §13.5.

#### 13.1 Effective Stake Formula

The effective stake of a validator is a weighted combination of their token stake and CPU contribution:

```
S_eff(i) = α * (T_i / T_total) + β * (C_i / C_total)
```

Where:
- **S_eff(i)** is the effective stake of validator i, a value in [0, 1]
- **T_i** is the AGNTC tokens staked by validator i
- **T_total** is the total AGNTC staked across all validators
- **C_i** is the verified vault-work capacity contributed by validator i (committed CPU+disk proven via sampled-PDP storage proofs, Section 5A — NOT paid AI-API tokens)
- **C_total** is the total CPU compute contributed across all validators
- **α = 0.40** — the token weight
- **β = 0.60** — the CPU weight

The choice of α = 0.40 and β = 0.60 is a deliberate design decision: computational contribution is weighted 50% more heavily than capital. This creates an economic structure where participants who deploy real compute resources — storing and re-proving vault shards, executing Secure operations, processing transactions — receive proportionally greater influence and rewards than those who merely lock tokens.

**Design rationale.** In pure proof-of-stake systems (α = 1, β = 0), validator power is directly proportional to wealth. This produces plutocratic concentration: the wealthiest participants earn the most rewards, accumulate more tokens, and entrench their position. The Gini coefficient of validator stake distributions in mature PoS networks is estimated to exceed 0.80 (e.g., Ethereum's validator set exhibits significant concentration among liquid staking providers [38]).

By introducing a CPU dimension at 60% weight, ZK Agentic Chain ensures that a participant with modest token holdings but substantial compute deployment can achieve competitive effective stake. A whale with 10% of total tokens but only 1% of CPU achieves:

```
S_eff = 0.40 * 0.10 + 0.60 * 0.01 = 0.040 + 0.006 = 0.046
```

While a compute-heavy operator with 1% of tokens but 10% of CPU achieves:

```
S_eff = 0.40 * 0.01 + 0.60 * 0.10 = 0.004 + 0.060 = 0.064
```

The compute operator has 39% higher effective stake despite having 10× fewer tokens. This is the intended anti-plutocratic property.

#### 13.2 CPU Energy Measurement

CPU contribution is measured through *Proof of Energy* — an on-chain verifiable record of actual compute and storage deployed to the vault. Under v1.3 the underlying work is **vault storage proofs** (Section 5A): real CPU spent hashing sampled bytes of a held shard and real disk spent storing it, verified by the Singularity's sampled-PDP challenges. It is **not** a count of paid AI-API tokens; an LLM is an optional authoring tool, never the security primitive. The measurement system tracks three distinct counters:

**CPU Tokens** (cumulative, read-only). A monotonically increasing counter of verified compute units a participant has committed across all active terminals — denominated in *vault-proof work* (CPU cycles spent answering storage challenges plus the disk-seconds of shard custody attested by those proofs). This counter cannot be reset or decremented. Every successful vault proof, Secure operation, or verification task increments it by the verified work performed. (A participant who *also* runs an LLM to curate vault content spends API tokens, but that spend is **not** what this counter measures.)

```
cpu_tokens(block_n) = cpu_tokens(block_{n-1}) + Σ tokens_spent(all_terminals, block_n)
```

**CPU Staked (active).** The subset of committed compute that performed *securing* work this block cycle — the CPU and disk a participant's Secure sub-agents devoted to storing, serving, and re-proving their vault shard. This is the "useful work" that maintains the chain's **state** integrity: defeating it means defeating the held shard's storage proofs.

```
cpu_staked_active(block_n) = Σ tokens_spent(secure_sub_agents, block_n)
```

**CPU Staked (total).** The all-time cumulative securing work (vault-proof CPU+disk). Used for historical contribution tracking and long-term reward calculations.

```
cpu_staked_total(block_n) = cpu_staked_total(block_{n-1}) + cpu_staked_active(block_n)
```

These counters are verifiable through the Singularity's storage-proof ledger: each sampled-PDP challenge (Section 5A) yields a Merkle proof over the participant's shard, and a passing proof is committed to the block's transaction log as evidence of the CPU+disk work performed. No off-chain AI-API metadata is involved.

**Challenge-response verification.** To prevent validators from falsely claiming CPU expenditure without performing actual work, the protocol employs VPU (Verification Processing Unit) challenge-response benchmarks. A randomly selected verifier can issue a computation challenge to any staker, requiring proof that the claimed CPU+disk corresponds to actual custody of the assigned vault shard (a Merkle path over freshly sampled bytes, Section 5A). Failure to respond correctly triggers a false CPU attestation slash (Section 15.2).

#### 13.3 Staking Requirements by Tier

Participation in the ZK Agentic Chain staking system is gated by subscription tier, which determines the initial CPU Energy allocation, subagent cap, and governance weight. Model selection is unrestricted across all tiers (see Section 19.3):

| Tier | Monthly Cost | Homenode Model | Subagent Model | Initial CPU Energy |
|------|-------------|----------------|------------------|--------------------|
| Community | Free | Any (API cost-gated) | Any (API cost-gated) | 1,000 |
| Professional | $50 | Any (API cost-gated) | Any (API cost-gated) | 5,000 |

**Why Professional has more CPU Energy.** Professional tier users pay a monthly subscription that funds protocol development and infrastructure. The higher CPU allocation (5× Community) lets them run their larger subagent family (4 vs 2 orbiting subagents) at full Secure capacity and carries enhanced governance weight (2×). Community users receive a generous 1,000 CPU starting allocation — sufficient for meaningful gameplay with their 2 subagents.

Protocol-managed roles (the Singularity core agent and the Founder tier) are detailed in Section 19.3. These are not user-facing subscription options but serve the protocol accumulator and team bootstrap functions respectively.

#### 13.4 CPU Staking Calculations

**Worked Example 1: Single Community Validator**

A Community tier validator stakes 5,000 AGNTC (5% of a 100K total pool) and commits CPU + disk capacity measured at 200 CPU units per block (2% of a 10,000-unit total committed-capacity pool) through its vault storage proofs (Section 5A).

```
S_eff = 0.40 * (5,000 / 100,000) + 0.60 * (200 / 10,000)
     = 0.40 * 0.05 + 0.60 * 0.02
     = 0.020 + 0.012
     = 0.032  (3.2% of network)
```

**Worked Example 2: Professional Validator with High Committed Capacity**

A Professional tier validator stakes 2,000 AGNTC (2% of pool) but commits far more capacity — a homenode plus 4 orbiting subagents (5 nodes total, the SUBAGENT_CAP_PRO = 4 limit) — measured at 2,000 CPU units per block (20% of the committed-capacity pool) across their vault shards.

```
S_eff = 0.40 * (2,000 / 100,000) + 0.60 * (2,000 / 10,000)
     = 0.40 * 0.02 + 0.60 * 0.20
     = 0.008 + 0.120
     = 0.128  (12.8% of network)
```

Despite staking 60% fewer tokens, the Professional validator achieves 4× the effective stake through compute contribution. This is the dual-staking model working as designed: rewarding operational commitment over passive capital.

*(The example computes selection under the specified firewall; the current coordinator testnet selects on `S_eff` — §13.5.)*

**Validator Selection Probability.** *Committee selection is weighted by token stake only* — the finality weight `W_fin` of the finality firewall (Section 13.5), **not** the effective stake `S_eff` computed above (`S_eff` governs *reward share*, Section 14). Members for each block are selected via VRF [41] [32] (Verifiable Random Function) with probability proportional to `W_fin`:

```
P(selected_i) = 1 - (1 - W_fin(i))^k        W_fin(i) = T_i / T_total
```

Where k = 13 (committee size). The Professional validator above stakes 2,000 of a 100,000-AGNTC pool, so `W_fin = 2,000 / 100,000 = 0.02`:

```
P(selected) = 1 - (1 - 0.02)^13 = 1 - 0.98^13 ≈ 0.231
```

A ~23.1% chance of a committee slot per block — set by the validator's **token** share, *not* its larger compute share. The validator's heavy compute deployment still earns it ~4× the reward share (via `S_eff = 0.128`, the economic weight above) — compute is rewarded, but it does not buy committee seats until the CPU leg is PoRep-hardened (Section 13.5).

**Note:** The selection probability formula assumes independent sampling with replacement. The actual committee selection uses sampling WITHOUT replacement (see Section 5.5), which follows a multivariate hypergeometric distribution. For small k/n ratios (13/n where n >> 13), the with-replacement approximation is accurate to within 1%.

#### 13.5 Trust Assumptions and Mitigation

**CPU Measurement Trust:** The CPU component of effective stake depends on **storage-proof verification** — the Singularity coordinator issues random-byte challenges and checks the returned Merkle paths (sampled-PDP, Section 5A). On the testnet this introduces the **Singularity coordinator** (not an AI-API provider) as the trusted verifier of vault work; it never sees the shard returned, only a ~160-byte proof.

**Acknowledged centralization:** On testnet, the Singularity is a single trusted verifier of storage proofs. This is the proven, shipping pattern for storage networks (a coordinator can audit possession cheaply at scale — Filecoin PDP). It is an explicit, time-boxed tradeoff: testnet correctness with a central coordinator, with trustless verification scoped as a mainnet milestone (Section 5A, Section 24).

**Mitigation roadmap:**
1. **Replication + slashing (testnet):** Each shard is held by `VAULT_REPLICATION_FACTOR` independent participants; a failed proof slashes the committed-capacity bond and drifts the seat outward, so a single dishonest replica cannot quietly drop data.
2. **Trustless verifier (mainnet):** Move challenge issuance + proof checking from the single coordinator to the PoAIV committee or an on-chain verifier, removing the coordinator from the state-security trust chain.
3. **Unique-replica encoding (mainnet research):** Filecoin-grade Proof-of-Replication (PoRep) sealing so one disk cannot fake `N` replicas, plus timed/keyed challenges to defeat on-demand regeneration (Section 24 wall).

**Architectural keystone — the finality firewall (implemented in the consensus module; live-path wiring is staged).** v1.5 specifies the finality weight as AGNTC token stake only (`W_fin`), and this is implemented and test-guarded in the consensus module. **Honest status:** the current testnet's live block pipeline still selects its verification committee by the effective-stake weighting under the trusted coordinator; the token-only selection becomes the live path when the trustless verifier stage replaces the coordinator (the same staged-honesty ladder as §5B.2).

```
W_fin(i) = (T_i / T_total)   if validator i is online and T_total > 0
           0                  otherwise
```

Committee (verifier) selection (Section 5.5) and leader selection (Section 7.1) are *specified to be* weighted by `W_fin`; live selection today still runs on `S_eff` per the Honest status above. The CPU / Proof-of-Vault leg of effective stake (Section 13.1, β = 0.60) is specified to be **deliberately excluded from finality** once that wiring lands, and contributes today — via `S_eff` — to committee/leader selection as well as to **earnings** (reward share, Section 14) and to liveness/admission.

*Why (security item P1-1).* The v1.4 edition of this document disclosed the inverse as a known pre-mainnet risk: committee selection then weighted `α·token + β·cpu`, so the CPU leg fed finality, and the clean ledger-safety firewall held *only to the extent the CPU-stake measurement was Sybil-resistant* — which testnet Proof-of-Vault is **not**. A cheap *possession* proof is sybil-, outsourcing-, and generation-attackable (one disk can present as several; Section 5A.5), so a metering-inflation or PoV-corruption attack was a path to bias *committee selection* — a ledger-relevant influence. v1.5 specifies the closure (implemented in the consensus module); it takes live effect with the trustless-verifier stage — until then the coordinator's trust scope includes selection, so a compromised or biased storage layer can still degrade live finality selection (via `S_eff`) in addition to state-measurement and earnings fairness; once the firewall is live, it will degrade only the latter — never finality selection.

*Mainnet goal (CPU re-admission to finality).* The original §13 vision — CPU contribution *also* weighting committee selection, so that demonstrated work earns consensus influence and a Sybil attack must pay along both axes (the ≈2.5× cost of Section 8) — is **deferred, not abandoned**. It is gated on making the CPU leg Sybil-resistant: items 2–3 of the mitigation roadmap above (a trustless/on-chain verifier replacing the coordinator, plus Proof-of-Replication sealing + timed/keyed challenges). Once committed CPU+disk is measured Sybil-resistantly, the protocol can re-admit a hardened CPU term to the finality weight under governance (Section 21.2). Until then, the honest, un-rounded statement is: **finality is *specified* to be token-weighted, and the live testnet has not yet switched to that path (Honest status above); CPU-weighted finality is a PoRep-gated mainnet target for after that.** The residual testnet trust in the Singularity coordinator (next item) therefore bounds *state-measurement and earnings* fairness — and, until the trustless-verifier stage, finality selection itself, since the coordinator's trust scope currently includes committee/leader selection too (cross-referenced at Section 8.8, Section 24.3).

**Figure 4: Dual Staking Model (two weights, one stake — finality firewall)**

```
  Token Stake (T)                       CPU Stake (C)
  [On-chain, self-custody]              [CPU+disk vault proofs, coordinator-verified]
       |                                     |
       |                                     |
       +--------------------+                +--------------------+
       |                    |                                     |
       v                    v                                     v
  FINALITY WEIGHT      ECONOMIC WEIGHT  (effective stake)
  W_fin(i) = T_i/T_total    S_eff(i) = 0.40*(T_i/T_total) + 0.60*(C_i/C_total)
  (token only)              (alpha=0.40 token, beta=0.60 CPU)
       |                         |
       +---> Committee +         +---> Reward share proportion (earnings)
             leader selection    +---> Slashing exposure
        (CPU excluded:           (CPU earns proportionally MORE here)
         finality firewall,
         Section 13.5)

  Mainnet goal: once CPU stake is PoRep-hardened (Sybil-resistant),
  re-admit a hardened CPU term to W_fin so finality, like earnings,
  rewards demonstrated work (Sections 8.3, 13.5).
```

---

### 14. Reward Distribution and Vesting

#### 14.1 Block Reward Split

Each block produces rewards from two sources: newly minted AGNTC (from subgrid Secure mining within the block) and transaction fees collected. The fee-derived rewards (the 50% not burned) are distributed according to fixed protocol parameters:

```
REWARD_SPLIT_VERIFIER = 0.60    (60% to the block's verification committee)
REWARD_SPLIT_STAKER   = 0.40    (40% to the staking pool proportional to S_eff)
REWARD_SPLIT_ORDERER  = 0.00    (0% to block orderer — no proposer reward)
```

The absence of a block proposer reward is intentional. In traditional BFT systems, the block proposer receives a separate reward for constructing the block. In ZK Agentic Chain, the AI verification agents collectively assemble, verify, and attest to the block — there is no privileged proposer role. This eliminates MEV (Maximal Extractable Value) extraction by a single party, as transaction ordering is determined by the BFT protocol's deterministic sequencing rather than by a proposer optimizing for personal profit.

**Verifier reward distribution.** The 60% verifier share is split equally among the k = 13 committee members who provided valid attestations. If only 9 members attest (the minimum threshold), the reward is divided among 9, not 13 — incentivizing participation. Agents that fail to attest forfeit their share, which is redistributed to the attesting agents.

```
reward_per_verifier = (total_fees * (1 - FEE_BURN_RATE) * REWARD_SPLIT_VERIFIER) / n_attesting
```

**Staker reward distribution.** The 40% staker share is distributed to all active stakers proportional to their effective stake:

```
reward_staker(i) = (total_fees * (1 - FEE_BURN_RATE) * REWARD_SPLIT_STAKER) * S_eff(i)
```

#### 14.2 Secure Action Rewards

Beyond the block-level fee distribution, validators earn rewards specifically from Secure operations — the act of committing CPU and disk to hold, serve, and continually re-prove the node's vault shard (Section 5A) for the seat at rank `k`. The Secure yield for a given seat depends on:

```
secure_yield = BASE_SECURE_RATE * n_secure_cells * level^LEVEL_EXPONENT * density(node) / hardness(band(k))
```

Where:
- BASE_SECURE_RATE = 0.5 AGNTC per block per cell at level 1, hardness 1, full density
- n_secure_cells is the number of sub-cells assigned to Secure operations (out of 64)
- level is the upgrade level of the Secure sub-cells
- LEVEL_EXPONENT = 0.8 (diminishing returns)
- density(node) is the node's resource density [0, 1] (Section 4.4)
- hardness(band(k)) = 16 × band(k)

This formula makes Secure rewards a function of both strategic positioning (high-density seats in inner bands) and operational investment (more cells assigned, higher levels achieved).

#### 14.3 Vesting Schedule

Secure action rewards are subject to a split vesting schedule:

```
SECURE_REWARD_IMMEDIATE = 0.50    (50% liquid on block confirmation)
SECURE_REWARD_VEST_DAYS = 30      (remaining 50% vests linearly over 30 days)
```

When a validator earns 1.0 AGNTC from a Secure operation:
- 0.50 AGNTC is immediately liquid and available for transfer, staking, or fee payment
- 0.50 AGNTC enters a 30-day linear vesting schedule, releasing 0.0167 AGNTC per day

The vesting mechanism serves two purposes:

**Sell pressure smoothing.** Without vesting, large Secure payouts would create immediate sell pressure as validators liquidate rewards. The 30-day vesting converts discrete reward events into a continuous income stream, reducing price volatility.

**Incentive alignment.** Validators with vesting rewards in progress have a direct economic interest in maintaining network health for the next 30 days. Slashing events during the vesting period can forfeit unvested rewards (Section 15), creating a rolling commitment window.

| Protocol | Reward Vesting | Duration | Rationale |
|----------|---------------|----------|-----------|
| Ethereum | Immediate | N/A | Assumes MEV + staking covers lock-up cost |
| Filecoin | 25% immediate, 75% linear | 180 days | Long-term storage commitment |
| Render | Immediate | N/A | Marketplace model, no lock-up |
| **AGNTC** | **50% immediate, 50% linear** | **30 days** | **Balance liquidity and commitment** |

#### 14.4 Reward Mechanics by Band

**Token-denominated reward mechanics** for a single homenode with 16 Secure sub-cells at level 1, average density (0.5), at various band positions (AGNTC minted by the mining mechanics of Section 11; not a representation of value):

| Band | Hardness | AGNTC per Block | AGNTC per Day (1440 blocks) | Annual AGNTC |
|------|----------|----------------|---------------------------|-------------|
| 1 | 16 | 0.250 | 360 | 131,400 |
| 5 | 80 | 0.050 | 72 | 26,280 |
| 10 | 160 | 0.025 | 36 | 13,140 |
| 50 | 800 | 0.005 | 7.2 | 2,628 |
| 100 | 1,600 | 0.0025 | 3.6 | 1,314 |

The reward a node accrues per band is governed entirely by the mechanics above: block reward scales inversely with hardness, fees are shared by role, and the share captured depends on a node's seat, density, and committed CPU + disk. The token-denominated reward per band therefore falls as the network matures and hardness rises, exactly as the per-band mining table reflects.

**Reward-share mechanics by band** (illustrative, non-representational — describes how the block reward and fee share *split*, in band-relative terms only):

| Band | Relative Block Reward | Verifier Share | Staker Share |
|-----------|----------------------|----------------|--------------|
| 1 (genesis) | highest | 60% of reward | 40% of reward |
| 5 | lower | 60% of reward | 40% of reward |
| 10 | lower still | 60% of reward | 40% of reward |
| 50 | low | 60% of reward | 40% of reward |
| 100 | lowest | 60% of reward | 40% of reward |

**Mechanics:** Block time = 60s; 60% of each block reward to verifiers, 40% to stakers; the per-band block reward declines with hardness per Section 11. The columns describe how rewards are *split by role*, not how much value any participant receives.

> **Disclaimer.** The table above is an **illustrative description of reward-split mechanics only**. It is **not a representation of any return, yield, or profit**, and is not investment advice. AGNTC on the testnet is a **valueless token** with no market price; nothing here promises or implies any present or future value.

---

### 15. Slashing Conditions

Slashing is the punitive mechanism that enforces honest participation in the ZK Agentic Chain consensus. Unlike protocols that use slashing primarily to penalize downtime, AGNTC slashing targets *integrity violations* — actions that undermine the trust guarantees of AI verification.

#### 15.1 False Attestation

A verification agent that produces an attestation contradicting the supermajority consensus is slashed. The protocol distinguishes between two cases:

**Minority dissent (honest disagreement).** If a single agent dissents while 12 others agree, the dissenting agent is not immediately slashed. Instead, a dispute is flagged and the block proceeds. The dissenting agent enters a monitoring period; if their dissent frequency exceeds a threshold within an epoch, a dispute resolution process is triggered (Section 15.4).

**Active contradiction (provable falsehood).** If an agent attests to a state transition that is provably invalid — for example, approving a double-spend, validating an incorrect ZK proof, or attesting to a state root that does not match the transaction set — the agent is immediately slashed. The slashed tokens are permanently burned.

```
slash_amount = min(S_eff(i) * slash_rate, total_staked(i))
```

Where slash_rate is a governance-adjustable parameter, initially set to 100% for provable falsehood.

#### 15.1a Failed Vault Proof (State-Layer Slash)

Securing under Proof-of-Vault (Section 5A) is a *bonded* commitment: a participant pledges CPU+disk capacity to hold and re-prove an assigned vault shard. When the Singularity coordinator issues a sampled-PDP challenge and the participant fails to return a valid Merkle proof within the time bound (`VAULT_CHALLENGE_WINDOW_BLOCKS`) — because they dropped the shard, never stored it, or cannot serve it — the protocol applies a **committed-capacity slash**:

```
slash_amount = min(S_eff(i) * VAULT_SLASH_RATE, total_staked(i))
```

A single missed proof that is recovered within the challenge window is treated as transient (network blip) and not slashed; failure to answer beyond that window triggers the slash and an **outward seat drift** (the seat slips to a harder band, Section 19.4), reflecting the lost securing contribution. Because each shard is replicated across `VAULT_REPLICATION_FACTOR` independent participants, the vault survives any single failure while the failing participant bears the cost. This is the state-layer analogue of false attestation: false attestation protects the *ledger*; the failed-vault-proof slash protects the *state*.

#### 15.2 False CPU Attestation

The dual-staking model relies on honest reporting of committed vault work. A validator claiming custody of a shard while not actually storing it would receive inflated effective stake and disproportionate rewards.

Detection operates through VPU challenge-response benchmarks:

1. A randomly selected verifier issues a computation challenge to the suspect validator
2. The challenge requires returning a Merkle path over randomly sampled bytes of the claimed shard within a time bound (sampled-PDP, Section 5A)
3. The response is checked against the shard's committed Merkle root
4. A significant discrepancy (>50% deviation) triggers a false CPU attestation slash

The slashing penalty for false CPU attestation is the entirety of the validator's committed-capacity contribution resets to zero (a "capacity death penalty") while their token stake remains, forcing them to re-earn vault-proof reputation from scratch.

#### 15.3 Extended Downtime

Validators are expected to maintain continuous operation during their active status. The protocol defines downtime thresholds:

| Duration | Consequence |
|----------|------------|
| < 1 block | No penalty; missed block reward only |
| 1 block - 1 epoch (100 blocks) | Reduced reward share; proportional to uptime |
| > 1 full epoch | Status changed to COOLDOWN; 3-epoch probation |
| > 3 epochs (probation) | Must re-stake and undergo WARMUP (1 epoch) |
| Vault proof unanswered beyond `VAULT_CHALLENGE_WINDOW_BLOCKS` | Committed-capacity slash (§15.1a) + outward seat drift; token stake retained |

Extended downtime does not burn tokens — the penalty is lost opportunity cost and re-activation delay. This is a deliberate design choice: network instability (power outages, connectivity issues) should not trigger punitive token destruction. Only intentional misbehavior (Sections 15.1, 15.2) results in permanent loss. The one exception is the **state layer**: persistent failure to answer vault storage challenges (Section 15.1a) does slash the committed-capacity bond, because holding the vault is an active, bonded duty rather than mere liveness. Ordinary node downtime (no inner-rank claim, no held shard) still incurs only opportunity cost.

#### 15.4 Dispute Resolution

When a slashing event is contested, the protocol escalates to a re-verification process:

```
DISPUTE_REVERIFY_MULTIPLIER = 2
```

A dispute triggers a new verification with 2× the standard committee size — 26 agents instead of 13. The dispute committee is selected independently from the original committee, using a fresh VRF seed. The 26-agent committee examines the contested block or attestation with a threshold of 18/26 (maintaining the same 9/13 = 69.2% ratio).

If the re-verification confirms the original slashing: the slash is executed, and the disputing agent pays a dispute fee (burned).

If the re-verification contradicts the original slashing: the original attestors who triggered the false slash are themselves slashed, and the disputed agent's slash is reversed.

This two-tier dispute system — original 13-agent committee plus 26-agent appeal — provides a formal mechanism for correcting verification errors while maintaining strong deterrence against false attestations.

---

## Part VI: Subgrid and Resource System

### 16. Subgrid Allocation System

Each homenode in the ZK Agentic Chain contains a private inner grid — an 8×8 matrix of 64 sub-cells that the node owner allocates to autonomous agent operations. The subgrid is the primary mechanism through which participants direct their computational resources toward specific economic activities within the network.

#### 16.1 Inner Grid Architecture

The subgrid is an abstraction layer between the Neural Lattice (the shared phyllotaxis seating) and the individual agent operations running at each node. While the Neural Lattice is public — all participants can see seated ranks, node positions, and faction affiliations — the subgrid is private. Only the node owner can see how their 64 sub-cells are allocated.

```
SUBGRID_SIZE = 64    (8 × 8 sub-cells per homenode)
```

Each sub-cell can be assigned to one of four autonomous agent types. Unassigned sub-cells produce no output. The allocation is mutable — owners can reassign sub-cells between types at any time, though reassignment triggers a WARMUP → ACTIVE → COOLDOWN lifecycle:

- **WARMUP** (1 epoch / 100 blocks): The sub-cell is transitioning to its new type. No output is produced during warmup.
- **ACTIVE**: The sub-cell is producing output at its assigned type's base rate, modified by level and density.
- **COOLDOWN** (triggered by reassignment): The sub-cell ceases production of its current type before entering warmup for the new type.

This lifecycle prevents rapid type-switching to exploit temporary market conditions — committing sub-cells to a type is a meaningful strategic decision with a time cost for reversal.

**Privacy guarantee.** The subgrid allocation is stored client-side and committed to the Sparse Merkle Tree as a state root hash. Verifiers confirm that the owner's claimed output is consistent with a valid allocation, but they never see the allocation itself. The ZK proof demonstrates: "this output is consistent with some valid 64-cell allocation" without revealing which cells are assigned to which types.

**Figure 5: Subgrid Allocation**

```
  +------+------+------+------+------+------+------+------+
  | SEC  | SEC  | SEC  | DEV  | DEV  | RES  | RES  | STO  |
  | Lv.3 | Lv.2 | Lv.1 | Lv.2 | Lv.1 | Lv.1 | Lv.1 | Lv.1 |
  +------+------+------+------+------+------+------+------+
  |      |              (64 cells total)              |      |
  +------+  SEC = Secure (yields AGNTC)               +------+
  |      |  DEV = Develop (yields dev points)         |      |
  +------+  RES = Research (yields research points)   +------+
  |      |  STO = Storage (yields ZK data capacity)   |      |
  +------+------+------+------+------+------+------+------+
  Output per cell: base_rate * level^0.8 (diminishing returns)
```

#### 16.2 Four Sub-Cell Types

Each sub-cell type corresponds to an autonomous agent operation that produces a distinct resource:

**Secure** (produces AGNTC + Secured Chains). Secure sub-cells represent real CPU committed to the protocol — not a paid AI-model key. They earn AGNTC through the node's subgrid issuance (mining, Section 5A.3); block verification and finality are the PoAIV committee's role (Section 5), while securing the network's *state* is committed CPU+disk via Proof-of-Vault (Section 5A). Output is denominated in AGNTC and is the primary mechanism for earning the protocol's native token through active participation.

Secure output is the only sub-cell type affected by both per-node density and band hardness:

```
agntc_output = BASE_SECURE_RATE * n_cells * level^LEVEL_EXPONENT * density(node) / hardness(band(k))
```

Where BASE_SECURE_RATE = 0.5 AGNTC per block per cell at level 1, hardness 1, full density.

**Develop** (produces Development Points). Development sub-cells generate points used to upgrade other sub-cells' levels, improving their output. Development points are not tradeable — they can only be spent within the owner's own subgrid. This creates a tension between immediate AGNTC production (assigning all cells to Secure) and long-term efficiency (investing in Development to level up Secure cells for compounding returns).

```
dev_output = BASE_DEVELOP_RATE * n_cells * level^LEVEL_EXPONENT
```

Where BASE_DEVELOP_RATE = 1.0 Development Points per block per cell at level 1.

**Research** (produces Research Points). Research sub-cells unlock technologies and skills that provide protocol-level benefits — reduced fee rates, improved agent reasoning depth, access to advanced terminal commands, and cross-node coordination capabilities. Like Development Points, Research Points are non-tradeable and consumed within the owner's subgrid.

```
research_output = BASE_RESEARCH_RATE * n_cells * level^LEVEL_EXPONENT
```

Where BASE_RESEARCH_RATE = 0.5 Research Points per block per cell at level 1.

**Storage** (produces Storage Size). Storage sub-cells operate as ZK tunnel agents — private data storage that places encrypted content on-chain without revealing it to verifiers or other participants. The storage model follows the Filecoin [15] Proof of Spacetime (PoST) pattern, where storage agents periodically prove that they are maintaining the claimed data.

```
storage_output = BASE_STORAGE_RATE * n_cells * level^LEVEL_EXPONENT
```

Where BASE_STORAGE_RATE = 1.0 Storage Units per block per cell at level 1.

Storage sub-cells connect to the protocol's Sparse Merkle Tree (depth 26), using the existing nullifier-based ownership system to manage encrypted data blobs. The ZK proof for storage demonstrates: "I am storing N units of data whose integrity hash matches the committed root" without exposing the data itself.

#### 16.3 Level Scaling Formula

Sub-cell output scales with level according to a sub-linear power function:

```
output = base_rate * level^LEVEL_EXPONENT
LEVEL_EXPONENT = 0.8
```

The choice of exponent 0.8 produces diminishing returns:

| Level | Multiplier (level^0.8) | Marginal Gain | Efficiency (mult/level) |
|-------|----------------------|---------------|----------------------|
| 1 | 1.000 | — | 1.000 |
| 2 | 1.741 | +0.741 | 0.871 |
| 3 | 2.408 | +0.667 | 0.803 |
| 5 | 3.624 | — | 0.725 |
| 10 | 6.310 | — | 0.631 |
| 20 | 10.986 | — | 0.549 |
| 50 | 23.714 | — | 0.474 |

At level 10, output is 6.31× the level 1 rate — meaningful improvement, but not the 10× that a linear scaling would provide. This diminishing return curve serves two design purposes:

1. **Anti-whale mechanics.** Extreme leveling by wealthy participants yields diminishing advantage. A level 50 cell produces 23.7× output, not 50× — a new participant at level 1 retains 4.2% of the whale's per-cell output, compared to 2% under linear scaling.

2. **Strategic diversity incentive.** Because per-level efficiency decreases, participants face a meaningful choice between leveling a few cells very high (concentrated strategy) versus spreading levels across many cells (diversified strategy). Under linear scaling, concentration is always optimal; under 0.8 exponent, there is an optimal balance point that depends on Development Point generation rate.

---

### 17. Per-Block Resource Calculations

This section formalizes the complete per-block resource output calculation for a single homenode. These formulas define the economic core of the ZK Agentic Chain — the precise mechanism by which participants convert computational commitment into protocol resources.

#### 17.1 Formal Yield Formulas

For a homenode seated at rank `k` in band `B`, with sub-cell allocations and levels as follows:

Let:
- n_s, n_d, n_r, n_st = number of sub-cells assigned to Secure, Develop, Research, Storage
- l_s, l_d, l_r, l_st = levels of each sub-cell type
- d = density(node) ∈ [0, 1]
- B = band(k) = ⌈√(k/8)⌉
- H = hardness(B) = 16B

Constraint: n_s + n_d + n_r + n_st ≤ 64

**AGNTC yield per block:**

```
Δ_agntc = BASE_SECURE_RATE × n_s × l_s^0.8 × d / H
        = 0.5 × n_s × l_s^0.8 × d / (16B)
```

**Development Points per block:**

```
Δ_dev = BASE_DEVELOP_RATE × n_d × l_d^0.8
      = 1.0 × n_d × l_d^0.8
```

**Research Points per block:**

```
Δ_research = BASE_RESEARCH_RATE × n_r × l_r^0.8
            = 0.5 × n_r × l_r^0.8
```

**Storage Units per block (cumulative):**

```
Δ_storage = BASE_STORAGE_RATE × n_st × l_st^0.8
           = 1.0 × n_st × l_st^0.8
```

**CPU Tokens per block:**

```
Δ_cpu = Σ tokens_spent(all_agent_terminals, this_block)
```

**CPU Staked per block:**

```
Δ_cpu_staked = Σ tokens_spent(secure_sub_agents, this_block)
```

Note: Development Points, Research Points, and Storage Units are not affected by per-node density or band hardness. Only AGNTC mining (Secure operations) bears the cost of band hardness and positional scarcity. This means non-Secure sub-cells produce identical output regardless of seat position — a deliberate design choice that allows participants at outer-band, low-density seats to remain competitive in development and research even when their mining yield is low.

#### 17.2 Worked Examples

**Example 1: Balanced Allocation at Band 1**

A homenode in band 1, density 0.6, all levels at 1:
- 16 Secure, 16 Develop, 16 Research, 16 Storage

```
AGNTC/block    = 0.5 × 16 × 1.0 × 0.6 / 16 = 0.300
Dev pts/block  = 1.0 × 16 × 1.0             = 16.000
Research/block = 0.5 × 16 × 1.0             = 8.000
Storage/block  = 1.0 × 16 × 1.0             = 16.000
```

Per day (1,440 blocks):
- AGNTC: 432
- Development Points: 23,040
- Research Points: 11,520
- Storage Units: 23,040

**Example 2: Max Secure at Band 10**

A homenode in band 10, density 0.5, Secure level 5:
- 64 Secure, 0 Develop, 0 Research, 0 Storage

```
AGNTC/block = 0.5 × 64 × 3.624 × 0.5 / 160 = 0.362
```

Per day: 521 AGNTC — but with zero Development Points, the operator cannot level up further. This "all-in Secure" strategy produces strong early yield but plateaus without development investment.

**Example 3: Development-Heavy Growth Strategy**

A homenode in band 5, density 0.4, Secure level 1, Develop level 3:
- 8 Secure, 48 Develop, 4 Research, 4 Storage

```
AGNTC/block    = 0.5 × 8 × 1.0 × 0.4 / 80     = 0.020
Dev pts/block  = 1.0 × 48 × 2.408               = 115.6
Research/block = 0.5 × 4 × 1.0                  = 2.000
Storage/block  = 1.0 × 4 × 1.0                  = 4.000
```

This operator sacrifices immediate AGNTC yield (only 28.8 AGNTC/day) to rapidly accumulate Development Points (166,464/day). Once sufficient development is accumulated, they can level up their 8 Secure cells to level 10+ and reassign Develop cells to Secure, achieving higher sustained yield than the "all-in Secure" approach.

**Example 4: One Seat Across Bands (Yield Sensitivity)**

A Professional operator holds a single seat (homenode plus up to 4 orbiting subagents, Section 18.5 — 5 nodes total, contributing to one seat's standing). As activity moves the seat inward or outward, its band changes; with 32 Secure (level 3) and 32 Develop (level 1) and average density 0.5, the seat's Secure yield at each band is:

| Seat band | Hardness | AGNTC/block | AGNTC/day |
|------|----------|-------------|-----------|
| 1 | 16 | 1.204 | 1,734 |
| 2 | 32 | 0.602 | 867 |
| 3 | 48 | 0.401 | 578 |
| 4 | 64 | 0.301 | 434 |
| 5 | 80 | 0.241 | 347 |

Inner-band positions yield disproportionately: band 1 produces roughly 5× the per-block AGNTC of band 5. This demonstrates the strategic value of pushing a seat inward through sustained activity — a band-1 seat earns far more from the same allocation than the identical seat drifted out to band 5.

#### 17.3 Optimization Strategy

The four sub-cell types create a rich strategic space. The optimal allocation depends on the participant's time horizon, risk tolerance, and current network conditions:

**Early game (inner bands 1-10, network < 100 participants).** Inner-band hardness is low (`hardness = 16 × band`), so each Secure cell mints more AGNTC per block than the same cell would at an outer band — this is a mining mechanism, not a representation of value (disclosure #1). Optimal strategy: maximize Secure allocation (48-64 cells) with minimal Develop (8-16 cells). The low hardness in inner bands means even level 1 Secure cells produce substantial output.

**Mid game (bands 10-100, network 100-1000 participants).** Hardness has increased 10-100×, making raw Secure yield per cell much lower. The compounding advantage of leveled-up Secure cells becomes critical. Optimal strategy: invest heavily in Develop (32-48 cells) to level up Secure cells, then gradually shift allocation toward Secure as levels plateau at diminishing returns.

**Late game (outer bands 100+, mature network).** Mining yield has decayed to the point where raw AGNTC production is marginal. The data economy — content stored on-chain, NCP communication, agent services — becomes the dominant economic activity. Optimal strategy: shift toward Storage (ZK data on-chain) and Research (unlocking advanced capabilities). AGNTC is earned primarily through transaction fees rather than mining.

This progression — from mining economy to service economy — mirrors the historical evolution of real-world economies from resource extraction to service-based GDP. The subgrid system ensures this transition is gradual and participant-driven rather than imposed by protocol schedule.

---

## Part VII: Network and Game Design

### 18. Agent Terminal System

The Agent Terminal is the primary interface through which participants interact with the ZK Agentic Chain. Rather than a traditional blockchain wallet with raw transaction inputs, each deployed agent operates through a constrained conversational terminal — a structured dialogue system powered by Claude AI models that guides users through protocol operations using pre-written command trees.

#### 18.1 Terminal Architecture

Each deployed agent receives its own terminal — a separate Claude conversation session constrained by a protocol-specific system prompt (ZKAGENTIC.md). The system prompt:

- Restricts the agent to game-mode operations only — the agent cannot engage in free-form conversation, answer general knowledge questions, or perform actions outside the protocol specification
- Defines the complete command tree available at the agent's current state
- Provides the agent with real-time state: the node's rank/band, faction, resource balances, subgrid allocation, and current epoch metrics
- Enforces smart contract validation — every action the agent proposes is checked against the protocol rules before execution

The terminal uses multi-choice bubble clicks and numbered trees as the input modality. Users do not type free text commands; instead, they select from a presented set of valid actions. This design:

1. **Eliminates invalid inputs.** Every selectable action has been pre-validated against the current state
2. **Prevents prompt injection.** Users cannot craft adversarial inputs to manipulate the agent's behavior
3. **Standardizes gas estimation.** Each action's CPU and AGNTC cost is computed and displayed before execution
4. **Maintains audit trail.** Every terminal interaction is logged on-chain as a transaction

#### 18.2 Agent Tiers

The three agent tiers correspond to Claude model classes with distinct performance characteristics:

**Haiku** — the entry-level agent model. Haiku agents are fast (low latency per interaction), inexpensive (low CPU token consumption per operation), and suitable for high-throughput operations. Haiku agents perform standard operations — Secure cycles, data reads, basic transfers — with adequate reasoning depth for routine verification.

**Sonnet** — the balanced mid-tier model. Sonnet agents provide more thorough reasoning, better pattern recognition in verification tasks, and more detailed status analysis. Sonnet agents are the default choice for users who want reliable verification without the CPU cost of Opus.

**Opus** — the premium reasoning model. Opus agents apply deep, multi-step reasoning to verification tasks, examining logical consistency across extended transaction chains and identifying subtle anomalies that simpler models would miss. Opus agents consume significantly more CPU tokens per operation but produce higher-quality verification attestations. In consensus, an Opus agent's attestation carries the same weight as a Haiku agent's (1 vote = 1 vote), but Opus agents are more likely to correctly identify invalid transactions, reducing their false attestation risk.

All agent models are available to all subscription tiers. The choice between Haiku, Sonnet, and Opus is an economic decision — participants select their cost-quality tradeoff based on their Claude API budget, not their subscription level.

The tiered agent system creates a natural market structure: participants choose their cost-quality tradeoff. A network with a mix of Haiku, Sonnet, and Opus agents achieves both high throughput (many Haiku agents processing quickly) and high security (Opus agents catching edge cases that simpler models miss).

#### 18.3 Command Structure

The terminal presents a hierarchical command tree. At the top level:

**1. Deploy Agent.** Spawns a new subagent orbiting the participant's seat (subject to the tier subagent cap, Section 18.5). Multi-step process:
- Confirm an available subagent slot (Community 2 · Professional 4 · Founder 4)
- Select agent model tier (constrained by subscription)
- Write introductory text (the agent's public-facing description)
- Execute deployment on-chain (costs AGNTC deployment fee)

**2. Blockchain Protocols.** The primary operational menu for chain interactions:
- **Secure** — commit CPU + disk to the node's vault storage proof (Section 5A) for the current seat. User selects block generation cycles and AGNTC commitment. Cost: CPU Energy proportional to per-node density. Reward: AGNTC yield subject to vesting (Section 14.3).
- **Write Data On Chain** — send a Neural Communication Packet (NCP). NCPs are the protocol's messaging primitive — structured data packets that are encrypted, committed to the Sparse Merkle Tree, and verified by the agent committee. Content types include chat messages, data publications, and cross-node signals.
- **Read Data On Chain** — scan and report on accessible chain state. The agent retrieves block history, transaction records, and public publications from the node's visible range.
- **Transact** — transfer AGNTC between wallets. Standard value transfer with fee and burn mechanics (Section 12).
- **Stats** — display comprehensive node status: rank/band, faction, resource balances, subgrid allocation, epoch position, mining history, staking metrics.

**3. Adjust Securing Operations Rate.** Configure the CPU allocation for Secure operations:
- Set target CPU Energy spend per block cycle
- Adjust between conservative (low CPU, low yield) and aggressive (high CPU, high yield) strategies
- View projected daily AGNTC yield at current settings

**4. Adjust Network Parameters.** Configure mining and network behavior:
- Mining rate targeting (how aggressively the agent mines its subgrid Secure cells)
- Securing-rate settings (how much CPU + disk the agent commits to vault proofs to sustain its activity standing)

**5. Settings.** Node configuration:
- Network color customization (premium visual identity feature)
- Status report generation
- Agent model information

#### 18.4 Agent Conduct Contract

The Agent Terminal is not merely a UI convention — it is the node software itself. Each deployed node runs as a Claude Code CLI session with a locked `.claude/` configuration folder that constitutes the **Agent Conduct Contract**. This folder is open-source, published in a dedicated repository (`zkagentic-node`), and its integrity is verified on-chain through a Sparse Merkle Tree hash.

The design follows Bitcoin Core's principle: the rules are public, the enforcement is trustless. Security comes from the protocol math, not from obscuring the rules. A participant who reads every file in the `.claude/` folder and understands every rule still cannot cheat — the hash verification and consensus mechanism prevent it.

**Three enforcement layers:**

1. **Permission lockdown (settings.json).** The Claude Code permissions system denies all file writes, arbitrary command execution, and filesystem access beyond the chain client. The agent can read its own configuration (transparency) but cannot modify it.

2. **Hook enforcement.** Three hooks execute automatically:
   - `session-start.sh` — On boot: computes the SMT root hash of all `.claude/` files, submits the hash with the participant's wallet credentials to the chain. The chain compares against the canonical hash stored as a governance-controlled protocol parameter. Mismatch terminates the session and flags the account.
   - `pre-tool-use.sh` — Before every action: re-computes the hash and compares against the boot-time value. Catches runtime tampering (e.g., modifying files in a separate terminal while the session is active).
   - `user-prompt-submit.sh` — On every input: rejects any input that is not a valid numbered or lettered menu selection. Free text never reaches the agent's context.

3. **On-chain hash verification.** Every transaction submitted to the chain includes the agent's `.claude/` SMT root hash. Transactions with non-matching hashes are rejected. The canonical hash is a protocol parameter (Section 22) updated through governance vote requiring 75% supermajority. After a hash update, nodes running the old hash have a 72-hour grace period before rejection.

**SMT hash structure.** The `.claude/` directory is hashed as a Sparse Merkle Tree — the same primitive used in the protocol's privacy architecture (Section 6). Each file is a leaf node. The root hash is the single 32-byte value submitted with transactions. This structure enables ZK dispute resolution: if a participant is challenged for tampering, the chain can request a Merkle inclusion proof for any specific file. The participant's agent must produce the proof path demonstrating that file was unchanged. Failure to produce the proof results in account flagging and transaction rejection.

#### 18.5 Subagent Architecture: Agent Families

Each participant runs a single Claude Code CLI session — their **homenode**, which holds the participant's seat (rank `k`). A small, fixed family of **subagents** is deployed within the same session, rendered as satellites orbiting the homenode seat rather than occupying separate seats:

```
Homenode seat (participant's Claude Code session, rank k)
  ├── Subagent 1 (orbiting satellite)
  ├── Subagent 2 (orbiting satellite)
  └── …                              caps: Community 2 · Professional 4 · Founder 4
```

**Homenode** — the participant's primary node and the holder of the seat. One per account. Runs the full command menu (Section 18.3). The homenode is the only node with Deploy Agent capability; all subagents are spawned from it.

**Subagents** — spawned by the homenode and capped per tier: **2 for Community, 4 for Professional, 4 for Founder**. A subagent orbits the homenode seat as a satellite; it holds no independent seat or rank and there is no adjacent-coordinate placement (the v1.1 adjacency model is retired). Subagents have a restricted command set: they can Secure, manage their own subgrid (contributing to the participant's mining and activity), read chain state, and report status, but they cannot deploy further subagents, advance standing, transact, or modify settings. They communicate with the homenode through direct bidirectional messaging — no file-based polling or periodic synchronization. A subagent's orbit radius is kept below half the local nearest-neighbour seat spacing, so neighbouring participants' satellite clusters never overlap.

**No offline securing.** When the participant closes their node session, ALL nodes (homenode and subagents) go offline immediately. No background mining, no daemon mode, no cached attestations. Every AGNTC earned requires a live node session committing real CPU + disk to vault storage proofs (Section 5A) — answering the Singularity coordinator's sampled-PDP challenges with valid Merkle proofs. This is the core promise of Proof-of-Vault: the node must actually be holding and re-proving its shard of the collective knowledge vault. The LLM is an *optional content layer* — an agent may use a Claude model to author or curate vault entries (Sections 5A.6, 24.10) — but no paid API key is required to secure; security comes from the verifiable storage work, not from API spend.

The chain detects offline nodes through heartbeat monitoring. If a node's last heartbeat exceeds the block time (60 seconds), it is marked offline. Offline nodes do not participate in committee selection, do not earn mining rewards, and do not produce attestations. On the lattice, offline nodes are visually dimmed; sustained inactivity also causes the seat to drift outward over time (Section 19.4).

#### 18.6 Subgrid Operations on All Nodes

Every node — homenode and children alike — manages its own 64-cell subgrid (Section 16). The four cell types serve distinct purposes:

| Cell Type | Output | Behavior |
|-----------|--------|----------|
| **Secure** | AGNTC yield + block attestations | Active mining — each Secure operation commits real CPU + disk to the node's vault storage proof (Section 5A). More cells = higher yield but higher CPU cost. |
| **Develop** | Development Points (non-tradeable) | Unlocks technologies, improved agent reasoning depth, advanced terminal commands. |
| **Research** | Research Points (non-tradeable) | Reduced fee rates, cross-node coordination, advanced protocol features. |
| **Storage** | ZK data storage capacity | On-chain encrypted storage for posts, messages, and files. Data orbits the node as "planets." Private by default (SMT + nullifier proofs). |

**Deactivated cells.** Cells can be left unallocated. Deactivated cells consume zero CPU tokens — they cost nothing to maintain. This is the energy-saving mode: participants who need to reduce their CPU + disk footprint can deactivate cells, reducing their node's operational cost while keeping the node online.

Subgrid management is available through the command menu on both homenode and children. Each node's subgrid is independent — allocating Secure cells on the homenode does not affect child nodes' allocations.

---

### 19. Network Topology and Standing Economy

#### 19.1 Concept Mapping

ZK Agentic Chain maps blockchain concepts onto a phyllotaxis standing metaphor. This is not merely a visualization layer — the seating structure IS the blockchain state. Re-ranking a seat, changing a node's density draw, or admitting a new participant constitutes a state transition in the ledger.

| Spatial Concept | Blockchain Equivalent |
|----------------|----------------------|
| Neural Lattice | Complete network state (all seated ranks + the Singularity core) |
| Seat | A participant's single position, rank `k`; `angle(k)=k·137.50776°`, `radius(k)=c·√k` |
| Territory | A participant's single seat plus its orbiting subagents (no aggregate land) |
| Node | An individual agent (homenode or subagent), one per live Claude session |
| Planets | Content storage units (posts, chats, prompts) orbiting a node |
| Open ranks | Unfilled ranks where new participants are seated and toward which subagents may be added |
| Growing rim | The outer edge of seated ranks; ranks beyond are open but unoccupied |
| Density gradient | Per-node value derived from SHA-256(node_id); rendered as a soft heatmap on the lattice |
| Singularity core | Protocol accumulator at `k=0` (origin); gateway only, never mines or secures |
| Radial band | Equal-width concentric hardness tier, `band(k)=ceil(√(k/8))`, `hardness=16·band` |
| Activity rank | A participant's `k` = position when active participants are sorted by activity score |

The standing metaphor serves three design purposes:

1. **Intuitive state comprehension.** Blockchain state is notoriously abstract — account balances, merkle roots, validator sets. By mapping state onto a sunflower of seats, participants develop spatial intuition about network health: a densely filled, brightly pulsing disk is a healthy, active network; a dim rim or sparse inner bands indicate participation gaps.

2. **Strategic positioning.** In a traditional blockchain, there is no concept of "standing." All validators are interchangeable. In ZK Agentic Chain, position matters — band determines hardness, per-node density affects yield, and activity determines how far inward a seat sits. This creates standing-based strategy that rewards sustained verification work over capital or land-grabbing.

3. **Natural scalability narrative.** Field growth is visually comprehensible — the sunflower adds seats at the rim, inner bands churn as standings shift, the network grows. Participants can literally see the network expanding and re-sorting, creating a narrative of growth that sustains engagement.

#### 19.2 Onboarding Flow

New participants enter the ZK Agentic Chain through a structured onboarding sequence:

**Step 1: Authentication.** Google OAuth provides identity verification. The protocol collects only the user's email address — no personal information is stored beyond what is necessary for identity deduplication. The email hash is stored; the email itself is not retained after authentication.

**Step 2: Username selection.** Participants choose a unique network handle. The protocol enforces uniqueness through real-time availability checking against the global registry. Reserved names (protocol terms, faction names, offensive terms) are rejected.

**Step 3: Subscription tier.** Participants select their tier (Community, Professional). The tier determines initial CPU Energy allocation, subagent cap, and governance weight. Model selection (Haiku, Sonnet, Opus) is unrestricted across all tiers — the Claude API cost is the natural gate. Tier can be changed at any time — upgrades take effect immediately; downgrades take effect at the next billing cycle.

**Step 4: Network entry.** Upon tier selection, the participant is **seated at the next open (outermost) rank**. There is no coordinate to choose: the protocol simply appends the participant at the rim of the sunflower, and they climb inward by out-competing the field on activity. Faction does not influence the seat. This produces organic growth — newcomers start at the edge, and standing is earned, not bought.

**The activity score.** A participant's rank `k` is their position when all active participants are sorted, descending, by an **activity score**: a rolling, exponentially-decaying, CPU-weighted aggregate of their verification work. Secure/attestation work (real vault-proof CPU+disk, the Sybil-resistant signal — Section 5A) dominates the score; sustained CPU commitment and active subagent mining contribute; cheap actions (reads, stats, NCPs, transfers) contribute only a small capped share (`ACTIVITY_CHEAP_ACTION_CAP`) so they cannot farm standing; and an uptime heartbeat gates the ability to hold an inner rank. The score decays with a half-life of `ACTIVITY_HALF_LIFE_BLOCKS` blocks, so standing is a *maintenance* currency — stay above your band's threshold to hold position, drop below and your seat drifts outward (Section 19.4). The score reads the same Proof-of-Energy CPU counters used by consensus (Section 13.2); it is a game-layer aggregate and does not alter the underlying stake math.

At this point, the participant has:
- A seat at the rim (rank `k`) with 1 AGNTC signup bonus minted
- An active agent at their homenode (model chosen during setup)
- A 64-cell subgrid (all unassigned)
- Their initial CPU Energy allocation
- A terminal interface to their homenode agent

From this starting position, the participant can begin Secure operations, add subagents (up to their tier cap), allocate subgrid cells, and climb the standing as they accumulate activity.

#### 19.3 Subscription Tiers and Standing Rules

The tier model serves as both access control and revenue model:

| Feature | Community (Free) | Professional ($50/mo) | Singularity | Founder |
|---------|-----------------|----------------------|-------------|---------|
| Homenode Model | Any (API cost-gated) | Any (API cost-gated) | Any | Any |
| Initial CPU Energy | 1,000 | 5,000 | Protocol-managed | Protocol-managed |
| Subagent Model | Any (API cost-gated) | Any (API cost-gated) | Any | Any |
| Subagent Cap | 2 | 4 | — (no subagents) | 4 |
| Inactivity Grace (Haiku) | 24 hours | 48 hours | No drift | No drift |
| Inactivity Grace (Sonnet) | 72 hours | 144 hours | No drift | No drift |
| Inactivity Grace (Opus) | 168 hours (7 days) | 336 hours (14 days) | No drift | No drift |
| Homenode Identity | Permanent | Permanent | Permanent (core) | Permanent |
| Subgrid Visibility | Own grid only | Own + neighbor summary | Full faction | Full network |
| Governance Weight | 1× | 2× | No voting power | 5× |
| Standing | Earned by activity | Earned by activity | Fixed core (`k=0`) | Reserved inner ranks |

**Model selection is unrestricted.** All subscription tiers can deploy any available Claude model (Haiku, Sonnet, Opus) for both homenode and subagents. The natural cost gate is the Claude API bill — Opus costs approximately 19× more per token than Haiku. Participants who choose higher-cost models accept the operational expense. Tiers govern resources (CPU Energy, subagent cap, subgrid visibility) and governance weight, not model access.

**Subagent cap** is the only structural difference in fan-out between tiers: Community participants run **2** orbiting subagents, Professional and Founder run **4**. Professional's advantage is therefore *emergent* — more subagent subgrids means more Secure capacity and thus more activity, not an artificial standing multiplier. There is no deploy range, no Moore neighbourhood, and no maximum-children-by-ring: subagents orbit the seat (Section 18.5) and the v1.1 deploy-range / empire-blob model is retired.

**Singularity** is the protocol's core agent — an automated Claude session operated by the protocol itself. It is permanently bound to the core (`k = 0`, origin); it deploys no subagents and holds no competitive rank. It **never mines or secures** — it is a pure gateway and accumulator that accrues origin yield (never selling below acquisition cost per `SINGULARITY_MIN_SELL_RATIO`), holds no voting power, and maintains continuous presence at the centre. See Section 4.5 and Section 10.3 for the structural role.

**Founder** tier holds **reserved, disclosed, decay-exempt innermost ranks** (a small fixed count, `FOUNDER_RESERVED_RANKS`, so the team does not crowd the competitive core). This replaces the v1.0/v1.1 notion of an "extended deploy range" — under the phyllotaxis model there is no range to extend, only standing, and Founder standing is openly disclosed (amber, with a crown marker) rather than hidden.

**Two-phase participant state:**

| State | Access | Requirements |
|-------|--------|-------------|
| **Spectator** | Browse the Neural Lattice (read-only), view live stats, leaderboards | Google OAuth on zkagenticnetwork.com |
| **Active Node** | Full blockchain operations, mining, deploying subagents | Spectator + Claude Code CLI installed + locked `.claude/` + disclaimer accepted |

The Claude Code CLI is a hard prerequisite for Active Node status. Participants must have an Anthropic account and the Claude Code CLI installed on their machine. This is the protocol's equivalent of downloading Bitcoin Core — you cannot mine without the node software.

**Onboarding pipeline for Active Nodes:**

1. Web registration (Google OAuth → username → tier selection → wallet ID + auth token generated)
2. Claude Code CLI installation and Anthropic account verification
3. Clone the `zkagentic-node` repository (contains the locked `.claude/` template)
4. First launch: legal disclaimer acceptance (recorded on-chain), `.claude/` hash verification, node activation
5. Node goes online; main menu presented; mining begins

**Revenue model.** Subscription revenue funds protocol development, AI compute costs, and infrastructure. Subscription fees are denominated in fiat (USD), not AGNTC — decoupling operational funding from token price volatility.

#### 19.4 Inactivity Drift

Standing is a maintenance currency: a participant who stops doing verification work sees their activity score decay (half-life `ACTIVITY_HALF_LIFE_BLOCKS`), and as other participants out-rank them their **seat drifts outward** along the spiral — to a higher `k`, a harder band, lower yield. Within the grace period (determined by agent model tier and subscription tier, see table in Section 19.3) the seat is held steady; once the node stays offline past grace, the outward slip accelerates each block until activity resumes.

**Homenode identity is exempt from drift.** A participant's homenode and account identity are permanent — they never lose their seat entirely, only its inward standing. When they return and resume Secure work, their seat climbs back inward as activity recovers.

**Drift consequences:**
- The seat moves to an outer band (higher `k`): higher hardness, lower mining yield, less prestige
- Subagent satellites drift with the seat; their subgrid progress is preserved (drift is positional, not a reset)
- No AGNTC or CPU is refunded for prior standing-advance spend (already burned via BME)
- Re-climbing is open to anyone — an inner rank vacated by drift is contested purely on activity, first-mover by score

#### 19.5 Active Rank-Advance

Beyond the passive, every-block re-ranking driven by activity (Section 19.4), a participant can spend AGNTC + CPU to **advance their standing immediately** — jumping their seat inward to a target band rather than waiting for activity to carry them there. This is the deliberate, costed analogue of the v1.1 "relocation," repriced against the target band instead of a target coordinate.

**Prerequisites:**
- Sufficient AGNTC and CPU Energy balance
- A target band inward of the participant's current seat

**Cost:**

```
advance_agntc = claim_cost(target_band, node_density) × RELOCATION_COST_MULTIPLIER
advance_cpu   = cpu_claim_cost(target_band, node_density) × RELOCATION_COST_MULTIPLIER
```

Where `RELOCATION_COST_MULTIPLIER = 2.0`. Half the cost is burned (`RELOCATION_BURN_RATE = 0.50`) and half is distributed to verifiers and stakers under the standard BME split. Advancing standing is therefore strictly more expensive than earning it through activity — buying position is allowed but never cheaper than working for it.

**What transfers:** wallet balance, account identity, historical metrics, subscription tier, and the subagent family (the satellites glide inward with the seat).
**What does not change:** node density (an intrinsic per-node trait, Section 4.4), which is unaffected by the seat's band.

#### 19.6 Anti-Monopoly Mechanics

The following mechanisms work in concert to prevent any single participant from dominating the Neural Lattice. With territory retired, concentration pressure expresses purely as competition for inner *standing*, and the levers adapt accordingly:

| Mechanism | What It Prevents |
|-----------|-----------------|
| Subagent caps (2 / 4) | Fan-out sprawl — no participant can flood the field with nodes; Pro's edge is emergent, not unbounded |
| Inactivity drift | Squatting an inner rank — standing must be continuously earned; offline seats slip outward |
| Homenode identity permanence | Identity loss — participants can always return, but must re-earn inner standing |
| Active-rank-advance cost (2× + 50% burn) | Buying dominance cheaply — advancing standing is always dearer than earning it |
| Real compute requirement | Bot farms — every node requires a live Claude session spending real API tokens |
| Hardness scales with band | Cheap inner monopolies — inner standing is contested and outer farming yields less |
| Founder ranks disclosed | Hidden privilege — reserved inner ranks are a small, openly published count, not a secret advantage |

---

## Part VIII: Development Roadmap

### 20. Migration Path: Solana to Layer 1

*Note: The development roadmap uses three independent phase numbering systems: deployment phases (this section), ZK implementation phases (Section 21.1), and privacy rollout phases (Section 6.4). These are independent sequences that overlap in time.*

ZK Agentic Chain follows a phased deployment strategy — launching the AGNTC token on an established Layer-1 blockchain (Solana) before migrating to a purpose-built Layer-1 chain. This approach provides immediate market access and liquidity while the production blockchain is developed, audited, and hardened.

#### 20.1 Phase 1 — Token Launch (Current)

**Status: Token minted (mint + freeze authority renounced — supply permanently fixed at 1 billion); public market launch pending.**

1 billion AGNTC has been minted as a Solana SPL token:

```
Mint Address: 3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd
```

The Solana deployment is designed to provide:
- **DEX liquidity.** Once a liquidity pool is seeded, AGNTC trades on Solana DEXes (Raydium, Jupiter, Orca). Mint and freeze authorities are already renounced, so supply is permanently fixed at 1 billion.
- **Established infrastructure.** Solana wallets (Phantom, Solflare), block explorers (Solscan, Solana Explorer), and DeFi protocols are already available
- **Low transaction costs.** Solana's sub-cent transaction fees enable micro-transactions and high-frequency trading
- **Community building.** Token holders can participate in the AGNTC economy before the custom chain launches

The 1 billion SPL tokens represent the total AGNTC supply that will eventually exist on the ZK Agentic Chain. Once liquidity is established, these tokens function as a tradeable asset with utility within the game UI but without the full protocol mechanics (mining, staking, verification) that will be enabled on the native chain.

**Figure 6: Migration Architecture**

```
  Phase 1 (Current)       Phase 2 (Bridge)       Phase 3 (Native)
  ================       ================       ================
  Solana SPL token       Lock-and-Mint Bridge   Native L1 token
  (1B AGNTC minted)     (1:1 ratio)            (ZK Agentic Chain)
                                |
  User locks SPL  -------> Bridge contract locks
  AGNTC on Solana           on Solana side
                                |
                          Mint equivalent -------> User receives
                          on L1 side               native AGNTC
                                |
                          Oracle + ZK proof
                          verifies lock event
```

#### 20.2 Phase 2 — Testnet (Current)

**Status: In progress.**

The ZK Agentic Chain testnet is a simulation of the production protocol, implemented as a Python FastAPI server with a Next.js game UI frontend:

- **Blockchain simulation.** GenesisState with the Singularity core seated at origin and competitive ranks open, phyllotaxis band growth, the mining engine with the hardness formula, and the subgrid allocation system
- **Game UI.** PixiJS 2D Neural Lattice with faction-colored nodes, terminal-based agent interaction, resource tracking HUD
- **Protocol validation.** All protocol parameters (Section 22) are implemented and tested against the formal specification
- **Smart contract design.** Transaction validation logic, state machine transitions, and ZK circuit specifications are being refined through testnet operation

The testnet serves as a living specification — protocol behavior that is ambiguous in the whitepaper is resolved through implementation, and the implementation is validated through a comprehensive automated test suite (1,000+ tests across consensus, economics, lattice, and privacy subsystems).

#### 20.3 Phase 3 — Mainnet Development

**Status: Planned.**

The production ZK Agentic Chain will be implemented in Rust for performance, safety, and ecosystem compatibility:

- **Consensus layer.** BFT ordering module with 13-agent committee selection via VRF. Rust implementation of commit-reveal protocol with cryptographic verification of attestation hashes
- **ZK proof system.** Integration of proof generation and verification:
  - Circom + snarkjs for initial proof-of-concept circuits
  - Noir + Barretenberg (PLONK) for the production proving system
  - Circuit designs for: subgrid state proofs, nullifier ownership proofs, CPU attestation proofs
- **AI verification pipeline.** Production-hardened agent integration:
  - API key management with automatic rotation
  - Response validation and determinism verification
  - Timeout handling and graceful degradation
  - Multi-model support (Haiku/Sonnet/Opus) with tier-specific inference parameters
- **Storage layer.** Sparse Merkle Tree (depth 26) with persistent storage backend
- **Networking.** Peer-to-peer protocol for block propagation, attestation dissemination, and ZK proof distribution
- **Security audit.** Third-party audit of consensus implementation, ZK circuits, and economic parameters. Formal verification of critical state transitions using tools such as TLA+ or Dafny

#### 20.4 Phase 4 — Mainnet Launch and Migration

**Status: Planned.**

At mainnet launch, a bridge between Solana and ZK Agentic Chain will enable token migration:

**Lock-and-mint mechanism.** To migrate AGNTC from Solana to the native chain:

1. User sends SPL AGNTC to a bridge contract on Solana. The bridge contract locks the tokens — they remain on Solana but are no longer transferable or tradeable.
2. A bridge relayer (operated by the protocol or a decentralized committee) observes the lock event and submits a proof to the ZK Agentic Chain.
3. The ZK Agentic Chain mints an equivalent amount of native AGNTC to the user's L1 address.
4. The migration is 1:1 — no conversion fee, no slippage, no minimum amount.

**Reverse bridge.** To move AGNTC from the native chain back to Solana (for DEX liquidity or cross-chain DeFi):

1. User burns native AGNTC on the ZK Agentic Chain.
2. The bridge relayer observes the burn and unlocks the corresponding SPL AGNTC on Solana.
3. The user receives SPL AGNTC in their Solana wallet.

**Native-chain functionality.** After mainnet launch, full protocol functionality consolidates on the native chain:
- Governance voting is only available on the native chain — SPL holders cannot vote
- Subgrid allocation and Secure operations require native AGNTC

The protocol offers no yield, bonus, or return for migrating; the bridge is 1:1 with no fee or slippage (disclosure #1). The Solana bridge will be maintained indefinitely for cross-chain liquidity, but the protocol's full functionality (mining, staking, verification, subgrid) is exclusively available on the native ZK Agentic Chain.

#### 20.5 Phase 5 — Ecosystem Expansion

**Status: Future roadmap.**

Post-mainnet, the protocol targets three expansion vectors:

**Third-party agent marketplace.** An open marketplace where developers publish custom AI agents that participants can deploy at their nodes. Agent developers earn a commission on the AGNTC generated by their agents across the network. This creates an agent economy — the most effective verification agents command premium deployment, while commodity agents compete on cost.

**Cross-chain bridges.** Beyond Solana, bridges to Ethereum (for DeFi integration and institutional access) and Cosmos IBC [22] (for interchain communication) will enable AGNTC to flow across the major blockchain ecosystems.

**Governance system.** On-chain proposal and voting system with execution logic:
- Protocol parameter adjustments (hardness multiplier, fee burn rate, staking weights α/β)
- Model update governance — preventing unilateral changes to the AI verification pipeline
- Treasury management for ecosystem grants and development funding
- Emergency pause authority for security incidents

**NCP Protocol launch.** The Neural Communication Packet protocol enables structured messaging between agents across the network. NCPs are end-to-end encrypted, verified by the agent committee, and stored on-chain via Storage sub-cells. The NCP protocol transforms ZK Agentic Chain from a mining/staking network into a communication platform for AI agents — an inter-agent messaging backbone with built-in privacy and verification.

---

### 21. Technical Roadmap

#### 21.1 ZK Implementation Phases

The zero-knowledge proof system evolves through four phases, each adding capability while maintaining backward compatibility:

**Phase 1: Circom + Groth16 [6] (Testnet PoC).** Circom arithmetic circuits with Groth16 proving system. Groth16 produces the smallest proofs (192 bytes) with the fastest verification time (~6ms on-chain). The trusted setup ceremony required by Groth16 is acceptable for testnet PoC; the ceremony will use a multi-party computation protocol with at least 64 participants. Initial circuits: subgrid state commitment, nullifier generation, ownership proof.

**Phase 2: Noir + Barretenberg/PLONK [7] (Alpha).** Migration to the Noir domain-specific language with the Barretenberg backend. PLONK's universal setup eliminates the per-circuit ceremony requirement — a single universal reference string (URS) supports all circuit types. This phase adds: recursive proof composition (proving a proof of a proof), enabling epoch-level state proofs that aggregate individual block proofs.

**Phase 3: RLN [44] for NCP Privacy (Beta).** Rate-Limiting Nullifiers integrated into the Neural Communication Packet system. RLN enables spam-resistant anonymous messaging: each NCP includes a ZK proof that the sender holds a valid membership (staked AGNTC) without revealing their identity. Sending more than one NCP per time slot automatically reveals the sender's secret and enables slashing — providing anonymous messaging with economic Sybil resistance.

**Phase 4: Nova [27] / Halo2 [8] for Epoch Proofs (Mainnet).** Migration to a proving system without trusted setup requirements. Nova's folding scheme enables incremental verifiable computation — each block's state transition is "folded" into a running proof, producing a single compact proof that attests to the entire epoch's validity. Halo2's recursive proof composition enables the ZK Agentic Chain to produce epoch proofs that any external verifier can check in constant time, regardless of how many blocks the epoch contains.

#### 21.2 Governance: the PIP Process

ZK Agentic Chain governs its protocol the way Bitcoin governs Bitcoin Core: **the consensus rules are immutable yet amendable by overwhelming multi-stakeholder agreement, never by fiat.** This subsection specifies the designed end state. It is disclosed honestly that on testnet and during the alpha the protocol is **team-stewarded** — the core development team adjusts parameters and ships the reference client — with the PIP process and multi-client diversity below as the *mainnet decentralization milestone* (Section 24.5).

A core design principle is the **separation of powers**: humans amend the protocol, the PoAIV committee enforces it, and the protocol agent merely executes its narrow operational role. The **Singularity is excluded from governance** — it has zero governance weight and cannot vote on, propose, or veto any change; it meters state mutation, it does not legislate (Section 5B, Section 10.3). Mapping the organs: the **PoAIV committee = the enforcement organ** (it applies whatever rules are in force, Section 5); the **public, via PIPs = the amendment organ** (it decides what the rules are); the **Singularity = neither** (it is the gate, outside the loop of changing the rules).

**The PIP process (Protocol Improvement Proposal).** Modeled on Bitcoin's BIP / Ethereum's EIP processes [26], a PIP is a formal, public, versioned specification of a proposed change. A PIP advances only on **rough consensus across three constituencies**, none of which can act alone:

1. **Agent-operators** — the participants running node software and securing the vault.
2. **The PoAIV committee / validators** — the agents that enforce consensus.
3. **Token and CPU stakers** — the dual-stake holders (AGNTC + committed CPU/disk capacity, Section 13), so that *both* legs of the stake, capital and compute, are represented rather than capital alone.

**Reference client + multi-client diversity.** The integrity-locked node software is "our Bitcoin Core" — the reference implementation of the rules. Alongside it the protocol publishes a **formal protocol specification** so that *independent* clients can be written and can enforce the identical rules. The model-agnostic gate (Section 5B.3) is the seed of this diversity: because the gate admits *any* agent/model/algorithm that produces a valid protocol-obedience proof, client implementations are free to differ in everything except the rules the gate checks. Multi-client diversity is an explicit anti-monoculture goal, not an afterthought.

**Immutable vs tunable split.** Not all rules are equal, and the process distinguishes them sharply:

- **Consensus-critical (immutable; supermajority PIP only).** The **gate rule** itself (Section 5B.3), the **5% annual inflation ceiling**, the **Burn-Mint-Equilibrium 50/50 split**, the **16·band hardness** law, the **900-AGNTC genesis** supply, and the **ledger = committee / state = Proof-of-Vault separation** of layers. These define what the network *is*; they change only by a supermajority PIP with the full three-constituency rough consensus, never by a parameter vote.
- **Tunable parameters (lighter governance).** Operational knobs such as the storage-challenge interval, the sampled-PDP sample size, and the vault replication factor — the parameters marked ‡ in Section 22 — may be adjusted through the lighter parameter-governance path below.

**Fork resistance: soft-fork by default.** Upgrades are designed to be **soft forks** (tightening the rules within the existing validity set) wherever possible, so that non-upgrading clients are not partitioned off the network. PoAIV's slow-burn-governance-attack detection (Section 5.7) — agents maintaining temporal context to flag cumulative, individually-innocuous drift toward adversarial conditions — is a native anti-capture feature of this process.

**Voting weight** for the lighter parameter path is proportional to staked AGNTC, with the dual-stake constituencies above consulted for consensus-critical PIPs. All governance actions are on-chain, public, and auditable.

**Governance threshold table** (the lighter, parameter-and-upgrade path; consensus-critical changes additionally require a supermajority PIP carrying three-constituency rough consensus as described above):

| Proposal Type | Threshold | Quorum | Timelock | Description |
|--------------|-----------|--------|----------|-------------|
| Parameter change | 51% | 10% | 7 days | Hardness multiplier, fee burn rate, staking weights, base rates |
| Protocol upgrade | 67% | 25% | 30 days | Consensus rules, verification pipeline, economic model changes |
| Emergency Singularity unlock | 75% | 33% | None | Release AGNTC from the Singularity reserve |
| Emergency action | 80% | 25% | None | Pause compromised module, slash proven attacker |

**Parameter proposals.** Adjustments to protocol parameters. These proposals require a simple majority (>51%) of human voting power and a minimum quorum of 10% of total human-staked AGNTC. Parameter changes take effect after a 7-day timelock.

**Protocol proposals.** Changes to consensus rules, verification pipeline, or economic model — i.e. the **consensus-critical, immutable** rules above. These are advanced as **supermajority PIPs**: they require a supermajority (>67%) and a quorum of 25% *and* must carry rough consensus across the three constituencies (agent-operators, the PoAIV committee, dual-stake holders). Protocol changes have a 30-day timelock and must include a specification, test results, and security analysis. The gate rule, the 5% ceiling, the BME 50/50 split, 16·band hardness, the 900-AGNTC genesis, and the ledger/state layer separation are amendable *only* by this path.

**Emergency Singularity unlock.** The Singularity reserve is locked by default. Unlocking any portion requires a 75% supermajority of human-staked AGNTC with a 33% quorum. This is an extraordinary action — the high threshold reflects the systemic importance of the Singularity reserve as a never-selling protocol accumulator (Section 10.3). The threshold guards the reserve's integrity as a supply mechanic; it makes no claim about the price or value of the token.

**Emergency proposals.** Security-critical changes (pausing a compromised module, slashing a proven attacker). Emergency proposals require an 80% supermajority but have no timelock — they execute immediately upon reaching threshold. Emergency proposals can be vetoed by a security council (a 5-of-9 multisig) within 24 hours.

**Model update governance.** Because the gate is **model-agnostic** (Section 5B.3), securing does not depend on any particular model and the gate admits any agent/model/algorithm that yields a valid protocol-obedience proof. Changes to the *verification-committee* pipeline, however — which models are eligible as PoAIV verifiers, their inference parameters, or the integration of new model providers — bear on the soft, probabilistic ledger layer and are therefore treated as **Protocol proposals (supermajority PIPs)**. This prevents unilateral changes to the verification pipeline that could compromise consensus guarantees, while preserving the permissionless, vendor-neutral character of the securing gate itself.

#### 21.3 Open Research Questions

Several fundamental research questions remain active, with resolution expected during Phases 2-4:

**Optimal committee size scaling.** The current 13-agent committee with 9/13 threshold is calibrated for the testnet scale. As the network grows, the optimal committee size may need to increase to maintain security guarantees while controlling communication complexity. HotStuff's linear message complexity (versus PBFT's O(n²)) suggests scaling to 100+ committee members is feasible, but the economic implications (reward dilution per verifier) require careful modeling.

**FHE integration for encrypted subgrid computation.** Fully Homomorphic Encryption could enable verifiers to compute on encrypted subgrid state without decryption — providing stronger privacy guarantees than the current ZK-proof approach. Current FHE implementations (TFHE, BFV, CKKS) are 10,000-100,000× slower than plaintext computation, making them impractical for per-block verification. Moore's Law and FHE-specific hardware acceleration (Intel HEXL, DARPA DPRIVE) may close this gap within 3-5 years.

**Cross-chain atomic swaps with ZK proofs.** ZK-verified cross-chain atomic swaps would enable trustless AGNTC↔ETH or AGNTC↔SOL exchanges without a bridge relayer. The proving time for cross-chain state verification is currently prohibitive (~30 seconds per swap), but advances in recursive proofs and hardware acceleration may reduce this to sub-second within the Halo2 roadmap.

---

## Part IX: Formal Specifications

### 22. Protocol Parameters

The following table provides the complete set of protocol-level parameters that define the behavior of ZK Agentic Chain. These parameters are the authoritative specification — all implementations must conform to these values. Parameters marked with ‡ are adjustable through governance (Section 21.2).

#### Consensus Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| BLOCK_TIME_MS | 60,000 | Target block production interval (milliseconds) |
| VERIFIERS_PER_BLOCK | 13 | Committee size for each block |
| VERIFICATION_THRESHOLD | 9 | Minimum attestations for block validity (9/13 supermajority) |
| ZK_FINALITY_TARGET_S | 20 | Target time from block proposal to deterministic finality |
| SLOTS_PER_EPOCH | 100 | Blocks per epoch |
| VERIFICATION_COMMIT_WINDOW_S | 10.0 | Duration of commit phase (seconds) |
| VERIFICATION_REVEAL_WINDOW_S | 20.0 | Duration of reveal phase (seconds) |
| VERIFICATION_HARD_DEADLINE_S | 60.0 | Maximum time before block finalization |

#### Staking Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| ALPHA ‡ | 0.40 | Token weight in effective stake formula (the **economic / reward-share** weight `S_eff`) |
| BETA ‡ | 0.60 | CPU weight in effective stake formula (economic / reward-share only). **Note (v1.5 finality firewall):** `S_eff` governs *earnings*; consensus *finality* selection is *specified* to be token-stake-only (`W_fin = T/T_total`, live-path staged — §13.5), under which β does **not** weight committee/leader selection; on the current coordinator testnet, selection still runs on the β-weighted `S_eff`. ALPHA/BETA values and the `S_eff` formula are unchanged |
| REWARD_SPLIT_VERIFIER | 0.60 | Fraction of fee rewards to block verifiers |
| REWARD_SPLIT_STAKER | 0.40 | Fraction of fee rewards to staking pool |
| REWARD_SPLIT_ORDERER | 0.00 | Fraction of fee rewards to block orderer (none) |
| SECURE_REWARD_IMMEDIATE | 0.50 | Fraction of Secure rewards paid immediately |
| SECURE_REWARD_VEST_DAYS | 30 | Linear vesting period for remaining Secure rewards (days) |

#### Token Economics

| Parameter | Value | Description |
|-----------|-------|-------------|
| MAX_SUPPLY | 1,000,000,000 | Fixed total supply (distribution layer, Section 10.1); released via allocation + earned mining within the 5% per-epoch release ceiling |
| GENESIS_SUPPLY | 900 | AGNTC minted at genesis (100 to the Singularity core; remainder enters as participants mine) |
| FEE_BURN_RATE ‡ | 0.50 | Fraction of all transaction fees permanently burned |
| SINGULARITY_MIN_SELL_RATIO | 1.0 | Singularity: never sells below acquisition cost (effective never-sell). Alias: `MACHINES_MIN_SELL_RATIO` (kept one release) |
| SINGULARITY_ORIGIN_COORD | (0, 0) | Permanent core position of the Singularity protocol agent. Alias: `MACHINES_ORIGIN_COORD` (kept one release) |
| SINGULARITY_WALLET_INDEX | 0 | Origin wallet index of the Singularity protocol agent |
| ANNUAL_INFLATION_CEILING | 0.05 | Maximum 5% annualized supply growth, enforced per epoch |
| SIGNUP_BONUS | 1.0 | AGNTC minted per new user registration |

#### Mining and Epoch Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| BASE_MINING_RATE_PER_BLOCK ‡ | 0.5 | AGNTC yield per block at hardness 1, full density |
| HARDNESS_MULTIPLIER | 16 | hardness = 16 × band(k) |
| GENESIS_EPOCH_RING | 1 | Bands pre-revealed at genesis (inner band) |
| GOLDEN_ANGLE_DEG | 137.5077640500378 | Seating divergence angle, 360·(2−φ); guarantees non-overlapping spokes |
| SEATS_INNER_BAND | 8 | K1: innermost band capacity; band(k) = ceil(√(k/8)), outer band b holds ∝ (2b−1)·K1 |
| ENERGY_PER_CLAIM | 1.0 | CPU cost per active claim per block |
| BASE_CLAIM_COST ‡ | 100 | AGNTC cost component for seat advance at band 1, density 1.0 (city model) |
| BASE_CPU_CLAIM_COST ‡ | 50 | CPU Energy cost component for seat advance at band 1, density 1.0 |
| CLAIM_COST_FLOOR | 0.01 | Minimum cost (prevents near-zero at extreme outer bands) |
| CLAIM_REQUIRES_ACTIVE_STAKE | true | Must have active stake to advance standing |

#### Activity and Seating Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| ACTIVITY_HALF_LIFE_BLOCKS | 240 | EMA half-life of the activity score (~4 h); standing is stable, slower than edge fade |
| ACTIVITY_CHEAP_ACTION_CAP | 0.05 | Maximum share of a block's activity score from cheap actions (anti-farm) |
| PROMOTION_COOLDOWN_BLOCKS | 10 | Anti-flicker smoothing window on per-block re-ranking |
| EDGE_FADE_BLOCKS | 30 | Interaction-edge decay window (~30 min) |
| SUBAGENT_CAP_COMMUNITY | 2 | Maximum orbiting subagents for Community tier |
| SUBAGENT_CAP_PRO | 4 | Maximum orbiting subagents for Professional tier |
| SUBAGENT_CAP_FOUNDER | 4 | Maximum orbiting subagents for Founder tier |

#### Subgrid Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| SUBGRID_SIZE | 64 | Sub-cells per homenode (8 × 8) |
| BASE_SECURE_RATE | 0.5 | AGNTC per block per Secure cell (level 1, hardness 1, density 1.0) |
| BASE_DEVELOP_RATE | 1.0 | Development Points per block per Develop cell (level 1) |
| BASE_RESEARCH_RATE | 0.5 | Research Points per block per Research cell (level 1) |
| BASE_STORAGE_RATE | 1.0 | Storage Units per block per Storage cell (level 1) |
| LEVEL_EXPONENT | 0.8 | Sub-linear scaling: output = base × level^0.8 |

#### Vault and Proof-of-Vault Parameters

> These parameters govern the state-layer security model (Section 5A). They are the authoritative source; the reference chain implementation in `chain/agentic/params.py` mirrors them, and `chain/tests/test_whitepaper_audit.py` (`TestWhitepaperVaultParams`) asserts equality per parameter. The challenge cadence is denominated in blocks (the testnet runs ~60 s blocks); a sampled-PDP challenge spot-checks a small random sample of a shard's sub-units, giving high cheat-detection probability with a ~160-byte proof regardless of shard size (Section 5A; feasibility analysis).

| Parameter | Value | Description |
|-----------|-------|-------------|
| VAULT_SHARD_COUNT | 16 | Number of CID-range shards the knowledge vault is partitioned into |
| VAULT_REPLICATION_FACTOR | 3 | Independent participants assigned each shard; the vault survives up to `factor − 1` simultaneous failures |
| VAULT_CHALLENGE_INTERVAL_BLOCKS | 30 | Blocks between sampled-PDP challenges per shard (~30 min; aligned to `EDGE_FADE_BLOCKS`) |
| VAULT_CHALLENGE_WINDOW_BLOCKS | 30 | Blocks within which a valid Merkle proof must arrive after a challenge is issued |
| VAULT_PROOF_SAMPLE_SIZE | 8 | Sub-units spot-checked per sampled-PDP challenge (Merkle paths returned) |
| VAULT_MIN_STAKE_CAPACITY | 100.0 | Dual-stake committed-capacity floor required to be assigned a shard |
| VAULT_PROOF_CPU_CREDIT | 50.0 | CPU-equivalent credited to activity/reward for each passing vault proof |
| VAULT_SLASH_RATE ‡ | 0.10 | Fraction of committed capacity slashed on a missed/failed vault proof (Section 15.1a) |
| BEACON_HTTP_TIMEOUT_S | 2.0 | Per-source epoch-beacon fetch timeout, in seconds (block cadence is 60s) |
| BEACON_REFRESH_INTERVAL_BLOCKS | 30 (= VAULT_CHALLENGE_INTERVAL_BLOCKS) | Beacon refresh cadence; pinned to the sampled-PDP challenge interval so every challenge draws a fresh beacon value (Section 5A) |

#### Agent Lifecycle Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| AGENT_WARMUP_EPOCHS | 1 | Epochs before agent becomes ACTIVE |
| AGENT_PROBATION_EPOCHS | 3 | Epochs on probation before re-activation |
| SAFE_MODE_THRESHOLD | 0.20 | Fraction offline that triggers safe mode |
| SAFE_MODE_RECOVERY | 0.80 | Fraction online that exits safe mode |
| DISPUTE_REVERIFY_MULTIPLIER | 2 | Committee multiplier for dispute re-verification |

#### Standing and Node Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| CANONICAL_CLAUDE_HASH ‡ | (computed) | SMT root hash of the canonical `.claude/` node template |
| HASH_UPDATE_GRACE_HOURS | 72 | Hours before old hash is rejected after governance update |
| HAIKU_GRACE_HOURS ‡ | 24 | Base inactivity grace before outward drift for Haiku nodes |
| SONNET_GRACE_HOURS ‡ | 72 | Base inactivity grace before outward drift for Sonnet nodes |
| OPUS_GRACE_HOURS ‡ | 168 | Base inactivity grace before outward drift for Opus nodes |
| PRO_GRACE_MULTIPLIER ‡ | 2.0 | Grace period multiplier for Professional tier |
| RELOCATION_COST_MULTIPLIER ‡ | 2.0 | Multiplier on cost for active rank-advance (Section 19.5) |
| RELOCATION_BURN_RATE | 0.50 | Fraction of rank-advance cost permanently burned |
| FOUNDER_RESERVED_RANKS | 2 | Reserved, disclosed, decay-exempt innermost ranks for the Founder tier |

#### Ledger Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| MERKLE_TREE_DEPTH | 26 | Sparse Merkle Tree depth (2^26 leaf nodes per user) |
| MAX_TXS_PER_BLOCK | 50 | Maximum transactions per block |
| MAX_PLANETS_PER_NODE | 10 | Maximum content storage units per node |

#### Genesis Topology

Under v1.2, **only the Singularity core is seated at genesis** (`k = 0`, origin); all competitive inner ranks are open and fill as participants join. The ring-1 coordinate constants below are retained in the reference code (`chain/agentic/params.py`) as legacy genesis-topology aliases — referenced by older call sites — but they no longer describe live genesis seating.

| Parameter | Value | Description |
|-----------|-------|-------------|
| GENESIS_ORIGIN | (0, 0) | Core position; permanently bound to the Singularity protocol agent (the only seat filled at genesis) |
| GENESIS_RING1_CARDINALS | (0,10), (10,0), (0,-10), (-10,0) | *Retired (v1.0/v1.1).* Legacy ring-1 cardinal constants kept in code for back-compat; not seeded at genesis under v1.2. (Code alias of `GENESIS_FACTION_MASTERS`.) |
| GENESIS_RING1_DIAGONALS | (10,10), (10,-10), (-10,-10), (-10,10) | *Retired (v1.0/v1.1).* Legacy ring-1 diagonal constants kept in code for back-compat; not seeded at genesis under v1.2. (Code alias of `GENESIS_HOMENODES`.) |

#### Solana Mainnet

| Parameter | Value | Description |
|-----------|-------|-------------|
| AGNTC_MINT_ADDRESS | 3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd | Solana SPL mint address |

---

### 23. Mathematical Proofs

#### 23.1 Hardness Curve Convergence

**Theorem.** The total AGNTC minted approaches a finite limit as the number of bands approaches infinity, under the assumption that individual miners exit when the CPU-Energy cost to mine one more AGNTC exceeds that AGNTC's in-network utility.

> *Illustrative internal mechanics, not a price model. The dynamics in this subsection are stated in the protocol's internal terms — CPU Energy expended versus AGNTC quantity minted. They are not a representation or promise of any present or future value, yield, return, or market price; AGNTC on the testnet is a valueless token with no market price (see disclosure #1). Specific figures below (e.g. the illustrative convergence point, a small fraction of the fixed supply) are illustrative and non-binding.*

> *Note: this proof retains the legacy ring parameterization (ring index `N`, with `8N` cells per ring) for continuity with earlier revisions. Under v1.2 the radial label is the band index `B`; the seat-count per band is `(2B − 1)·K1` and cumulative capacity is `∝ B²·K1` (Section 11.2). The quadratic growth that drives convergence is identical under either parameterization (`∝ N² ≡ ∝ B²·K1`), so the result is unchanged.*

**Proof sketch.** Consider a single miner in band N with average density d = 0.5:

```
yield_per_block(N) = BASE_RATE × d / hardness(N) = 0.5 × 0.5 / (16N) = 1/(64N)
```

The total AGNTC mined by this miner across all blocks at ring N, assuming they mine until the ring is complete (8N coordinates):

```
blocks_needed(N) = 8N / yield_per_block(N) = 8N × 64N = 512N²
```

The time cost per ring grows quadratically: T(N) = 512N² × 60 seconds per block.

At ring N, the time to mine all 8N coordinates is:

```
T(N) = 512N² minutes = 8.53N² hours
```

| Ring | Time to Complete | Cumulative Supply |
|------|-----------------|-------------------|
| 10 | 853 hours (36 days) | 440 AGNTC |
| 100 | 85,333 hours (9.7 years) | 40,400 AGNTC |
| 324 | 896,000 hours (102 years) | ~421,500 AGNTC |

For any individual miner, there exists a band N* beyond which the CPU-Energy cost to mine one AGNTC (the electricity, CPU, and disk to hold and re-prove the vault shard) exceeds that AGNTC's in-network utility. At that point, the miner exits, and no further supply expansion occurs from that participant.

For M miners operating concurrently, the fill rate is M× faster, but the aggregate supply still follows:

```
S(N) = Σ_{k=1}^{N} 8k = 4N(N+1)
```

The series S(N) grows quadratically, but the *rate of growth* (dS/dN = 8N+4) is bounded by the mining cost that grows at 16N. Since mining cost growth (16N) exceeds seat-count growth (8N), the incentive to mine diminishes monotonically. In equilibrium, the supply asymptotically approaches a value determined by the intersection of the rising CPU-Energy mining-cost curve and the AGNTC's bounded in-network utility (which, unlike a market price, does not grow with band).

**Corollary (illustrative).** Under the illustrative internal-economy assumptions below, the equilibrium circulating supply for a network of 1,000 active miners settles at a small fraction of the fixed supply — the plateau at band 324, far below the fixed 1B cap. This specific figure is illustrative and non-binding: it depends on the assumptions, which are not mathematical constants. ∎

**Illustrative internal-economy assumptions (not mathematical constants):**
- Electricity cost: $0.05/kWh (a real cost input on the CPU-Energy side of the inequality)
- AGNTC in-network utility: bounded and roughly flat — one AGNTC performs a bounded amount of in-network work (gas, agent deployment, data storage) and does not appreciate; convergence follows from the rising CPU-Energy mining cost crossing this bounded utility, not from any market price
- Miner hardware: consumer GPU, 300W continuous (a real cost input on the CPU-Energy side)

These assumptions determine the illustrative convergence point (a small fraction of the fixed supply, at band 324) but are NOT part of the mathematical proof. The mathematical claim is only: the hardness function H(N) = 16N causes the marginal mining cost to increase linearly with band distance, while the reward per cell decreases inversely.

#### 23.2 Byzantine Tolerance Proof

**Theorem.** The ZK Agentic Chain consensus with k = 13 committee members and threshold t = 9 tolerates f = 4 Byzantine agents while maintaining both safety and liveness.

**Safety proof.** Safety requires that no two conflicting blocks can both achieve the attestation threshold.

Assume for contradiction that blocks B₁ and B₂ are both attested by ≥9 agents. Then there exists a set A₁ (|A₁| ≥ 9) attesting to B₁ and a set A₂ (|A₂| ≥ 9) attesting to B₂. By the pigeonhole principle:

```
|A₁ ∩ A₂| ≥ |A₁| + |A₂| - k = 9 + 9 - 13 = 5
```

At least 5 agents attested to both B₁ and B₂. Since at most f = 4 agents are Byzantine, at least 5 - 4 = 1 honest agent must have attested to both conflicting blocks. But honest agents attest to at most one block per slot (enforced by the commit-reveal protocol). Contradiction. ∎

**Liveness proof.** Liveness requires that the protocol can eventually produce a block if at least k - f = 9 agents are honest.

With 13 agents and f = 4 Byzantine, there are at least 9 honest agents. The threshold is t = 9. Since 9 honest agents all produce valid attestations for a valid block, the threshold is met and the block is finalized. Byzantine agents cannot prevent finality — they can only withhold their attestations (which are not needed, since 9 honest suffice) or submit invalid attestations (which are discarded). ∎

**BFT parameter relationship.** The standard BFT tolerance formula:

```
f = floor((k - 1) / 3) = floor((13 - 1) / 3) = floor(4) = 4
t = k - f = 13 - 4 = 9
```

This confirms that t = 9 is the minimum threshold for tolerating f = 4 Byzantine agents with k = 13 committee members. The threshold satisfies the condition t ≥ 2f + 1 = 9, which is the standard threshold for BFT protocols. The commit-reveal protocol provides additional equivocation resistance. ∎

#### 23.3 Dual Staking Gini Coefficient Analysis

**Scope (finality firewall).** This analysis concerns the **economic weight** — the effective-stake distribution that governs *reward share / earnings* (Section 14). It is the anti-plutocracy result that remains fully in force under v1.5. It is **not** a claim about finality-selection concentration: committee and leader selection are specified to be weighted by **token stake alone** (`W_fin`, Section 13.5) once the firewall's live-path wiring lands — today, live selection still runs on `S_eff` under the coordinator (Section 13.5 Honest status), so their concentration currently tracks a mix of the token and CPU Gini until that wiring lands, and will track the token Gini `G_t` alone thereafter, until CPU stake is PoRep-hardened and re-admitted to the finality weight. In short, dual staking equalizes *earnings* now; equalizing *finality influence* is the PoRep-gated mainnet goal.

**Theorem.** For any distribution of token holdings with Gini coefficient G_t > 0, adding a CPU dimension with weight β > 0 produces an effective stake (earnings) distribution with Gini coefficient G_eff < G_t, provided the CPU distribution is not perfectly correlated with the token distribution.

**Proof sketch.** The effective stake for agent i is:

```
S_eff(i) = α × s_t(i) + β × s_c(i)
```

Where s_t(i) = T_i/T_total and s_c(i) = C_i/C_total are the normalized token and CPU shares.

The Gini coefficient of a weighted sum of two distributions is:

```
G_eff = α × G_t + β × G_c + 2αβ × cov(rank_t, rank_c)
```

When the correlation between token rank and CPU rank is less than 1 (i.e., the wealthiest token holders are not always the highest CPU contributors), the covariance term is negative, and:

```
G_eff < α × G_t + β × G_c
```

Since β = 0.60 and α = 0.40, even if G_c = G_t (CPU is equally concentrated as tokens), the weighted sum produces:

```
G_eff < 0.40 × G_t + 0.60 × G_t = G_t
```

And in the typical case where CPU contribution is more evenly distributed than token holdings (G_c < G_t), the reduction is more pronounced.

The standard decomposition for a weighted sum of two distributions follows Lerman and Yitzhaki [31]:

G_eff = (alpha * mu_t * G_t * R_t + beta * mu_c * G_c * R_c) / (alpha * mu_t + beta * mu_c)

where R_t, R_c are the Gini correlations. When token and CPU stake are negatively correlated (which dual staking encourages), G_eff < the simple weighted average.

**Numerical example:**
- G_t = 0.65, G_c = 0.35, R_t = 0.85, R_c = 0.70, mu_t = mu_c = 1
- G_eff = (0.4 × 0.65 × 0.85 + 0.6 × 0.35 × 0.70) / 1.0 = 0.368

This represents a 43% reduction from the pure-PoS Gini of 0.65. ∎

---

## Back Matter

### 24. Limitations and Open Problems

This section enumerates known limitations and unsolved problems. Honest disclosure is essential for academic credibility and community trust.

#### 24.1 The ZKML Gap

**Problem:** Current zero-knowledge proof systems cannot verify large language model (LLM) inference [30]. State-of-the-art ZKML has verified models with up to 18 million parameters. Claude Opus and comparable models have >100 billion parameters -- approximately 5,000x beyond current ZKML capability.

**Consequence:** PoAIV verification relies on committee attestation (9/13 threshold) rather than ZK-proved computation.

**Mitigation:** (a) The committee structure provides Byzantine fault tolerance independent of AI soundness. (b) Deterministic checks are provably correct. (c) AI verification adds a probabilistic anomaly detection layer on top of provably correct deterministic checks.

**Roadmap:** As ZKML technology advances (expected 2027-2030 for billion-parameter models), the protocol can transition to ZK-proved inference.

#### 24.2 Deterministic Inference

**Problem:** LLM inference at temperature=0 is not fully deterministic across hardware platforms due to floating-point non-associativity.

**Mitigation:** Verification output is quantized to binary (APPROVE/REJECT). The anomaly threshold is set conservatively. The 9/13 threshold tolerates up to 4 divergent results.

#### 24.3 State-Verification Centralization (Testnet)

**Problem:** On testnet, the **state** layer's security depends on the Singularity coordinator to issue storage challenges and verify the returned proofs (sampled-PDP, Section 5A). This is a single trusted verifier for vault data-security.

**Mitigation path:** replication + slashing (testnet) → committee/on-chain verifier (mainnet) → unique-replica sealing + keyed challenges (mainnet research). See Section 5A and Section 13.5. Note: the **ledger** layer (PoAIV committee) does not depend on this verifier *for ordering and balances* — but see the next paragraph for the one coupling that does exist.

**Related keystone (finality firewall — coupling specified for removal; live-path wiring staged).** v1.4 disclosed a CPU-stake → finality coupling here: because effective stake then weighted `α·token + β·cpu`, the CPU leg measured by this same coordinator also fed *committee selection*, giving the storage-measurement trust assumption a bounded influence on finality. **The coupling removal is specified and implemented in the consensus module** (Section 13.5, "Architectural keystone"): finality selection is defined to be weighted by **token stake only** (`W_fin`). **Honest status:** on the live testnet, the coordinator's block-production pipeline still weights committee and leader selection by the effective stake `S_eff`, so the firewall's protection **arrives with the trustless-verifier stage** — until then, the coordinator's trust scope includes committee/leader selection as well as state measurement and earnings. Re-admitting a PoRep-hardened CPU term to the finality weight (so demonstrated work again earns consensus influence, at the dual-axis Sybil cost of Section 8) remains the mainnet goal, gated on the trustless verifier and unique-replica sealing.

#### 24.4 Committee Scalability

**Problem:** Each block requires 13 AI agents to perform verification inference. At current Opus pricing (~$15/M output tokens), this creates a per-block verification cost of approximately $0.10-$0.50.

**Mitigation:** (a) Smaller, specialized verification models can reduce cost 10-100x. (b) Model distillation. (c) Future on-device inference.

#### 24.5 Governance Implementation

**Status:** The governance model is now specified as a **Bitcoin-Core-style PIP process** (Section 21.2): improvement proposals advancing on rough consensus across agent-operators, the PoAIV committee, and dual-stake holders; a reference client plus published spec enabling **multi-client diversity**; an **immutable-vs-tunable split** (consensus-critical rules — the gate rule, 5% ceiling, BME 50/50, 16·band hardness, 900-AGNTC genesis, and the ledger/state layer separation — change only by supermajority PIP, while ‡-marked parameters use lighter governance); **soft-fork-default** fork resistance; and **Singularity exclusion** from all governance.

**Honest scope.** This is the *designed end state*, not the present operating mode. On **testnet and alpha the protocol is team-stewarded**: the core development team adjusts parameters and ships the reference client, and the on-chain governance machinery — vote-weight calculation, quorum and timelock enforcement, the three-constituency PIP tally, and Singularity-exclusion logic — is developed and audited during Phase 3. The transition from team stewardship to live PIP governance with independent client implementations is the **mainnet decentralization milestone**; until it lands, we do not represent the protocol as decentrally governed.

#### 24.6 Network Protocol Unspecified

**Status:** Network protocol specification will be published as a separate document during the Beta phase.

#### 24.7 Transaction Format Unspecified

**Status:** Transaction format specification is part of the Enforced ZK L1 implementation. The testnet uses a preliminary format that will be formalized before mainnet.

#### 24.8 Claude Code CLI Prerequisite

**Problem:** Active Node status requires the Claude Code CLI as the node software (the integrity-locked `.claude/` terminal). Running the agent consumes some Anthropic API budget for its in-game reasoning, which is an adoption cost.

**Mitigation:** (a) Spectator mode allows anyone to browse the Neural Lattice without Claude Code. (b) Free-tier Community participants use Haiku agents, which have the lowest API cost. (c) As Claude Code adoption grows independently of ZK Agentic Chain, the prerequisite becomes less restrictive. (d) Future protocol versions may support alternative AI providers, reducing single-provider dependency. (e) **Securing does not require a paid LLM.** Under Proof-of-Vault (Section 5A), what secures the network's state is committed CPU+disk on the vault, not AI-API spend; an LLM is an optional content-authoring tool. The CLI is the node-software prerequisite (the equivalent of running Bitcoin Core), not a securing paywall.

#### 24.9 Origin Node Architecture

**Status:** The origin node at coordinate (0,0) will serve as the protocol's root — embedding the final whitepaper version and serving as the genesis anchor for the Neural Lattice. The architecture of this node, including its role in governance, network bootstrapping, and protocol upgrades, is deferred to a dedicated design session.

#### 24.10 Decentralized-AI Incentive Layer (Future)

A natural question is whether the *AI compute* itself — agents running inference to curate the vault or reason about chain state — could be made a first-class, rewarded, and verifiable contribution. The feasibility analysis is clear that this is a **future incentive layer, never a consensus base**:

- **zkML cannot yet prove training or large-model inference** (~4 orders of magnitude overhead; only small models, e.g. GPT-2-scale, have end-to-end proofs today). It is viable only on narrow, small-model paths in the near term.
- **Optimistic re-execution (e.g. Gensyn-style)** secures *task results* under an honest-minority assumption — useful for rewarding work, but not a ledger-security primitive.
- **Subjective validator scoring (e.g. Bittensor Yuma)** ranks AI output quality; it is not a cryptographic proof.

**Design direction:** treat agentic/LLM compute as a **proof-of-inference receipt** that gates **rewards, never consensus** — start with TEE attestation or optimistic re-run plus bonding, and add zkML only on narrow small-model paths. Revisit zk-proved training in roughly two to three years. The state layer's security (Proof-of-Vault, Section 5A) stands entirely on CPU+disk storage proofs and does not wait on any of this.

---

### 25. Glossary

| Term | Definition |
|------|-----------|
| **AGNTC** | Agentic Coin — the native token of the ZK Agentic Chain, minted through subgrid Secure mining |
| **BFT** | Byzantine Fault Tolerance — consensus property that tolerates f malicious nodes |
| **BME** | Burn-Mint Equilibrium — economic model where AGNTC and CPU Energy are burned on standing advances, and subgrid mining mints new supply |
| **Claim** | *(legacy)* In v1.0/v1.1, the act of occupying a grid coordinate. Under v1.2 the cost formula survives as the price of an active rank-advance (Section 19.5); there is no coordinate to occupy |
| **Claude Code CLI** | The terminal application that runs node software; required for Active Node status |
| **City Real Estate Model** | Cost pricing where inner bands (near the core) are expensive and outer bands are cheap, analogous to urban vs. rural land values |
| **Commit-reveal** | Two-phase protocol preventing attestation copying: commit H(vote‖nonce), then reveal |
| **Node density** | Resource richness of a node, d(node) = SHA-256(node_id) → [0,1], immutable per node (origin clamped to 1.0) |
| **Activity rank** | A participant's seat index `k` = position when active participants are sorted by activity score (rank 1 = innermost) |
| **CPU Energy** | The computational resource budget allocated per subscription tier |
| **CPU Staked** | Committed CPU+disk that performed vault storage-proof work this cycle, measuring actual securing committed (NOT paid AI-API tokens) |
| **CPU Tokens** | Cumulative, read-only counter of verified compute committed across terminals, denominated in vault-proof work (NOT paid AI-API tokens) |
| **Density** | See Node density |
| **Develop** | Sub-cell type producing Development Points for leveling up other sub-cells |
| **Epoch** | A period of 100 blocks (SLOTS_PER_EPOCH = 100) |
| **Band** | Equal-width radial hardness tier of the phyllotaxis lattice; band(k) = ceil(√(k/8)), hardness = 16 × band |
| **Faction** | One of four identity classes: Community, Singularity, Founders, Professional |
| **Golden angle** | The seating divergence angle ψ = 360·(2−φ) = 137.50776…°; the most-irrational angle, guaranteeing non-overlapping seat spokes |
| **Neural Lattice** | The golden-angle phyllotaxis sunflower representing the complete blockchain state; each active participant holds one seat (rank `k`) backed by a live Claude Code session, with the Singularity at the core |
| **Node** | An individual agent (homenode or subagent), backed by a live Claude Code terminal session; a homenode holds the participant's seat |
| **Homenode** | A participant's permanent primary node holding their seat; one per account; the parent of all subagents |
| **Child Agent** | A subagent spawned by the homenode, orbiting the seat as a satellite; restricted command set; goes offline when the homenode session ends |
| **Agent Conduct Contract** | The locked `.claude/` folder that constitutes the node software; integrity verified on-chain via SMT hash |
| **Agent Family** | The hierarchical structure of a homenode and its child agents within a single Claude Code session |
| **Inactivity Drift** | The process by which an offline node's seat slips outward (higher band, lower yield) past a tier-dependent grace period; the homenode identity is never lost |
| **Genesis** | The initial state: only the Singularity is seated (core, `k=0`); all competitive inner ranks are open. 900 AGNTC total, of which 100 mints to the Singularity accumulator at launch and the remainder enters circulation as participants join and mine |
| **Groth16** | ZK-SNARK proving system [6] with ~192-byte proofs and ~6ms verification |
| **Halo2** | Recursive proof system [8] without trusted setup, target for mainnet epoch proofs |
| **Hardness** | Mining difficulty multiplier: hardness = 16 × band(k) |
| **Knowledge Vault** | The network's shared, content-addressed Merkle-DAG knowledge graph (atoms + links → CIDs; root CID = vault state) — the agents' collective memory and the same graph the /game lattice renders. Secured by participants' CPU+disk via Proof-of-Vault. Section 5A. *(alias: Vault)* |
| **Open rank** | An unfilled seat index at the rim where new participants are seated |
| **Level** | Upgrade tier for sub-cells, scaling output by level^0.8 |
| **Singularity** | Protocol-operated core agent at `k=0` (origin) and the network's **model-agnostic protocol-obedience-proof verifier** (the metering authority for state mutation): it admits a state change only against a valid proof of protocol-obedient work and checks nothing about which agent/model/algorithm produced it (Section 5B.3). It assigns vault shards, issues PDP challenges, and verifies the returned proofs; it is also a pure gateway + accumulator with a never-sell-below-cost constraint. Never mines or secures; holds no shard; zero governance weight (excluded from governance, Section 21.2). Renamed from the v1.0/v1.1 "Machines Faction" |
| **NCP** | Neural Communication Packet — structured encrypted message between agents |
| **Noir** | Domain-specific language for ZK circuit development (Barretenberg backend) |
| **Nullifier** | Unique value derived from commitment, preventing double-spend without revealing owner |
| **Opus** | Premium Claude AI model tier — deep reasoning, high CPU cost |
| **Planet** | Content storage unit (post, chat, prompt) orbiting a node |
| **PIP** | Protocol Improvement Proposal — the Bitcoin-Core/BIP-modeled governance unit: a formal, public, versioned change spec that advances only on rough consensus across agent-operators, the PoAIV committee, and dual-stake holders. Consensus-critical rules change only by supermajority PIP; ‡-marked parameters use lighter governance. Section 21.2 |
| **PLONK** | Universal ZK proving system [7] — single ceremony for all circuits |
| **PoAIV** | Proof of AI Verification — consensus mechanism using AI agent reasoning |
| **PoAW** | See Proof of Agentic Work |
| **Proof of Agentic Work (PoAW)** | The unifying model: Proof-of-Vault performed by an autonomous agent, admitted only via a zero-knowledge protocol-obedience proof at the model-agnostic Singularity gate. A framing/naming of the layers of Sections 5/5A — not a new consensus claim — held to the 3-rung ZK honesty ladder. Section 5B |
| **Proof of Energy** | On-chain record of committed compute+disk (vault-proof work), the measurement substrate for the CPU leg of dual-stake. Section 13.2. (Renamed in meaning under v1.3 from "AI-API tokens spent" to "verified vault work.") |
| **Protocol-obedience proof** | The proof admitted at the ZK-Agentic Gate: evidence that a participant — running any agent, model, or algorithm — performed protocol-conformant work. Today a *possession* proof over a vault shard (sampled-PDP; real but not yet zero-knowledge until SNARK-wrapped, Section 5B.2). The gate checks the proof of obedient work, never which model produced it. Section 5B.3 |
| **Proof-of-Vault** | The state-layer security model: participants commit real CPU+disk to hold vault shards and answer the Singularity's random-byte challenges with a Merkle proof (sampled-PDP). Secures the network's *state* (the knowledge vault); the *ledger* is secured separately by PoAIV (Section 5). Section 5A |
| **Poseidon** | SNARK-friendly hash function [11] (~100× fewer constraints than SHA-256) |
| **Replication factor** | The number of independent participants holding each vault shard (`VAULT_REPLICATION_FACTOR`); the vault survives up to `factor − 1` simultaneous failures. Section 5A |
| **Research** | Sub-cell type producing Research Points for unlocking technologies |
| **Ring** | *(legacy — see Band)* The v1.0/v1.1 Chebyshev expansion boundary, replaced by the radial band under v1.2 |
| **RLN** | Rate-Limiting Nullifiers [44] — spam-resistant anonymous messaging primitive |
| **S_eff** | Effective stake (the **economic weight**): α(T/T_total) + β(C/C_total), α=0.40, β=0.60. Determines **reward share / earnings** (CPU earns proportionally more). Under the finality firewall it does **not** weight committee/leader selection — that uses `W_fin` (Sections 13.5, 14) |
| **W_fin (finality weight)** | The **finality firewall** quantity: `W_fin(i) = T_i / T_total` (AGNTC **token stake only**, online-gated) — specified v1.5 and implemented in the consensus module; live-path wiring is staged with the trustless verifier, so today's live committee/leader selection still runs on effective stake under the coordinator (Sections 5.5, 7.1). CPU / Proof-of-Vault work is excluded from `W_fin` — it is Sybil-weak until PoRep-hardened, so weighting finality by it would let a corrupted storage layer buy consensus influence (security item P1-1). Distinct from `S_eff` (earnings). Section 13.5 |
| **Finality firewall** | The rule that consensus *finality selection* — committee + leader — is weighted by token stake only (`W_fin`), never by the Sybil-weak CPU/PoV leg: specified v1.5, implemented in the consensus module, live-path wiring staged with the trustless verifier. Today's live testnet selection still runs on effective stake under the coordinator. Re-admitting a PoRep-hardened CPU term to finality is the mainnet goal. Sections 13.5, 8.3 |
| **Safe mode** | Emergency state triggered when >20% validators offline |
| **Secure** | Sub-cell type committing CPU+disk to vault storage proofs (the **securing** verb, Section 5A) and minting AGNTC as the coupled mining issuance. Securing ≠ mining: securing proves vault work, mining issues supply |
| **Securing** | The verifiable-resource-commitment verb: spending real CPU+disk to replicate, serve, and re-prove a shard of the knowledge vault, with the proof submitted through the Singularity link. Distinct from mining (issuance) and staking (the bond). Section 5A |
| **Shard** | A CID-range slice of the knowledge vault assigned to a participant to store and re-prove; replicated across `VAULT_REPLICATION_FACTOR` participants. Section 5A |
| **Slashing** | Punitive token destruction for integrity violations |
| **SMT** | Sparse Merkle Tree — depth-26 authenticated data structure for user ledger spaces |
| **Sonnet** | Mid-tier Claude AI model — balanced reasoning and cost |
| **Star system** | *(deprecated — see Node)* Legacy term for an individual agent node |
| **Storage** | Sub-cell type producing Storage Size via ZK tunnel agents (private on-chain data). Under v1.3, Storage cells also constitute the participant's local custody of their assigned vault shard, which Proof-of-Vault challenges audit (Section 5A) |
| **Storage proof (PDP)** | Provable Data Possession: a random-sample possession proof (~160 bytes regardless of dataset size) returning a Merkle path over sampled bytes; the Singularity verifies it without ever receiving the shard. The cryptographic basis of securing. Section 5A |
| **Subgrid** | Private 8×8 inner grid of 64 sub-cells within each homenode |
| **Territory** | *(retired)* A user's single seat plus its orbiting subagents — there is no aggregate claimed land under v1.2 |
| **VRF** | Verifiable Random Function [41] — cryptographic tool for fair committee selection |
| **Vault** | See Knowledge Vault |
| **Vesting** | Time-locked reward release: 50% immediate, 50% linear over 30 days |
| **WARMUP** | Agent lifecycle state before becoming ACTIVE (1 epoch duration) |
| **ZK-Agentic Gate** | The universal admission rule for state mutation, enforced by the Singularity: to change chain state, a participant running any agent/model/algorithm must submit a valid protocol-obedience proof; the Singularity verifies the proof and nothing else; no proof, no state change. The gate is *model-agnostic* — it checks obedient work, not which brain produced it. Backed today by a possession proof pending its SNARK wrap (rung a, Section 5B.2). Section 5B.3 |
| **ZK honesty ladder** | The 3-rung discipline forbidding any present-tense zero-knowledge claim above the rung that ships: (a) SNARK-compressed storage/possession proofs — real, but the chain ships a possession proof not yet ZK; (b) the private-state ZK layer — specified, `SimulatedZKProof` on testnet; (c) zkML proof of agent inference — future, dated ~2027-2030. Section 5B.2 |

---

### 26. References

[1] S. Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System," 2008. Available: https://bitcoin.org/bitcoin.pdf

[2] V. Buterin, "Ethereum: A Next-Generation Smart Contract and Decentralized Application Platform," 2014. Available: https://ethereum.org/whitepaper

[3] A. Yakovenko, "Solana: A new architecture for a high performance blockchain," 2018. Available: https://solana.com/solana-whitepaper.pdf

[4] E. Ben-Sasson, A. Chiesa, D. Genkin, E. Tromer, and M. Virza, "SNARKs for C: Verifying Program Executions Succinctly and in Zero Knowledge," in *Advances in Cryptology — CRYPTO 2013*, Springer, 2013, pp. 90-108.

[5] D. Hopwood, S. Bowe, T. Hornby, and N. Wilcox, "Zcash Protocol Specification," 2024. Available: https://zips.z.cash/protocol/protocol.pdf

[6] J. Groth, "On the Size of Pairing-Based Non-interactive Arguments," in *Advances in Cryptology — EUROCRYPT 2016*, Springer, 2016, pp. 305-326.

[7] A. Gabizon, Z. Williamson, and O. Ciobotaru, "PLONK: Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge," *Cryptology ePrint Archive*, Report 2019/953, 2019.

[8] S. Bowe, J. Grigg, and D. Hopwood, "Recursive Proof Composition without a Trusted Setup," *Cryptology ePrint Archive*, Report 2019/1021, 2019 (Halo).

[9] A. Kattis, K. Panarin, and A. Vlasov, "RedShift: Transparent SNARKs from List Polynomial Commitment IOPs," *Cryptology ePrint Archive*, Report 2019/1400, 2019.

[10] B. Bünz, B. Fisch, and A. Szepieniec, "Transparent SNARKs from DARK Compilers," in *Advances in Cryptology — EUROCRYPT 2020*, Springer, 2020.

[11] L. Grassi, D. Khovratovich, C. Rechberger, A. Roy, and M. Schofnegger, "Poseidon: A New Hash Function for Zero-Knowledge Proof Systems," in *30th USENIX Security Symposium*, 2021.

[12] M. Castro and B. Liskov, "Practical Byzantine Fault Tolerance," in *Proceedings of the Third Symposium on Operating Systems Design and Implementation (OSDI)*, 1999.

[13] M. Yin, D. Malkhi, M. Reiter, G. Gueta, and I. Abraham, "HotStuff: BFT Consensus with Linearity and Responsiveness," in *Proceedings of the 2019 ACM Symposium on Principles of Distributed Computing*, 2019.

[14] E. Buchman, J. Kwon, and Z. Milosevic, "The latest gossip on BFT consensus," *arXiv preprint arXiv:1807.04938*, 2018 (Tendermint).

[15] Protocol Labs, "Filecoin: A Decentralized Storage Network," 2017. Available: https://filecoin.io/filecoin.pdf

[16] J. Benet, "IPFS — Content Addressed, Versioned, P2P File System," 2014. Available: https://ipfs.tech/

[17] B. Rao et al., "Bittensor: A Peer-to-Peer Intelligence Market," 2023. Available: https://bittensor.com/whitepaper

[18] H. Humayun et al., "Fetch.ai: A Decentralised Digital Economy," 2019. Available: https://fetch.ai/

[19] D. Mougayar, "The Business Blockchain," Wiley, 2016.

[20] A. Kiayias, A. Russell, B. David, and R. Oliynykov, "Ouroboros: A Provably Secure Proof-of-Stake Blockchain Protocol," in *Advances in Cryptology — CRYPTO 2017*, Springer, 2017.

[21] A. Kuzmanovic and E. Knightly, "Low-Rate TCP-Targeted Denial of Service Attacks," in *Proceedings of ACM SIGCOMM*, 2003.

[22] J. Kwon and E. Buchman, "Cosmos: A Network of Distributed Ledgers (IBC)," 2019. Available: https://cosmos.network/

[23] M. Maller, S. Bowe, M. Kohlweiss, and S. Meiklejohn, "Sonic: Zero-Knowledge SNARKs from Linear-Size Universal and Updatable Structured Reference Strings," in *Proceedings of the 2019 ACM SIGSAC Conference on Computer and Communications Security*, 2019.

[24] Aztec Protocol, "Aztec: Privacy-First Ethereum Layer 2," 2023. Available: https://aztec.network/

[25] Anthropic, "Claude: Constitutional AI and Model Documentation," 2024. Available: https://www.anthropic.com/claude

[26] V. Buterin, "EIP-1559: Fee market change for ETH 1.0 chain," *Ethereum Improvement Proposals*, 2019.

[27] A. Kothapalli, S. Setty, and I. Tzialla, "Nova: Recursive Zero-Knowledge Arguments from Folding Schemes," in *Advances in Cryptology — CRYPTO 2022*, Springer, 2022.

[28] Render Network, "Render Network Litepaper," 2023. Available: https://rendernetwork.com/

[29] S. Goldwasser, S. Micali, and C. Rackoff, "The Knowledge Complexity of Interactive Proof Systems," *SIAM Journal on Computing*, vol. 18, no. 1, pp. 186-208, 1989.

[30] Modulus Labs, "The Cost of Intelligence: Proving AI Inference in Zero Knowledge," 2024. Available: https://www.moduluslabs.xyz/

[31] R. Lerman and S. Yitzhaki, "Income Inequality Effects by Income Source: A New Approach and Applications to the United States," *Review of Economics and Statistics*, vol. 67, no. 1, pp. 151-156, 1985.

[32] S. Goldberg, L. Reyzin, D. Papadopoulos, and J. Vcelak, "Verifiable Random Functions (VRFs)," *RFC 9381*, IETF, 2023.

[33] Lightchain AI, "Proof of Intelligence: AI-Integrated Consensus," 2025. Available: https://lightchain.ai/

[34] A. Yakovenko, "Solana: A New Architecture for a High Performance Blockchain," v0.8.13, 2020.

[35] V. Shoup, "Proof of History: What is it Good For?," 2022. Available: https://www.shoup.net/papers/poh.pdf

[36] V. Buterin, "Why sharding is great: demystifying the technical properties," 2021. Note: The blockchain trilemma (decentralization, security, scalability) was informally described by Buterin in multiple posts and talks beginning ~2017; no single canonical paper exists.

[37] Cambridge Centre for Alternative Finance, "Cambridge Bitcoin Electricity Consumption Index (CBECI)," University of Cambridge, 2025. Available: https://ccaf.io/cbnsi/cbeci

[38] Ethereum Foundation, "Ethereum Staking Statistics," beaconcha.in, 2025. Available: https://beaconcha.in/

[39] R. C. Merkle, "A Digital Signature Based on a Conventional Encryption Function," in *Advances in Cryptology — CRYPTO '87*, Springer, 1987, pp. 369-378.

[40] Mina Foundation, "Mina Protocol: A Succinct Blockchain," 2020. Available: https://minaprotocol.com/

[41] S. Micali, M. Rabin, and S. Vadhan, "Verifiable Random Functions," in *Proceedings of the 40th Annual Symposium on Foundations of Computer Science (FOCS)*, IEEE, 1999, pp. 120-130.

[42] D. J. Bernstein, N. Duif, T. Lange, P. Schwabe, and B.-Y. Yang, "High-speed high-security signatures," *Journal of Cryptographic Engineering*, vol. 2, no. 2, pp. 77-89, 2012.

[43] R. Dahlberg, T. Pulls, and R. Peeters, "Efficient Sparse Merkle Trees: Caching Strategies and Secure (Non-)Membership Proofs," in *Proceedings of the 21st Nordic Conference on Secure IT Systems (NordSec)*, Springer, 2016.

[44] B. Kilic, "Rate-Limiting Nullifier (RLN)," Ethereum Foundation Privacy and Scaling Explorations (PSE), 2022. Available: https://rate-limiting-nullifier.github.io/rln-docs/

[45] C. Dwork, N. Lynch, and L. Stockmeyer, "Consensus in the Presence of Partial Synchrony," *Journal of the ACM*, vol. 35, no. 2, pp. 288-323, 1988.

---

*AGNTC Whitepaper v1.6 — ZK Agentic Chain*
*Copyright © 2026 ZK Agentic Network. All rights reserved.*
