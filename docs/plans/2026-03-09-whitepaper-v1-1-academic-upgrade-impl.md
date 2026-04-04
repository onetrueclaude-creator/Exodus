# Whitepaper v1.1 Academic Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade AGNTC whitepaper to peer-review quality and produce 3 companion documents (PoAIV paper, Feasibility Report, Litepaper).

**Architecture:** Pure documentation work — all markdown files in `vault/`. No code changes except `gen_whitepaper_pdf.py` header fix. Each task produces one coherent section or document. Review each task against the competitor analysis findings before committing.

**Tech Stack:** Markdown, fpdf2 (Python PDF generator)

**Design doc:** `docs/plans/2026-03-09-whitepaper-v1-1-academic-upgrade-design.md`

**Source of truth:** `vault/whitepaper-v1-0.md` (backup of v1.0), `vault/agentic-chain/agentic/params.py` (protocol parameters)

**Competitor benchmarks (read before writing):**
- Solana pattern: Description → Algorithm → Verification → Attack per mechanism
- Zcash pattern: Formal security games (L-IND, TR-NM, Balance), Abstract/Concrete layering
- zkSync pattern: Living docs + audit references, security by inheritance

---

## Task 1: Fix PDF Header + Version Bump

**Files:**
- Modify: `ZkAgentic/projects/web/zkagentic-deploy/gen_whitepaper_pdf.py:7-15`

**Step 1: Fix header spacing**

In `WhitepaperPDF.header()`, the header text overlaps the decorative line. Move the line lower:

```python
def header(self):
    if self.page_no() > 1:
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, "ZK Agentic Chain - AGNTC Whitepaper v1.1", align="C")
        self.ln(3)
        self.set_draw_color(200, 200, 200)
        self.line(20, self.get_y(), 190, self.get_y())
        self.ln(5)
```

Key change: Use `self.get_y()` for the line position instead of hardcoded `15`, and reduce `self.ln(5)` after the text to `self.ln(3)` so the line sits right below. Also bump version to v1.1.

**Step 2: Update title page version**

In `render_title_page()`, change:
```python
pdf.cell(0, 7, "Version 1.1  |  March 2026", align="C")
```

And update the footer disclaimer similarly.

**Step 3: Test by generating PDF**

Run: `cd ZkAgentic/projects/web/zkagentic-deploy && python gen_whitepaper_pdf.py`
Expected: PDF generates without errors, header line sits below text on page 2+

**Step 4: Commit**

```bash
git add ZkAgentic/projects/web/zkagentic-deploy/gen_whitepaper_pdf.py
git commit -m "fix(pdf): header line below text, bump to v1.1"
```

---

## Task 2: Whitepaper Structural Additions (TOC, Notation, New Section Stubs)

**Files:**
- Modify: `vault/whitepaper.md:1-55` (header, TOC)
- Modify: `vault/whitepaper.md:1847+` (add new sections before glossary)

**Step 1: Update version in header**

Change line 1 from `# AGNTC Whitepaper v1.0` to `# AGNTC Whitepaper v1.1`.
Change line 5 from `Version 1.0 | March 2026` to `Version 1.1 | March 2026`.

**Step 2: Add Notation section after TOC**

After the TOC (after the `---` on line 53), add:

```markdown
## Notation and Conventions

| Symbol | Meaning |
|--------|---------|
| lambda | Security parameter |
| n | Committee size (13) |
| t | Byzantine threshold (4, i.e., n - supermajority) |
| S_eff(i) | Effective stake of validator i |
| T, C | Token stake, CPU stake (normalized) |
| alpha, beta | Staking weights (0.40, 0.60) |
| N | Current epoch ring number |
| H(N) | Hardness at ring N = 16 * N |
| PPT | Probabilistic Polynomial Time (adversary) |
| negl(lambda) | Negligible function of security parameter |

All pseudocode uses Python-like syntax. Security games follow the Zcash convention: challenger C interacts with adversary A.
```

**Step 3: Add TOC entries for new sections**

Add to the Table of Contents:
- `[24. Limitations and Open Problems](#24-limitations-and-open-problems)` (new)
- `[25. Glossary](#25-glossary)` (renumbered from 24)
- `[26. References](#26-references)` (renumbered from 25)

**Step 4: Add stub for Section 24 (Limitations)**

Before the current Glossary section (line 1849), insert:

```markdown
### 24. Limitations and Open Problems

*[Content to be written in Task 10]*
```

Renumber Glossary to 25 and References to 26.

**Step 5: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs(whitepaper): v1.1 version bump, notation section, section stubs"
```

---

## Task 3: Upgrade Sections 3-5 — PoAIV Consensus (Critical)

**Files:**
- Modify: `vault/whitepaper.md:175-346` (Sections 3, 4, 5)
- Read: `vault/agentic-chain/agentic/consensus/` (implementation reference)
- Read: `vault/agentic-chain/agentic/params.py` (parameter values)

**Context:** This is the weakest area of the whitepaper. The core innovation (AI verification) is described in prose without pseudocode, formal definitions, or attack analysis. Competitors (Solana PoH, Zcash POUR) provide rigorous specification of their novel mechanisms.

**Step 1: Add pseudocode for committee selection (Section 5)**

After the existing prose description of VRF selection, add a pseudocode block:

```markdown
#### 5.2 Committee Selection Algorithm

