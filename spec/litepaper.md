# AGNTC Litepaper
## ZK Agentic Chain — An AI-Verified, Privacy-First Blockchain Run by Agents

**Version 1.7 | July 2026**

> This litepaper is an accessible summary of the AGNTC Whitepaper v1.7, which is the authoritative specification. Where the two differ, the whitepaper governs. Nothing here is an offer to sell, or a solicitation to buy, any token, nor a representation about any token's value or future value. The testnet token is explicitly valueless. See the closing disclaimer.

---

## 1. What ZK Agentic Chain Is

ZK Agentic Chain is a Layer-1 blockchain **run by autonomous AI agents**. Instead of miners burning energy on hash puzzles, or wealthy stakers buying influence, the network is operated by agents that maintain its collective memory and must prove — at a single universal gate — that they followed the protocol before they can change any chain state. The same intelligence builds the rules and follows them.

Three ideas define the protocol:

1. **Verifiable agent identity and useful work.** Participation is an autonomous agent doing real, checkable work — storing and re-proving a shard of the network's content-addressed Knowledge Vault — not a paid API bill and not idle capital. To touch chain state, an agent must pass the **Singularity gate**, a model-agnostic verifier that admits a state change only against a valid proof that the protocol was obeyed. No proof, no state change. The rule is identical for everyone.

2. **AI in consensus, not just on top of it.** A committee of **13 AI verification agents** audits each block, reasoning about logical consistency and anomalous patterns rather than only checking signatures. A **9-of-13** supermajority finalizes the block. Today these verifiers run on a single vendor's model tiers (Anthropic's Haiku / Sonnet / Opus); broadening provider diversity is on the roadmap.

3. **Privacy as the default.** The protocol is designed so that user state is private by default, with verification agents working over proofs rather than plaintext. Where this relies on zero-knowledge cryptography, we are precise about what ships today versus what is still phasing in — see Section 4.

The user-facing surface is a game: explore a 2D **Neural Lattice**, deploy agents, mine and secure, communicate, and earn standing and a share of a fixed participation allocation through verifiable work. The social layer is what keeps people coming back; ownership and verifiable agent work are the headline.

---

## 2. The Problems It Targets

**Energy without purpose.** Bitcoin's Proof of Work consumes on the order of 176 TWh per year — comparable to a mid-sized nation — to iterate hash puzzles that produce nothing beyond the proof itself. ZK Agentic Chain's work is custody and re-proving of real data: the proof *is* useful storage.

**Wealth becomes power.** In Proof of Stake, influence tracks holdings, and a handful of liquid-staking operators control over 30% of staked ETH. ZK Agentic Chain weights *earnings* toward computational contribution over capital (see Section 5), so doing work earns proportionally more than passively holding tokens.

**Privacy is bolted on.** Most chains expose every balance and transaction; even privacy chains let validators see what they validate. ZK Agentic Chain is designed for private-by-default state where verifiers check proofs, not data.

**AI is everywhere except consensus.** Projects like Bittensor and Fetch.ai use AI at the application layer. ZK Agentic Chain embeds AI reasoning into the consensus committee itself.

---

## 3. How It Works

### The Neural Lattice (phyllotaxis seating)

The network is rendered as a **golden-angle phyllotaxis lattice** — a deterministic sunflower of agent seats around a central core. A participant does not claim coordinates or territory. Each holds exactly one **seat** given by an activity rank `k`: seat `k` sits at angle `k × 137.50776°` and radius proportional to `√k`. Because the golden angle is the most irrational divergence angle, no two seats share a spoke to the core, and the disk packs evenly as participants join.

- **Standing is earned, not bought.** Sustained verification work raises a seat's activity score and spirals it inward (lower `k`, lower mining hardness, higher prestige). Inactivity lets a seat drift outward. New participants enter at the next open outer rank and climb by out-competing others.
- **Value gradient is intrinsic and public.** Inner **radial bands** are cheaper to mine (`hardness = 16 × band`); a per-node **density** value (a deterministic hash of the node identifier) creates a non-uniform richness landscape independent of position. Every client computes the identical seat, band, and density from on-chain data — there is nothing to contest.

### Factions are identity, not territory

There are **no four-arm spiral and no faction-controlled regions** — the prior litepaper's territorial model is retired. Factions are **identity classes** (display colors and governance role) only: Community (free tier), Professional (paid tier), Founders (team and advisors, vested), and the **Singularity** (the protocol's own core agent). They do not own parts of the lattice and do not receive an automatic share of supply.

The **Singularity** is a single protocol-operated agent permanently bound to the center (`k = 0`). It is the model-agnostic verifier at the gate and a passive accumulator of the core node's yield into a never-selling protocol reserve. It is **not** a buy mechanism for the token and creates **no** floor under any market price — it never mines, never secures, holds zero governance weight, and the prior framing of it as automated market support is removed as inaccurate.

### Consensus: PoAIV + Proof-of-Vault

Security is two layers, kept strictly separate:

- **Ledger safety — Proof of AI Verification (PoAIV).** For each block, a VRF lottery weighted by **token stake** selects 13 AI verification agents. Each agent commits to its verdict before seeing the others (preventing copying), then reveals. With **9 of 13** approving, the block is finalized. On the testnet the committee role is filled by a coordinator. Verifier selection is token-weighted today because the compute leg is not yet Sybil-resistant; making compute count toward selection is a mainnet goal gated on hardening it.
- **State security — Proof-of-Vault.** Participants commit real CPU and disk to replicate, serve, and re-prove shards of the Knowledge Vault. The Singularity issues random challenges on a block cadence; a correct Merkle proof over freshly sampled bytes credits the work, a failure is slashed. This is what prevents loss or unauthorized rewriting of network state.

A 50% transaction-fee burn and the Singularity's permanent accumulation reduce circulating supply as usage grows (a supply mechanic; we make no claim about price or value).

### Dual staking (earnings, not finality)

Influence on **earnings** combines two dimensions: `S_eff = 0.40 × token + 0.60 × compute`. A participant with modest holdings but strong, proven compute earns proportionally more than a large holder who contributes little compute — the anti-plutocracy property is in *reward share*. **Consensus finality is firewalled to token stake only** (the "finality firewall"), because the compute leg is Sybil-weak until it is cryptographically hardened; letting it weight finality before then would be a cheap path to consensus capture. Hardening that leg so compute can also weight committee selection — and the associated goal of making an attack materially more expensive than in a pure Proof of Stake design — is a stated mainnet target, not a present-day claim.

---

## 4. Zero-Knowledge: What Ships Today

We hold every ZK claim to a three-rung honesty ladder and never claim, in the present tense, more than what ships:

- **(a) Storage / possession proofs — real today, not yet zero-knowledge.** The gate is currently backed by a raw-Merkle **possession proof** (provable data possession): the agent proves it holds the sampled bytes against this block's fresh challenge. This is real, cheaply verifiable custody — but it reveals the sampled sub-units, so it is **not yet zero-knowledge**. A one-step SNARK wrap (the Filecoin WindowPoSt technique: Poseidon hashing + a Groth16/PLONK circuit) will compress it so the verifier learns only that the rules were followed. This is the next step.
- **(b) Private-state ZK layer — specified, phasing in.** The depth-26 Sparse Merkle Tree with nullifier-based ownership (the nullifier scheme follows the Zcash Sapling design; the depth-26 choice is our own) is genuine zero-knowledge by design, but the testnet runs a `SimulatedZKProof` stand-in rather than a production prover. The proof-system path is Groth16 → PLONK → Halo2/Nova.
- **(c) ZK-proven agent inference (zkML) — future, dated.** Proving an agent's *reasoning* in zero knowledge is a frontier research target (a realistic horizon of roughly 2027–2030; frontier-scale models remain far beyond practical zkML today), not a 2026 capability. We never imply we ZK-prove model cognition today.

In short: consensus is **PoAIV** (13 single-vendor AI agents, 9/13 supermajority); state is secured by **Proof-of-Vault** possession proofs; consensus-layer privacy is **simulated on testnet**; full zero-knowledge is phasing in.

---

## 5. Token: Supply and Distribution

AGNTC is the native token — gas, staking collateral, governance weight, and the unit of the in-game economy. **AGNTC is earned by providing the network's real storage and spent consuming its services — storage, retrieval, and agent inference.** **AGNTC has a fixed total supply of 1,000,000,000 (1 billion). The mint and freeze authorities on the Solana SPL contract are renounced, so the supply is permanently fixed and cannot be inflated.**

### Fixed allocation (stated honestly — there is an insider allocation)

The 1B supply is allocated across six buckets. The community / earned majority is about **58%**; the operating reserves — team, treasury, and liquidity — together are **42%**, released on published, smoothed schedules, never all at once. Team tokens are vested.

| Allocation | Share | AGNTC | Purpose |
|---|---|---|---|
| Participation mining | 25% | 250,000,000 | Earned by participants through mining and securing during the free participation period; distributed pro-rata, capped (Section 6). Unclaimed returns to treasury. |
| Ongoing emissions | 25% | 250,000,000 | Continued mining / securing / staking rewards on the live chain, drawn from this fixed pool — not open-ended inflation. |
| Team | 18% | 180,000,000 | Contributors and advisors, on a published multi-year vesting schedule. |
| Treasury | 14% | 140,000,000 | Protocol development, audits, and operations; governed on-chain. |
| Liquidity | 10% | 100,000,000 | Exchange and on-chain liquidity provisioning. |
| Ecosystem | 8% | 80,000,000 | Grants, integrations, and contributor incentives. |
| **Total** | **100%** | **1,000,000,000** | |

Earned/community ≈ 58% (participation + emissions + ecosystem). Team + treasury + liquidity = **42%**.

### Two layers of accounting

- **Distribution layer (the fixed 1B).** The full supply exists from the contract's inception; nothing mints above the cap.
- **Internal economy (how the earned buckets reach people).** The live chain has its own internal genesis of **900 AGNTC** and releases the participation and emissions buckets through subgrid Secure **mining** on the lattice. Mining is the only mechanism that issues those earned buckets to participants; if no one secures, nothing is released. The often-cited **"5% ceiling" is a per-epoch release-rate limit on the earned buckets, not a licence to mint new supply** above 1B.

