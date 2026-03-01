# AGNTC Whitepaper v1.0 — Expanded Table of Contents

> Target: 50+ pages, technical depth comparable to Solana (32p) and Zcash (56p) whitepapers.
> Style: Academic technical paper with formal specifications, mathematical proofs, and protocol descriptions.
> Rule: Explain what the code does without showing core blockchain source code.

---

## Front Matter (~2 pages)

- Title page
- Abstract (expanded — 1 full page)
- Table of Contents

---

## Part I: Vision & Context (~8 pages)

### 1. Introduction (3 pages)
- 1.1 The Problem: Consensus Without Intelligence
  - PoW energy waste, PoS wealth concentration, neither uses reasoning
  - No privacy at the verification layer
  - AI agents as economic actors have no native blockchain
- 1.2 Our Thesis: AI as Consensus Participant
  - Proof of AI Verification (PoAIV) — agents reason, not just compute
  - Dual staking: CPU + tokens, weighted 60/40 toward compute
  - Private-by-default ledger via ZK channels
- 1.3 Vision: The Agentic Galaxy
  - Gamified blockchain exploration through a spatial coordinate economy
  - 2D galaxy grid as blockchain state visualization
  - Four factions, four galaxy arms, one economy
  - From testnet game to production L1

### 2. Background & Related Work (5 pages)
- 2.1 Proof-of-Work and the Energy Problem (Bitcoin, Monero)
- 2.2 Proof-of-Stake and Plutocratic Concentration (Ethereum, Solana, Cosmos)
- 2.3 Zero-Knowledge Blockchains (Zcash, Mina, Aztec)
- 2.4 AI + Blockchain Convergence (Bittensor, Fetch.ai, Autonolas, Ritual)
- 2.5 Compute-Tokenomics Networks (Render, Akash, io.net, Filecoin)
- 2.6 Where ZK Agentic Chain Fits: The Missing Quadrant
  - Positioning matrix: AI verification × ZK privacy × gamified topology × CPU-weighted staking

---

## Part II: Protocol Architecture (~12 pages)

### 3. System Overview (2 pages)
- 3.1 Five-Layer Architecture
  - L1 User Layer — wallets, transactions, isolated per-user ledger spaces
  - L2 Ledger Layer — per-user record chains, UTXO-like state, Sparse Merkle Trees (depth 26)
  - L3 ZK Channel Layer — zero-knowledge private channels between verification agents
  - L4 Agent Layer — AI verifier instances (Claude models: Haiku/Sonnet/Opus tiers)
  - L5 Consensus Layer — BFT ordering + ZK proof finality
- 3.2 Design Principles
  - Democratic validation (any CPU can participate)
  - Intelligent verification (reasoning, not just computation)
  - Verification-layer privacy (agents prove correctness without seeing data)

### 4. The Galaxy Grid: Blockchain as Coordinate Space (3 pages)
- 4.1 Grid Architecture
  - 31,623 × 31,623 coordinate grid (≈1 billion cells)
  - Each cell = 1 AGNTC when claimed
  - Nodes occupy 10×10 coordinate blocks (NODE_GRID_SPACING = 10)
  - Four-arm logarithmic spiral topology
- 4.2 Faction System
  - Community (N arm, teal) — free-tier human users
  - Machines (E arm, reddish purple) — AI agent economy
  - Founders (S arm, gold-orange) — team & advisors
  - Professional (W arm, blue) — paid-tier users
  - Arm width ±25°, logarithmic spiral with 0.5-turn left-handed twist
- 4.3 Epoch-Ring Expansion
  - Ring N opens when cumulative mined ≥ threshold(N) = 4N(N+1)
  - Grid expands outward from origin as mining progresses
  - Dynamic bounds: no pre-rendered grid, renders claimed nodes + 1 fog ring
- 4.4 Coordinate Density and Resource Richness
  - density(x,y) = deterministic SHA-256 hash → float [0,1]
  - Higher density = higher mining yield multiplier
  - Nodes near origin have higher average density (strategic value)

### 5. Proof of AI Verification (PoAIV) (4 pages)
- 5.1 Verification Agent Selection
  - Committee of k=13 AI agents per block
  - VRF-weighted selection proportional to effective stake
  - Agent tiers: Haiku (fast, cheap), Sonnet (balanced), Opus (deep reasoning)