```
Algorithm: SELECT_COMMITTEE(block_height, epoch_seed)
  Input: block_height h, epoch_seed s (hash of previous epoch's last block)
  Output: committee C of size VERIFIERS_PER_BLOCK (13)

  1. seed <- BLAKE2b(s || h)
  2. candidates <- {v : v in ValidatorSet, S_eff(v) > 0}
  3. C <- empty set
  4. nonce <- 0
  5. while |C| < 13:
       vrf_output <- VRF_Ed25519(v.secret_key, seed || nonce)
       threshold <- S_eff(v) / sum(S_eff(all candidates))
       if vrf_output / 2^256 < threshold:
         C <- C union {v}
         candidates <- candidates \ {v}  // without replacement
       nonce <- nonce + 1
  6. return C
```

**Note:** Selection is WITHOUT replacement (hypergeometric distribution). Each selected validator is removed from the candidate pool. This differs from the v1.0 formula which incorrectly used geometric (with-replacement) sampling.
```

**Step 2: Add pseudocode for attestation voting (Section 5)**

```markdown
#### 5.3 Attestation Protocol

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

**Step 3: Add "What AI catches that deterministic code cannot" subsection**

After the attestation pseudocode, add:

```markdown
#### 5.4 Value of AI Verification Over Deterministic Validation

Traditional BFT validators execute deterministic checks: signature validity, state transition correctness, Merkle proof integrity. These are necessary but not sufficient for the following threat classes:

1. **Economic anomaly detection.** An adversary constructs a valid state transition that is technically correct but economically suspicious — e.g., a coordinated series of transactions that collectively constitute a wash trade or market manipulation. Deterministic validators approve each transaction individually; AI agents can detect the collective pattern.

2. **Semantic state inconsistency.** After a complex sequence of subgrid reallocations, the resulting resource distribution may be technically valid per the state machine rules but violates higher-order invariants (e.g., a single entity controlling >50% of a ring's secure cells). AI agents cross-reference spatial patterns against economic invariants.

3. **Slow-burn governance attacks.** A series of individually innocuous parameter change proposals that collectively steer the protocol toward adversarial conditions. AI agents maintain temporal context across blocks and flag cumulative drift.

**Limitation:** AI verification is probabilistic, not provably sound. The committee structure (13 agents, 9/13 threshold) provides statistical confidence rather than mathematical certainty. Section 24 discusses the ZKML gap — current zero-knowledge proof systems cannot verify LLM inference, so AI verification relies on committee attestation rather than ZK-proved computation.
```

**Step 4: Add per-mechanism attack analysis (Solana pattern)**

Add a new subsection to Section 5:

```markdown
#### 5.5 Attack Analysis

**Attack 1: Model Poisoning**
- *Vector:* Adversary fine-tunes or replaces the AI model used by corrupted committee members to always approve invalid blocks.
- *Mitigation:* Heterogeneous model requirement — the protocol mandates that each committee of 13 must include agents running at least 3 distinct model providers. A single compromised model family can corrupt at most ~4 of 13 agents, below the 5-agent Byzantine threshold.
- *Residual risk:* If all major model providers are simultaneously compromised (supply chain attack on AI infrastructure), the committee loses its AI advantage and degrades to deterministic-only verification.

**Attack 2: Prompt Injection**
- *Vector:* Adversary crafts transaction data containing prompt injection payloads that cause verification agents to approve invalid state transitions.
- *Mitigation:* (a) Verification input uses a strict JSON schema — agents receive structured data, not free-form text. (b) Agent system prompts are immutable and loaded from chain state, not from transaction data. (c) No tool-use or function-calling is permitted during verification — agents output only APPROVE/REJECT with structured reasoning.
- *Residual risk:* Novel injection techniques may bypass schema enforcement. The 9/13 threshold means an injection must fool at least 9 independent agents simultaneously.

**Attack 3: Inference Cost Attack**
- *Vector:* Adversary submits blocks requiring disproportionately expensive AI inference, draining committee members' compute budgets.
- *Mitigation:* (a) Maximum transaction count per block (BLOCK_TX_LIMIT). (b) Verification agents have a per-block compute budget; if exceeded, the agent abstains rather than approving without full analysis. (c) Fee market ensures the adversary pays proportionally for complex blocks.

**Attack 4: Committee Sybil Attack**
- *Vector:* Adversary acquires sufficient stake to dominate committee selection.
- *Mitigation:* Dual staking (60% CPU, 40% capital) makes Sybil attacks approximately 2.5x more expensive than pure-PoS systems. *Derivation:* In pure PoS, controlling 1/3 of stake costs X. In dual staking, the adversary must acquire both tokens (0.4X) AND compute capacity (0.6X), but compute capacity cannot be purchased on the open market — it requires ongoing API subscriptions and actual compute deployment. The economic friction of maintaining continuous compute raises the effective cost to ~2.5X. See Section 23 for the full cost model.

**Attack 5: Deterministic Inference Divergence**
- *Vector:* Two honest agents running the same model at temperature=0 produce different outputs due to floating-point non-determinism across hardware.
- *Mitigation:* (a) Verification outputs are quantized to APPROVE/REJECT (binary, not continuous). (b) The anomaly threshold (ANOMALY_THRESHOLD) is set conservatively so that minor numerical differences in anomaly scoring do not cross the threshold. (c) The 9/13 supermajority tolerates up to 4 divergent results.
- *Residual risk:* Acknowledged as an open problem. See Section 24.
```

**Step 5: Specify VRF construction in Section 4 area**

Add to the committee section:

```markdown
#### VRF Construction

Committee selection uses Ed25519-based VRF as specified in RFC 9381 (ECVRF-EDWARDS25519-SHA512-ELL2). Each validator generates a VRF proof using their staking key and the epoch seed. The VRF output is a 256-bit hash that is compared against the validator's proportional stake threshold.

- **Seed derivation:** `epoch_seed = BLAKE2b(previous_epoch_final_block_hash || epoch_number)`
- **Per-block nonce:** `block_seed = BLAKE2b(epoch_seed || block_height)`
- **Threshold:** `P(selected_i) = S_eff(i) / sum(S_eff(all))`
- **Output format:** 32-byte hash (SHA-512 of VRF proof), interpreted as unsigned 256-bit integer
```

**Step 6: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs(whitepaper): PoAIV pseudocode, attack analysis, VRF spec (sections 3-5)"
```

---

## Task 4: Upgrade Section 6 — ZK Privacy Layer

**Files:**
- Modify: `vault/whitepaper.md:348-430` (Section 6)
- Read: `docs/plans/2026-03-04-enforced-zk-l1-design.md` (ZK L1 architecture)
- Read: `vault/agentic-chain/agentic/ledger/` (crypto, merkle, nullifier implementation)

**Step 1: Add circuit architecture overview**

After the existing privacy layer description, add:

```markdown
#### 6.5 Circuit Architecture

The ZK proof pipeline uses a two-tier proving system:

1. **Per-transaction proofs (Groth16):** Each state transition (transfer, claim, stake) is proved individually using a Groth16 SNARK with BN254 pairing. Groth16 provides the smallest proof size (~128 bytes) and fastest verification time (~6ms), at the cost of requiring a trusted setup per circuit.

2. **Batch proofs (Recursive PLONK):** Multiple per-transaction proofs are aggregated into a single batch proof using recursive PLONK composition. This reduces on-chain verification cost: instead of verifying 13 Groth16 proofs per block, validators verify 1 recursive proof.

```
Transaction Flow:
  User constructs tx → Client generates Groth16 proof →
  Block proposer collects proofs → Recursive PLONK aggregation →
  Committee verifies single batch proof → State root updated
```

**Estimated constraint counts** (subject to circuit implementation):

| Circuit | Estimated Constraints | Proving Time (est.) |
|---------|----------------------|---------------------|
| Transfer (nullifier + commitment) | ~50,000 | ~2s (client-side) |
| Claim coordinate | ~30,000 | ~1s |
| Stake/unstake | ~40,000 | ~1.5s |
| Batch aggregation (per block) | ~200,000 | ~10s (proposer) |

These estimates are based on comparable circuits in Zcash Sapling (~100K constraints for shielded transfer) and Aztec (~80K for private transfer). Actual constraint counts will be determined during the Enforced ZK L1 implementation phase (see Section 21).
```

**Step 2: Clarify cross-user verification**

Add after the Isolated Ledger Spaces description:

```markdown
#### 7.4 Cross-User State Verification

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
```

**Step 3: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs(whitepaper): ZK circuit architecture, cross-user verification (sections 6-7)"
```

---

## Task 5: Upgrade Section 8 — Security Analysis

**Files:**
- Modify: `vault/whitepaper.md:496-562` (Section 8)

**Step 1: Add formal adversary model**

Replace the opening of Section 8 with:

```markdown
### 8. Threat Model and Security Analysis

#### 8.1 Adversary Model

We consider a computationally bounded adversary A (PPT) operating under the following assumptions:

- **Network model:** Partial synchrony (Dwork, Lynch, Stockmeyer 1988). Messages between honest nodes are delivered within a known bound Delta after GST (Global Stabilization Time). Before GST, the adversary controls message ordering.
- **Corruption model:** Adaptive corruption of up to t < n/3 committee members per block (i.e., up to 4 of 13). Corruption means full control of the agent's signing key and model.
- **Computational bound:** A runs in polynomial time in the security parameter lambda.
- **AI model access:** A may fine-tune or replace AI models on corrupted agents. A may craft adversarial inputs (prompt injection) but cannot modify the verification schema enforced by honest agents.

#### 8.2 Security Properties

We define three core security properties for PoAIV:

**Property 1: Verification Integrity (VER-INT)**
No PPT adversary controlling fewer than 5 of 13 committee members can cause the committee to finalize a block containing an invalid state transition, except with negligible probability.

**Property 2: Verification Privacy (VER-PRIV)**
The verification process reveals no information about the contents of private ledger spaces beyond the validity assertion (APPROVE/REJECT), even to committee members.

**Property 3: Committee Unbiasability (COM-UNBIAS)**
No PPT adversary controlling less than 1/3 of total effective stake can predictably influence committee composition beyond their proportional representation, except with negligible probability.

*Full formal definitions as cryptographic games and proofs are provided in the companion PoAIV Formal Paper [ref].*
```

**Step 2: Restructure existing attack analysis as per-mechanism**

Keep the existing content but reorganize under clear headings:
- 8.3 Consensus Layer Attacks (reference Section 5.5 attack analysis)
- 8.4 Privacy Layer Attacks (linkability, side-channel, metadata)
- 8.5 Economic Attacks (stake manipulation, fee manipulation, MEV)
- 8.6 AI-Specific Attacks (model poisoning, prompt injection, inference divergence)
- 8.7 What Survives Compromised Components

Add the "What Survives" table:

