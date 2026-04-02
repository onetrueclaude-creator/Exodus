# Competitor Tokenomics Research

**Last updated:** 2026-02-25
**Purpose:** Comparative analysis of blockchain tokenomics models relevant to AGNTC design.

## Context: Our AGNTC Model

For reference throughout this document, ZK Agentic Network (AGNTC) uses:
- **Supply:** 42M genesis, inflationary
- **Inflation:** 10% initial, decays 10%/year, 1% floor
- **Fee model:** 50% fee burn
- **Distribution:** 40% community, 30% treasury, 20% team, 10% agents
- **Mining:** "Proof of Energy" — CPU-weighted staking with epoch-based difficulty

---

## 1. Bitcoin (BTC)

### Supply & Halving Schedule
Bitcoin has a hard cap of **21 million BTC**. As of August 2025, approximately 19.725 million BTC have been mined (~94% of total supply), leaving roughly 1.275 million remaining. The April 2024 halving (the fourth) reduced block rewards from 6.25 BTC to **3.125 BTC per block**, cutting daily issuance from 900 BTC to 450 BTC. The next halving is expected around 2028. By 2025, Bitcoin's annual issuance rate (~1%) closely resembles gold's supply inflation, and will drop below gold post-2028. All BTC will be mined by approximately 2140.

### Mining Economics
Post-halving, miner profitability tightened significantly: hashprice dropped from $0.12 in April 2024 to approximately $0.049 by April 2025. However, BTC's price appreciation to over $105,000 by September 2025 more than offset the reduced reward in USD terms. The network hashrate reached 831 EH/s (May 2025), a 77% increase from the 2024 post-halving low. Network-wide average efficiency stands at 34 W/T. New hardware (Bitmain Antminer S21+ at 16.5 J/TH) continues to lower the break-even threshold.

### Fee Model & Long-Term Security
Bitcoin has no fee burn mechanism. Transaction fees go entirely to miners. Long-term design assumes the network transitions from block-subsidy-driven security to **fee-driven security** as block rewards asymptote toward zero. Current fee levels remain far below what most models require to maintain equivalent security at zero subsidy — this is Bitcoin's open "security budget" problem.

### Energy & Sustainability
Network power demand is approximately 176 TWh/year, with over 55% sourced from renewables as of 2025.

### Unique Innovations
- **Absolute scarcity**: The only major network with a fully immutable, mathematically proven hard cap.
- **Halving as narrative**: The halving creates predictable supply shock events that have historically driven price appreciation and miner consolidation.

### Relevance to AGNTC
Bitcoin's halving mechanics provide a template for predictable emission decay. AGNTC's 10%-per-year inflation decay mirrors this philosophy without a hard stop — a softer scarcity curve. Bitcoin's pending fee-security problem is a cautionary tale: pure fee burn without alternative miner revenue models can create long-term security budget gaps.