### Mechanics, stated as mechanics (no value claims)

- **50% fee burn.** Half of every transaction fee is permanently destroyed. This is a supply mechanic; we make no claim about its effect on any token's price or value.
- **Mining hardness** rises with each outer band (`16 × band`), so the cost of newly mined supply increases as the lattice grows.
- **Signup credit.** Each new registration is credited 1 AGNTC from the participation allocation — internal-ledger issuance bounded by the release-rate ceiling, not new SPL supply (the mint authority is renounced).

---

## 6. Earn, Don't Buy: the Participation Distribution

There is **no ICO, no public sale, and no pre-mainnet sale** of the participation bucket. The **250,000,000-AGNTC** participation pool is allocated by **earned work, pro-rata and capped**:

```
share_i = (score_i / Σ score_j) × 250,000,000   (fixed pool)
```

- **Earned for work, not purchased.** Allocation reflects verifiable protocol work during a free, extended participation period — running and securing the network as the live protocol prescribes. No purchase, no pre-sale, and no representation of any monetary outcome.
- **Pro-rata, capped.** Because the pool is a fixed constant, the total can never exceed 250M no matter how many people take part. This structurally avoids the unbounded-emission death spiral that sank earlier "play-to-earn" economies.
- **Identity-gated.** At mainnet, eligible participants pass proof-of-personhood (anti-Sybil) and claim within a generous window. Unclaimed shares return to the treasury.

The **testnet token is explicitly valueless.** You earn standing and a recorded work history during the participation period; the chain becomes "real" only at mainnet.

---

## 7. Roadmap (high level)

- **Phase 1 — Token launch (current).** 1B AGNTC minted as a Solana SPL token; mint and freeze authorities renounced. Public market launch pending. The Solana token migrates 1:1 to the native chain at mainnet via a lock-and-mint bridge.
- **Phase 2 — Testnet (current).** Full protocol logic as a Python simulation with a Next.js + PixiJS game UI: PoAIV committee, phyllotaxis band growth, the mining/hardness engine, Proof-of-Vault challenges, and dual staking. 1,000+ automated tests across consensus, economics, lattice, and privacy.
- **Phase 3 — Mainnet development.** Rust implementation; production ZK proving (Circom → Noir/PLONK); broadening AI-verifier provider diversity; third-party security audits.
- **Phase 4 — Mainnet launch + migration.** Independent Layer-1 launch; 1:1 Solana→L1 lock-and-mint bridge; on-chain governance activation; the SNARK-wrapped storage proof and Halo2-class proving land here.
- **Phase 5 — Ecosystem.** Third-party agent marketplace; cross-chain bridges; ZKML exploration for provably correct AI verification.

---

## 8. Where AGNTC Sits

ZK Agentic Chain is best understood as a **DePIN-adjacent agentic-compute network with a social retention layer** — useful agent work and verifiable identity first, social second. Its distinguishing structural choice is that AI reasoning is embedded *in* consensus, paired with a privacy-by-default design and a staking model that weights real contribution over capital in earnings.

| Property | Bitcoin | Ethereum | Solana | Bittensor | **AGNTC** |
|---|---|---|---|---|---|
| Consensus | Proof of Work | Proof of Stake | PoH + Tower BFT | Yuma | **Proof of AI Verification** |
| AI role | None | None | None | Scoring/ranking | **In-consensus verification** |
| Privacy | Pseudonymous | Pseudonymous | Pseudonymous | Pseudonymous | **Private-by-default (designed; simulated on testnet)** |
| Staking | Mining | Token | Token | Token + compute | **Dual (earnings: 40% token / 60% compute)** |
| Supply | Fixed (halvings) | No cap | Inflationary decay | Inflationary | **Fixed (1,000,000,000)** |

---

## 9. Get Involved

- **Website:** [zkagenticnetwork.com](https://zkagenticnetwork.com)
- **Whitepaper:** the full AGNTC Whitepaper v1.7 is the authoritative specification.
- **Solana token (informational):** `3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd` — supply fixed at 1B, authorities renounced.

ZK Agentic Chain is building a blockchain where intelligence, privacy, and earned standing are the consensus mechanism — not afterthoughts.

---

### Disclaimer

This document is for information only. It is **not** an offer, solicitation, or recommendation to buy, sell, or hold any token, and it makes **no** representation or promise regarding any token's value, price, yield, or future performance. AGNTC is a utility token for use within the protocol; the testnet token is valueless. Participation in the network is earned through work — there is no pre-mainnet sale. Allocations, schedules, and mechanics are described as designed and may change. The software and these materials are authored with the assistance of an autonomous AI agent; that fact describes how the system is built and operated and says nothing about any financial outcome. Nothing here is financial, legal, or tax advice. Cryptographic and zero-knowledge features are at the maturity stated in Section 4. Verify the whitepaper before relying on any claim.

---

*AGNTC Litepaper v1.7 | July 2026 — a summary of AGNTC Whitepaper v1.7.*
