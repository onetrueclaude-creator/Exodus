# Agentic AI + Blockchain Competitive Landscape
## Research for ZK Agentic Network — February 2026

---

## Table of Contents

1. [Fetch.ai (FET/ASI)](#1-fetchai-fetasi)
2. [Bittensor (TAO)](#2-bittensor-tao)
3. [SingularityNET (AGIX/ASI)](#3-singularitynet-agixasi)
4. [Autonolas / Olas (OLAS)](#4-autonolas--olas-olas)
5. [Ritual](#5-ritual)
6. [Morpheus (MOR)](#6-morpheus-mor)
7. [Virtuals Protocol (VIRTUAL)](#7-virtuals-protocol-virtual)
8. [ElizaOS / ai16z (ELIZAOS)](#8-elizaos--ai16z-elizaos)
9. [Theoriq (THQ)](#9-theoriq-thq)
10. [Emerging Projects (2025–2026)](#10-emerging-projects-20252026)
11. [Landscape Map](#11-landscape-map)
12. [Competitive Positioning for ZK Agentic Network](#12-competitive-positioning-for-zk-agentic-network)

---

## 1. Fetch.ai (FET/ASI)

### Overview

Fetch.ai is one of the earliest blockchain-native autonomous agent platforms, now merged into the **Artificial Superintelligence Alliance (ASI)** alongside SingularityNET and Ocean Protocol. The FET token has been rebranded to ASI and serves as the unified economic layer across all three projects.

### Architecture

Fetch.ai uses a three-layer architecture:

- **Layer 1 — Autonomous Economic Agents (AEAs):** Lightweight Python agents (built via the `uAgents` SDK) that register on-network, discover peers, and transact autonomously. Agents are off-chain processes that interact with the ledger for settlement and discovery.
- **Layer 2 — Open Economic Framework (OEF):** A decentralized peer-discovery and search layer where agents find services and capabilities. DeltaV is the consumer-facing AI-powered marketplace built on top of the OEF.
- **Layer 3 — Ledger / Blockchain:** Cosmos SDK-based chain that records identity, transactions, and on-chain state.

Agents run off-chain. The blockchain is the settlement and identity anchor, not the execution environment.

### Consensus Mechanism

Fetch.ai uses **Useful Proof-of-Work (UPoW)** — a hybrid of PoW, PoS, and a DAG structure. The "useful" aspect channels computation toward training ML models rather than arbitrary hash work, contributing to a network-wide collective intelligence. This combination enables high throughput for agent micro-transactions.

### Token Utility (FET/ASI)

- Pay for agent registration and service fees
- AI-to-AI payments: agents pay other agents for services (first real-world AI-to-AI room booking demonstrated December 2025 at Hotel Satoshis)
- Staking for network security and governance voting
- Access to ASI:Cloud GPU infrastructure
- Unified token for all three ASI Alliance projects (FET + AGIX + OCEAN → ASI)

### Agent Autonomy Level

**High autonomy via scripted logic + LLM routing.** DeltaV's AI Engine uses an LLM to translate natural language requests into structured agent task graphs (Smart Routing). Agents themselves are Python processes running goal-directed logic; they are not LLMs but can call external LLMs as tools. ASI1 (ASI:One) is a new Web3-native LLM being developed specifically for agentic reasoning.

### Unique Innovations

- **Digital twins:** Agents can mirror real-world IoT devices (EV chargers, warehouse sensors) enabling real-time physical-digital coordination
- **First AI-to-AI real-world payment** (December 2025)
- **ASI:Cloud:** Permissionless enterprise GPU infrastructure (launched December 17, 2025)
- **ASI:Chain (blockDAG):** Purpose-built to support billions of agents; currently in DevNet

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | Fetch.ai | ZK Agentic Network |
|---|---|---|
| Agent model | Off-chain Python AEAs | On-chain Claude LLM agents (Haiku/Sonnet/Opus) |
| Consensus role | UPoW (useful computation) | PoAIV — 13 AI verifiers check each block |
| Token drives agents? | Yes (FET for service fees) | Yes (AGNTC maps to grid coordinates) |
| Gamification | None | Neural Lattice network grid |
| Agent tiers | None (capability-based) | Haiku/Sonnet/Opus (subscription gated) |
| User relationship | Agents work for users | Users ARE agents (star system owners) |

**Key difference:** Fetch.ai agents are task-automation tools for users. In ZK Agentic Network, the user's subscription tier *is* their agent — they embody the agent as a spatial empire in a game world.

**Sources:**
- [Fetch.ai Documentation](https://fetch.ai/docs/concepts)
- [Fetch.ai & ASI Alliance Overview — Greythorn](https://0xgreythorn.medium.com/fetch-ai-the-asi-alliance-decentralized-ai-powerhouse-b39c40ec4a56)
- [World's First AI-to-AI Payment](https://fetch.ai/blog/world-s-first-ai-to-ai-payment-for-real-world-transactions)
- [Minimal Agency Consensus Scheme](https://fetch.ai/blog/the-fetch-ai-minimal-agency-consensus-scheme)

---

## 2. Bittensor (TAO)

### Overview

Bittensor is a decentralized marketplace for AI intelligence. Rather than one monolithic AI network, it is structured as a **meta-network of competing subnets**, each producing a specific AI commodity (text generation, image recognition, trading signals, fraud detection, etc.). As of 2025, over 128 active subnets exist.

### Architecture

- **Subnets:** Each subnet is an independent competition marketplace. Subnet creators define the task, the incentive mechanism, and the scoring criteria. Miners produce AI outputs; validators measure and score those outputs.
- **Validators:** Run scoring logic, query miners, assign scores (0–1), and submit weight matrices on-chain each epoch.
- **Miners:** Run AI models, receive queries from validators, return outputs. Rewarded proportional to consensus scores.
- **Yuma Consensus (on-chain):** Aggregates all validator weight matrices using stake-weighted median. Computes per-miner emission allocation. Validators earn via "V-Trust bonds" that reward alignment with consensus.

Computation is entirely **off-chain**. The blockchain records only weight matrices, emissions, and identity.

### Consensus Mechanism

**Yuma Consensus** — the core innovation. It is:

- **Task-agnostic:** Does not care what is being measured; it finds probabilistic consensus across validators
- **Stake-weighted:** Validators with more staked TAO carry more weight
- **Outlier-resistant:** Clips validator scores that deviate too far from consensus (anti-Sybil)
- **Commit-reveal:** Validators commit evaluations before seeing others' scores (anti-gaming)
- **Dynamic TAO (dTAO, deployed February 13, 2025):** Subnet token pools where market demand determines resource allocation; TAO-holders stake into subnets they believe are valuable, creating organic resource voting

The network's first TAO halving occurred December 2025 (mirroring Bitcoin's supply model).

### Token Utility (TAO)

- Mined by AI contributors (miners produce intelligence, validators verify it)
- Emission split per block: 41% miners, 41% validators, 18% subnet creator
- Staked by validators to gain weight in Yuma Consensus
- Staked by users into subnet pools (dTAO) to vote for subnet value
- Governance over network parameters

### Agent Autonomy Level

**Variable — subnet-defined.** Some subnets run classical ML models (scripted). Others run fine-tuned LLMs. Others run code-generation models. Autonomy level is entirely up to subnet creators; the protocol is model-agnostic. There are no "agents" in the autonomous-action sense — miners respond to queries, they don't self-direct.

### Unique Innovations

- **Proof of Intelligence (PoI):** The first large-scale implementation of market-based intelligence verification on blockchain
- **Subnet economy:** 128+ competing AI markets under one token umbrella
- **dTAO (Dynamic TAO):** Market-driven resource allocation where capital votes on AI subnet quality
- **Model-agnostic consensus:** Yuma works for any AI output type

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | Bittensor | ZK Agentic Network |
|---|---|---|
| Intelligence verification | Yuma Consensus (validators score miners) | PoAIV — 13 Claude AI verifiers per block |
| Agent autonomy | Miners respond to queries (reactive) | Claude agents loop through 4 actions autonomously |
| User role | Miner, validator, or passive staker | Active player managing a star system empire |
| Spatial metaphor | None (abstract subnets) | 2D galaxy grid, 6481x6481 coordinate space |
| Token allocation | Subnet-specific + TAO | AGNTC maps to specific grid coordinates |
| Gamification | None | Full Neural Lattice game layer |

**Key difference:** Bittensor optimizes for raw AI output quality via market competition. ZK Agentic Network uses AI agents as the *actors* performing blockchain state transitions within a game world — the "intelligence" is the decision-making within game actions, not a scored output.

**Sources:**
- [Bittensor Overview — Metalamp](https://metalamp.io/magazine/article/bittensor-overview-of-the-protocol-for-decentralized-machine-learning)
- [Subnet Architecture — Taostats](https://docs.taostats.io/docs/subnet)
- [Yuma Consensus Deep Dive — Global Coin Research](https://globalcoinresearch.com/research/bittensor-deep-dive-is-tao-crypto-s-most-promising-ai-project)
- [dTAO Launch 2025 — CoinDesk](https://www.coindesk.com/business/2025/09/13/bittensor-ecosystem-surges-with-subnet-expansion-institutional-access)
- [Bittensor Whitepaper](https://uploads-ssl.webflow.com/5cfe9427d35b15fd0afc4687/6021920718efe27873351f68_bittensor.pdf)

---

## 3. SingularityNET (AGIX/ASI)

### Overview

SingularityNET is the oldest decentralized AI marketplace, founded by Ben Goertzel with an explicit goal of building AGI (Artificial General Intelligence). It now operates as a co-founder of the **ASI Alliance** (with Fetch.ai and Ocean Protocol). The AGIX token has been merged into ASI.

### Architecture

SingularityNET operates as a **decentralized AI services marketplace** where AI developers publish APIs and algorithms that any other agent or user can call and pay for via smart contracts. The long-term architecture layers are:

- **AI Marketplace:** Developers list AI services (image recognition, NLP, analytics). Users or agents pay AGIX/ASI per call.
- **AI-to-AI Economy:** Agents autonomously hire other agents for sub-tasks (Agent A hires Agent B for video transcription, Agent C for text summarization).
- **OpenCog Hyperon:** The flagship AGI framework. Uses a distributed **AtomSpace** (metagraph knowledge repository) with **MeTTa**, a novel programming language designed for AGI cognitive processes (reasoning, learning, memory, self-reflection).
- **ASI:Chain (DevNet, November 2025):** A blockDAG network designed for billions of agents, providing decentralized rails for agent-to-agent communication.

### Consensus Mechanism

The primary marketplace relies on Ethereum/Cardano smart contracts for service payment. ASI:Chain is a new blockDAG with its own consensus (in DevNet stage). No formal "proof of intelligence" layer — the marketplace is permissionless; quality is determined by reputation and user ratings.

### Token Utility (AGIX → ASI)

- Pay for AI services on the marketplace
- Governance voting
- Staking for liquidity and access
- Merged into ASI token as part of the Alliance (targeting AGI development at scale)

### Agent Autonomy Level

**High in vision, moderate in practice.** The cooperative AI vision (agents hiring agents, networks of AI growing smarter collectively) is the stated long-term goal. OpenCog Hyperon represents the highest-autonomy research track — symbolic + neural hybrid reasoning with episodic memory and self-reflection. Current marketplace agents are primarily API wrappers around ML models.

### Unique Innovations

- **OpenCog Hyperon / MeTTa language:** A complete cognitive framework designed from the ground up for AGI — symbolic reasoning, probabilistic logic, self-modification
- **ASI:Chain (blockDAG):** Infrastructure designed for billions of AI agents communicating at network scale
- **Neural-symbolic AI:** Zarqa LLM uses deep learning + logic-based reasoning with episodic memory
- **Oldest decentralized AI project** — deep research lineage going back to OpenCog

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | SingularityNET | ZK Agentic Network |
|---|---|---|
| Agent model | Marketplace APIs + Hyperon research AGI | Claude LLM agents (commercial, tiered) |
| Agent communication | AI-to-AI service calls | In-game coordination + haiku messaging |
| Consensus | Smart contract settlement | PoAIV — 13 AI verifiers |
| Gamification | None | Galaxy grid empire building |
| User engagement | Developer/researcher-focused | Consumer gaming-first |
| Time horizon | AGI / decades | Playable now on testnet |

**Key difference:** SingularityNET is a research-heavy AGI project. ZK Agentic Network targets consumers with a playable game metaphor, using existing frontier models (Claude) rather than building AGI from scratch.

**Sources:**
- [SingularityNET Homepage](https://singularitynet.io/)
- [ASI Alliance Introduction](https://singularitynet.io/introducing-the-artificial-superintelligence-alliance/)
- [OpenCog Hyperon Alpha Release](https://singularitynet.io/announcing-the-release-of-opencog-hyperon-alpha/)
- [ASI:Chain DevNet Launch](https://singularitynet.io/singularitynet-launches-asichain-devnet-and-hyperon-agi-framework/)

---

## 4. Autonolas / Olas (OLAS)

### Overview

Autonolas (rebranded Olas) is a protocol for building **decentralized off-chain agent services** — multi-agent systems that run autonomously, maintain verifiable state across participants, and interact with on-chain protocols. Unlike most competitors, Olas focuses on the *infrastructure* for deploying robust, fault-tolerant agent services rather than a specific AI application.

### Architecture

- **Agent Services:** A collection of N software agents (typically 4) running the same deterministic FSM (Finite State Machine) codebase. Each agent instance runs independently but they must reach Byzantine fault-tolerant consensus (2/3+1 threshold) before any on-chain action is taken.
- **Open Autonomy Framework:** Developer toolkit for defining FSM-based agent services. Agents are Python processes; the framework handles replication, consensus, and lifecycle.
- **Consensus Gadget (Tendermint):** A short-lived internal blockchain (pruned periodically) used purely for agents to agree on internal state transitions. Not the public ledger — a tool for coordination.
- **Keeper Pattern:** When agents must call an external service (API, on-chain tx), they elect a **keeper** via deterministic randomness (DRAND). The keeper performs the action; all agents co-sign via Gnosis Safe multisig.
- **On-chain Protocol:** Smart contracts on Ethereum (and 8 other chains) handle agent registration, code NFTs, economic incentives, and service lifecycle management.

### Consensus Mechanism

**Tendermint-based internal consensus** (not global PoS/PoW). Each service runs its own mini-Byzantine consensus to synchronize FSM state across N agent instances. The public Ethereum chain is used only for settlement, identity, and incentives — not for agent computation. This is a hybrid: off-chain byzantine consensus feeds into on-chain execution.

### Token Utility (OLAS)

- Register and manage agent services (on-chain staking)
- Bonding curve for service code NFTs — developers earn proportional to ecosystem growth they drive
- Governance over protocol upgrades
- Staking as service bond (slash-able if service misbehaves)

### Agent Autonomy Level

**High structural autonomy, scripted logic.** Agents run deterministic FSMs — they follow pre-programmed state machines, not LLM-driven reasoning. The framework guarantees fault tolerance and decentralization of any scripted service. Olas-powered agents on Gnosis Chain run prediction market operations 24/7 autonomously without human intervention.

### Unique Innovations

- **Byzantine fault-tolerant off-chain services:** The most robust multi-agent execution model in the space — a single compromised agent cannot corrupt the service
- **Keeper + Gnosis Safe pattern:** Any on-chain action requires multi-agent co-signing
- **Service composability:** Agent services can call other agent services, enabling nested autonomous pipelines
- **Cross-chain deployment:** Active on 8+ chains (Ethereum, Gnosis, Polygon, Solana, etc.)

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | Autonolas/Olas | ZK Agentic Network |
|---|---|---|
| Agent model | Deterministic FSM multi-agent services | LLM-based Claude agents (non-deterministic) |
| Consensus | Internal Tendermint per service | PoAIV — 13 external Claude verifiers |
| Fault tolerance | 2/3+1 Byzantine threshold | Committee-based AI verification |
| User experience | Developer infrastructure | Consumer game UI |
| Token incentive | Code contribution bonding curve | Coordinate-mapped AGNTC + CPU Energy |
| Spatial element | None | Galaxy grid with coordinate ownership |

**Key difference:** Autonolas provides the most rigorous multi-agent execution framework, but it is developer infrastructure with no consumer layer. ZK Agentic Network's PoAIV is conceptually similar to Olas's multi-agent consensus but uses LLMs as verifiers and embeds it in a playable game world.

**Sources:**
- [Olas Network Homepage](https://olas.network/)
- [Open Autonomy Framework Docs](https://docs.olas.network/open-autonomy/)
- [Autonolas Deep Dive — Greythorn](https://0xgreythorn.medium.com/an-exploration-into-blockchain-and-artificial-intelligence-integration-autonolas-olas-08d54d1b0d11)
- [Olas Protocol Architecture](https://stack.olas.network/protocol/)

---

## 5. Ritual

### Overview

Ritual is building **AI inference infrastructure for blockchains** — positioning itself as an AI coprocessor that any chain can plug into to get verifiable AI outputs inside smart contracts. The goal is to make AI a native primitive in blockchain execution, not an external oracle.

### Architecture

- **Infernet:** Ritual's first product. A Decentralized Oracle Network (DON) that nodes can subscribe to for AI model execution. Any EVM-compatible smart contract can request AI inference via Infernet; nodes execute the model and return results.
- **Ritual Chain (Layer 1):** An EVM++ Layer 1 with specialized node types:
  - TEE execution nodes (hardware-backed secure execution)
  - ZK verification nodes (cryptographic proof generation)
  - GPU inference nodes (LLM/ML model execution)
- **EVM++ Sidecars:** Dedicated execution environments running alongside the core EVM. AI inference runs in sidecars in parallel, keeping chain state lightweight while enabling expressive compute.
- **Symphony (consensus):** An **Execute-Once-Verify-Many-Times (EOVMT)** model where selected nodes execute workloads and generate succinct sub-proofs. Verification is distributed across a subset of validators (not all nodes verify everything). Initial implementation uses TEEs for speed; ZK proofs are being developed for stronger guarantees.

### Consensus Mechanism

**Symphony / EOVMT** — the key innovation. Rather than requiring all nodes to replicate AI inference (computationally infeasible), one executor runs the model and generates a proof. Verification shards are distributed to subsets of validators. This enables blockchain-verifiable AI outputs without requiring every node to run the model. Combines TEE (trusted hardware) and ZK proofs (cryptographic guarantees).

### Token Utility

No public token as of February 2026. Raised $25M Series A (June 2024) from Archetype, Accel, Robot Ventures, Polychain. Testnet is invite-only. Token design not yet public.

### Agent Autonomy Level

**Infrastructure-layer, not autonomous agents.** Ritual provides the plumbing for on-chain AI inference — it does not build agents that act autonomously. Smart contracts call Ritual for AI outputs; the contract logic determines what happens with results. Fully dependent on the calling contract for any autonomous behavior.

### Unique Innovations

- **Verifiable AI inference on-chain:** First credible architecture for making LLM outputs cryptographically verifiable without trusting a single oracle
- **Symphony / EOVMT:** Elegant solution to the verification scalability problem
- **TEE + ZK hybrid:** Pragmatic approach — fast TEE execution now, cryptographically pure ZK verification later
- **AI-native L1:** Custom blockchain designed from the ground up for AI workloads

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | Ritual | ZK Agentic Network |
|---|---|---|
| AI role | Inference coprocessor for smart contracts | Agents as autonomous block verifiers |
| Verifiability | TEE + ZK proofs for model outputs | 13-agent committee consensus |
| User facing | Developer infrastructure | Consumer game |
| Agent autonomy | None (contracts call AI) | High (agents loop through game actions) |
| Chain architecture | Custom L1 with AI-specialized nodes | Agentic Chain testnet |

**Key difference:** Ritual makes AI outputs verifiable *for* blockchain contracts. ZK Agentic Network uses AI agents *as* the verification mechanism itself (PoAIV). The philosophical direction is inverted: Ritual serves blockchains with AI; ZK Agentic uses AI to run the blockchain.

**Sources:**
- [Ritual Introduction](https://ritual.net/blog/introducing-ritual)
- [Symphony Documentation](https://www.ritualfoundation.org/docs/whats-new/symphony)
- [Ritual Architecture Guide — Gate](https://www.gate.com/learn/articles/a-simple-guide-to-ritual-the-open-ai-infrastructure-network/4594)
- [Nillion + Ritual Partnership (Blind AI)](https://nillion.com/news/nillion-partners-with-ritual-to-develop-decentralized-blind-ai-inference/)

---

## 6. Morpheus (MOR)

### Overview

Morpheus is a **peer-to-peer network of personal smart agents** — open-source, fairly launched (no VC allocations), and designed to put a personal AI agent in every user's hands. The architecture is explicitly anti-centralization, structured around four equal contributor groups.

### Architecture

**Four-contributor model** (each receives 24% of daily MOR emissions, 4% to protection fund):

1. **Capital Providers:** Stake stETH (and now USDC, USDT, wBTC via Aave — expanded September 2025). The yield from staked capital flows to the protocol treasury, bootstrapping development without selling tokens.
2. **Compute Providers:** Run local inference nodes (GPU machines), serve model queries, earn MOR proportional to demand.
3. **Coders:** Contribute to Morpheus codebase, smart agent tools, reference implementations.
4. **Community:** Run full nodes, build front-ends, use the API.

Smart agents run **locally on user hardware** (the "local Morpheus node") and can interact with external compute providers when local hardware is insufficient. The Local Morpheus Node stores wallet, connects to compute, executes smart contracts on behalf of the user.

### Consensus Mechanism

No novel consensus mechanism. Morpheus runs on Arbitrum mainnet for token settlement. The "consensus" for agent quality is market-driven: users route queries to compute providers whose agents perform best, economically selecting for quality.

### Token Utility (MOR)

- **Fair launch:** No pre-mine, no VCs. Emitted daily from genesis (February 8, 2024)
- Total supply cap: 42,000,000 MOR
- Pay compute providers for inference
- Governance over protocol upgrades
- Staking (capital providers stake yield-bearing assets to earn MOR)
- $20M MOR rewards pool opened for compute providers (December 2024)

### Agent Autonomy Level

**LLM-powered, locally executed.** Smart agents are powered by open-source LLMs (Llama, Mistral, etc.) running on user hardware or compute provider nodes. They can execute smart contracts on behalf of users. This is a significant autonomy level — agents can move funds and interact with DeFi protocols with user delegation. The intelligence level is bounded by the underlying open-source model.

### Unique Innovations

- **Fully fair launch** — arguably the most credibly decentralized token distribution in the space
- **Capital contract innovation (September 2025):** Multi-asset staking (stETH + USDC + USDT + wBTC via Aave) for bootstrapping without dilution
- **Local-first execution:** Agent runs on user's own machine, private by default
- **Smart contract execution by agents:** Higher-stakes autonomy than most competitors

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | Morpheus | ZK Agentic Network |
|---|---|---|
| Agent model | Open-source LLMs locally | Claude API (Haiku/Sonnet/Opus, cloud) |
| Privacy | Local-first | Cloud-based, subscription |
| Token launch | Fair launch, no VCs | TBD |
| User relationship | Agent works for user | User IS the agent (empire metaphor) |
| Gamification | None | Neural Lattice network |
| Agent autonomy | Execute contracts for user | Autonomous game actions + block verification |

**Key difference:** Morpheus is private, local, and financially-focused (smart contract execution, DeFi agents). ZK Agentic Network is public, cloud-based, and game-world-focused. Morpheus democratizes AI through open-source; ZK Agentic differentiates through frontier model quality (Anthropic's Claude).

**Sources:**
- [Morpheus Homepage](https://mor.org/)
- [GitHub — MorpheusAIs](https://github.com/MorpheusAIs/Morpheus)
- [Morpheus Capital Contract v2 Expansion (Sept 2025)](https://www.globenewswire.com/news-release/2025/09/18/3152710/0/en/Morpheus-Decentralized-AI-Marketplace-Expands-Staking-to-USDC-USDT-and-WBTC-via-Aave-DeFi-Integration.html)
- [Morpheus Smart Agent Explainer — Medium](https://medium.com/@mattmckibbin/morpheus-a-network-for-powering-smart-agents-37e174bdddd5)

---

## 7. Virtuals Protocol (VIRTUAL)

### Overview

Virtuals Protocol is the largest **AI agent tokenization platform** as of early 2026, with over 18,000 agents created and $500M+ in agent token market cap. It operates on the Base blockchain (and Solana) and allows anyone to create, tokenize, and monetize AI agents as investable on-chain assets.

### Architecture

**Core components:**

- **GAME Framework (Generative Autonomous Multimodal Entities):** The agent runtime engine. A two-tier decision architecture:
  - *Task Generator (high-level planner):* Receives agent goals, decomposes them into tasks, routes to appropriate workers
  - *Workers (low-level planners):* Domain-specialized executors (Twitter posting, trading, NPC behavior, etc.)
  - Supports LLMs: Llama, DeepSeek, Qwen, and others via API
- **Stateful AI Runners (SAR):** Off-chain servers hosting agent personality, voice, visuals. A Sequencer orchestrates multiple AI models for multimodal outputs.
- **Agent Commerce Protocol (ACP):** On-chain smart contracts enabling agent-to-agent coordination via a four-phase interaction model (request → negotiation → execution → settlement). Standardizes autonomous commerce between agents.
- **Coordinator:** Monitors on-chain governance votes and implements changes across all agent instances in real time.
- **Memory system:** Knowledge graphs + embedding stores for agent long-term memory across interactions.

### Token Structure

- **VIRTUAL (1B fixed supply, ERC-20 on Base):** Protocol governance + agent creation payment + base currency for all agent token liquidity pools.
- **veVIRTUAL:** Locked VIRTUAL for governance voting.
- **Per-agent tokens (1B each on creation):** Every new agent mints 1B agent-specific ERC-20 tokens on a bonding curve. These are governance tokens for that specific agent. As of September 2025, agent tokens have surpassed $8B DEX volume.
- **Revenue Network (February 2026):** Virtuals Revenue Network launched to enable agent-to-agent commerce at internet scale.

### Agent Autonomy Level

**Moderate to high — LLM-powered with structured decision loops.** GAME provides a real planning architecture (not just prompt-response), enabling agents to decompose goals, maintain memory, and execute multi-step tasks. Autonomy is real but bounded by the task domain (social media, trading, gaming NPCs). The framework is designed for *productive* agents — agents that generate revenue for token holders.

### Unique Innovations

- **Agent tokenization:** Every agent is an investable asset; holders govern the agent's development and share in its revenue
- **18,000+ agents deployed** (largest active AI agent economy as of early 2026)
- **Agent Commerce Protocol (ACP):** First standardized protocol for autonomous agent-to-agent commerce on-chain
- **Pump.fun model for AI agents:** Bonding curve launch, anyone can create an agent token — democratizing AI agent deployment
- **Multimodal agents:** Personality + voice + visuals unified in SAR architecture

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | Virtuals Protocol | ZK Agentic Network |
|---|---|---|
| Agent count | 18,000+ deployed | One per user (homenode + deployed agents) |
| Agent ownership | Community-owned via agent tokens | User-owned (subscription tier) |
| Token model | Per-agent token + VIRTUAL base | AGNTC (coordinate-mapped) |
| AI backend | Open-source LLMs (Llama, DeepSeek) | Anthropic Claude (Haiku/Sonnet/Opus) |
| Gamification | Limited (gaming NPC use cases) | Full Neural Lattice game world |
| Blockchain role | Settlement + agent identity | Proof-of-existence + game state |
| Consensus | ERC-20 smart contracts (Base) | PoAIV — 13 AI verifiers |

**Key difference:** Virtuals is a launchpad for agent tokens — financial speculation on AI agents is a first-class feature. ZK Agentic Network uses game mechanics to drive engagement, with AGNTC tied to spatial coordinates rather than per-agent speculation. ZK Agentic uses frontier closed-source models (Claude) vs. Virtuals' open-source LLMs, trading decentralization for capability.

**Sources:**
- [Virtuals Protocol Whitepaper](https://whitepaper.virtuals.io/)
- [GAME Framework Documentation](https://whitepaper.virtuals.io/about-virtuals/agentic-framework-game)
- [Messari Comprehensive Overview](https://messari.io/report/understanding-virtuals-protocol-a-comprehensive-overview)
- [Virtuals Revenue Network Launch (Feb 2026)](https://www.prnewswire.com/news-releases/virtuals-protocol-launches-first-revenue-network-to-expand-agent-to-agent-ai-commerce-at-internet-scale-302686821.html)

---

## 8. ElizaOS / ai16z (ELIZAOS)

### Overview

ElizaOS (formerly ai16z) is the **dominant open-source AI agent framework** in Web3, built in TypeScript. It started as a Solana-native project and has rapidly expanded into a multi-chain, multi-model framework that became the #1 trending GitHub repository in its category. As of late 2025, it rebranded from $ai16z to $ELIZAOS token (1:6 migration ratio via Chainlink CCIP).

### Architecture

**Core framework components:**

- **ElizaOS Core:** Manages memory, events, planning, and state transitions for each agent instance
- **Character Files:** JSON configurations defining agent personality, goals, knowledge base, and behavior
- **Providers:** Data feed connectors (blockchain data, APIs, social feeds)
- **Actions:** Discrete operations agents can execute (post tweet, swap tokens, call API, etc.)
- **Evaluators:** Scoring functions that assess whether actions achieved their goals
- **Hierarchical Task Networks (HTN) — v2:** Agents decompose complex goals into subtask trees and re-plan dynamically when sub-tasks fail

**Runtime characteristics:**
- TypeScript, cross-platform
- 90+ official plugins connecting to Discord, Twitter/X, Ethereum, Solana, OpenAI, Anthropic, and more
- Event-driven architecture: agents react to external triggers (messages, on-chain events)
- v2 (2025): Cross-chain via Chainlink CCIP — agents operate across Ethereum, Base, BNB Chain, Solana

### Token Utility (ELIZAOS)

- **Generative Treasury:** Token treasury managed by AI agents using algorithmic capital deployment
- Governance over plugin registry, protocol upgrades, treasury allocation
- Cross-chain utility (ERC-20 + BEP-20 + SPL depending on chain)
- $20B ecosystem market cap claimed (as of migration announcement)

**Partnership note:** Eliza Labs partnered with Stanford's Future of Digital Currency Initiative to research AI agents in Web3 (2025).

### Agent Autonomy Level

**High — LLM-powered with structured autonomy.** ElizaOS agents use LLMs (configurable: Claude, GPT-4, Llama, Mistral) for reasoning but operate within the structured Character + Actions framework. v2's HTN planning allows genuine multi-step goal pursuit with re-planning. The framework is used for DeFi trading agents, social media bots, DAO governance agents, and gaming NPCs.

### Unique Innovations

- **Largest open-source AI agent framework in Web3** (overtook Bittensor in GitHub engagement)
- **90+ plugins:** Most extensive integration ecosystem in the space
- **HTN planning (v2):** Real task decomposition, not just single-turn prompting
- **Generative Treasury:** Treasury funds managed by AI agents — agents eating their own cooking
- **Stanford partnership:** Academic credibility for agent + Web3 research

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | ElizaOS | ZK Agentic Network |
|---|---|---|
| Agent model | Multi-LLM (configurable) | Claude-specific (Haiku/Sonnet/Opus) |
| Framework | Open-source SDK | Proprietary game platform |
| User creates | Agents via config files | Star system empire (game UX) |
| Token | ELIZAOS (cross-chain governance) | AGNTC (coordinate-spatial) |
| Gamification | None natively (Smolworld via Mage) | Core product = game |
| Consumer UX | Developer-facing | Consumer game-first |
| Block verification | Not applicable | PoAIV (13 AI verifiers) |

**Key difference:** ElizaOS is a developer framework — it enables others to build agent products. ZK Agentic Network is a finished consumer product with a specific game metaphor. ElizaOS could theoretically be used to build a competitor to ZK Agentic Network; conversely, ZK Agentic could integrate ElizaOS as an underlying framework.

**Sources:**
- [ElizaOS Documentation](https://docs.elizaos.ai)
- [GitHub — elizaOS/eliza](https://github.com/elizaOS/eliza)
- [ElizaOS Whitepaper (arXiv)](https://arxiv.org/html/2501.06781v1)
- [Token Migration Announcement](https://cryptobriefing.com/elizaos-token-migration-ecosystem/)
- [Stanford Partnership](https://cointelegraph.com/news/ai16z-stanfod-ai-research-partnership)

---

## 9. Theoriq (THQ)

### Overview

Theoriq is a **decentralized AI agent collective protocol** focused on DeFi — coordinating swarms of specialized AI agents to automate complex financial operations (liquidity provision, yield optimization, treasury management). It launched its mainnet on December 16, 2025, with AlphaSwarm and AlphaProtocol live.

### Architecture

**Hybrid on-chain/off-chain architecture:**

- **On-chain (Ethereum + Base):**
  - Agent registry (each agent is an on-chain NFT with published capabilities)
  - Escrow and settlement contracts
  - Anchoring of cryptographic contribution proofs
  - Governance token (THQ)
- **Off-chain:**
  - Theoriq Nodes: Run AI inference, agent execution, evaluation, and decision-making
  - Agent runtimes: Individual agent logic (LLM-powered)
  - Evaluator/optimizer: Scores agent contributions

**Swarm coordination:**
- Agents dynamically form **swarms** for multi-agent tasks
- Role allocation within swarms via voting mechanisms
- Adaptive strategy execution (swarms can pivot based on market conditions)
- Agent Reputation: On-chain score built from verified task outcomes — higher reputation → higher weight in swarm decisions + higher rewards

**Products:**
- **AlphaSwarm:** On-chain liquidity and trading agent network
- **AlphaProtocol:** Smart contract layer for agent interaction
- **AlphaVault (December 2025):** DeFi vault where AI agents autonomously manage risk and rebalance capital

### Consensus Mechanism

No novel consensus for block production. Uses Ethereum for settlement. Consensus within swarms is voting-based (role allocation, strategy decisions). Verifiability comes from on-chain NFT registration + cryptographic proof anchoring of agent actions — similar to Ritual's TEE approach but for agent behavior rather than model outputs.

### Token Utility (THQ)

- Staking for security (agent bonds)
- Governance over protocol parameters
- Access to AlphaProtocol and AlphaVault
- Agent incentives (rewarded for swarm contributions)
- Raised $10.4M from Hack VC, Foresight Ventures, HashKey Capital

### Agent Autonomy Level

**High autonomy within DeFi domain.** Agents are LLM-powered decision-makers that operate 24/7 on real capital, making autonomous yield and risk decisions. This is arguably the highest-stakes autonomy in the space (agents manage user funds without human approval per action).

### Unique Innovations

- **AlphaVault:** First DeFi vault managed autonomously by AI agent swarms
- **Agent reputation system:** On-chain track record builds trust over time
- **Swarm intelligence:** Dynamic team formation for complex multi-agent DeFi strategies
- **OpenLedger partnership (January 2026):** Verifiable on-chain execution for AI agents managing real capital

### Comparison to ZK Agentic Network (PoAIV)

| Dimension | Theoriq | ZK Agentic Network |
|---|---|---|
| Domain | DeFi (yield, liquidity) | Gamified blockchain (mining, diplomacy) |
| Agent model | LLM-powered DeFi agents | Claude models (tiered by subscription) |
| Swarm concept | Dynamic task-specific swarms | Static 13-verifier committee (PoAIV) |
| User interface | DeFi dashboard | Neural Lattice network game |
| Token | THQ governance + access | AGNTC coordinate-mapped |
| Real capital at stake | Yes (AlphaVault) | No (game resources) |
| Consumer appeal | DeFi users | Gamers + crypto enthusiasts |

**Key difference:** Theoriq's "collective" is transactional (agents cooperate to optimize finance). ZK Agentic Network's "collective" is political and spatial (agents cooperate through diplomacy, territorial expansion, haiku communication). The game metaphor creates a fundamentally different user emotional engagement.

**Sources:**
- [Theoriq Homepage](https://www.theoriq.ai/)
- [THQ Tokenomics](https://www.theoriq.ai/tokenomics)
- [Theoriq Mainnet Launch](https://crypto.news/theoriq-unveils-mainnet-touts-new-era-ai-driven-defi/)
- [OpenLedger + Theoriq Partnership](https://www.prnewswire.com/news-releases/openledger-partners-with-theoriq-to-bring-verifiable-ai-agents-into-live-defi-markets-302664498.html)

---

## 10. Emerging Projects (2025–2026)

### OpenLedger (OPEN)

An **AI-native blockchain** designed to make data, models, and agents transparent, traceable, and rewardable. Every AI action is attributed on-chain. Key 2025 developments:

- Integrated with LayerZero (October 2025) for AI model/data portability across 130+ chains
- Partnership with Netmarble (gaming): deploying verifiable AI for in-game economies and NPC behavior
- $25M launchpad (OpenCircle) for AI + Web3 startups
- Partnership with Theoriq (January 2026) for verifiable on-chain agent execution

**Relevance to ZK Agentic:** OpenLedger's gaming + AI NPC track is the closest infrastructure-layer parallel to ZK Agentic's game world. A partnership or integration path may exist.

Sources: [OpenLedger](https://www.openledger.xyz/), [CoinDesk — $25M Fund](https://www.coindesk.com/business/2025/06/09/openledger-commits-usd25m-to-fund-ai-blockchain-startups)

---

### Gensyn ($AI)

A **decentralized ML compute protocol** — connects GPU hardware owners worldwide for machine learning training workloads. Not agent-focused; pure compute marketplace.

- Raised $80.6M total; $AI token presale December 2025
- Enables anyone to contribute GPU compute and earn rewards
- Positioned as the AWS of decentralized ML training

**Relevance to ZK Agentic:** Potential infrastructure for running Claude API alternatives at lower cost if ZK Agentic ever moves off Anthropic's centralized API.

Sources: [Gensyn](https://www.gensyn.ai/), [Whales Market Analysis](https://whales.market/blog/what-is-gensyn/)

---

### NEAR Protocol — "AI Blockchain" Pivot

NEAR has rebranded its 2026 direction around AI:

- **Shade Agent Sandbox:** Verifiable AI agents running in TEE environments on NEAR
- **NEAR AI Cloud + Private Chat (December 2025):** Sovereign AI products
- **NEAR Intents:** Cross-chain transaction layer ($6B+ volume across 120+ assets by November 2025)
- **House of Stake:** On-chain governance system (late 2025)

**Relevance:** NEAR Intents could be a settlement layer for cross-chain ZK Agentic transactions.

Sources: [CoinMarketCap NEAR Updates](https://coinmarketcap.com/cmc-ai/near-protocol/latest-updates/)

---

### AI Agent Gaming (GameFi + AI NPCs)

The GameFi sector (projected $80B by 2025) is actively integrating AI agents:

- **Smolworld (Treasure x ElizaOS):** Tamagotchi-style AI agents that evolve independently in a virtual environment — the closest existing product to ZK Agentic's star system metaphor
- **Mage (ElizaOS gaming layer):** Framework for deploying autonomous agents within blockchain games
- AI agents as dynamic NPCs that adjust game economy in real time (preventing token oversupply by routing players to new challenges)

AI activity on blockchains surged 86% in 2025, driven by AI agent projects.

**Relevance to ZK Agentic:** Smolworld / Mage is the most direct analog — autonomous on-chain agents in a game world. ZK Agentic's Neural Lattice design, Claude model tiers, and PoAIV consensus are meaningful differentiators.

Sources: [Gaming x AI Agents — OAK Research](https://oakresearch.io/en/analyses/innovations/gaming-x-ai-agents-emerging-trend-for-2025), [AI in GameFi — Agility Portal](https://agilityportal.io/blog/ai-agents-in-gamefi-decentralized-gaming-2025)

---

## 11. Landscape Map

### By AI Autonomy Level vs. Blockchain Integration

```
HIGH AI AUTONOMY
        |
        |   Theoriq (DeFi swarms)          ElizaOS (LLM agents, multi-chain)
        |   Virtuals (18k tokenized agents) Autonolas (FSM services, BFT)
        |
        |   Fetch.ai (AEAs, DeltaV)        SingularityNET (AGI research)
        |   Morpheus (personal agents)
        |
        |   Bittensor (miners respond to queries)
        |
        |   Ritual (inference coprocessor)
        |
        |   OpenLedger (attribution layer)  Gensyn (compute only)
LOW AI AUTONOMY
        +------------------------------------------------->
        LIGHT CHAIN INTEGRATION          DEEP CHAIN INTEGRATION
        (off-chain, settles on-chain)    (on-chain state, verifiable)
```

### By Consumer UX vs. Developer Focus

```
CONSUMER-FACING
        |
        |   Virtuals Protocol          [ZK Agentic Network — TARGET POSITION]
        |   (18k agents, speculative)  (game world, social, Claude agents)
        |
        |   Fetch.ai / DeltaV          Morpheus (personal agent)
        |   (AI marketplace for users)
        |
        |   Bittensor (staking UX)     Theoriq (DeFi dashboard)
        |
        |   ElizaOS (agent builder)    Autonolas (service deployer)
        |
        |   Ritual (L1 infrastructure) Gensyn (compute network)
DEVELOPER-FACING
```

### By Consensus Innovation

| Project | Consensus Innovation |
|---|---|
| Bittensor | Yuma Consensus — stake-weighted intelligence scoring (most mature) |
| ZK Agentic (PoAIV) | 13 Claude AI verifiers check each block — novel AI committee consensus |
| Autonolas | Tendermint per-service Byzantine consensus for agent state |
| Ritual / Symphony | EOVMT — execute-once, verify-many-times with TEE/ZK proofs |
| Fetch.ai | UPoW — useful proof of work (ML training as work) |
| Theoriq | Swarm voting + reputation-weighted contribution proofs |
| Virtuals | No novel consensus — ERC-20 on Base |
| ElizaOS | No novel consensus — multi-chain settlement |
| Morpheus | No novel consensus — Arbitrum settlement |
| SingularityNET | ASI:Chain blockDAG (DevNet only) |

---

## 12. Competitive Positioning for ZK Agentic Network

### The Unique Combination

ZK Agentic Network occupies a position that no current competitor holds:

1. **Game-first engagement** — Neural Lattice design makes blockchain abstract concepts tangible. No competitor has a comparable game world.
2. **Frontier model agents** — Claude Haiku/Sonnet/Opus as tiered agent types, not open-source approximations. Real intelligence quality differences between subscription tiers.
3. **PoAIV (Proof of Agentic Verification)** — 13 AI verifiers checking each block is a genuinely novel consensus contribution. Closest analog is Bittensor's Yuma Consensus (human-designed scoring by validators), but PoAIV uses the *same AI systems* as the agents themselves to verify blocks — a recursive trust model.
4. **Spatial token economics** — AGNTC tokens map to specific grid coordinates. This creates territorial scarcity and strategic value that pure token metrics cannot replicate.
5. **Social layer via haiku** — inter-agent communication as constrained creative expression is unique in the space.

### Differentiation Matrix

| Differentiator | Who also does this | ZK Agentic's edge |
|---|---|---|
| AI agent + blockchain | Everyone | Game world + Claude frontier models |
| Claude / Anthropic models | None (ElizaOS supports Claude as option) | Only platform where Claude tiers ARE the product |
| Gamification | Smolworld (ElizaOS), GameFi broadly | Most sophisticated (Neural Lattice-class) |
| Multi-AI block verification | None (novel) | PoAIV is a whitepaper-ready innovation |
| Coordinate-based token | None | Spatial scarcity drives strategic play |
| Subscription-gated agent tiers | None | Creates aspirational upgrade path |

### Risks and Gaps to Monitor

1. **Virtuals Protocol** — the 18k+ agent economy and per-agent tokenization could expand into gaming. Monitor for Virtuals + GameFi crossover.
2. **ElizaOS + Smolworld** — if ElizaOS's gaming track (Mage framework, Smolworld) gains traction, it becomes the closest competitor UX-wise.
3. **Bittensor gaming subnet** — a subnet explicitly for on-chain gaming AI could emerge as Bittensor's ecosystem grows to 128+ subnets.
4. **OpenLedger + Netmarble** — if OpenLedger's gaming AI NPC track matures (transparent, verifiable in-game AI economies), it addresses a similar market need.
5. **ASI Alliance convergence** — if Fetch.ai + SingularityNET + Ocean Protocol produce a unified agent operating system with consumer UX, the combined ecosystem is formidable.

### Strategic Recommendations

1. **Publish PoAIV as a whitepaper** — the 13-verifier consensus model is novel enough to stake a research claim before a larger player adopts similar architecture.
2. **Position against Virtuals Protocol** explicitly — Virtuals is the most consumer-facing competitor. The key differentiator is Claude quality vs. open-source LLMs, and game depth vs. token speculation.
3. **Watch the ElizaOS gaming track** — consider whether ZK Agentic's GAME loop architecture should expose APIs compatible with ElizaOS plugins to attract the developer ecosystem.
4. **Coordinate scarcity is defensible** — the AGNTC-to-coordinate mapping is a genuinely novel tokenomic design. Emphasize this in positioning.
5. **The haiku social layer** is culturally unique — no competitor has a constrained creative communication layer between agents. This is a marketing differentiator worth investing in.

---

*Research compiled February 2026. Sources: web search of public documentation, blog posts, whitepapers, and news articles from project websites, CoinDesk, CoinMarketCap, Messari, Medium, GitHub, and academic preprints.*

*All source URLs are inline with each project section above.*