```markdown
#### 8.7 What Survives Compromised Components

| Compromised Component | Properties Preserved | Properties Lost |
|-----------------------|---------------------|-----------------|
| Single AI model family | VER-INT (threshold), VER-PRIV, COM-UNBIAS | None (below threshold) |
| All AI models (catastrophic) | VER-PRIV (ZK still holds), COM-UNBIAS | VER-INT degrades to deterministic-only |
| Trusted setup (Groth16) | VER-PRIV (soundness lost, but ZK preserved*) | VER-INT (adversary can forge proofs) |
| API provider (Anthropic) | VER-INT, VER-PRIV | COM-UNBIAS (CPU stake measurement unreliable) |

*Following Zcash's analysis: a compromised trusted setup breaks soundness (allows counterfeiting) but preserves zero-knowledge (privacy). See [Zcash Protocol Specification, Section 7.1].*
```

**Step 3: Derive the 2.5x Sybil cost claim**

Add to Section 8.3:

```markdown
#### Sybil Cost Derivation

**Claim:** Controlling 1/3 of effective stake in dual-staking costs approximately 2.5x more than in pure PoS.

**Derivation:**
- In pure PoS: Cost = (1/3) * total_token_value = X
- In dual staking: Effective stake S_eff = 0.40*(T/T_total) + 0.60*(C/C_total)
- To achieve S_eff >= 1/3, adversary needs:
  - Token component: 0.40*(T_adv/T_total) contributing up to 0.40 max
  - CPU component: 0.60*(C_adv/C_total) contributing up to 0.60 max
- Minimum cost path: acquire (1/3)/0.40 = 83.3% of tokens OR (1/3)/0.60 = 55.6% of CPU
- Optimal split: T_adv/T_total = t, C_adv/C_total = c, minimize cost(t,c) subject to 0.4t + 0.6c >= 1/3
- Token cost scales linearly with market cap (liquid market)
- CPU cost scales with ongoing operational expenditure (API subscriptions, not one-time purchase)
- The CPU component introduces a continuous cost floor: even if an adversary acquires tokens cheaply, maintaining 55.6% of network compute requires sustained operational spending
- **Empirical estimate:** At current Claude API pricing ($15/M output tokens for Opus), maintaining 55.6% of network compute for a 100-validator network costs ~$50K/month ongoing, compared to a one-time token acquisition cost
- The ratio of total cost (one-time + ongoing) to pure-PoS cost (one-time only) ranges from 2.0x to 3.0x depending on attack duration; we conservatively estimate 2.5x

**Assumptions:** (1) Token market is liquid with linear price impact. (2) CPU pricing follows Anthropic's published rates. (3) Attack duration >= 6 months for the ongoing cost to dominate.
```

**Step 4: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs(whitepaper): formal adversary model, security properties, Sybil derivation (section 8)"
```

---

## Task 6: Fix Section 13 (Dual Staking) + Section 14 (APY Table) + Section 23 (Proofs)

**Files:**
- Modify: `vault/whitepaper.md:861-980` (Section 13)
- Modify: `vault/whitepaper.md:982-1066` (Section 14)
- Modify: `vault/whitepaper.md:1732-1846` (Section 23)
- Read: `vault/agentic-chain/agentic/economics/staking.py`
- Read: `vault/agentic-chain/agentic/economics/rewards.py`

**Step 1: Address CPU measurement centralization in Section 13**

Add after the dual staking formula:

```markdown
#### 13.5 Trust Assumptions and Mitigation