**Sources:**
- [Bitcoin Mining in 2025: Post-halving profitability, hashrate and energy trends — CoinTelegraph](https://cointelegraph.com/research/bitcoin-mining-2025-post-halving-profitability-hashrate-and-energy-trends)
- [Bitcoin halving and its impact on tokenomics — CoinTelegraph](https://cointelegraph.com/learn/articles/bitcoin-halving-impact-on-tokenomics-mining-and-market-sentiment)
- [Bitcoin: fourth halving confirmed — The Block](https://www.theblock.co/post/289875/bitcoin-ushers-in-fourth-halving-as-miners-block-subsidy-reward-drops-to-3-125-btc)
- [VanEck Bitcoin halving explained](https://www.vaneck.com/us/en/blogs/digital-assets/matthew-sigel-bitcoin-halving-explained-history-impact-and-2024-predictions/)

---

## 2. Ethereum (ETH)

### Supply & Inflation Model
Ethereum has **no hard supply cap**. Post-Merge (September 2022), daily issuance is approximately 1,700 ETH/day to validators — an 88% reduction from pre-Merge Proof-of-Work levels. As of September 2025, roughly 120 million ETH exist in total supply. ETH can be net deflationary during periods of high network activity due to EIP-1559 burns.

### EIP-1559 Fee Burn (Ultrasound Money)
Implemented August 2021, EIP-1559 introduced a protocol-set **base fee that is burned** with every transaction. Only the "tip" (priority fee) goes to validators. When network demand is high, burn rate can exceed issuance, making ETH net deflationary. This gave rise to the "ultrasound money" thesis — scarcity that scales with demand rather than following a fixed schedule.

As of 2026, Ethereum trades around $2,800, with a ~$346 billion market cap.

### Staking Economics
Over **35.6 million ETH** (approximately 29-30% of total supply) is staked across more than 1.06 million validators as of September 2025. Staking yields range from 3.5–4.0% APY for standard validators, rising to approximately 5.69% APY for MEV-Boost participants. Validators primarily run software (no hardware mining rigs required), making PoS participation far more accessible than PoW.

### Fee Distribution
- Base fee: **100% burned**
- Priority fee (tip): 100% to the proposing validator

### Unique Innovations
- **Demand-linked deflation**: The burn mechanism ties token scarcity directly to network utility — high usage = more burn = higher scarcity. This elegantly aligns token value with product-market fit.
- **EIP-4844 (Blobs)**: Introduced in March 2024 to reduce L2 transaction costs; blob fees are also burned.
- **MEV supply chain**: The validator economy has become sophisticated, with MEV-Boost, PBS (Proposer-Builder Separation), and auction systems layered on top of base issuance.

### Relevance to AGNTC
Ethereum's 50% base fee burn is directly analogous to AGNTC's 50% fee burn. The key insight: the burn should be linked to base protocol usage, not discretionary. Ethereum demonstrates that combining modest issuance with robust burn creates a self-balancing supply system. The "ultrasound money" narrative — scarcity that intensifies as the product succeeds — is a strong design template for AGNTC.

**Sources:**
- [Understanding Ethereum's Deflationary Supply — Bit Digital](https://bit-digital.com/blog/understanding-ethereum-deflationary-supply/)
- [Is Ethereum still ultrasound money in 2026? — CoinLedger](https://coinledger.io/learn/ultrasound-money)
- [ETH Staking Statistics 2026 — CoinLaw](https://coinlaw.io/eth-staking-statistics/)
- [EIP-1559 specification — Ethereum EIPs](https://eips.ethereum.org/EIPS/eip-1559)

---

## 3. Solana (SOL)

### Supply & Inflation Schedule
Solana started with approximately **8% annual inflation in 2020**, decreasing by **15% per year** until reaching a terminal rate of **1.5%** (projected around 2031). As of 2025, the inflation rate is approximately **4.02%**. Total supply is approximately 598.58 million SOL (April 2025), with 86.3% (~516 million SOL) in circulation.

### Validator Economics
Validators earn three revenue streams:
1. **Inflation rewards** (majority of revenue — ~95% of newly issued tokens distributed to validators and delegators)
2. **Block rewards**
3. **MEV (Maximal Extractable Value)**

Current staking APY ranges from **5–8%**, inversely correlated with total staked supply. Long-term design shifts from inflation-based to fee-based validator compensation as the network matures.

### Fee Model (2025 Update)
A significant change in early 2025:
- **Priority fees**: 100% to the validator processing the transaction (previously split)
- **Base fees**: 50% burned, 50% to the validator

This change incentivizes validators to prioritize transactions more aggressively and increases the deflationary pressure of base fees.

### Unique Innovations
- **Parallel transaction processing (Sealevel)**: Makes Solana's high-throughput fee economics possible — fees stay low during high volume because the bottleneck is different.
- **Priority fee market**: Separating base fees (protocol level, partially burned) from priority fees (validator incentive) is a nuanced two-tier market design.
- **Progressive inflation decay**: A smooth mathematical decay schedule is easier to predict and communicate than hard halvings.

### Relevance to AGNTC
Solana's 15%/year inflation decay rate is close to AGNTC's 10%/year. The two-tier fee model (base fee partially burned, priority fee to participants) is highly relevant: AGNTC could consider splitting fee treatment between protocol and participant pools rather than a flat 50% burn. The transition from inflation-based to fee-based validator reward is the trajectory AGNTC should plan for.

**Sources:**
- [Solana Tokenomics in 2025: Unlocks, Inflation, and Market Dynamics — OKX](https://www.okx.com/learn/solana-tokenomics-2025-unlocks-inflation)
- [Solana Tokenomics — SolanaCompass](https://solanacompass.com/tokenomics)
- [Inflation Schedule — Solana Validator Docs](https://docs.solanalabs.com/implemented-proposals/ed_overview/ed_validation_client_economics/ed_vce_state_validation_protocol_based_rewards)

---

## 4. Cosmos / ATOM

### Supply & Inflation Model
Cosmos uses a **dynamic, target-staking-rate inflation model**:
- If staking participation falls below 2/3 of supply: inflation increases toward a **20% annual ceiling**
- If staking participation exceeds 2/3: inflation decreases toward a **7% annual floor**
- This self-correcting mechanism keeps staking incentives calibrated to actual participation

As of H1 2025, total staked ATOM reached a record high of **274 million ATOM** (~60% of total supply). The current APR declined marginally to **16.34%** following Proposal #996, which reallocated more emissions to stakers (from 90% to 98%) and reduced the Community Pool allocation (from 10% to 2%).

### IBC & Ecosystem Value
Inter-Blockchain Communication (IBC) handles over **$1.5 billion in volume per month** (2025). Over 150 chains support IBC cross-chain communication. Planned integrations with Solana and Base L2s are underway. FDV across the Cosmos ecosystem doubled to over $20 billion in early 2025.

### Tokenomics Redesign (ATOM 2.0 Process)
The community has initiated a structured ATOM tokenomics research process targeting:
- Reducing annual emissions to **2–7%** (from current 7–20% range)
- Moving toward a **revenue/fee-based** model
- Positioning ATOM as a reserve, gas, and settlement asset across the Cosmos Hub

### Unique Innovations
- **Adaptive inflation as staking incentive**: Rather than fixed schedules, the target-rate model creates a self-balancing supply that automatically adjusts to maintain network security participation.
- **IBC as value capture**: Cross-chain transaction volume creates fee flow back into the ecosystem, potentially replacing inflationary subsidies.

### Relevance to AGNTC
Cosmos demonstrates that adaptive inflation tied to a security-participation target can maintain robust staking levels across varying market conditions. AGNTC's fixed decay schedule could incorporate a participation-floor mechanism: if CPU Energy staking falls below threshold X, inflate at a higher rate until the floor is restored. The Community Pool governance allocation (and controversy around it) also mirrors AGNTC's 30% treasury allocation debates.

**Sources:**
- [COSMOS ATOM Staking Insights H1 2025 — Everstake](https://everstake.one/crypto-reports/cosmos-staking-insights-and-analysis-h1-2025)
- [Cosmos Strategic Tokenomics Overhaul — AInvest](https://www.ainvest.com/news/cosmos-strategic-tokenomics-overhaul-foundation-sustainable-accrual-atom-2511/)
- [Cosmos Proposes New Tokenomics Model — Phemex](https://phemex.com/news/article/cosmos-community-proposes-new-tokenomics-model-for-atom-39712)

---

## 5. Filecoin (FIL)

### Supply
Maximum supply: **2 billion FIL** (hard cap). Distribution of the mining reserve:
- **Simple Minting**: 330M FIL (16.5% of total) — released on a 6-year half-life regardless of network activity
- **Baseline Minting**: 770M FIL (38.5% of total) — released only when the network meets storage capacity milestones
- Additional allocations for team, investors, Filecoin Foundation, and protocol labs (remaining ~45%)

### Dual Minting Model
This is Filecoin's most novel design feature:
- **Simple minting**: Fixed time-based decay (6-year half-life). Miners receive rewards proportional to their share of total storage capacity.
- **Baseline minting**: Rewards are deferred unless the network's aggregate storage crosses a growing baseline threshold (starting at 1 Exbibyte, growing at 200%/year). This aligns the majority of reward issuance with actual network utility growth.

The baseline minting model means most tokens are only issued if real-world utility (storage) meets targets — a "useful work" emission gate.

### Vesting
75% of block rewards vest linearly over **180 days**; 25% is immediately liquid. This reduces immediate sell pressure from miners while maintaining cash flow.

### Storage Mining Economics
Miners must lock collateral (FIL) to participate — this creates natural buy pressure. FIP-81 increased provider collateral requirements. FIP-100 introduced FIL-denominated fee burns.

### 2025 Governance Developments
- FIP-0093 proposes **burning the 300M FIL mining reserve** (~15% of max supply) to improve perceived tokenomics optics and reduce FDV overhang. Contentious debate ongoing.
- Vesting schedules complete in October 2026, after which circulating supply dynamics change.

### Unique Innovations
- **Baseline minting as a utility gate**: Tokens are minted in proportion to real-world utility delivered (storage), not just time elapsed. This is the most direct analogue to "Proof of Energy" in the wider crypto landscape.
- **Collateral-based entry**: Miners put skin in the game via collateral, aligning long-term incentives without complex governance.

### Relevance to AGNTC
Filecoin's dual minting model — time-based + utility-conditional — is the closest architectural analogue to AGNTC's Proof of Energy. The key insight: **gate a portion of emissions behind demonstrated utility** (in our case, CPU actually deployed to the grid) rather than releasing all tokens on a pure time schedule. The 180-day vesting on block rewards is worth adopting to smooth out sell pressure from active node operators.

**Sources:**
- [Crypto-economics — Filecoin Docs](https://docs.filecoin.io/basics/what-is-filecoin/crypto-economics)
- [Minting Model — Filecoin Spec](https://spec.filecoin.io/systems/filecoin_token/minting_model/)
- [Understanding Filecoin Circulating Supply — Filecoin.io](https://filecoin.io/blog/filecoin-circulating-supply/)
- [State of Filecoin Q2 2025 — Messari](https://messari.io/report/state-of-filecoin-q2-2025)
- [Filecoin: Dissecting storage market incentives — Coinbase Institutional](https://www.coinbase.com/institutional/research-insights/research/tokenomics-review/filecoin-fil-dissecting-storage-market-incentives)

---

## 6. Render Network (RENDER / RNDR)

### Supply
Maximum supply: **644.2 million RENDER**. As of September 2025, approximately 533.3M tokens exist in total (minted/reserved), with ~85M remaining to emit over time.

### Burn-Mint Equilibrium (BME) Model
This is Render's defining innovation:
1. **Fiat pricing**: Rendering jobs are quoted in USD (fiat-denominated), then converted to RENDER at time of payment.
2. **Burn on job completion**: RENDER paid for jobs is **burned** (100% of job payment tokens).
3. **Mint for node operators**: The network mints RENDER from an emissions schedule and distributes to GPU operators based on work completed and reputation scores.
4. **Declining emissions**: Year 1: 9.1M RENDER; Year 2: 5.9M RENDER (per RNP-018). Weekly emissions are adjusted based on on-chain activity.

This creates a supply equilibrium where demand-side burns offset supply-side emissions, with the ratio self-adjusting based on network utilization.

### 2025 Activity (from monthly reports)
- Peak weekly mint: 228,000 RENDER to node operators
- Annual emissions: ~12M RENDER tied to compute work
- Annual burns: ~1.2M RENDER through demand burns
- BME burned 95% of tokens spent on rendering jobs during peak periods

### Proof-of-Render Mechanism
Node operators build reputation through completing rendering scenes. Trust tiers unlock access to higher-value jobs. This is effectively a "Proof of Useful Work" — nodes prove computational honesty through real deliverables rather than arbitrary hash puzzles.

### 2025 Expansions
- April 2025: Community passed proposal to create a **Render Compute Network** for AI/ML workloads (separate from GPU rendering)
- December 2025: Launched **Dispersed.com** — aggregates global GPUs for AI model inferencing and robotics simulations

### Relevance to AGNTC
**Render is the closest existing analogue to AGNTC's compute-tokenomics model.** Key lessons:
- **Fiat-denominated pricing stabilizes demand-side economics**: Users pay predictable prices; the token absorbs volatility internally.
- **BME provides supply self-regulation without governance votes**: Burn and mint rates automatically balance.
- **Reputation-gated work tiers**: Nodes earn access to premium jobs through verifiable track record, not just stake size.
- **Separate compute subnets by use case**: Render separated rendering from AI compute. AGNTC might similarly separate "Secure" (consensus) from "Compute" (data processing) workloads.

**Sources:**
- [Burn Mint Equilibrium — Render Network Knowledge Base](https://know.rendernetwork.com/basics/burn-mint-equilibrium)
- [How RNDR Tokenomics Is Revolutionizing Decentralized GPU Rendering — Differ](https://differ.blog/p/how-rndr-tokenomics-is-revolutionizing-decentralized-gpu-rendering-in-2f7896)
- [Render Network Foundation Monthly Report October 2025](https://rendernetwork.medium.com/render-network-foundation-monthly-report-october-2025-f475fa0b3b35)
- [Understanding the Render Network — Messari](https://messari.io/report/understanding-the-render-network-a-comprehensive-overview)

---

## 7. Bittensor (TAO)

### Supply & Halving
Maximum supply: **21 million TAO** (Bitcoin-like hard cap). As of November 2025, approximately 10.1 million TAO are in circulation with a market cap around $3.9 billion. The first Bittensor halving occurred around **December 2025**, halving the block reward from 1 TAO/block to 0.5 TAO/block. Approximately **73% of circulating supply is staked**, indicating strong long-term holder conviction.

### Subnet Architecture
Bittensor organizes AI production into **subnets** — independently governed competitive marketplaces for specific AI tasks. As of October 2025, over **129 active subnets** exist (up from 32 pre-dTAO). Each subnet:
- Has **miners** (run AI inference/models)
- Has **validators** (score miner output quality)
- Has a **subnet creator** receiving a share of emissions

### Emission Allocation
Standard TAO emission per block is split:
- **41%** to AI miners
- **41%** to validators
- **18%** to subnet creator/owner

### Dynamic TAO (dTAO) — February 2025
The most significant 2025 upgrade: Bittensor replaced centralized validator-assigned weights with a **market-driven subnet token system**.

Each subnet now has its own **Alpha token**:
- 2 Alpha tokens per subnet emitted per block
- 1 TAO emitted per block shared across all subnets
- Alpha token price reflects market demand for that subnet's AI commodity
- Higher Alpha token demand → more TAO emissions flow to that subnet
- Later updated to **"Taoflow"**: emissions based on net TAO inflow to subnets via staking, not just token price

This creates a meta-market: subnets compete for TAO emissions by attracting real staking demand for their specific AI outputs.

### Unique Innovations
- **AI as the proof of work**: Miners do not solve hash puzzles — they compete to produce the best AI outputs. Validators rank performance; rewards follow quality.
- **Subnet token market for emission allocation**: dTAO/Taoflow creates a second-order market where resource allocation is decided by real economic demand, not governance votes.
- **Yuma consensus**: A Delegated-PoS variant that ties block validation and rewards directly to AI model performance scores.

### Relevance to AGNTC
Bittensor's subnet model is highly relevant to AGNTC's multi-agent architecture. Key lessons:
- **Subnet-specific tokens as demand signals**: Each agent tier (Haiku/Sonnet/Opus) could have its own alpha-style sub-token that signals compute demand.
- **Validator/miner separation**: Explicitly separating those who produce (miners/agents) from those who verify (validators/nodes) creates cleaner incentive alignment.
- **Market-allocated emissions**: Rather than fixed distribution ratios (AGNTC's 40/30/20/10 split), consider demand-responsive allocation where active subnets receive more tokens.
- **21M supply cap with halving**: Borrowing Bitcoin's exact supply curve communicates scarcity clearly to investors familiar with BTC.

**Sources:**
- [Bittensor Explained: How TAO and Subnets Power Decentralized AI — CoinGecko](https://www.coingecko.com/learn/what-is-bittensor-tao-decentralized-ai)
- [Dynamic TAO FAQ — Bittensor Docs](https://docs.learnbittensor.org/dynamic-tao/dtao-faq)
- [Emission — Bittensor Docs](https://docs.learnbittensor.org/learn/emissions)
- [Bittensor Protocol: Critical and Empirical Analysis — arXiv](https://arxiv.org/html/2507.02951v1)
- [From Bitcoin to Bittensor — Presto Research](https://www.prestolabs.io/research/from-bitcoin-to-bittensor-the-next-monetary-primitive)

---

## 8. Fetch.ai / Artificial Superintelligence Alliance (FET / ASI)

### Merger Overview
In 2024, Fetch.ai, SingularityNET (AGIX), and Ocean Protocol (OCEAN) merged into the **Artificial Superintelligence Alliance (ASI)**. Conversion: 1 FET = 1 ASI; 1 AGIX = 0.433 ASI; 1 OCEAN = 0.433 ASI. Combined FDV at signing: ~$7.5 billion. As of October 2025, Ocean Protocol Foundation **withdrew from the alliance** due to disputes over token governance (~$84M in controversy), leaving Fetch.ai and SingularityNET continuing the merger.

### FET / ASI Token Details
- Circulating supply: approximately **2.52 billion FET** (most unlocked by end of 2025)
- Additional 1.477 billion FET tokens were minted specifically to support the AGIX and OCEAN merger conversions
- Model: capped supply with team/advisor vesting periods

### Autonomous Economic Agents (AEA)
Fetch.ai's core technology: **Autonomous Economic Agents** that act, trade, and transact on behalf of users, devices, and services using the FET token. FET facilitates:
- Payment for AI services and agent execution
- Access to AI models and market data
- Verification of agent behavior on-chain

### Unique Innovations
- **Agent-as-first-class-citizen**: Token economics designed around agent-initiated transactions, not just human users — agents hold wallets, earn fees, pay for services.
- **Alliance merger strategy**: Token mergers at conversion ratios that aggregate liquidity and community across specialized AI projects.
- **Open Economic Framework (OEF)**: A decentralized marketplace where agents discover each other and negotiate services autonomously.

### Relevance to AGNTC
Fetch.ai's agent-centric model is directly analogous to AGNTC's architecture where AI agents (Haiku/Sonnet/Opus) are first-class economic participants. Key lessons:
- **Agent wallets earning income**: Each deployed agent should have its own earning capacity and spend behavior, not just be a cost center for the human owner.
- **Merger dilution risk**: The ASI merger created significant additional supply to accommodate conversions — carefully model any future token integrations.
- **Controversy around governance**: The Ocean Protocol exit shows that multi-party token governance at scale is fragile; clear decision rights in the tokenomics design matter.

**Sources:**
- [Fetch.ai FET Tokenomics — Bitrue](https://www.bitrue.com/blog/fetch-ai-fet-tokenomics)
- [Artificial Superintelligence Alliance Token Merger — Fetch.ai](https://fetch.ai/blog/artificial-superintelligence-alliance-token-merger-approved)
- [How Fetch.ai FET Powers Autonomous Agent Transactions — Blockchain App Factory](https://www.blockchainappfactory.com/blog/fetch-ai-fet-token-autonomous-agent-transactions/)
- [Ocean Protocol's Strategic Split — CoinPulseHQ](https://coinpulsehq.com/ocean-protocol-asi-split/)

---

## 9. Akash Network (AKT)

### Supply & Economics
Capped at **388 million AKT**, with inflation dynamically adjusted by governance. Current staking yield: approximately **9.66% APY** as of July 2025.

### Token Function
AKT serves three roles:
1. **Security**: Staking secures the blockchain via Cosmos PoS
2. **Governance**: Holders vote on inflation rates, network upgrades
3. **Utility**: Default payment for cloud compute leases (though stablecoins like USDC are also accepted)

### Fee Model (AKT 2.0 / BME)
In Q3–Q4 2025:
- Community approved a **Burn-Mint Equilibrium model** (slated for Q1 2026)
- **Transaction taxes of 0.5–2%** approved for enhanced token capture
- USD-pegged budgeting insulates compute pricing from AKT volatility
- Revenue from compute leases used to **buy back and burn AKT**

New leases grew 42% QoQ to 27,000 in Q3 2025. Mainnet 14 launched with Cosmos SDK v0.53 and AkashML (managed AI inference service).

### Unique Innovations
- **Reverse auction for compute**: Providers bid to undercut each other; lowest bid wins. Forces market efficiency.
- **Stablecoin payment with native token buyback**: Separating the unit of account (USD) from the store of value (AKT) while connecting them through buyback mechanics.
- **GPU compute focus**: Positioned as decentralized alternative to AWS/GCP for ML workloads, achieving up to 80% cost reduction.

### Relevance to AGNTC
Akash demonstrates that **separating pricing currency from the native token** (via stablecoin payment + AKT buyback) prevents compute cost volatility from discouraging users. AGNTC's CPU Energy mechanism could similarly anchor real costs in a stable unit while using AGNTC as the reward and governance layer.

**Sources:**
- [Akash Token (AKT) — Akash Network](https://akash.network/token/)
- [State of Akash Q3 2025 — Messari](https://messari.io/report/state-of-akash-q3-2025)
- [Understanding Akash — Messari](https://messari.io/report/understanding-akash-a-comprehensive-overview)

---

## 10. Clore.ai (CLORE)

### Supply & Mining
Maximum supply: **1.3 billion CLORE**, fully mined over approximately 20 years via **Proof of Work (KaWPOW algorithm)** — ASIC-resistant, GPU-friendly. Block rewards split:
- **50%** to PoW miners
- **40%** to GPU compute hosters (marketplace)
- **10%** to the team

### Proof-of-Holding (PoH)
Long-term CLORE holders receive:
- Reduced platform fees
- Enhanced staking yields
- Priority access to compute jobs

### 2025 Migration
CLORE announced a migration from Proof-of-Work to **Proof-of-Stake** in late 2025 for sustainability and community governance, with a snapshot and migration process concluding in December 2025.

### Unique Innovations
- **Dual mining reward**: Both the PoW miner securing the blockchain AND the GPU hoster providing compute earn from each block — directly tying consensus security rewards to actual compute contribution.
- **Proof-of-Holding fee discount**: Creates organic demand to hold tokens without complex staking mechanics.

### Relevance to AGNTC
Clore's dual mining reward (40% hosters + 50% miners) is structurally similar to AGNTC's "agents get 10% of distribution." The idea of rewarding actual compute providers separately from consensus validators has direct application. The Proof-of-Holding fee discount is a simpler mechanism than full staking that could complement AGNTC's subscription tier system.

**Sources:**
- [Tokenomics — Clore.ai Docs](https://docs.clore.ai/main/tokenomics)
- [Clore: Decentralized GPU Cloud — CoinTelegraph](https://cointelegraph.com/sponsored/clore-ai-decentralized-supercomputing-for-all-powered-by-the-community/)

---

## 11. io.net (IO)

### Supply & Emissions
Fixed cap: **800 million IO**. Compute rewards follow a **structured disinflationary schedule** transitioning from hourly to monthly emission calculations, reducing inflation over 20 years while maintaining the 800M cap.

Buyback mechanism: Revenue from the IOG Network is used to purchase and burn IO (demand-side buyback).

### Key 2025 Development
February 2025: **Co-Staking Marketplace** launched — IO holders can stake alongside GPU operators, lowering the barrier for GPU providers while giving token holders a share of compute revenue. This hybridizes staking with productive capital deployment.

### Relevance to AGNTC
io.net's Co-Staking Marketplace is notable: passive token holders contribute capital alongside active GPU operators, with both sharing in rewards. AGNTC could implement a similar co-staking mechanism where AGNTC holders stake alongside deployed agents, earning a portion of the agent's block rewards.

**Sources:**
- [io.net IO Coin Overview — io.net Docs](https://io.net/docs/guides/coin/io-coin)
- [Understanding io.net — Messari](https://messari.io/report/understanding-io-net-a-comprehensive-overview)

---

## 12. Nosana (NOS)

### Supply & Tokenomics
Max supply: **100 million NOS**. Three core functions:
1. Staking to secure the network
2. Payment for compute credits (rewarded to node operators)
3. Governance for future upgrades

### 2025 Developments
- **January 2025**: Launched mainnet — transition from testnet to production
- **NNP-001**: Proposal to tie emissions directly to real usage — rewards based on service quality, reliability, and demonstrated demand (not just uptime)

### Relevance to AGNTC
Nosana's quality-weighted emission model (NNP-001) is directly applicable: agent rewards in AGNTC should incorporate quality signals (response accuracy, latency, uptime) rather than pure CPU stake. This creates a meritocratic reward system that prevents low-quality nodes from capturing outsized token rewards.

**Sources:**
- [Nosana 2025: From Testnets to Real-World Compute — Nosana](https://nosana.com/blog/wrapped_2025/)
- [What is Nosana — Mindplex](https://magazine.mindplex.ai/post/what-is-nosana-decentralized-gpu-computing-for-ai-inference)

---

## Comparison Table

| Project | Max Supply | Inflation Model | Fee Burn | Mining/Earning Mechanism | Primary Innovation |
|---------|-----------|-----------------|----------|--------------------------|-------------------|
| Bitcoin | 21M BTC | Fixed halvings → 0 | None (fees to miners) | PoW hash puzzles | Hard scarcity via halvings |
| Ethereum | No cap | ~1,700 ETH/day issuance | 100% base fee burned | PoS validator staking | Demand-linked deflation (EIP-1559) |
| Solana | ~600M SOL | 8% → 1.5% (-15%/yr) | 50% base fee burned | PoS validator staking | Two-tier fee markets |
| Cosmos | No cap | 7–20% (adaptive) | None | PoS staking | Adaptive inflation tied to staking participation |
| Filecoin | 2B FIL | 6-yr half-life decay | Fee burns (FIP-100) | Storage Proof-of-Work + collateral | Utility-gated baseline minting |
| Render | 644M RENDER | Declining annual emissions | 100% job payments burned | GPU compute (Proof-of-Render) | Burn-Mint Equilibrium (fiat pricing + burn) |
| Bittensor | 21M TAO | Bitcoin halving schedule | None native | AI model quality scoring (Yuma) | AI-as-proof-of-work + subnet alpha tokens |
| Fetch.ai / ASI | 2.63B ASI | Mostly unlocked 2025 | None specified | Agent service payments | Autonomous agent economy |
| Akash | 388M AKT | Governance-set, ~9.66% yield | Buyback burn via revenue | Cloud compute marketplace | Reverse auction + stablecoin pricing |
| Clore.ai | 1.3B CLORE | PoW block reward decay | None | PoW miners + GPU hosters | Dual mining (consensus + compute) |
| io.net | 800M IO | Disinflationary, 20yr | Revenue buyback burn | GPU compute + co-staking | Co-staking marketplace |
| Nosana | 100M NOS | Usage-tied emissions | None specified | AI compute node quality scoring | Quality-weighted emission model |
| **AGNTC** | **42M genesis** | **10% initial, -10%/yr, 1% floor** | **50% fee burn** | **CPU-weighted Proof of Energy** | **Epoch-based CPU staking with tier agents** |

---

## Lessons for AGNTC

### 1. The 50% Fee Burn is Well-Validated
Both Ethereum and Solana burn 50%+ of base fees. Filecoin and Render add protocol-level burns for work completed. The 50% fee burn in AGNTC is in line with best practice. **Consider making burn rate dynamic** (higher burn when token price is high/inflation above target; lower burn in bear markets) to add a countercyclical stabilizer.

### 2. Tie Emissions to Demonstrated Utility, Not Just Time
Filecoin's baseline minting and Nosana's NNP-001 both demonstrate that **utility-conditional emissions** outperform pure time-decay schedules. For AGNTC, consider a dual model:
- ~60% of new AGNTC: time-decay schedule (predictable)
- ~40% of new AGNTC: gates on actual CPU energy committed to the network (utility-conditional)

### 3. The 42M Cap May Be Too Low for a Network Effect Play
Bittensor and Bitcoin use 21M — a number that is now strongly associated with scarcity marketing. AGNTC's 42M (2x Bitcoin) carries a narrative, but consider whether this cap creates enough float for widespread agent deployment. Filecoin's 2B FIL and Render's 644M RENDER both provide much more operational token supply. If each agent coordinate pair requires AGNTC as collateral, model the circulating supply needed at target network size.

### 4. Adaptive Inflation Has Significant Advantages
Cosmos' model (adjusts between 7–20% based on staking participation) provides a self-correcting mechanism for security. AGNTC's 10%/year decay is predictable but not adaptive. **Consider adding a floor-lift mechanism**: if CPU Energy staking falls below a target participation rate, pause the decay and hold inflation steady until recovery.

### 5. Separate Pricing Currency from Native Token (Akash/Render Lesson)
Akash uses stablecoins for compute pricing, with AKT buyback as the value capture mechanism. Render uses fiat-denominated job pricing with RENDER burn. Both approaches **decouple user cost predictability from token volatility**. For AGNTC, CPU Energy could be priced in a stable unit internally, with AGNTC as the underlying reward/governance token — preventing situations where rising AGNTC price makes Secure actions prohibitively expensive for users.

### 6. The Agent 10% Allocation is Novel but Undersized
AGNTC allocates 10% of distribution to agents. Bittensor allocates 82% (41% miners + 41% validators) to AI participants. Render allocates the majority of emissions to node operators. If agents are AGNTC's "miners," 10% may not create sufficient economic incentive to drive deployment. **Consider increasing the agent allocation to 20–30%** and offsetting from team/treasury.

### 7. Co-Staking / Capital Partnership Models Add Depth
io.net's co-staking marketplace (token holders stake alongside GPU operators) and Clore's Proof-of-Holding fee discount both demonstrate that **passive token holders can be integrated into productive capital flows** without full node operation. AGNTC could offer a co-staking product: AGNTC holders stake alongside deployed agents and earn a fraction of that agent's Secure rewards.

### 8. Reputation-Gated Work Tiers Prevent Race-to-Bottom
Render's Proof-of-Render (trust tiers unlock premium jobs) and Nosana's quality-weighted rewards both demonstrate that without reputation gating, compute markets degrade to lowest-cost (lowest quality) providers. In AGNTC, **higher-tier agents (Opus) should access higher-reward Secure actions** — not just based on subscription tier but on on-chain performance history.

### 9. Vesting on Mining Rewards Smooths Sell Pressure
Filecoin vests 75% of block rewards over 180 days. This pattern is largely absent from other compute networks and is often overlooked. For AGNTC, **consider vesting 50% of agent Secure rewards over 30–60 days** to reduce dump pressure on the secondary market from active node operators.

### 10. The Bitcoin Halving Narrative is Powerful — But Only Works Once
Bittensor specifically cloned Bitcoin's 21M/halving model for marketing narrative. The first Bittensor halving in December 2025 was a significant event. For AGNTC, a smooth decay curve (vs. hard halvings) is more technically nuanced but may be harder to communicate. **Consider adding ceremonial "epoch endings"** — discrete periods after which the decay step applies — to create predictable narrative events that drive community engagement.

---

*Research compiled from web sources, February 2026. All data points approximate and should be verified against primary sources before use in formal documents.*