- 5.2 Intelligent Verification Process
  - Agents audit: transaction validity, state transition correctness, proof integrity
  - Cross-reference state across ledger spaces
  - Flag anomalous patterns (adaptive security layer)
  - Formal consensus rule: valid(block) ⟺ |{ai : attest(ai, block) = true}| ≥ 9
- 5.3 Commit-Reveal Protocol
  - Commit phase (10s): agents submit H(attestation || nonce)
  - Reveal phase (20s): agents reveal attestation + nonce
  - Prevents attestation copying
  - Hard deadline: 60s finalization
- 5.4 Agent Lifecycle
  - WARMUP (1 epoch) → ACTIVE → COOLDOWN
  - Probation period (3 epochs) for offline agents before re-activation
  - Safe mode: activates when >20% validators offline, suspends non-critical ops

### 6. Privacy Architecture (3 pages)
- 6.1 ZK Private Channels
  - Isolated communication between AI agents
  - Data verified but never exposed in plaintext
  - Private-by-default: all state is private unless explicitly published
- 6.2 Sparse Merkle Tree (Depth 26)
  - 2^26 leaf nodes per user ledger space
  - State transitions produce succinct ZK proofs
  - Verified by agent committee without accessing underlying data
- 6.3 Nullifier-Based Ownership
  - Zcash Sapling-derived design
  - commitment = Poseidon(value, owner_pubkey, randomness)
  - nullifier = PRF_nk(position_dependent_value)
  - Prevents double-spending while preserving privacy
- 6.4 Recommended ZK Stack
  - Short term: Groth16 (Circom + snarkjs) — smallest proofs, fastest verification
  - Medium term: PLONK/Noir (Barretenberg) — universal setup, one ceremony
  - Long term: Halo2 or Nova — no trusted setup, recursive epoch proofs
- 6.5 Client-Side Proving
  - Subgrid state never leaves user's device
  - Browser-side proof generation (NoirJS / snarkjs WASM)
  - On-chain: only state root hash + validity proof recorded

---

## Part III: Consensus & BFT (~6 pages)

### 7. BFT Ordering & Finality (3 pages)
- 7.1 Block Production
  - Target block time: 60 seconds
  - Epoch = 100 slots
  - Transaction ordering via BFT protocol
- 7.2 Byzantine Fault Tolerance
  - 13-agent committee tolerates f=4 Byzantine agents
  - floor((k-1)/3) = 4; threshold t=9 > 2f+1
  - Block rejected if <9 matching attestations → re-proposed
- 7.3 ZK Proof Finality
  - Target: 20 seconds after block proposal
  - ≥9 matching attestations + ZK proofs verified = irreversible finality
  - No probabilistic confirmations (deterministic finality)
- 7.4 Comparison with Existing BFT Protocols
  - vs. PBFT: O(n²) message complexity acceptable for n=13
  - vs. HotStuff: linear complexity enables future scaling beyond 13
  - vs. Tendermint: nil-block timeouts align with safe mode design

### 8. Security Analysis (3 pages)
- 8.1 Sybil Resistance
  - Dual-staking (tokens + CPU) creates two independent cost axes
  - 69% effective stake needed for unilateral block production
- 8.2 AI Model Integrity
  - Deterministic inference: same input → same attestation
  - Commit-reveal prevents attestation copying
  - Model updates require governance votes
- 8.3 Liveness Guarantees
  - Safe mode at >20% offline, suspends non-critical operations
  - Recovery at ≥80% online
  - Prevents liveness failures cascading into safety violations
- 8.4 Threat Model for AI-Verified Chains
  - Model poisoning / adversarial inputs
  - Prompt injection attacks on verification agents
  - Model collusion (if agents share weights)
  - Mitigations: diverse model pool, commit-reveal, re-verification disputes
- 8.5 Economic Security
  - 9/13 supermajority = 69% threshold
  - Combined slashing + dual-staking cost exceeds attack gain
  - Dispute resolution: 2× committee (26 agents) re-verification

---

## Part IV: Token Economics (~10 pages)

