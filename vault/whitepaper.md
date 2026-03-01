# AGNTC Whitepaper v0.3

> ZK Agentic Chain: A Privacy-Preserving Blockchain with AI-Powered Verification
>
> Version 0.3 | March 2026 | Draft









AGNTC Whitepaper



ZK Agentic Chain: A Privacy-Preserving Blockchain with AI-Powered Verification






Download PDF









Version 0.3 . March 2026 . Draft











Contents


- [Abstract](#abstract)
- [Introduction](#introduction)
-
[Protocol Design](#protocol)

- [Proof of AI Verification](#poaiv)
- [Five-Layer Architecture](#architecture)
- [ZK Private Channels](#zk-channels)


-
[Consensus Mechanism](#consensus)

- [Commit-Reveal Verification](#commit-reveal)
- [BFT Ordering & Finality](#bft)


-
[Staking Model](#staking)

- [ZK-CPU Dual Staking](#dual-staking)
- [Reward Distribution](#rewards)
- [Slashing](#slashing)


-
[Token Economics](#tokenomics)

- [Supply & Distribution](#supply)
- [Organic Growth Model](#growth)
- [Fee Model & Burn](#fee-model)


- [Security Considerations](#security)
- [Related Work](#related)
- [References](#references)






## 1. Abstract



We present ZK Agentic Chain, a Layer-1 blockchain that replaces traditional proof-of-work hash computation and
pure proof-of-stake capital requirements with *Proof of AI Verification* (PoAIV) -- a novel consensus
mechanism in which AI agents verify chain integrity through zero-knowledge private channels. Validators stake
CPU compute alongside AGNTC tokens in a dual-staking model that weights computational contribution (60%) over
capital (40%), reducing plutocratic concentration [1].
The protocol employs isolated per-user ledger spaces, Sparse Merkle Trees (depth 26) with nullifier-based
privacy [2], and a commit-reveal
verification pipeline with BFT ordering [4].
AGNTC, the native token, has a fixed maximum supply of 1,000,000,000 units tied to a 31,623 x 31,623
coordinate grid; supply grows organically as coordinates are claimed, with no scheduled inflation. 50% of
transaction fees are burned. This paper describes the protocol architecture, consensus mechanism, staking model,
and token economics of ZK Agentic Chain.







## 2. Introduction



Existing blockchain consensus mechanisms face a trilemma between decentralization, security, and
scalability [8].
Proof-of-Work (PoW) systems like Bitcoin [1]
require specialized hardware (ASICs, GPUs), concentrating validation power among well-capitalized miners.
Proof-of-Stake (PoS) systems such as Ethereum [7]
replace energy expenditure with capital lockup but introduce wealth concentration, where the largest token
holders exert disproportionate influence over consensus.




Neither approach incorporates *intelligent reasoning* into the validation process. Validators in both
PoW and PoS execute deterministic checks -- verifying cryptographic signatures, checking state transitions
against predefined rules. No semantic understanding of transaction correctness is applied.




Furthermore, most public blockchains expose all transaction data, balances, and state transitions to every
participant. While projects like Zcash [2]
have introduced zero-knowledge proofs for transaction privacy, the verification layer itself remains non-private:
validators see the data they validate.




ZK Agentic Chain addresses these limitations with three design principles: (1) democratic
validation -- any CPU can participate as a verifier, with computational contribution weighted
above capital; (2) **intelligent verification** -- AI
agents [10] reason about chain
integrity rather than executing purely deterministic checks; (3) **verification-layer privacy**
-- agents operate within zero-knowledge private channels, proving correctness without exposing the
underlying data [6].







## 3. Protocol Design



### 3.1 Proof of AI Verification (PoAIV)



PoAIV selects a committee of *k* = 13 AI verification agents per block. Each agent independently
audits the proposed block's transactions, state transitions, and proof correctness. A block achieves
consensus when at least *t* = 9 of the 13 agents produce matching attestations (a 9/13
supermajority threshold).




Unlike deterministic validation, PoAIV agents apply *reasoning* to their verification --
examining logical consistency, cross-referencing state across ledger spaces, and flagging anomalous
patterns. This introduces an adaptive security layer that evolves with the AI models powering the agents.




PoAIV Consensus Rule:


valid(block) <=> |{ai : attest(ai, block) = true}| >= t, &nbsp; t = 9, &nbsp; k = 13




Agent selection follows a verifiable random function (VRF) weighted by effective stake (Section 5.1),
ensuring both randomness and proportional representation.






### 3.2 Five-Layer Architecture



The protocol is organized into five layers, each handling a distinct concern:




L1
User Layer
Wallets, transactions, and isolated per-user ledger spaces.


L2
Ledger Layer
Per-user record chains with UTXO-like state management, backed by Sparse Merkle Trees (depth 26).


L3
ZK Channel Layer
Zero-knowledge private channels between verification agents (Section 3.3).


L4
Agent Layer
AI verifier instances that audit transactions with reasoning, not just computation.


L5
Consensus Layer
BFT ordering combined with ZK proof finality (Section 4).




Each user's state is isolated in its own ledger space. Verification agents communicate only through ZK
channels -- they prove correctness of state transitions without exposing the underlying data to
other agents or to the network.






### 3.3 ZK Private Channels



ZK Agentic Chain implements verification-layer privacy through *ZK private channels* --
isolated communication pathways between AI agents where data is verified but never exposed in plaintext
to the broader
network [6].




Each ledger space maintains a Sparse Merkle Tree of depth 26, supporting 226 leaf nodes.
State transitions produce succinct zero-knowledge
proofs [5] that are verified
by the agent committee without requiring access to the underlying data. Nullifiers prevent double-spending
while preserving transaction
privacy [2].




This design provides *private-by-default* semantics: unlike public ledgers where privacy is
opt-in (e.g., shielded transactions in Zcash), all state in ZK Agentic Chain is private unless explicitly
published by the user.








## 4. Consensus Mechanism



### 4.1 Commit-Reveal Verification



Block verification follows a two-phase commit-reveal protocol to prevent attestation copying:



-
**Commit phase** (10s window): Each selected agent submits a
cryptographic commitment `H(attestation || nonce)` to the ordering node.

-
**Reveal phase** (20s window): Agents reveal their attestations
and nonces. The ordering node verifies that each reveal matches its commitment.




Agents that fail to reveal within the window forfeit their block reward and receive a liveness penalty.
The hard deadline for finalization is 60 seconds.






### 4.2 BFT Ordering & Finality



Transaction ordering uses a Byzantine Fault Tolerant
protocol [4] with a target
block time of 60 seconds. Blocks are organized into epochs of 100 slots each.




The protocol tolerates up to *f* = 4 Byzantine agents in each 13-agent committee
(floor((k-1)/3) = 4, with consensus threshold *t* = 9 > 2*f* + 1).
If fewer than 9 agents produce matching attestations, the block is rejected and re-proposed.




ZK proof finality is targeted at 20 seconds after block proposal. Once a block receives >= 9 matching
attestations and the corresponding ZK proofs are verified, it achieves irreversible finality.








## 5. Staking Model



### 5.1 ZK-CPU Dual Staking



ZK Agentic Chain introduces *dual staking*: validators must commit both AGNTC tokens and CPU
compute resources. The effective stake that determines committee selection probability and reward share
is a weighted combination:




Effective Stake Formula:


Seff = alpha . (Tstake / Ttotal) + beta . (Ccpu / Ctotal)


alpha = 0.40 (token weight), beta = 0.60 (CPU weight)




By setting beta > alpha, the protocol rewards computational contribution over capital. A validator
with modest token holdings but strong CPU resources earns proportionally more than a well-capitalized
validator with minimal compute. This design choice directly addresses the wealth concentration problem
inherent in pure PoS
systems [7].






### 5.2 Reward Distribution



Block rewards are split between verifiers and stakers:




Verifiers:
60%


Stakers:
40%




Verification rewards vest partially: 50% is liquid upon block confirmation, while the remaining 50%
vests linearly over 30 days. This vesting schedule aligns validator incentives with long-term network
health and discourages verification-and-dump behavior.



Mining yield at a given coordinate is determined by:



yield = BASE_RATE x density(x,y) x stake_weight / hardness(ring)


where density is a deterministic hash in [0,1] and hardness = 16 x ring






### 5.3 Slashing


The protocol enforces three slashing conditions:


- **False attestation:** Submitting a verification result that contradicts the supermajority consensus. Slashed tokens are burned.
- **False CPU attestation:** Claiming compute resources not actually committed. Detected via challenge-response VPU benchmarks.
- **Extended downtime:** Validators offline for more than one full epoch without notice enter a probationary period (3 epochs) before re-activation.



Dispute resolution uses a re-verification process with 2x the standard committee size (26 agents).
If the re-verification contradicts the original result, the original attestors are slashed.








## 6. Token Economics



### 6.1 Supply & Distribution



AGNTC has a fixed maximum supply of 1,000,000,000 (1 billion) tokens. The supply is intrinsically
linked to a 31,623 x 31,623 coordinate grid -- each grid cell yields exactly 1 AGNTC when
claimed. There is no pre-mine, no scheduled inflation, and no treasury allocation beyond the genesis supply.




Genesis supply is 900 AGNTC, distributed across 9 genesis nodes (1 origin + 4 faction masters + 4
diagonal homenodes), each claiming a 10x10 coordinate block (100 AGNTC per node).




The supply is distributed equally across four factions:




Community (Free Tier):
25%


Machines (AI Agents):
25%


Founders (Team):
25%


Professional (Paid Tier):
25%




Founder tokens are subject to a 4-year vesting schedule with a 12-month cliff. Machine faction
agents are hardcoded to never sell below acquisition cost, providing a price floor mechanism.






### 6.2 Organic Growth Model



Supply growth in ZK Agentic Chain is purely organic: new AGNTC enters circulation only when grid
coordinates are claimed through mining. There is no scheduled emission curve, no annual inflation
rate, and no algorithmic minting.




The grid expands through an epoch-ring system. Each epoch corresponds to a concentric ring around
the origin. Mining the required cumulative AGNTC threshold opens the next ring:




threshold(N) = 4 x N x (N + 1) cumulative AGNTC mined


N = ring number; each opened ring reveals new claimable coordinates




Mining difficulty increases proportionally with ring distance: hardness(ring) = 16 x ring.
This creates natural disinflation -- as the grid expands outward, each new AGNTC requires
proportionally more compute to mine, without any artificial halving schedule.






### 6.3 Fee Model & Burn



Every transaction on ZK Agentic Chain requires AGNTC as gas. Transaction fees are split:




Burned:
50%


Verifiers & Treasury:
50%




The 50% burn rate creates sustained deflationary pressure. As network usage grows, the burn rate
may exceed the mining rate, transitioning AGNTC to a net-deflationary asset. Slashed tokens
are also permanently burned.








## 7. Security Considerations



**Sybil resistance.** The dual-staking requirement (tokens + CPU)
makes Sybil attacks costly along two independent dimensions. An attacker must acquire both significant
AGNTC holdings and proportional compute resources.




**AI model integrity.** Verification agents run deterministic model
inference; the same input produces the same attestation. The commit-reveal protocol prevents agents from
copying others' attestations. Model updates follow governance votes to prevent unilateral changes.




**Privacy guarantees.** ZK
proofs [5] ensure that verification
produces a boolean result (valid/invalid) without exposing the underlying state. Nullifiers prevent replay
attacks. The Sparse Merkle Tree structure allows efficient membership proofs without revealing non-queried leaves.




**Liveness.** Safe mode activates when >20% of validators go
offline, suspending non-critical operations until >=80% recovery. This prevents liveness failures from
cascading into safety violations.




**Economic security.** The 9/13 supermajority threshold requires an
attacker to control >=69% of effective stake to unilaterally produce invalid blocks. Combined with
slashing, the cost of a sustained attack exceeds the potential gain.







## 8. Related Work



**Zero-knowledge blockchains.**
Zcash [2] pioneered the use of
zk-SNARKs for transaction privacy. Mina Protocol uses recursive SNARKs for constant-size blockchain proofs.
Aleo implements program-level privacy with zk execution. ZK Agentic Chain differs by applying ZK proofs to
the *verification layer* -- not just transactions but the entire validation process operates
within private channels.




**AI and blockchain.** Projects like Bittensor, Fetch.ai, and
SingularityNET integrate AI with blockchain for model training or agent coordination. ZK Agentic Chain is
distinct in using AI agents as *consensus participants* rather than application-layer services.
The AI is embedded in the consensus mechanism itself.




**CPU-friendly consensus.** Monero uses RandomX, a CPU-friendly PoW
algorithm, to democratize mining. ZK Agentic Chain goes further by combining CPU contribution with token
staking in a dual model, and replacing hash computation with AI verification.




**Decentralized storage.**
Filecoin [9] pioneered
proof-of-storage for decentralized file systems. ZK Agentic Chain incorporates storage as one of four
sub-cell types in its grid system, allowing validators to earn rewards for data persistence alongside
computation.







## 9. References


-
[1]
Nakamoto, S. (2008). Bitcoin: A Peer-to-Peer Electronic Cash System. [https://bitcoin.org/bitcoin.pdf](https://bitcoin.org/bitcoin.pdf)

-
[2]
Ben-Sasson, E., Chiesa, A., Garman, C., Green, M., Miers, I., Tromer, E., & Virza, M. (2014). Zerocash: Decentralized Anonymous Payments from Bitcoin. IEEE S&P. [https://doi.org/10.1109/SP.2014.36](https://doi.org/10.1109/SP.2014.36)

-
[3]
Yakovenko, A. (2018). Solana: A new architecture for a high performance blockchain. [https://solana.com/solana-whitepaper.pdf](https://solana.com/solana-whitepaper.pdf)

-
[4]
Castro, M., & Liskov, B. (1999). Practical Byzantine Fault Tolerance. OSDI. [https://pmg.csail.mit.edu/papers/osdi99.pdf](https://pmg.csail.mit.edu/papers/osdi99.pdf)

-
[5]
Groth, J. (2016). On the Size of Pairing-Based Non-Interactive Arguments. EUROCRYPT. [https://doi.org/10.1007/978-3-662-49896-5_11](https://doi.org/10.1007/978-3-662-49896-5_11)

-
[6]
Goldwasser, S., Micali, S., & Rackoff, C. (1989). The Knowledge Complexity of Interactive Proof Systems. SIAM J. Computing, 18(1), 186-208. [https://doi.org/10.1137/0218012](https://doi.org/10.1137/0218012)

-
[7]
Buterin, V. (2014). Ethereum: A Next-Generation Smart Contract and Decentralized Application Platform. [https://ethereum.org/en/whitepaper/](https://ethereum.org/en/whitepaper/)

-
[8]
Bonneau, J., Miller, A., Clark, J., Narayanan, A., Kroll, J. A., & Felten, E. W. (2015). SoK: Research Perspectives and Challenges for Bitcoin and Cryptocurrencies. IEEE S&P. [https://doi.org/10.1109/SP.2015.14](https://doi.org/10.1109/SP.2015.14)

-
[9]
Protocol Labs. (2017). Filecoin: A Decentralized Storage Network. [https://filecoin.io/filecoin.pdf](https://filecoin.io/filecoin.pdf)

-
[10]
Anthropic. (2024). Claude 3 Model Card. [https://www.anthropic.com](https://www.anthropic.com)







AGNTC Whitepaper v0.3 . Draft . March 2026



Solana Mainnet Contract:
[3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd](https://solscan.io/token/3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd)



&copy; 2026 ZK Agentic Chain. All rights reserved.