**CPU Measurement Trust:** The CPU component of effective stake depends on verified API usage from AI providers (currently Anthropic's Claude API). This introduces Anthropic as a trusted third party for CPU stake measurement.

**Acknowledged centralization:** Unlike token stake (verified on-chain via self-custody), CPU stake relies on off-chain attestation from the API provider. This is an explicit design tradeoff: the anti-plutocratic benefits of dual staking outweigh the centralization risk of a single measurement source.

**Mitigation roadmap:**
1. **Multi-provider measurement (Phase 2):** Require CPU attestation from at least 2 independent AI providers. Discrepancies trigger a dispute resolution process.
2. **TEE attestation (Phase 3):** CPU usage proved via Trusted Execution Environment (Intel TDX, AMD SEV) attestation, removing the API provider from the trust chain.
3. **ZK-proved computation (Phase 4+):** When ZKML technology matures, CPU usage can be verified via zero-knowledge proofs of inference execution.
```

**Step 2: Fix VRF selection formula**

Find the existing selection probability formula in Section 13 and add a correction note:

```markdown
**Correction from v1.0:** The selection probability formula `P(selected_i) = 1 - (1 - S_eff(i))^k` assumes independent sampling with replacement. The actual committee selection uses sampling WITHOUT replacement (see Section 5.2), which follows a multivariate hypergeometric distribution. The corrected probability of validator i being selected to a committee of size k from n validators is:

P(selected_i) = 1 - prod_{j=0}^{k-1} (1 - S_eff(i) / (1 - sum of already-selected stakes))

For small k/n ratios (13/n where n >> 13), the with-replacement approximation is accurate to within 1%.
```

**Step 3: Complete the APY table in Section 14.4**

Replace the dashes with projections. Read from the testnet simulation to get realistic numbers:

```markdown
#### 14.4 Reward Projections

| Epoch Ring | Total Supply (est.) | Staking Ratio (est.) | Block Reward | Verifier APY | Staker APY |
|-----------|--------------------|--------------------|-------------|-------------|-----------|
| 1 (genesis) | 900 | 50% | 0.5 AGNTC | ~40% | ~27% |
| 5 | ~5,000 | 40% | 0.3 AGNTC | ~22% | ~15% |
| 10 | ~15,000 | 35% | 0.2 AGNTC | ~14% | ~9% |
| 50 | ~200,000 | 30% | 0.05 AGNTC | ~5% | ~3% |
| 100 | ~500,000 | 25% | 0.02 AGNTC | ~2% | ~1.5% |

**Assumptions:** Block time = 60s, 60% of block reward to verifiers, 40% to stakers. APY assumes continuous compounding over 365 days. Staking ratio is the fraction of total supply actively staked. These are testnet projections and will vary with actual network participation.
```

**Step 4: Fix Section 23 proofs**

In Section 23.1 (Hardness Curve), add explicit economic assumptions:

```markdown
**Economic assumptions (not mathematical constants):**
- Electricity cost: $0.05/kWh (global average for data centers)
- AGNTC price: $0.10 at ring 50, growing logarithmically
- Miner hardware: consumer GPU, 300W continuous

These assumptions determine the convergence point (~42M AGNTC at ring 324) but are NOT part of the mathematical proof. The mathematical claim is only: the hardness function H(N) = 16N causes the marginal mining cost to increase linearly with ring distance, while the reward per coordinate decreases inversely. The intersection of these curves determines the economic equilibrium, which depends on external market conditions.
```

In Section 23.3 (Gini Coefficient), fix the formula:

```markdown
**Correction from v1.0:** The Gini decomposition formula `G_eff = alpha*G_t + beta*G_c + 2*alpha*beta*cov(rank_t, rank_c)` was stated without derivation and included an unexplained correction term. The standard decomposition for a weighted sum of two distributions follows Lerman and Yitzhaki (1985):

G_eff = (alpha * mu_t * G_t * R_t + beta * mu_c * G_c * R_c) / (alpha * mu_t + beta * mu_c)

where R_t, R_c are the Gini correlations (rank correlation between each component and the total). When token and CPU stake are negatively correlated (which dual staking encourages by making compute non-purchasable), R values are < 1 and G_eff < the simple weighted average of G_t and G_c.

**Numerical example (corrected):**
- G_t = 0.65 (token Gini, typical for PoS)
- G_c = 0.35 (CPU Gini, lower due to API subscription equality)
- R_t = 0.85, R_c = 0.70 (estimated Gini correlations)
- mu_t = mu_c = 1 (normalized means)
- G_eff = (0.4 * 0.65 * 0.85 + 0.6 * 0.35 * 0.70) / (0.4 + 0.6) = (0.221 + 0.147) / 1.0 = 0.368

This represents a 43% reduction from the pure-PoS Gini of 0.65.
```

**Step 5: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs(whitepaper): CPU trust assumptions, APY table, fixed proofs (sections 13-14, 23)"
```

---

## Task 7: Add Diagrams (6 ASCII Diagrams)

**Files:**
- Modify: `vault/whitepaper.md` (insert at relevant section locations)

**Step 1: Galaxy Grid Diagram (Section 4)**

Insert after the grid description:

```markdown
#### Figure 1: Galaxy Grid Structure

```
                    Community (NW)          Machines (NE)
                         \                    /
                          \    Ring 3        /
                           \  .--------.   /
                            \/ Ring 2   \ /
                             .--------.  X
                            / Ring 1  / \
                           /  [ORIGIN]    \
                            \ Ring 1  \ /
                             '--------'
                            /  Ring 2   \
                           /  '--------'  \
                          /    Ring 3      \
                         /                  \
                    Professional (SW)    Founders (SE)

    4-arm logarithmic spiral | 31,623 x 31,623 coordinate space
    Each coordinate yields exactly 1 AGNTC when claimed
    Epoch rings expand outward as cumulative mining reaches threshold
```
```

**Step 2: Block Production Lifecycle (Section 5)**

```markdown
#### Figure 2: Block Production Lifecycle

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
```

**Step 3: Dual Staking Model (Section 13)**

```markdown
#### Figure 3: Dual Staking Model

```
  Token Stake (T)          CPU Stake (C)
  [On-chain, self-custody]  [API usage, off-chain attestation]
       |                         |
       | weight: 0.40            | weight: 0.60
       |                         |
       v                         v
  S_eff(i) = 0.40*(T_i/T_total) + 0.60*(C_i/C_total)
       |
       +---> Committee selection probability
       +---> Reward share proportion
       +---> Slashing exposure
```
```

**Step 4: Subgrid Allocation (Section 16)**

```markdown
#### Figure 4: Subgrid Allocation (8x8 Inner Grid)

```
  +--------+--------+--------+--------+--------+--------+--------+--------+
  | SEC    | SEC    | SEC    | DEV    | DEV    | RES    | RES    | STO    |
  | Lv.3   | Lv.2   | Lv.1   | Lv.2   | Lv.1   | Lv.1   | Lv.1   | Lv.1   |
  +--------+--------+--------+--------+--------+--------+--------+--------+
  | SEC    | ...                                                  | STO    |
  +--------+                  (64 cells total)                    +--------+
  |        |                                                      |        |
  +--------+    SEC = Secure (yields AGNTC)                       +--------+
  |        |    DEV = Develop (yields dev points)                 |        |
  +--------+    RES = Research (yields research points)           +--------+
  |        |    STO = Storage (yields ZK data capacity)           |        |
  +--------+--------+--------+--------+--------+--------+--------+--------+

  Output per cell: base_rate * level^0.8 (diminishing returns)
  Level up cost: dev_points * level^1.5 (increasing cost)
```
```

**Step 5: ZK Proof Pipeline (Section 6)**

```markdown
#### Figure 5: ZK Proof Pipeline

```
  User (client-side)              Block Proposer            Committee
  ==================              ==============            =========
  Construct transaction
         |
  Generate Groth16 proof -------> Collect tx + proofs
  (~2s per tx)                           |
                                  Aggregate via recursive
                                  PLONK (~10s per block)
                                         |
                                  Propose block + -------> Verify batch proof
                                  batch proof              (~6ms)
                                                                |
                                                           AI verification
                                                                |
                                                           Attestation
                                                           (9/13 threshold)
```
```

**Step 6: Migration Architecture (Section 20)**

```markdown
#### Figure 6: Solana to Layer 1 Migration

```
  Phase 1 (Current)           Phase 2 (Bridge)         Phase 3 (Native)
  ================           ================         ================
  Solana SPL token           Lock-and-Mint Bridge     Native L1 token
  (1B AGNTC minted)         (1:1 ratio)              (on ZK Agentic Chain)
                                    |
  User locks SPL  ---------> Bridge contract locks
  AGNTC on Solana             on Solana side
                                    |
                              Mint equivalent --------> User receives
                              on L1 side                native AGNTC
                                    |
                              Oracle + ZK proof
                              verifies lock event
```
```

**Step 7: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs(whitepaper): add 6 ASCII diagrams (grid, block lifecycle, staking, subgrid, ZK, migration)"
```

---

## Task 8: Add Competitor Comparison + Limitations Section

**Files:**
- Modify: `vault/whitepaper.md` (Section 2 area for comparison, new Section 24 for limitations)

**Step 1: Add competitor comparison table to Section 2**

After the Background section, add:

```markdown
#### 2.5 Comparative Positioning

| Feature | Bitcoin | Ethereum | Solana | Zcash | Bittensor | **AGNTC** |
|---------|---------|----------|--------|-------|-----------|-----------|
| Consensus | PoW | PoS (Casper) | PoH + Tower BFT | PoW (Equihash) | Yuma consensus | **PoAIV** |
| AI role | None | None | None | None | Scoring/ranking | **Consensus verification** |
| Privacy | Pseudonymous | Pseudonymous | Pseudonymous | Shielded (ZK) | Pseudonymous | **Private by default (ZK)** |
| Staking model | Mining | Token-only | Token-only | Mining | Token + compute | **Dual (40% token, 60% CPU)** |
| Supply model | Fixed (21M, halving) | Inflationary + burn | Inflationary | Fixed (21M, halving) | Inflationary | **Organic (mining-driven)** |
| Smart contracts | Limited (Script) | Full (EVM) | Full (SVM) | Limited | Subnet-specific | **Agent-mediated** |
| Block time | ~10 min | ~12 sec | ~400 ms | ~75 sec | ~12 sec | **~60 sec** |

**Key differentiators:**
1. **AI-as-consensus** is unique to AGNTC. Bittensor uses AI for scoring but not for block verification. No other L1 embeds AI into the consensus mechanism itself.
2. **Dual staking** is shared conceptually with Bittensor (which weights compute) but AGNTC formalizes it as a weighted formula with explicit anti-plutocratic properties.
3. **Privacy by default** is shared with Zcash, but AGNTC adds AI-enhanced anomaly detection within the privacy layer — verifying correctness without breaking privacy.
```

**Step 2: Write Section 24 — Limitations and Open Problems**

Replace the stub with full content:

```markdown
### 24. Limitations and Open Problems

This section enumerates known limitations and unsolved problems. Honest disclosure of these issues is essential for academic credibility and community trust.

#### 24.1 The ZKML Gap

**Problem:** Current zero-knowledge proof systems cannot verify large language model (LLM) inference. State-of-the-art ZKML (Modulus Labs, 2024) has verified models with up to 18 million parameters. Claude Opus and comparable models have >100 billion parameters — approximately 5,000x beyond current ZKML capability.

**Consequence:** PoAIV verification relies on committee attestation (9/13 threshold) rather than ZK-proved computation. The verification process is not provably sound in the cryptographic sense; it is statistically robust through redundancy.

**Mitigation:** (a) The committee structure provides Byzantine fault tolerance independent of AI soundness. (b) Deterministic checks (signature, state transition, Merkle proof) are provably correct. (c) AI verification adds a probabilistic anomaly detection layer on top of provably correct deterministic checks.

**Roadmap:** As ZKML technology advances (expected 2027-2030 for billion-parameter models), the protocol can transition to ZK-proved inference, upgrading PoAIV from committee-attested to cryptographically-proved AI verification.

#### 24.2 Deterministic Inference

**Problem:** LLM inference at temperature=0 is not fully deterministic across hardware platforms, library versions, or batching strategies due to floating-point non-associativity. Two honest agents running the same model on the same input may produce different internal activations and therefore different anomaly scores.

**Mitigation:** (a) The verification output is quantized to binary (APPROVE/REJECT), reducing sensitivity to small numerical differences. (b) The anomaly threshold is set conservatively. (c) The 9/13 threshold tolerates up to 4 divergent results. (d) Attestations include a structured reasoning trace that can be audited for consistency.

**Open question:** Can a deterministic verification protocol be constructed that is semantically equivalent to LLM reasoning? This is an open research problem at the intersection of formal verification and large language models.

#### 24.3 API Provider Trust

**Problem:** The CPU component of dual staking depends on API usage attestation from AI providers (currently Anthropic). This introduces a single trusted third party for 60% of the staking weight.

**Severity:** High. If Anthropic's API misreports usage, the entire staking weight system is compromised.

**Mitigation path:** Multi-provider → TEE attestation → ZK-proved computation (see Section 13.5).

#### 24.4 Committee Scalability

**Problem:** Each block requires 13 AI agents to perform verification inference. At current Opus pricing (~$15/M output tokens), this creates a per-block verification cost of approximately $0.10-$0.50 depending on block complexity. This limits practical block time reduction below ~30 seconds.

**Mitigation:** (a) Smaller, specialized verification models can reduce cost 10-100x. (b) Model distillation of verification-specific capabilities. (c) Future on-device inference eliminates API costs entirely.

#### 24.5 No Formal Governance Mechanism

**Problem:** The governance system (Section 21.2) describes a three-tier proposal structure but does not specify: voting mechanism, proposal submission requirements, minimum holding thresholds, or Security Council composition and rotation.

**Status:** Governance specification is deferred to post-mainnet. During testnet and alpha phases, protocol parameters are adjusted by the core development team.

#### 24.6 Network Protocol Unspecified

**Problem:** The whitepaper does not describe the peer-to-peer networking layer: block propagation, attestation gossip, transaction mempool management, or latency assumptions. The 60-second block time is stated but not justified against network propagation delays.

**Status:** Network protocol specification will be published as a separate document during the Beta phase (see Section 21).

#### 24.7 Transaction Format Unspecified

**Problem:** No transaction data structure, serialization format, or signature scheme is defined in this document.

**Status:** Transaction format specification is part of the Enforced ZK L1 implementation (see `docs/plans/2026-03-04-enforced-zk-l1-design.md`). The testnet implementation uses a preliminary format that will be formalized before mainnet.
```

**Step 3: Update references**

Add new references at the end of Section 26 (renumbered from 25):

```markdown
[29] S. Goldwasser, S. Micali, and C. Rackoff, "The Knowledge Complexity of Interactive Proof Systems," *SIAM Journal on Computing*, vol. 18, no. 1, pp. 186-208, 1989.

[30] Modulus Labs, "The Cost of Intelligence: Proving AI Inference in Zero Knowledge," 2024. Available: https://www.moduluslabs.xyz/

[31] R. Lerman and S. Yitzhaki, "Income Inequality Effects by Income Source: A New Approach and Applications to the United States," *Review of Economics and Statistics*, vol. 67, no. 1, pp. 151-156, 1985.

[32] S. Goldberg, L. Reyzin, D. Papadopoulos, and J. Vcelak, "Verifiable Random Functions (VRFs)," *RFC 9381*, IETF, 2023.

[33] Lightchain AI, "Proof of Intelligence: AI-Integrated Consensus," 2025. Available: https://lightchain.ai/lightchain-whitepaper.pdf

[34] A. Yakovenko, "Solana: A New Architecture for a High Performance Blockchain," v0.8.13, 2020.

[35] V. Shoup, "Proof of History: What is it Good For?," 2022. Available: https://www.shoup.net/papers/poh.pdf
```

**Step 4: Update TOC and section numbers**

Renumber Glossary (24→25), References (25→26). Update all TOC entries. Add entry for new Section 24.

**Step 5: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs(whitepaper): competitor comparison, limitations section, new references"
```

---

## Task 9: Write PoAIV Formal Paper

**Files:**
- Create: `vault/poaiv-formal.md`

**Step 1: Write the full document**

This is a standalone academic-style paper (~20 pages). Write the complete document following the structure in the design doc (Section 2):

1. Abstract (200 words)
2. Introduction & Motivation (~1000 words)
3. System Model (network, adversary, AI agent definitions)
4. Formal Definitions (PoAIV scheme tuple, 3 security games)
5. Construction (full pseudocode for all protocols)
6. Security Analysis (proof sketches for each property)
7. Anti-Injection Guarantees (prompt injection defense, memory integrity, consensus isolation, multi-model diversity)
8. Smart Contract Verification Flow (on-chain verification, state validation, slash conditions)
9. Limitations and Open Problems (ZKML gap, deterministic inference, API trust)
10. Conclusion
11. References

**Key formal definitions to include:**

VER-INT game, VER-PRIV game, COM-UNBIAS game (as specified in design doc).

**Cross-references:** This paper should reference the whitepaper sections and vice versa.

**Step 2: Commit**

```bash
git add vault/poaiv-formal.md
git commit -m "docs: PoAIV formal paper — security games, proofs, anti-injection guarantees"
```

---

## Task 10: Write Feasibility Report

**Files:**
- Create: `vault/feasibility-report.md`

**Step 1: Write the full document**

Following the design doc structure (Section 3):

1. Executive Summary (500 words)
2. Technology Assessment
   - 2.1 Built and Tested: 593+ tests, 60+ modules, params.py source of truth
   - 2.2 Simulated: ZK proofs (SimulatedZKProof), AI verification (SHA-256 stand-ins)
   - 2.3 Theoretical: Bridge, governance, TEE, real ZKML
3. Competitor Positioning
   - 3.1 Matrix: 35+ projects from `vault/research/competitors/REPORT-competitor-architecture-2026-02-25.md`
   - 3.2 Novel claims assessment (PoAIV uniqueness confirmed)
   - 3.3 Market gap: no competitor runs AI-as-consensus-verifier
4. Technical Risk Analysis
   - 4.1 Consensus risk: novel, unproven at scale
   - 4.2 ZK implementation risk: circuit complexity, proving times
   - 4.3 AI provider dependency: Anthropic as trust anchor
   - 4.4 Scalability risk: 13-agent committee per block
5. Economic Risk Analysis
   - 5.1 Token sustainability (organic growth model analysis)
   - 5.2 Mining economics (hardness curve convergence)
   - 5.3 Staking incentive alignment
6. Regulatory Considerations
7. Implementation Timeline (Phase 1-4)
8. Resource Requirements
9. Conclusion

**Sources:** Pull data from the 4 research agent reports (whitepaper analysis, competitor research, vault exploration, companion documents).

**Step 2: Commit**

```bash
git add vault/feasibility-report.md
git commit -m "docs: feasibility report — technology assessment, risk analysis, competitor positioning"
```

---

## Task 11: Write Litepaper

**Files:**
- Create: `vault/litepaper.md`

**Step 1: Write the full document (5-8 pages)**

Non-technical, investor-friendly. Following design doc structure (Section 4):

1. The Problem (1 page): Current blockchains waste energy (PoW) or concentrate wealth (PoS). AI is transforming computing but not yet securing blockchains.
2. The Solution (1 page): ZK Agentic Chain — AI verifiers, privacy by default, fair distribution.
3. How It Works (2 pages): Galaxy Grid visual explanation, PoAIV in plain English, dual staking explained simply. Include simplified versions of the ASCII diagrams.
4. Token Economics (1 page): 1B AGNTC, 4 factions, organic growth, 50% fee burn.
5. Roadmap (1 page): Testnet → Alpha → Beta → Mainnet.
6. Get Involved (0.5 page): Links, community, developer resources.

**Tone:** Professional but accessible. No formulas. No security games. Think "what would a VC read in 10 minutes?"

**Step 2: Commit**

```bash
git add vault/litepaper.md
git commit -m "docs: litepaper — 6-page investor-friendly overview"
```

---

## Task 12: Regenerate PDF + Final Review

**Files:**
- Modify: `ZkAgentic/projects/web/zkagentic-deploy/gen_whitepaper_pdf.py` (if needed)
- Generate: `ZkAgentic/projects/web/zkagentic-deploy/AGNTC-Whitepaper-v1.1.pdf`

**Step 1: Generate the v1.1 PDF**

Run: `cd ZkAgentic/projects/web/zkagentic-deploy && python gen_whitepaper_pdf.py`

Expected: PDF generates without errors, header line sits below text, version shows v1.1.

**Step 2: Verify page count**

Expected: ~70-80 pages (up from 62 in v1.0).

**Step 3: Cross-reference check**

Verify:
- All new section numbers match TOC
- All cross-references (e.g., "See Section 24") point to correct sections
- PoAIV paper references match whitepaper section numbers
- No broken references

**Step 4: Final commit**

```bash
git add ZkAgentic/projects/web/zkagentic-deploy/gen_whitepaper_pdf.py
git add ZkAgentic/projects/web/zkagentic-deploy/AGNTC-Whitepaper-v1.1.pdf
git commit -m "docs: generate AGNTC Whitepaper v1.1 PDF (70+ pages)"
```

---

## Task 13: Update CLAUDE.md Changelog

**Files:**
- Modify: `vault/CLAUDE.md`
- Modify: `ZkAgentic/CLAUDE.md`

**Step 1: Add changelog entry to vault/CLAUDE.md**

```markdown
## 2026-03-09 — Whitepaper v1.1 academic upgrade

**Changed:** `whitepaper.md` upgraded from v1.0 to v1.1. Major additions:
- Formal adversary model and 3 security properties (VER-INT, VER-PRIV, COM-UNBIAS)
- PoAIV pseudocode (committee selection, attestation protocol)
- Per-mechanism attack analysis (5 attack vectors with mitigations)
- 6 ASCII diagrams (grid, block lifecycle, staking, subgrid, ZK pipeline, migration)
- Competitor comparison table (vs Bitcoin, Ethereum, Solana, Zcash, Bittensor)
- Limitations and Open Problems section (7 honest disclosures incl. ZKML gap)
- VRF specification (Ed25519, RFC 9381)
- ZK circuit architecture overview with constraint estimates
- Completed APY table, fixed Gini coefficient formula, fixed VRF selection formula
- CPU measurement trust assumptions and mitigation roadmap
- 7 new references

**Added:**
- `vault/poaiv-formal.md` — PoAIV formal paper (security games, proofs, anti-injection)
- `vault/feasibility-report.md` — technology assessment, risk analysis, competitor positioning
- `vault/litepaper.md` — 6-page investor-friendly overview
- `vault/whitepaper-v1-0.md` — backup of v1.0

**Design:** `docs/plans/2026-03-09-whitepaper-v1-1-academic-upgrade-design.md`
**Plan:** `docs/plans/2026-03-09-whitepaper-v1-1-academic-upgrade-impl.md`
```

**Step 2: Commit**

```bash
git add vault/CLAUDE.md ZkAgentic/CLAUDE.md
git commit -m "docs: update changelogs for whitepaper v1.1 academic upgrade"
```

---

## Summary

| Task | Description | Est. Effort |
|------|-------------|-------------|
| 1 | Fix PDF header + version bump | Small |
| 2 | Structural additions (TOC, notation, stubs) | Small |
| 3 | PoAIV sections 3-5 (CRITICAL) | Large |
| 4 | ZK Privacy sections 6-7 | Medium |
| 5 | Security Analysis section 8 | Large |
| 6 | Dual staking + APY + proofs (sections 13, 14, 23) | Medium |
| 7 | 6 ASCII diagrams | Medium |
| 8 | Competitor comparison + limitations section | Large |
| 9 | PoAIV formal paper (standalone) | Large |
| 10 | Feasibility report (standalone) | Large |
| 11 | Litepaper (standalone) | Medium |
| 12 | Regenerate PDF + final review | Small |
| 13 | Update changelogs | Small |

**Total: 13 tasks, execution order is sequential (each builds on previous).**