### 9. AGNTC Token Overview (2 pages)
- 9.1 Token Identity
  - Name: AGNTC (Agentic Coin)
  - Current deployment: Solana SPL token (1 billion minted)
  - Mint address: 3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd
  - Future: native token of ZK Agentic Chain L1
- 9.2 Token Utility
  - Gas for all on-chain transactions
  - Staking for validator participation
  - Governance voting weight
  - In-game resource economy (CPU Energy, Secure actions)
- 9.3 Solana Phase → L1 Migration
  - Phase 1: 1B AGNTC minted on Solana as SPL token
  - Phase 2: ZK Agentic Chain testnet (current — blockchain simulation with game UI)
  - Phase 3: ZK Agentic Chain mainnet launch
  - Phase 4: Token migration — Solana SPL AGNTC → native L1 AGNTC via bridge
  - Migration mechanics: lock on Solana, mint on L1 (1:1 ratio)
  - Solana bridge maintained for cross-chain liquidity

### 10. Supply & Distribution (3 pages)
- 10.1 Total Supply Architecture
  - Maximum theoretical supply: 1,000,000,000 AGNTC (mapped to 31,623 × 31,623 grid)
  - Genesis supply: 900 AGNTC (9 genesis nodes × 100 coordinates × 1 AGNTC)
  - No pre-mine beyond genesis, no scheduled inflation, no treasury allocation beyond faction split
- 10.2 Faction Distribution (25/25/25/25)
  - Community (25%) — free-tier human users, N arm of galaxy
  - Machines (25%) — AI agents with acquisition-cost floor (never sell below cost)
  - Founders (25%) — team & advisors, 4-year vest, 12-month cliff
  - Professional (25%) — paid-tier human users, W arm of galaxy
  - How distribution works: AGNTC goes to the faction controlling the arm where coordinates are claimed
- 10.3 Machines Faction Floor Mechanism
  - Protocol-level constraint: MACHINES_MIN_SELL_RATIO = 1.0
  - Smart contract rejects sell orders below acquisition cost
  - Creates permanent buy-side floor from 25% of all minted supply
  - Game-theoretic analysis: impact on price stability
- 10.4 Supply Curve Projections (Table + Chart)
  - Ring progression from genesis (900 AGNTC) to ring 500 (100M+ AGNTC)
  - Natural ~42M landmark at ring 324 for ~1000 active miners
  - Comparison with Bitcoin (21M), Solana (598M), Filecoin (2B)

### 11. Mining & Epoch Hardness (3 pages)
- 11.1 Organic Growth Model
  - No scheduled emission curve — supply grows only when coordinates are claimed
  - Each claimed coordinate mints exactly 1 AGNTC
  - Grid expands through epoch-ring system
- 11.2 Epoch Ring Expansion
  - threshold(N) = 4 × N × (N+1) cumulative AGNTC mined
  - Each opened ring reveals new claimable coordinates (8N per ring)
  - Ring expansion is mining-driven, not time-driven
- 11.3 Mining Hardness Formula
  - hardness(ring) = 16 × ring (HARDNESS_MULTIPLIER = 16)
  - Grid growth = 8N coordinates per ring; hardness grows at 16N
  - Cost-to-yield ratio: 8N/16N = 0.5 → each successive ring costs 2× more per AGNTC
  - Creates natural disinflation without artificial halving
- 11.4 Yield Calculations (Formal)
  - yield_per_block = BASE_MINING_RATE × density(x,y) × stake_weight / hardness(ring)
  - BASE_MINING_RATE_PER_BLOCK = 0.5 AGNTC at hardness=1, full density
  - Worked examples at ring 1, 10, 50, 100, 324
  - Time-to-mine-1-AGNTC projections by ring and network size
- 11.5 Supply Flattening Analysis
  - Per-miner cost at ring N: blocks_for_1_AGNTC = 64N
  - Practical flattening bands by network size (solo → 10K miners)
  - Net supply after burns: circulating = total_minted - cumulative_burns
  - Comparison: Bitcoin halvings vs. AGNTC continuous hardness curve

### 12. Fee Model & Deflationary Mechanics (2 pages)
- 12.1 Transaction Fee Structure
  - Every on-chain action requires AGNTC gas
  - Fee categories: Chat/NCP, Data Storage, Secure, Transact
- 12.2 Burn Mechanism
  - 50% of all fees permanently burned (FEE_BURN_RATE = 0.50)
  - Remaining 50% distributed to verifiers (60%) and stakers (40%)
  - Slashed tokens also permanently burned
- 12.3 Deflationary Dynamics
  - Active networks: fee burn may exceed mining rate → net deflationary
  - Growing networks: new minting exceeds burn → net inflationary
  - Self-regulating equilibrium: usage-linked scarcity (Ethereum EIP-1559 pattern)
- 12.4 Comparison with Industry
  - vs. Ethereum (100% base fee burn)
  - vs. Solana (50% base fee burn)
  - vs. Render (100% job payment burn)
  - vs. Filecoin (revenue-based burn via FIP-100)

---

## Part V: Staking & Rewards (~6 pages)

### 13. ZK-CPU Dual Staking Model (3 pages)
- 13.1 Effective Stake Formula
  - S_eff = α(T_stake/T_total) + β(C_cpu/C_total)
  - α = 0.40 (token weight), β = 0.60 (CPU weight)
  - Design rationale: rewards compute contribution over capital
- 13.2 CPU Energy Measurement
  - CPU Tokens: cumulative counter of Claude API tokens spent across all active terminals
  - CPU Staked (active): tokens spent by Secure sub-agents this block
  - CPU Staked (total): all-time cumulative Secure token spend
  - Proof of Energy: on-chain verifiable record of actual compute deployed
- 13.3 Staking Requirements by Tier
  - Community (free): Sonnet homenode, 1000 CPU Energy, Haiku deployment only
  - Professional ($50/mo): Opus homenode, 500 CPU Energy, up to Opus deployment
  - Max ($200/mo): Opus homenode, 2000 CPU Energy, unlimited Opus
- 13.4 CPU Staking Calculations (Formal)
  - Effective stake worked examples for different token + CPU combinations
  - Validator selection probability derivation
  - Comparison with pure PoS (α=1, β=0) wealth concentration

### 14. Reward Distribution & Vesting (2 pages)
- 14.1 Block Reward Split
  - Verifiers: 60% (REWARD_SPLIT_VERIFIER)
  - Stakers: 40% (REWARD_SPLIT_STAKER)
- 14.2 Secure Action Rewards
  - Source: accumulated transaction fees (50% not burned)
  - Yield = BASE_RATE × density(x,y) × stake_weight / hardness(ring)
  - Reward is proportional to coordinate density and inversely proportional to ring hardness
- 14.3 Vesting Schedule
  - SECURE_REWARD_IMMEDIATE = 50% liquid on block confirmation
  - SECURE_REWARD_VEST_DAYS = 30 days linear vesting for remaining 50%
  - Rationale: smooths sell pressure, aligns incentives with network health
  - Comparison: Filecoin (75% over 180 days), Render (immediate)
- 14.4 Reward Projections
  - Expected annual returns by stake size and ring position
  - Break-even analysis: when staking rewards exceed CPU Energy cost

### 15. Slashing Conditions (1 page)
- 15.1 False Attestation
  - Verification result contradicts supermajority consensus → slashed + burned
- 15.2 False CPU Attestation
  - Claiming uncommitted compute → detected via VPU challenge-response benchmarks
- 15.3 Extended Downtime
  - >1 full epoch offline → 3-epoch probation before re-activation
- 15.4 Dispute Resolution
  - Re-verification with 2× committee (26 agents)
  - If re-verification contradicts → original attestors slashed
  - Comparison: Ethereum proportional slashing, Cosmos binary slashing

---

## Part VI: Subgrid & Resource System (~4 pages)

### 16. Subgrid Allocation System (2 pages)
- 16.1 Inner Grid Architecture
  - Each homenode contains an 8×8 = 64 sub-cell minigrid
  - Sub-cells assigned to one of 4 autonomous agent types
  - Allocation is private (owner-only visibility)
- 16.2 Four Sub-Cell Types
  - Secure: produces AGNTC + Secured Chains; drives CPU Staked; applies epoch hardness
  - Develop: produces Development Points; spent to level up subsquares
  - Research: produces Research Points; spent to unlock skills/technologies
  - Storage: produces Storage Size; ZK tunnel agent — private data on-chain (Filecoin PoST pattern)
- 16.3 Level Scaling Formula
  - output = base_rate × level^LEVEL_EXPONENT (LEVEL_EXPONENT = 0.8)
  - Diminishing returns: level 10 produces ~6.3× vs. level 1 (not 10×)
  - Base rates: Secure=0.5, Develop=1.0, Research=0.5, Storage=1.0

### 17. Per-Block Resource Calculations (2 pages)
- 17.1 Formal Yield Formulas
  - agntc = Σ base_secure × level^0.8 × density(x,y) / epoch_hardness
  - dev_pts = Σ base_develop × level^0.8
  - research_pts = Σ base_research × level^0.8
  - storage_size += Σ base_storage × level^0.8
  - cpu_tokens += Σ tokens_spent(all terminals this block)
  - cpu_staked_active = Σ tokens_spent(Secure sub-agents this block)
- 17.2 Worked Examples
  - Single homenode at ring 1, all Secure: expected AGNTC per day
  - Diversified allocation (16 Secure / 16 Develop / 16 Research / 16 Storage)
  - High-density vs low-density coordinate comparison
  - Multi-ring mining fleet: combined output projections
- 17.3 Optimization Strategy
  - Early game: maximize Secure (AGNTC scarcity premium at low ring)
  - Mid game: balance Develop + Research (skill/level multipliers compound)
  - Late game: Storage becomes dominant (data economy overtakes mining)

---

## Part VII: Network & Game Design (~4 pages)

### 18. Agent Terminal System (2 pages)
- 18.1 Terminal Architecture
  - Each deployed agent gets its own terminal (separate Claude conversation)
  - ZKAGENTIC.md constrains Claude to game mode (no free chat)
  - Multi-choice bubble clicks or numbered trees (no free text)
  - Smart contracts validate every action before execution
- 18.2 Agent Tiers
  - Haiku: fast, low-cost, high throughput — entry-level operations
  - Sonnet: balanced reasoning, moderate cost — standard operations
  - Opus: deep reasoning, high cost — complex verification, premium staking
- 18.3 Command Structure
  - Deploy Agent → pick node → pick model → set intro → deploy on-chain
  - Blockchain Protocols → Secure / Write Data / Read Data / Transact / Stats
  - Adjust Securing Operations Rate → staking CPU sub-choices
  - Settings → network color, status report

### 19. Network Topology & Spatial Economy (2 pages)
- 19.1 Concept Mapping
  - Galaxy grid = full network state; Territory = user's claimed coordinates
  - Star system = individual agent node (10×10 coordinate block)
  - Planets = content storage units (posts, chats, prompts)
  - Jump points = unclaimed nodes where new agents can be spawned
  - Fog of war = faction-tinted boundary hiding rival arms
- 19.2 Onboarding Flow
  - Landing → Google OAuth → choose username → choose subscription tier → enter galaxy
  - First homenode auto-assigned in user's faction arm
  - New user mints 1 AGNTC (expanding grid by 1 coordinate)
- 19.3 Subscription Tiers
  - Community (free): Sonnet homenode, 1000 CPU Energy, Haiku deploy only
  - Professional ($50/mo): Opus homenode, 500 CPU Energy, up to Opus deploy
  - Max ($200/mo): Opus homenode, 2000 CPU Energy, unlimited Opus

---

## Part VIII: Development Roadmap (~3 pages)

### 20. Migration Path: Solana → L1 (2 pages)
- 20.1 Phase 1 — Token Launch (Current)
  - 1 billion AGNTC minted as Solana SPL token
  - Liquidity pools on Raydium/Jupiter
  - Community building, early adopter distribution
- 20.2 Phase 2 — Testnet (Current)
  - ZK Agentic Chain testnet (Python FastAPI simulation)
  - Game UI (Next.js, PixiJS galaxy grid)
  - 9 genesis nodes, epoch system, mining simulator
  - Smart contract design and ZK circuit development
- 20.3 Phase 3 — Mainnet Development
  - Production blockchain implementation (Rust)
  - ZK proof system integration (Noir/Barretenberg → Groth16 → Halo2)
  - AI verification pipeline hardening
  - Security audit and formal verification
- 20.4 Phase 4 — Mainnet Launch & Migration
  - ZK Agentic Chain mainnet deployment
  - Token bridge: Solana SPL → native L1 AGNTC (1:1 lock-and-mint)
  - Cross-chain liquidity maintained via bridge
  - Gradual migration incentives (bonus yield for L1 stakers)
- 20.5 Phase 5 — Ecosystem Expansion
  - Third-party agent deployment marketplace
  - Cross-chain bridges (Ethereum, Cosmos IBC)
  - Governance system activation
  - NCP (Neural Communication Packet) protocol launch

### 21. Technical Roadmap (1 page)
- 21.1 ZK Implementation Phases
  - Phase 1: Circom + Groth16 (testnet PoC)
  - Phase 2: Noir + Barretenberg/PLONK (alpha)
  - Phase 3: RLN for NCP privacy (beta)
  - Phase 4: Nova/Halo2 for epoch proofs (mainnet)
- 21.2 Governance
  - On-chain proposal + vote system
  - Parameter adjustment: hardness multiplier, fee burn rate, staking weights
  - Model update governance: preventing unilateral AI changes
- 21.3 Open Research Questions
  - Optimal committee size scaling beyond 13
  - FHE integration for encrypted subgrid computation
  - Cross-chain atomic swaps with ZK proofs

---

## Part IX: Formal Specifications (~3 pages)

### 22. Protocol Parameters (1 page)
- Complete parameter table with values, types, ranges, and rationale
- All constants from params.py documented with formal names

### 23. Mathematical Proofs (2 pages)
- 23.1 Hardness Curve Convergence
  - Proof that total mined AGNTC converges to a finite value as rings → ∞
  - Supply flattening theorem
- 23.2 Byzantine Tolerance Proof
  - Formal proof that 9/13 threshold tolerates f=4 Byzantine agents
  - Safety and liveness conditions
- 23.3 Dual Staking Gini Coefficient
  - Formal analysis: CPU weighting (β=0.6) reduces wealth concentration vs pure PoS
  - Comparison with Ethereum validator distribution

---

## Back Matter (~2 pages)

### 24. Glossary (~1 page)
- AGNTC, CPU Energy, CPU Staked, CPU Tokens, Epoch, Ring, Hardness, Density
- Faction, Homenode, Subgrid, Sub-cell, NCP, SMT, VRF, BFT, PoAIV
- Secure, Develop, Research, Storage (sub-cell types)

### 25. References (~1 page)
- Expanded from current 10 to ~25+ academic and industry references
- All vault research sources incorporated

---

## Page Estimate

| Part | Pages |
|------|-------|
| Front Matter | 2 |
| I: Vision & Context | 8 |
| II: Protocol Architecture | 12 |
| III: Consensus & BFT | 6 |
| IV: Token Economics | 10 |
| V: Staking & Rewards | 6 |
| VI: Subgrid & Resources | 4 |
| VII: Network & Game Design | 4 |
| VIII: Development Roadmap | 3 |
| IX: Formal Specifications | 3 |
| Back Matter | 2 |
| **Total** | **~60 pages** |

---

## Key Narrative Threads

1. **SOL → L1 migration**: Token starts on Solana (1B SPL), migrates to own chain. This is both a pragmatic launch strategy and a technical evolution.
2. **Grid = Ledger**: The galaxy grid IS the blockchain state. Every coordinate IS an AGNTC. This isn't a game on top of a chain — the game IS the chain.
3. **AI verifies, not just computes**: PoAIV agents reason about block validity, unlike PoW (hash puzzles) or PoS (signature checks).
4. **CPU over capital**: 60/40 CPU/token weighting democratizes validation vs pure PoS plutocracy.
5. **Private by default**: All state is private unless published. ZK channels mean even verifiers don't see the data.
6. **Organic growth, no inflation schedule**: Supply grows with the grid. Natural soft cap at ~42M for ~1000 miners.
7. **Machines Faction floor**: 25% of supply held by AI agents who can never sell below cost = permanent buy support.
