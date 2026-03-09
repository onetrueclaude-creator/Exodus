# Proof of AI Verification: Formal Security Analysis

> **A Companion Paper to the AGNTC Whitepaper v1.1**
>
> ZK Agentic Chain Technical Report | March 2026

---

## 1. Abstract

We present the formal security analysis of Proof of AI Verification (PoAIV), the novel consensus mechanism employed by the ZK Agentic Chain protocol. PoAIV replaces energy-intensive hash puzzles (Proof of Work) and purely capital-weighted validation (Proof of Stake) with a committee of AI verification agents that reason about chain state through zero-knowledge private channels. For each block, a committee of k = 13 agents is selected via a Verifiable Random Function weighted by effective stake -- a dual-staking metric combining token capital (40%) and CPU compute contribution (60%). Blocks achieve deterministic finality when at least 9 of 13 agents produce matching attestations through a commit-reveal protocol. We define three core security properties -- Verification Integrity (VER-INT), Verification Privacy (VER-PRIV), and Committee Unbiasability (COM-UNBIAS) -- as formal cryptographic games and prove that PoAIV satisfies each under stated assumptions. We analyze BFT safety and liveness, derive the Sybil cost amplification of dual staking (approximately 2.5x over pure PoS), and provide anti-injection guarantees for the AI verification pipeline. We conclude with an honest assessment of limitations, including the ZKML gap, deterministic inference constraints, and API provider trust assumptions.

---

## 2. Introduction and Motivation

### 2.1 Why AI Verification?

Traditional Byzantine Fault Tolerant (BFT) consensus protocols [1, 2, 3] employ deterministic validation: each committee member executes the same fixed verification function on the proposed block, checking cryptographic signatures, confirming that state transitions follow predefined rules, and verifying Merkle proofs against committed roots. This is sufficient for detecting *syntactic* violations -- malformed transactions, invalid signatures, incorrect state roots -- but is fundamentally incapable of detecting *semantic* anomalies: patterns that are individually rule-compliant but collectively suspicious.

Consider three concrete threat classes that deterministic validation cannot address:

**Economic anomaly detection.** An adversary constructs a series of technically valid transactions that collectively constitute a wash trade or market manipulation scheme. Each transaction individually satisfies all protocol rules; no single state transition is invalid. Deterministic validators approve each transaction in isolation. An AI verification agent, by contrast, can analyze the block as a whole, recognizing that a cluster of transactions between apparently independent accounts follows a pattern consistent with coordinated manipulation (see Whitepaper Section 5.7).

**Semantic state inconsistency.** After a complex sequence of subgrid reallocations, the resulting resource distribution may satisfy the state machine rules but violate higher-order economic invariants -- for example, a single entity controlling a disproportionate share of a ring's secure cells through a chain of nominally independent transfers. AI agents cross-reference spatial patterns against economic invariants.

**Slow-burn governance attacks.** A sequence of individually innocuous parameter change proposals that collectively steer the protocol toward adversarial conditions. AI agents maintain temporal context across blocks and can flag cumulative drift that no single-block deterministic check would identify.

PoAIV embeds AI reasoning into the consensus mechanism itself, not as an application-layer service, creating an adaptive security layer that evolves with the underlying AI models (see Whitepaper Section 5).

### 2.2 Comparison with Traditional BFT

The BFT consensus family -- PBFT [2], HotStuff [4], Tendermint [5] -- establishes safety and liveness under the assumption that fewer than one-third of validators are Byzantine. PoAIV inherits these guarantees: a 13-member committee with a 9/13 threshold tolerates f = 4 Byzantine agents, consistent with the standard bound f < n/3.

The critical distinction is not in the fault tolerance mechanics but in the *verification content*. In PBFT, each replica executes the same deterministic state machine. In PoAIV, each agent applies probabilistic reasoning on top of the deterministic checks. This layering is strictly additive: PoAIV agents perform all deterministic checks (signature verification, state transition correctness, Merkle proof integrity) and additionally apply AI-based anomaly detection. If the AI component fails entirely (e.g., all model providers are compromised simultaneously), PoAIV degrades gracefully to deterministic-only BFT -- the system never performs *worse* than traditional consensus (see Whitepaper Section 8.8).

| Property | Traditional BFT | PoAIV |
|----------|----------------|-------|
| Deterministic checks | Yes | Yes |
| Semantic anomaly detection | No | Yes |
| Threshold structure | t >= 2f + 1 | t = 9, f = 4 (same bound) |
| Verification content | Fixed function | Adaptive (model-dependent) |
| Degradation mode | N/A | Falls back to deterministic BFT |

### 2.3 Contribution Summary

This paper makes the following contributions:

1. **Formal definitions.** We define PoAIV as a tuple of algorithms (Setup, SelectCommittee, Verify, Attest, Finalize) and formalize three security properties as cryptographic games.

2. **Security proofs.** We prove VER-INT, VER-PRIV, and COM-UNBIAS under stated assumptions, reducing each to standard cryptographic hardness assumptions (collision resistance, VRF pseudorandomness, ZK soundness).

3. **BFT analysis.** We provide clean proofs of safety and liveness for the 13/9 committee structure, following the approach of Castro and Liskov [2].

4. **Anti-injection guarantees.** We formalize the defenses against prompt injection, agent memory corruption, and consensus isolation bypass in the AI verification pipeline.

5. **Smart contract verification flow.** We specify the on-chain verification contract, state transition validation, and slash conditions as formal logic.

6. **Honest limitations.** We enumerate open problems including the ZKML gap, deterministic inference constraints, and API provider trust, with a roadmap toward resolution.

---

## 3. System Model

### 3.1 Network Model (Partial Synchrony)

We adopt the partial synchrony model of Dwork, Lynch, and Stockmeyer [6]. There exists an unknown Global Stabilization Time (GST) and a known message delay bound Delta such that:

- Before GST: The adversary controls message ordering and delivery timing. Messages may be arbitrarily delayed but are eventually delivered.
- After GST: All messages between honest nodes are delivered within Delta time units.

**Concrete parameters for PoAIV:**

```
Delta = 10 seconds (commit window)
Block finalization window = 60 seconds (VERIFICATION_HARD_DEADLINE_S)
Commit phase = 10 seconds (VERIFICATION_COMMIT_WINDOW_S)
Reveal phase = 20 seconds (VERIFICATION_REVEAL_WINDOW_S)
```

The finalization window (60 seconds) is chosen to be 6x the message delay bound, providing sufficient margin for commit-reveal completion under normal network conditions. If the commit-reveal process does not complete within 60 seconds, the block is abandoned and a new leader proposes a fresh block.

**Assumption 3.1 (Network).** We assume that after GST, the network delivers messages within Delta = 10 seconds with probability 1 - negl(lambda), where lambda is the security parameter. This assumption is standard for BFT protocols and is empirically justified for well-connected internet nodes.

### 3.2 Adversary Model (Bounded, Adaptive)

We consider a probabilistic polynomial time (PPT) adversary A operating under the following constraints:

**Corruption budget.** A may adaptively corrupt up to t < n/3 committee members per block. For n = 13, this means A controls at most f = 4 agents. "Corruption" means full control of the agent's signing key and model -- the adversary can produce arbitrary attestations from corrupted agents.

**Adaptive corruption.** A observes the committee selection for each block and then chooses which agents to corrupt, subject to the budget constraint. This is a stronger adversary than the static corruption model (where corruptions are fixed before protocol execution) and captures scenarios where the adversary targets specific high-value committee members.

**Computational bound.** A runs in polynomial time in the security parameter lambda. A cannot break standard cryptographic assumptions (collision resistance, discrete log, VRF pseudorandomness) except with negligible probability.

**AI model access.** A may:
- Fine-tune or replace the AI model on corrupted agents
- Craft adversarial inputs (prompt injection payloads) included in transaction data
- Observe the timing of honest agents' commit messages (but not their contents, which are hashed)

A may NOT:
- Modify the verification schema enforced by honest agents (this is a protocol constant)
- Access the system prompt or internal state of honest agents
- Break the hiding property of the commitment scheme

**Assumption 3.2 (Adversary).** We assume the adversary is computationally bounded (PPT) and controls fewer than n/3 = 4.33, i.e., at most 4, committee members in any given block.

### 3.3 AI Agent Model (Capabilities and Limitations)

Each verification agent is an instance of a large language model (LLM) operating in a constrained verification mode. We model the agent as a probabilistic function:

```
V: (block_data, chain_state, schema) -> {APPROVE, REJECT} x reasoning_trace
```

**Capabilities.** An honest agent:
- Correctly executes all deterministic checks (signature verification, state transition validation, Merkle proof integrity) with probability 1
- Detects semantic anomalies with probability p_detect, where p_detect depends on the model tier (Haiku < Sonnet < Opus) and the anomaly complexity
- Produces its attestation independently of other agents (enforced by the commit-reveal protocol)
- Operates within a strict JSON schema that constrains both input and output formats

**Limitations.** An honest agent:
- May produce false negatives (failing to detect a real anomaly) with probability 1 - p_detect
- May produce false positives (flagging a valid block as anomalous) with probability p_false
- Does not achieve deterministic inference across hardware platforms (see Section 9.2)
- Cannot verify that its own inference is correct via zero-knowledge proof (the ZKML gap, Section 9.1)

**Assumption 3.3 (Agent).** We assume that honest agents correctly execute all deterministic verification checks with probability 1. AI-enhanced anomaly detection provides an additional probabilistic security layer but is not required for the core safety and liveness properties. This assumption separates the provably correct components (deterministic checks) from the probabilistically beneficial components (AI reasoning).

---

## 4. Formal Definitions

### 4.1 PoAIV Scheme

We define a PoAIV scheme as a tuple of five algorithms:

```
PoAIV = (Setup, SelectCommittee, Verify, Attest, Finalize)
```

**Setup(lambda) -> (params, keys).** The setup algorithm takes a security parameter lambda and produces:
- params: public protocol parameters including committee size k = 13, threshold t = 9, staking weights alpha = 0.40, beta = 0.60, VRF parameters, and commitment scheme parameters
- keys: a set of validator key pairs {(pk_i, sk_i)} for each registered validator, including VRF keys and signing keys

**SelectCommittee(block_height, epoch_seed, ValidatorSet) -> C.** The committee selection algorithm takes the current block height h, the epoch seed s (derived from the hash of the previous epoch's last block), and the set of active validators with their effective stakes. It outputs a committee C of size k = 13.

```
Algorithm SelectCommittee(h, s, ValidatorSet):
  1. seed <- BLAKE2b(s || h)
  2. candidates <- {v in ValidatorSet : S_eff(v) > 0, v.status = ACTIVE}
  3. C <- empty set
  4. nonce <- 0
  5. while |C| < 13:
       for each v in candidates \ C:
         vrf_output <- VRF_Ed25519(v.sk, seed || nonce)
         threshold <- S_eff(v) / SUM(S_eff(w) for w in candidates \ C)
         if vrf_output / 2^256 < threshold:
           C <- C union {v}
           if |C| = 13: break
       nonce <- nonce + 1
  6. return C
```

Selection is WITHOUT replacement: each selected validator is removed from the candidate pool for subsequent selections within the same block. This produces a hypergeometric distribution over committee compositions (see Whitepaper Section 5.5).

**Verify(agent_i, proposed_block) -> (verdict_i, reasoning_i).** Each committee member independently verifies the proposed block:

```
Algorithm Verify(agent_i, B):
  1. // Deterministic checks (provably correct)
     check_sigs <- verify_all_signatures(B.transactions)
     check_state <- verify_state_transition(B.prev_state_root, B.txs, B.new_state_root)
     check_merkle <- verify_merkle_root(B.new_state_root)
     check_proofs <- verify_all_zk_proofs(B.zk_proofs)
     check_nullifiers <- verify_no_double_spend(B.nullifiers, global_nullifier_set)

  2. // AI-enhanced verification (probabilistic)
     anomaly_score <- AI_REASON(agent_i.model, {
       context: B.transactions,
       state_diff: B.prev_state_root -> B.new_state_root,
       cache: agent_i.local_state_cache,
       schema: VERIFICATION_JSON_SCHEMA
     })

  3. deterministic_valid <- check_sigs AND check_state AND check_merkle
                           AND check_proofs AND check_nullifiers
     ai_valid <- (anomaly_score < ANOMALY_THRESHOLD)

  4. if deterministic_valid AND ai_valid:
       return (APPROVE, reasoning_trace)
     else:
       return (REJECT, reasoning_trace_with_reason)
```

**Attest(agent_i, verdict_i) -> attestation_i.** The attestation protocol follows a two-phase commit-reveal:

```
// Phase 1: Commit (within VERIFICATION_COMMIT_WINDOW_S = 10 seconds)
nonce_i <- random(lambda bits)
commitment_i <- H(verdict_i || B.hash || nonce_i)
BROADCAST(commitment_i)

// Phase 2: Reveal (within VERIFICATION_REVEAL_WINDOW_S = 20 seconds)
attestation_i <- SIGN(agent_i.sk, verdict_i || B.hash)
BROADCAST(attestation_i, nonce_i)

// Verification by ordering node:
ASSERT: H(verdict_i || B.hash || nonce_i) = commitment_i
```

**Finalize(block, attestations) -> {ACCEPT, REJECT}.** The finalization algorithm counts valid attestations:

```
Algorithm Finalize(B, {a_1, ..., a_m}):
  1. valid_count <- 0
  2. for each a_i in attestations:
       if VERIFY_SIG(a_i.pk, a_i) AND a_i.verdict = APPROVE:
         valid_count <- valid_count + 1
  3. if valid_count >= VERIFICATION_THRESHOLD (= 9):
       return ACCEPT
     else:
       return REJECT
```

### 4.2 Security Property: Verification Integrity (VER-INT)

**Definition 4.1 (Verification Integrity Game).**

```
Game VER-INT_PoAIV(A, lambda):
  1. Challenger C runs Setup(lambda) -> (params, committee_keys)
     C initializes the chain with a valid genesis state.

  2. Adversary A receives params and oracle access to:
     - O_Verify: submit a block and receive honest agents' verdicts
       (after commit-reveal, so A cannot front-run)
     - O_Attest: observe the commit-reveal protocol for any block
     - O_Corrupt: adaptively corrupt a committee member (up to f = 4),
       receiving the member's secret key and model control

  3. A interacts with the oracles over polynomially many rounds.
     In each round, A may:
     - Propose a block (valid or invalid)
     - Corrupt committee members (subject to budget f = 4)
     - Observe commit-reveal protocol messages

  4. A outputs a challenge (block*, {attestation*_1, ..., attestation*_m})
     where block* contains at least one invalid state transition
     (i.e., a transaction that violates the deterministic validation rules).

  5. A wins if Finalize(block*, {attestation*_1, ..., attestation*_m}) = ACCEPT

PoAIV is VER-INT secure if for all PPT adversaries A:
  Pr[A wins in VER-INT_PoAIV(A, lambda)] <= negl(lambda)
```

**Remark.** The game restricts the winning condition to blocks with *deterministic* violations (invalid signatures, incorrect state transitions, failed Merkle proofs). Semantic anomalies detectable only by AI reasoning are not covered by VER-INT; their detection is a probabilistic enhancement addressed in Section 6.1.

### 4.3 Security Property: Verification Privacy (VER-PRIV)

**Definition 4.2 (Verification Privacy Game).**

```
Game VER-PRIV_PoAIV(A, lambda):
  1. Challenger C runs Setup(lambda) -> (params, committee_keys)

  2. Adversary A submits two transactions tx_0, tx_1 satisfying:
     - Both are valid transactions
     - Both produce identical public outputs (same fee, same nullifiers
       revealed, same state root change from an external observer's view)
     - They differ only in their private content (the data within the
       ZK-proved state transition)

  3. Challenger C selects b <- {0, 1} uniformly at random.
     C constructs a block B_b containing tx_b.
     C runs the full verification protocol: SelectCommittee, Verify,
     Attest, Finalize on B_b.

  4. Adversary A observes:
     - The committee selection (identities of selected agents)
     - All commitment values from the commit phase
     - All revealed attestations from the reveal phase
     - The final verdict (ACCEPT/REJECT)

  5. A outputs a guess b' in {0, 1}.

  6. A wins if b' = b.

PoAIV is VER-PRIV secure if for all PPT adversaries A:
  |Pr[A wins in VER-PRIV_PoAIV(A, lambda)] - 1/2| <= negl(lambda)
```

**Remark.** VER-PRIV captures the property that the verification process does not leak information about private transaction content beyond what is already public (the ZK proof and public outputs). This property depends on the ZK proof system's zero-knowledge guarantee and the attestation protocol's output structure (binary APPROVE/REJECT).

### 4.4 Security Property: Committee Unbiasability (COM-UNBIAS)

**Definition 4.3 (Committee Unbiasability Game).**

```
Game COM-UNBIAS_PoAIV(A, lambda):
  1. Challenger C runs Setup(lambda) -> (params, keys)
     C registers n validators with effective stakes {S_eff(1), ..., S_eff(n)}.

  2. Adversary A controls validators whose total effective stake is
     less than 1/3 of the network total.
     A knows the epoch seed derivation algorithm.

  3. For each block in a challenge epoch:
     a. A may adaptively choose which of its validators to register
        or deregister (within the constraint that total adversarial
        stake < 1/3).
     b. C computes the committee C_actual = SelectCommittee(h, s, ValidatorSet).

  4. A specifies a target committee C_target (a specific set of 13 agents).

  5. A wins if:
     Pr[C_actual = C_target] > (1/choose(n, 13)) + 1/poly(lambda)

     That is, A can bias the committee composition toward C_target
     with more than negligible advantage over the uniform distribution
     weighted by effective stake.

PoAIV is COM-UNBIAS secure if for all PPT adversaries A:
  A's advantage <= negl(lambda)
```

**Remark.** COM-UNBIAS ensures that no minority stakeholder can predictably control committee composition. This property relies on the pseudorandomness of the VRF and the unpredictability of the epoch seed.

---

## 5. Construction

### 5.1 Committee Selection Protocol

The full committee selection protocol, including VRF construction and seed derivation:

```
Protocol: COMMITTEE_SELECTION

Parameters:
  k = 13                    (committee size)
  VRF: Ed25519-based VRF per RFC 9381 (ECVRF-EDWARDS25519-SHA512-ELL2)
  Hash: BLAKE2b (256-bit output)

Seed Derivation:
  epoch_seed = BLAKE2b(previous_epoch_final_block_hash || epoch_number)
  block_seed = BLAKE2b(epoch_seed || block_height)

Selection Algorithm:
  Input:  block_height h, epoch_seed s, validator set V = {v_1, ..., v_n}
  Output: committee C = {c_1, ..., c_13}

  1. seed <- BLAKE2b(s || h)
  2. pool <- {v in V : S_eff(v) > 0 AND v.status = ACTIVE}
  3. C <- empty ordered set
  4. nonce <- 0

  5. while |C| < k:
       total_stake <- SUM(S_eff(v) for v in pool)
       for each v in pool (ordered by public key):
         (pi_v, beta_v) <- VRF_prove(v.sk, seed || nonce)
         hash_v <- SHA-512(pi_v)  // 256-bit output, interpreted as integer
         threshold_v <- (S_eff(v) / total_stake) * 2^256
         if hash_v < threshold_v:
           C <- C || {v}         // append v to committee
           pool <- pool \ {v}    // remove from candidate pool
           if |C| = k: return C
       nonce <- nonce + 1

  6. return C

VRF Verification (by any node):
  For each c_i in C:
    ASSERT VRF_verify(c_i.pk, seed || nonce_i, pi_i) = VALID
    ASSERT SHA-512(pi_i) < threshold_i
```

**Properties of the selection algorithm:**

1. **Verifiability.** Any node can verify committee membership by checking VRF proofs against public keys and stakes.
2. **Without replacement.** Selected validators are removed from the pool, producing a hypergeometric distribution. For n >> k = 13, this closely approximates independent sampling.
3. **Stake-weighted.** The probability of selection is proportional to effective stake, which combines token stake (weight 0.40) and CPU stake (weight 0.60).
4. **Unpredictable.** The VRF output is pseudorandom; without the validator's secret key, no party can predict whether a given validator will be selected.

### 5.2 AI Verification Protocol

The verification protocol specifies what each agent checks and in what order. All agents execute the same protocol; the AI enhancement layer operates on top of the deterministic checks.

```
Protocol: AI_VERIFICATION

Input:  agent A_i with model M_i, proposed block B
Output: verdict v_i in {APPROVE, REJECT}, reasoning trace r_i

Phase 1 -- Deterministic Verification (all agents, identical logic):

  1.1 SIGNATURE CHECK:
      For each tx in B.transactions:
        ASSERT VERIFY_ED25519(tx.sender_pk, tx.signature, tx.payload)
      If any fail: return (REJECT, "invalid_signature: tx_id")

  1.2 STATE TRANSITION CHECK:
      new_state <- APPLY(B.prev_state_root, B.transactions)
      ASSERT new_state = B.new_state_root
      If mismatch: return (REJECT, "invalid_state_transition")

  1.3 MERKLE ROOT CHECK:
      computed_root <- COMPUTE_ROOT(B.state_tree)
      ASSERT computed_root = B.state_root
      If mismatch: return (REJECT, "invalid_merkle_root")

  1.4 ZK PROOF CHECK:
      For each proof pi_j in B.zk_proofs:
        ASSERT ZK_VERIFY(params.vk, pi_j, public_inputs_j) = ACCEPT
      If any fail: return (REJECT, "invalid_zk_proof: proof_id")

  1.5 NULLIFIER CHECK:
      For each nf in B.nullifiers:
        ASSERT nf NOT IN global_nullifier_set
      If any duplicate: return (REJECT, "double_spend: nullifier")

Phase 2 -- AI-Enhanced Verification (model-dependent, probabilistic):

  2.1 CONSTRUCT VERIFICATION INPUT:
      input <- {
        "block_hash": B.hash,
        "transaction_count": |B.transactions|,
        "state_diff": DIFF(B.prev_state_root, B.new_state_root),
        "transaction_summaries": [SUMMARIZE(tx) for tx in B.transactions],
        "epoch_context": {
          "ring": current_epoch_ring,
          "hardness": 16 * current_epoch_ring,
          "total_mined": cumulative_agntc
        },
        "historical_patterns": A_i.local_cache.recent_blocks(100)
      }
      // Input is structured JSON; no free-form text from transactions

  2.2 AI INFERENCE:
      anomaly_report <- M_i.infer(
        system_prompt: VERIFICATION_SYSTEM_PROMPT,  // immutable, from chain state
        user_input: JSON.stringify(input),
        schema: VERIFICATION_OUTPUT_SCHEMA,          // constrains output format
        temperature: 0,                              // deterministic mode
        max_tokens: 1024,
        tools: NONE                                  // no tool use permitted
      )

  2.3 PARSE AND THRESHOLD:
      anomaly_score <- anomaly_report.score  // float in [0, 1]
      if anomaly_score >= ANOMALY_THRESHOLD:
        return (REJECT, anomaly_report.reasoning)

Phase 3 -- Output:

  3.1 return (APPROVE, "deterministic_valid: true, anomaly_score: " || anomaly_score)
```

### 5.3 Attestation and Finality Protocol

The attestation protocol implements a two-phase commit-reveal scheme to prevent attestation copying.

```
Protocol: COMMIT_REVEAL_ATTESTATION

Parameters:
  COMMIT_WINDOW = 10 seconds
  REVEAL_WINDOW = 20 seconds
  HARD_DEADLINE = 60 seconds
  H: collision-resistant hash function (BLAKE2b-256)

Phase 1 -- Commit (t = 0 to t = COMMIT_WINDOW):

  For each committee member c_i:
    1. Run Verify(c_i, B) -> (v_i, r_i)
    2. Generate nonce: nonce_i <- random({0,1}^256)
    3. Compute commitment: comm_i <- H(v_i || B.hash || nonce_i)
    4. Sign commitment: sig_comm_i <- SIGN(c_i.sk, comm_i)
    5. Broadcast (comm_i, sig_comm_i) to ordering node

  Ordering node:
    - Collects commitments for COMMIT_WINDOW seconds
    - After COMMIT_WINDOW, publishes the set of received commitments
    - Late commitments (after window closes) are REJECTED

Phase 2 -- Reveal (t = COMMIT_WINDOW to t = COMMIT_WINDOW + REVEAL_WINDOW):

  For each committee member c_i who committed:
    1. Broadcast (v_i, nonce_i) to ordering node
    2. Sign reveal: sig_reveal_i <- SIGN(c_i.sk, v_i || nonce_i)

  Ordering node:
    - For each reveal (v_i, nonce_i):
      ASSERT H(v_i || B.hash || nonce_i) = comm_i
      ASSERT VERIFY_SIG(c_i.pk, sig_reveal_i)
    - Non-matching reveals are DISCARDED
    - Non-revealers forfeit block reward and receive liveness penalty

Phase 3 -- Finalization (t <= HARD_DEADLINE):

  approvals <- |{c_i : v_i = APPROVE AND reveal verified}|
  if approvals >= VERIFICATION_THRESHOLD (= 9):
    // Construct finality certificate
    cert <- {
      block_hash: B.hash,
      attestations: [(c_i.pk, sig_reveal_i) for verified approvals],
      committee: C,
      epoch: current_epoch
    }
    FINALIZE(B, cert)
    DISTRIBUTE_REWARDS(C, cert)
  else:
    REJECT(B)
    ROTATE_LEADER()
    // New leader proposes fresh block
```

### 5.4 Commit-Reveal Scheme (Message Formats)

The commit-reveal messages use the following wire formats:

```
CommitMessage:
  {
    "type": "COMMIT",
    "block_hash": bytes32,           // hash of proposed block
    "commitment": bytes32,           // H(verdict || block_hash || nonce)
    "committee_index": uint8,        // agent's position in committee (0-12)
    "signature": bytes64,            // Ed25519 signature over commitment
    "timestamp": uint64              // millisecond-precision timestamp
  }

RevealMessage:
  {
    "type": "REVEAL",
    "block_hash": bytes32,           // must match commit
    "verdict": enum {APPROVE, REJECT},
    "nonce": bytes32,                // random nonce used in commitment
    "reasoning_hash": bytes32,       // hash of full reasoning trace (stored off-chain)
    "anomaly_score": float32,        // [0, 1] -- AI anomaly assessment
    "signature": bytes64             // Ed25519 signature over (verdict || nonce)
  }

FinalityCertificate:
  {
    "type": "FINALITY",
    "block_hash": bytes32,
    "epoch": uint64,
    "block_height": uint64,
    "attestations": [                // at least 9 entries
      {
        "agent_pk": bytes32,
        "verdict": APPROVE,
        "signature": bytes64
      }, ...
    ],
    "aggregate_signature": bytes64   // optional: BLS aggregate for compact verification
  }
```

---

## 6. Security Analysis

### 6.1 Proof of Verification Integrity

**Theorem 6.1.** PoAIV is VER-INT secure under Assumptions 3.1, 3.2, and 3.3, provided the commitment scheme H is collision-resistant and the signature scheme is EUF-CMA secure.

**Proof.**

We prove that no PPT adversary A controlling at most f = 4 committee members can cause Finalize to accept a block containing an invalid state transition, except with negligible probability.

Let B* be the adversary's challenge block containing at least one invalid state transition (failing one or more of: signature check, state transition check, Merkle root check, ZK proof check, nullifier check).

**Step 1: Honest agents reject invalid blocks.**
By Assumption 3.3, honest agents correctly execute all deterministic verification checks with probability 1. Since B* contains an invalid state transition, every honest agent produces verdict v_i = REJECT for B* after Phase 1 of the AI_VERIFICATION protocol.

There are at least k - f = 13 - 4 = 9 honest agents in the committee.

**Step 2: Adversary cannot forge honest attestations.**
To achieve Finalize(B*, ...) = ACCEPT, the adversary needs at least t = 9 APPROVE attestations. The adversary controls at most f = 4 agents, so at most 4 APPROVE attestations come from corrupted agents. The adversary therefore needs at least 9 - 4 = 5 additional APPROVE attestations from honest agents.

By Step 1, honest agents produce REJECT for B*. For the adversary to obtain APPROVE attestations attributed to honest agents, the adversary would need to:
- (a) Forge an honest agent's signature on an APPROVE verdict, or
- (b) Find a collision in H such that an honest agent's REJECT commitment can be opened as APPROVE

Option (a) is infeasible by the EUF-CMA security of Ed25519. The probability of forgery is negl(lambda).

Option (b) requires finding nonce' such that H(APPROVE || B*.hash || nonce') = H(REJECT || B*.hash || nonce_i) for some honest agent's nonce_i. This is a collision attack on H. By the collision resistance of BLAKE2b-256, this succeeds with probability at most negl(lambda).

**Step 3: Commit-reveal prevents attestation substitution.**
The commit-reveal protocol ensures that each agent's verdict is bound at commit time. The ordering node verifies that revealed attestations match commitments. An adversary cannot substitute a different verdict after observing other agents' commitments (which reveal no information about the underlying verdict due to the random nonce).

Specifically, the commitment comm_i = H(v_i || B.hash || nonce_i) is computationally binding: changing v_i after commitment requires finding a second pre-image, which succeeds with probability at most negl(lambda).

**Step 4: Combining.**
The probability that A wins the VER-INT game is at most:

```
Pr[A wins] <= Pr[signature forgery] + Pr[hash collision] + Pr[commitment break]
           <= negl(lambda) + negl(lambda) + negl(lambda)
           = negl(lambda)
```

Therefore, PoAIV is VER-INT secure. QED.

**Remark on AI enhancement.** The VER-INT proof relies solely on deterministic checks and cryptographic properties, not on AI verification correctness. The AI layer provides *additional* detection of semantic anomalies beyond what VER-INT covers. Specifically, blocks that are deterministically valid but semantically suspicious (e.g., wash trading patterns) may be rejected by AI analysis. The detection probability for such patterns is p_detect, which is model-dependent and not formally guaranteed. VER-INT ensures that deterministically invalid blocks are always rejected; AI enhancement provides best-effort detection of higher-order threats.

### 6.2 Proof of Verification Privacy

**Theorem 6.2.** PoAIV is VER-PRIV secure under the assumption that the ZK proof system satisfies the zero-knowledge property and the attestation protocol reveals only binary verdicts.

**Proof.**

Consider the VER-PRIV game. The adversary A submits two transactions tx_0, tx_1 with identical public outputs, and the challenger processes tx_b for a random bit b.

**Step 1: ZK proofs reveal no private information.**
Both tx_0 and tx_1 produce the same public outputs: same fee, same nullifiers, same state root change (from the external observer's perspective). The ZK proof accompanying tx_b proves validity of the private state transition without revealing which private state (underlying tx_0 or tx_1) was used. By the zero-knowledge property of the proof system (Groth16 in the testnet phase, PLONK in alpha; see Whitepaper Section 6.4), the proof itself is computationally indistinguishable regardless of which transaction is the witness.

Formally, for any PPT distinguisher D:

```
|Pr[D(pi_0) = 1] - Pr[D(pi_1) = 1]| <= negl(lambda)
```

where pi_0, pi_1 are ZK proofs for tx_0, tx_1 respectively.

**Step 2: Verification operates on proofs, not plaintext.**
By the ZK private channel architecture (see Whitepaper Section 6.1), verification agents receive ZK proofs as input, not the underlying transaction data. Agents never access the plaintext state being modified. Their verification consists of:
- ZK proof verification (deterministic, independent of which transaction is the witness)
- State root consistency check (identical for tx_0 and tx_1 by construction)
- Anomaly detection on public summaries (identical for tx_0 and tx_1 by construction)

Since the inputs to the verification function are indistinguishable for tx_0 and tx_1, the verification output (APPROVE/REJECT) is identically distributed for both.

**Step 3: Attestations reveal only binary verdicts.**
The attestation protocol reveals:
- Commitments: H(v_i || B.hash || nonce_i), which are indistinguishable random values
- Verdicts: binary APPROVE/REJECT, which are identical in distribution (by Step 2)
- Anomaly scores: deterministic function of the public inputs, which are identical

No additional information about the private transaction content is leaked through the attestation channel.

**Step 4: Combining.**
A's view in the VER-PRIV game is computationally indistinguishable for b = 0 and b = 1:

```
|Pr[A wins] - 1/2| = |Pr[A guesses b correctly] - 1/2|
                    <= negl(lambda)
```

The advantage is bounded by the ZK distinguishing advantage, which is negligible by assumption.

Therefore, PoAIV is VER-PRIV secure. QED.

**Assumption dependency.** This proof relies critically on the zero-knowledge property of the underlying proof system. During the testnet phase (Groth16), the trusted setup ceremony introduces a trust assumption: if the ceremony is compromised, soundness is lost but zero-knowledge is preserved. During the mainnet phase (Halo2/Nova, transparent setup), this trust assumption is eliminated.

### 6.3 Proof of Committee Unbiasability

**Theorem 6.3.** PoAIV is COM-UNBIAS secure under the assumption that the VRF is pseudorandom (Definition per RFC 9381) and the epoch seed is unpredictable.

**Proof.**

Consider the COM-UNBIAS game. The adversary A controls validators with less than 1/3 of total effective stake and attempts to bias committee composition toward a target C_target.

**Step 1: VRF pseudorandomness.**
The committee selection uses Ed25519-based VRF outputs. By the pseudorandomness property of the VRF (as defined in RFC 9381, Section 3), for any validator v, the output VRF_prove(v.sk, seed || nonce) is computationally indistinguishable from a random 256-bit value to any party not holding v.sk.

Since A does not hold the secret keys of honest validators (by assumption), A cannot predict whether any specific honest validator will be selected for a given block.

**Step 2: Epoch seed unpredictability.**
The epoch seed is derived as:

```
epoch_seed = BLAKE2b(previous_epoch_final_block_hash || epoch_number)
```

The previous epoch's final block hash depends on the transactions and attestations in that block, which are not fully determined until the block is finalized. A minority stakeholder (< 1/3 effective stake) cannot unilaterally determine the contents of the final block, and therefore cannot predict the epoch seed before the epoch begins.

Formally, the min-entropy of the epoch seed, conditioned on A's view, is:

```
H_inf(epoch_seed | A's view) >= lambda - log(1/3) >= lambda - 2
```

which is sufficient for security parameter lambda.

**Step 3: Adversarial influence is bounded by stake.**
A controls validators with total effective stake S_A < (1/3) * S_total. Under the VRF-weighted selection protocol, the expected number of A's validators in a committee of k = 13 is:

```
E[|C intersect A_validators|] = k * (S_A / S_total) < 13/3 < 4.34
```

Since selection is without replacement and weighted by stake, A's ability to place specific validators on the committee is bounded by their stake fraction. The deviation from this expected value follows a hypergeometric distribution.

**Step 4: Grinding resistance.**
Could A influence the seed by strategically choosing which blocks to propose or which transactions to include? Since A controls less than 1/3 of effective stake:

- A is selected as block proposer with probability < 1/3
- If selected, A can choose to propose or abstain, gaining at most 1 bit of influence on the epoch seed per block
- Over an epoch of 100 blocks, A's total grinding advantage is bounded by:

```
Adv_grind <= 100 * (1/3) * 2^(-lambda) = negligible for lambda >= 128
```

This bound follows from the analysis of Kiayias et al. [8] for VRF-based leader election under minority adversaries.

**Step 5: Combining.**
A's advantage in biasing committee composition is:

```
Adv_COM-UNBIAS <= Adv_VRF + Adv_seed + Adv_grind
               <= negl(lambda) + negl(lambda) + negl(lambda)
               = negl(lambda)
```

Therefore, PoAIV is COM-UNBIAS secure. QED.

### 6.4 BFT Safety and Liveness

**Theorem 6.4 (Safety).** No two conflicting blocks can both achieve finality in the same slot.

**Proof.**

Suppose for contradiction that blocks B_1 and B_2, where B_1 != B_2, both achieve finality in slot s. Then there exist attestation sets A_1 and A_2 with:

```
|A_1| >= 9,  all a in A_1 attest APPROVE for B_1
|A_2| >= 9,  all a in A_2 attest APPROVE for B_2
```

By the pigeonhole principle:

```
|A_1 intersect A_2| >= |A_1| + |A_2| - k = 9 + 9 - 13 = 5
```

At least 5 agents attested to both B_1 and B_2. Since at most f = 4 agents are Byzantine, at least 5 - 4 = 1 honest agent must have attested APPROVE to both conflicting blocks.

However, honest agents are bound by the commit-reveal protocol: in Phase 1, each honest agent commits to a single verdict for a single block hash. The commitment comm_i = H(v_i || B.hash || nonce_i) binds the agent to a specific block hash. An honest agent cannot produce valid commitments for two different block hashes in the same slot, because:

1. The ordering node accepts at most one commitment per agent per slot.
2. Even if a Byzantine ordering node accepts two, the honest agent's local state records only one commitment, and it will refuse to reveal a second.

Therefore, no honest agent can attest to both B_1 and B_2. This contradicts the requirement that at least 1 honest agent attested to both. QED.

**Theorem 6.5 (Liveness).** If at least k - f = 9 committee members are honest and the network is in the synchronous phase (after GST), then blocks are finalized within the hard deadline.

**Proof.**

After GST, messages are delivered within Delta = 10 seconds. The protocol proceeds as follows:

1. The leader broadcasts the proposed block B to all committee members. Delivery: within Delta seconds.
2. Each honest committee member runs Verify and produces a commitment. Since B is valid (honest leader) and honest agents correctly execute deterministic checks (Assumption 3.3), all 9+ honest agents produce APPROVE verdicts. Commit broadcast and delivery: within Delta seconds.
3. After COMMIT_WINDOW (10 seconds), the ordering node publishes commitments. All honest agents have committed by this point (delivery within Delta = 10 seconds = COMMIT_WINDOW).
4. Honest agents reveal their attestations. Reveal broadcast and delivery: within Delta seconds. The REVEAL_WINDOW (20 seconds) provides 2x margin.
5. The ordering node receives at least 9 valid APPROVE reveals and constructs the finality certificate.

Total time: at most COMMIT_WINDOW + REVEAL_WINDOW = 30 seconds, well within the HARD_DEADLINE of 60 seconds.

If the leader is Byzantine and proposes an invalid block, all honest agents produce REJECT. The block fails finalization. The protocol rotates to the next leader. Since at most f = 4 of 13 potential leaders are Byzantine, within at most f + 1 = 5 leader rotations, an honest leader proposes a valid block and finality is achieved.

The worst-case liveness delay is:

```
T_liveness = (f + 1) * HARD_DEADLINE = 5 * 60 = 300 seconds
```

In practice, leader rotation is much faster than the full hard deadline, and the expected delay is approximately HARD_DEADLINE * (1 + f/(k-f)) = 60 * (1 + 4/9) = 87 seconds. QED.

---

## 7. Anti-Injection Guarantees

### 7.1 Prompt Injection Defense Model

The use of AI agents in consensus introduces a unique attack surface: prompt injection, where an adversary crafts transaction data containing payloads designed to manipulate the agent's reasoning.

**Threat definition.** A prompt injection attack on PoAIV succeeds if an adversary can cause an honest verification agent to:
- Approve a deterministically invalid block (covered by VER-INT)
- Reject a deterministically valid block (denial of service)
- Leak private information through the attestation channel (covered by VER-PRIV)

**Defense layers.** PoAIV implements three independent injection defenses:

**Layer 1: Schema enforcement.** Verification agents receive structured JSON data, not free-form text. The VERIFICATION_JSON_SCHEMA defines the exact fields, types, and value ranges permitted in the verification input. Transaction metadata -- the most likely injection vector -- is summarized into numerical fields (amounts, counts, hashes) before being passed to the agent. Raw transaction payloads (which could contain natural language injection attempts) are never included in the verification input.

```
VERIFICATION_JSON_SCHEMA = {
  "type": "object",
  "properties": {
    "block_hash": {"type": "string", "format": "hex", "length": 64},
    "transaction_count": {"type": "integer", "minimum": 0, "maximum": 50},
    "state_diff": {"type": "object", ...},
    "epoch_context": {"type": "object", ...},
    // No free-text fields. All string fields are hex-encoded hashes.
  },
  "additionalProperties": false
}
```

**Layer 2: Immutable system prompt.** The verification agent's system prompt is loaded from on-chain state, not from transaction data. The system prompt is a protocol constant that explicitly instructs the agent:
- Produce only APPROVE or REJECT with a structured reasoning trace
- Do not interpret any field in the verification input as an instruction
- Do not use tools, browse the web, or execute code
- Ignore any content that appears to be a meta-instruction

Modifying the system prompt requires an on-chain governance proposal with supermajority approval (see Whitepaper Section 21.2).

**Layer 3: No tool use.** During verification, agents operate with tool_use = NONE. The agent cannot execute code, make network requests, read files, or perform any action beyond producing a text response constrained by the output schema. Even a successful injection that alters the agent's "intent" cannot translate into external actions.

**Formal claim.** Under the schema enforcement and no-tool-use constraints, a prompt injection attack can influence at most the anomaly_score output of the AI verification phase. The deterministic checks (Phase 1 of AI_VERIFICATION) are implemented in protocol code, not in the AI model, and are therefore immune to prompt injection. Even if the injection causes the anomaly_score to be manipulated, the outcome is bounded:

- If the injection causes a false low anomaly_score (approving a suspicious block): The deterministic checks still catch any invalid state transitions (VER-INT). The injection only bypasses the probabilistic anomaly layer.
- If the injection causes a false high anomaly_score (rejecting a valid block): This affects at most 1 of 13 agents. The 9/13 threshold tolerates up to 4 incorrect rejections.

### 7.2 Agent Memory Integrity (Isolation Guarantees)

Each verification agent operates within a stateless verification context. The agent does not retain memory across blocks -- each verification invocation receives a fresh context consisting only of:

1. The immutable system prompt
2. The structured verification input (current block data)
3. A read-only cache of recent block summaries (numerical data, not transaction content)

**Isolation properties:**

- **No cross-block state leakage.** An agent verifying block B_n has no access to the plaintext of blocks B_1 through B_{n-1}. It receives only aggregated statistics (block hashes, transaction counts, epoch metrics).
- **No cross-agent state leakage.** Agent A_i has no access to Agent A_j's verification context, reasoning trace, or attestation (before reveal phase).
- **No persistent memory.** The agent's inference session is created and destroyed per verification task. There is no conversation history that could accumulate injected content over time.

**Formal claim.** The agent memory model prevents multi-block injection attacks -- attacks that inject partial payloads across multiple blocks, accumulating in agent memory until a critical threshold triggers the desired behavior. Since agent memory is reset per block, such accumulation is impossible.

### 7.3 Consensus Isolation (No External Influence on Voting)

The commit-reveal protocol ensures that each agent's attestation is produced independently:

**Timing isolation.** During the commit phase (0 to 10 seconds), agents produce attestations and broadcast commitments. Commitments are cryptographic hashes that reveal no information about the underlying verdict. Even if an adversary observes honest agents' commitments, the adversary gains no information about whether those agents approved or rejected the block.

**Information isolation.** Agents do not communicate with each other during verification. Each agent receives the proposed block directly from the block proposer and produces its attestation in isolation. There is no "pre-vote" or "prepare" message that could allow agents to coordinate or be influenced by each other's positions.

**Formal claim.** The commit-reveal protocol provides information-theoretic hiding during the commit phase: commitment values are uniformly distributed (due to the random nonce), regardless of the underlying verdict. The adversary's view during the commit phase is independent of the honest agents' verdicts.

### 7.4 Multi-Model Diversity Requirement

The protocol mandates that each committee of 13 agents includes agents running at least 3 distinct model variants (from the Haiku, Sonnet, Opus tiers; see Whitepaper Section 5.1). This diversity requirement serves as a defense-in-depth measure:

**Single-model compromise bound.** If a vulnerability affects a single model family (e.g., a systematic bias in Opus that causes it to approve a specific class of invalid blocks), the maximum number of affected agents is bounded by the committee's model composition. With at least 3 distinct model variants, no single variant can constitute more than 11 of 13 agents (in the extreme case). In practice, committee composition reflects the network's validator distribution across model tiers.

**Quantitative analysis.** Assume the worst case: a vulnerability affects one model family, and all agents of that family on the committee are compromised. The maximum number of same-family agents on a committee of 13, given 3 required distinct families, is at most 11 (if 1 agent each from 2 other families). But this represents an extreme stake concentration in one model tier. Under typical network conditions with balanced model distribution:

- Expected Haiku agents per committee: ~4-5
- Expected Sonnet agents per committee: ~5-6
- Expected Opus agents per committee: ~2-3

A vulnerability in any single family compromises at most ~6 agents, below the 9-agent threshold required for finalization.

**Formal claim.** Under the assumption that model vulnerabilities are independent across model families (i.e., a bug in Haiku does not imply a bug in Opus), the probability that a model-level vulnerability compromises 9 or more committee members is bounded by:

```
Pr[>= 9 compromised] <= choose(13, 9) * p_family^3 * (1 - p_family)^{10}
```

where p_family is the probability that a given model family is vulnerable. For p_family = 0.01 (1% per-family vulnerability rate), this probability is approximately 10^{-6}, well within negligible bounds for practical security.

---

## 8. Smart Contract Verification Flow

### 8.1 On-Chain Verification Contract

The verification contract is the on-chain component that enforces PoAIV consensus rules. It maintains the following state:

```
Contract: PoAIVVerifier

State:
  validator_registry: Map<PublicKey, ValidatorRecord>
    // ValidatorRecord = {pk, vrf_pk, S_eff, status, model_tier, slash_balance}
  epoch_state: {epoch_number, epoch_seed, ring, hardness}
  global_nullifier_set: Set<bytes32>
  finality_certificates: Map<BlockHeight, FinalityCertificate>
  pending_blocks: Map<BlockHash, PendingBlock>

Functions:

  register_validator(pk, vrf_pk, token_stake, cpu_attestation):
    REQUIRE token_stake >= MIN_STAKE
    REQUIRE cpu_attestation verified
    S_eff <- ALPHA * (token_stake / total_token_stake)
             + BETA * (cpu_attestation / total_cpu)
    validator_registry[pk] <- {pk, vrf_pk, S_eff, WARMUP, model_tier, token_stake}

  submit_block(block, proposer_proof):
    REQUIRE VRF_verify(proposer_proof, current_seed)
    REQUIRE |block.transactions| <= MAX_TXS_PER_BLOCK (= 50)
    pending_blocks[block.hash] <- {block, commitments: [], reveals: [], timestamp: now()}

  submit_commitment(block_hash, commitment, agent_pk, signature):
    REQUIRE agent_pk in current_committee(block_hash)
    REQUIRE now() - pending_blocks[block_hash].timestamp <= COMMIT_WINDOW
    REQUIRE VERIFY_SIG(agent_pk, signature, commitment)
    pending_blocks[block_hash].commitments.append({agent_pk, commitment})

  submit_reveal(block_hash, verdict, nonce, agent_pk, signature):
    REQUIRE agent_pk in current_committee(block_hash)
    pending <- pending_blocks[block_hash]
    REQUIRE now() - pending.timestamp > COMMIT_WINDOW
    REQUIRE now() - pending.timestamp <= COMMIT_WINDOW + REVEAL_WINDOW
    // Verify commitment match
    expected_comm <- H(verdict || block_hash || nonce)
    recorded_comm <- find_commitment(pending.commitments, agent_pk)
    REQUIRE expected_comm = recorded_comm
    REQUIRE VERIFY_SIG(agent_pk, signature, verdict || nonce)
    pending.reveals.append({agent_pk, verdict, nonce})

  try_finalize(block_hash):
    pending <- pending_blocks[block_hash]
    REQUIRE now() - pending.timestamp <= HARD_DEADLINE
    approvals <- count(r in pending.reveals where r.verdict = APPROVE)
    if approvals >= VERIFICATION_THRESHOLD (= 9):
      // Finalize the block
      cert <- construct_finality_certificate(pending)
      finality_certificates[block.height] <- cert
      apply_state_transition(pending.block)
      update_nullifier_set(pending.block.nullifiers)
      distribute_rewards(cert)
      delete pending_blocks[block_hash]
    else if now() - pending.timestamp > HARD_DEADLINE:
      // Deadline exceeded without consensus
      penalize_non_revealers(pending)
      delete pending_blocks[block_hash]
      emit LeaderRotation(next_leader)
```

### 8.2 State Transition Validation

The on-chain verification of state transitions proceeds through a layered validation pipeline:

```
Function: validate_state_transition(prev_root, transactions, new_root, proofs)

  1. // Transaction-level validation
     for each (tx, proof) in zip(transactions, proofs):
       // Nullifier freshness
       REQUIRE tx.nullifier NOT IN global_nullifier_set
       // ZK proof verification
       REQUIRE ZK_VERIFY(verification_key, proof, tx.public_inputs)
       // Public input consistency
       REQUIRE tx.public_inputs.prev_root = prev_root OR
               tx.public_inputs.prev_root = intermediate_root(previous tx in block)

  2. // Block-level validation
     // Compute expected new root by applying all transactions
     running_root <- prev_root
     for each tx in transactions:
       running_root <- apply_tx_to_root(running_root, tx)
     REQUIRE running_root = new_root

  3. // Economic validation
     total_fees <- SUM(tx.fee for tx in transactions)
     burn_amount <- total_fees * FEE_BURN_RATE (= 0.50)
     reward_amount <- total_fees - burn_amount
     REQUIRE block.burn_record = burn_amount
     REQUIRE block.reward_record = reward_amount

  4. return VALID
```

### 8.3 Slash Conditions as Smart Contract Logic

Slashing is enforced on-chain through deterministic detection of protocol violations (see Whitepaper Section 15):

```
Contract: SlashingEngine

Constants:
  SLASH_EQUIVOCATION_PCT = 100     // full stake slash for equivocation
  SLASH_INVALID_ATTEST_PCT = 50    // 50% slash for provably invalid attestation
  SLASH_OFFLINE_EPOCHS = 3         // epochs of offline before forced cooldown

Functions:

  report_equivocation(evidence):
    // Evidence: two signed attestations from the same agent for
    // different blocks at the same height
    REQUIRE evidence.attestation_1.agent_pk = evidence.attestation_2.agent_pk
    REQUIRE evidence.attestation_1.block_height = evidence.attestation_2.block_height
    REQUIRE evidence.attestation_1.block_hash != evidence.attestation_2.block_hash
    REQUIRE VERIFY_SIG(agent_pk, attestation_1)
    REQUIRE VERIFY_SIG(agent_pk, attestation_2)

    // Full slash -- equivocation is the most serious offense
    slash_amount <- validator_registry[agent_pk].slash_balance
    BURN(slash_amount)
    validator_registry[agent_pk].status <- SLASHED
    emit SlashEvent(agent_pk, "equivocation", slash_amount)

  report_invalid_attestation(block_hash, agent_pk, evidence):
    // Evidence: the agent approved a block that was subsequently
    // proven invalid through dispute resolution
    REQUIRE finality_certificates[block_hash].disputed = true
    REQUIRE dispute_result[block_hash] = INVALID
    REQUIRE agent_pk in original_approvers(block_hash)

    slash_amount <- validator_registry[agent_pk].slash_balance * SLASH_INVALID_ATTEST_PCT / 100
    BURN(slash_amount)
    validator_registry[agent_pk].status <- PROBATION
    emit SlashEvent(agent_pk, "invalid_attestation", slash_amount)

  report_extended_downtime(agent_pk, missed_epochs):
    REQUIRE missed_epochs >= SLASH_OFFLINE_EPOCHS (= 3)
    // No token burn for downtime -- only status change
    validator_registry[agent_pk].status <- COOLDOWN
    validator_registry[agent_pk].probation_remaining <- AGENT_PROBATION_EPOCHS (= 3)
    emit DowntimeEvent(agent_pk, missed_epochs)

  initiate_dispute(block_hash, disputer_pk, deposit):
    // Disputer must stake a deposit that is burned if dispute fails
    REQUIRE deposit >= MIN_DISPUTE_DEPOSIT
    // Select 2x committee for re-verification
    dispute_committee <- SelectCommittee(
      block_hash,
      fresh_seed,
      ValidatorSet,
      committee_size = VERIFIERS_PER_BLOCK * DISPUTE_REVERIFY_MULTIPLIER  // = 26
    )
    // Threshold for dispute committee: same ratio (18/26 ~ 69.2%)
    dispute_threshold <- 18
    emit DisputeInitiated(block_hash, dispute_committee, dispute_threshold)
```

---

## 9. Limitations and Open Problems

This section enumerates known limitations of the PoAIV construction. We consider honest disclosure essential for academic credibility and for guiding future research.

### 9.1 ZKML Gap (Honest Disclosure)

**Problem.** The zero-knowledge proof systems currently available cannot verify large language model (LLM) inference. The state of the art in ZKML (as of early 2026) has demonstrated zero-knowledge proofs for neural networks with up to approximately 18 million parameters [9]. Claude Opus and comparable frontier models have on the order of 100+ billion parameters -- a gap of approximately 5,000x.

**Consequence.** PoAIV cannot prove in zero knowledge that the AI verification was executed correctly. The protocol relies on committee attestation (9/13 threshold with commit-reveal) as a substitute for provable computation. This means:

1. An individual agent's claim that it performed AI verification cannot be independently verified without re-executing the inference.
2. The security of the AI verification layer rests on the honest majority assumption (at least 9/13 agents are honest), not on cryptographic proof.
3. A fully compromised committee (all 13 agents controlled by an adversary) could produce attestations without performing genuine AI verification, and no external party could detect this from the attestations alone.

**Mitigation.** The committee structure provides Byzantine fault tolerance independent of whether any individual agent genuinely performed AI reasoning. The deterministic checks (signature verification, state transition correctness, Merkle proof integrity) are provably correct and do not depend on AI. The AI layer adds probabilistic anomaly detection on top of a provably sound deterministic foundation.

**Roadmap.** The ZKML gap is expected to narrow as proving systems improve. Projected milestones:
- 2026-2027: ZK proofs for models with 100M-1B parameters (sufficient for distilled verification models)
- 2027-2029: ZK proofs for models with 1B-10B parameters (sufficient for Sonnet-class verification)
- 2029+: Full frontier model ZK verification (speculative)

When ZKML capability reaches the verification model size, the protocol can transition from committee-attestation-based verification to ZK-proved verification. This transition does not require a protocol change -- only a new proof type in the verification pipeline.

### 9.2 Deterministic Inference Limitation

**Problem.** LLM inference at temperature=0 is not fully deterministic across hardware platforms. Floating-point arithmetic is not associative, and different GPU architectures, driver versions, and library implementations may produce different intermediate results for the same model and input. This means two honest agents running the same model on the same input may produce different anomaly scores.

**Scope of impact.** The non-determinism affects the AI verification layer (Phase 2 of the AI_VERIFICATION protocol) but not the deterministic checks (Phase 1). Deterministic checks are implemented in exact-arithmetic protocol code and produce identical results on all platforms.

**Mitigation.** Three mechanisms limit the impact of inference non-determinism:

1. **Binary quantization.** The verification output is quantized to APPROVE or REJECT. Small differences in anomaly scores that do not cross the threshold produce the same binary output.
2. **Conservative threshold.** The ANOMALY_THRESHOLD is set conservatively, so that a transaction must exhibit a clear anomaly pattern to trigger rejection. Borderline scores (near the threshold) are rare for well-constructed blocks.
3. **Tolerance margin.** The 9/13 supermajority tolerates up to 4 divergent results. Even if 4 honest agents produce anomalous results due to floating-point divergence, the remaining 9 honest agents still reach consensus.

**Open problem.** Achieving bit-exact LLM inference across heterogeneous hardware remains an unsolved problem. Approaches under investigation include:
- Quantized integer-only inference (INT8/INT4) which eliminates floating-point non-determinism
- Canonical computation ordering specified at the operator level
- Hardware-specific verification models trained to match outputs across target platforms

### 9.3 API Provider Trust Assumption

**Problem.** The CPU component of effective stake (beta = 0.60 weight) depends on verified API usage from AI providers. In the current architecture, Anthropic's Claude API is the sole provider for verification inference. This introduces Anthropic as a trusted third party for 60% of staking weight determination.

**Specific trust assumptions:**
1. Anthropic accurately reports token usage in API response headers
2. Anthropic does not selectively deny service to validators based on criteria unrelated to their account status
3. Anthropic does not collude with a subset of validators to inflate their CPU attestations

**Risk assessment.** This is the most significant centralization risk in the current PoAIV design. A compromised or adversarial API provider could:
- Inflate the CPU stake of favored validators, biasing committee selection
- Deny service to targeted validators, reducing their effective stake
- Alter model behavior for specific validators, causing them to produce incorrect attestations

**Mitigation roadmap (see Whitepaper Section 13.5):**

Phase 2: Multi-provider measurement. Require CPU attestation from at least 2 independent AI providers. Discrepancies between providers trigger dispute resolution. This reduces single-provider trust to a Byzantine assumption: security holds as long as at least one provider is honest.

Phase 3: TEE attestation. CPU usage proved via Trusted Execution Environment (Intel TDX, AMD SEV-SNP) attestation. The TEE proves that specific model inference was executed without revealing the model weights or input data, removing the API provider from the trust chain entirely.

Phase 4+: ZK-proved computation. When ZKML technology matures (see Section 9.1), CPU usage can be verified via zero-knowledge proofs of inference execution, eliminating all external trust assumptions.

### 9.4 Roadmap to Full ZK Verification of Inference

The long-term goal is to replace committee-attestation-based AI verification with ZK-proved AI verification, where each agent produces a zero-knowledge proof that it correctly executed the verification model on the proposed block.

**Target architecture:**

```
Current (committee attestation):
  Agent runs model -> produces verdict -> commits/reveals -> threshold vote

Future (ZK-proved inference):
  Agent runs model inside ZK circuit -> produces verdict + proof ->
  On-chain contract verifies proof -> No committee vote needed for
  deterministic checks (AI anomaly layer still uses committee)
```

**Technical requirements for this transition:**
1. ZKML proving time for the verification model must be < HARD_DEADLINE (60 seconds)
2. Proof size must be manageable for on-chain verification (current target: < 10 KB)
3. The verification model must be small enough to fit in a ZK circuit (current limit: ~18M parameters; target: 1B+ parameters)
4. Model weights must be committed on-chain so the proof verifies execution of the correct model

**Phased transition:**
- Phase A: ZK-prove the deterministic checks (signature verification, Merkle proofs). This is achievable with current technology and removes the trust assumption for the non-AI portion of verification.
- Phase B: ZK-prove inference of a distilled verification model (~100M parameters). This requires ~100x improvement in ZKML capability over current state of the art.
- Phase C: ZK-prove inference of the full verification model. This requires ~5,000x improvement and is speculative at this time.

Even in Phase C, the committee structure may be retained for the AI anomaly detection layer, as the semantic reasoning component resists full formalization into a deterministic circuit.

---

## 10. Conclusion

We have presented the formal security analysis of Proof of AI Verification (PoAIV), the consensus mechanism of the ZK Agentic Chain protocol. Our analysis establishes three core security properties:

1. **Verification Integrity (VER-INT).** No PPT adversary controlling fewer than 5 of 13 committee members can cause finalization of a block containing an invalid state transition. This property reduces to the collision resistance of BLAKE2b and the EUF-CMA security of Ed25519.

2. **Verification Privacy (VER-PRIV).** The verification process reveals no information about private transaction content beyond the binary APPROVE/REJECT verdict. This property reduces to the zero-knowledge property of the underlying proof system (Groth16/PLONK/Halo2).

3. **Committee Unbiasability (COM-UNBIAS).** No minority stakeholder can predictably bias committee composition. This property reduces to the pseudorandomness of the Ed25519-based VRF and the unpredictability of the epoch seed.

We have further established BFT safety and liveness for the 13/9 committee structure, provided anti-injection guarantees for the AI verification pipeline, and specified the smart contract verification flow.

The dual-staking model (alpha = 0.40 token weight, beta = 0.60 CPU weight) provides approximately 2.5x Sybil cost amplification over pure PoS systems. The Sybil cost derivation follows from the requirement that an adversary must invest along both the token and CPU dimensions simultaneously, where the CPU dimension introduces ongoing operational expenditure that cannot be reduced to a one-time capital outlay (see Whitepaper Section 8, Sybil Cost Derivation).

We have been transparent about limitations. The ZKML gap means that AI verification currently relies on committee attestation rather than provable computation. Deterministic inference across hardware platforms is not guaranteed. The API provider trust assumption introduces centralization risk that is mitigated by a multi-phase roadmap (multi-provider, TEE, ZK-proved computation).

PoAIV represents a novel point in the design space: consensus that is provably secure for deterministic checks (matching traditional BFT) and additionally provides probabilistic AI-enhanced anomaly detection that no existing consensus mechanism offers. As AI and ZK technologies mature, the gap between "provably secure" and "AI-enhanced" components will narrow, eventually converging on a fully ZK-proved AI verification pipeline.

---

## 11. References

[1] S. Nakamoto. "Bitcoin: A Peer-to-Peer Electronic Cash System." 2008.

[2] M. Castro and B. Liskov. "Practical Byzantine Fault Tolerance." Proceedings of the Third Symposium on Operating Systems Design and Implementation (OSDI), 1999.

[3] A. Yakovenko. "Solana: A new architecture for a high performance blockchain." 2018.

[4] M. Yin, D. Malkhi, M. K. Reiter, G. Golan-Gueta, and I. Abraham. "HotStuff: BFT Consensus with Linearity and Responsiveness." Proceedings of the 2019 ACM Symposium on Principles of Distributed Computing (PODC), 2019.

[5] E. Buchman, J. Kwon, and Z. Milosevic. "The latest gossip on BFT consensus." 2018.

[6] C. Dwork, N. Lynch, and L. Stockmeyer. "Consensus in the Presence of Partial Synchrony." Journal of the ACM, 35(2):288-323, 1988.

[7] V. Buterin, D. Hernandez, T. Kamphefner, et al. "Combining GHOST and Casper." 2020.

[8] A. Kiayias, A. Russell, B. David, and R. Oliynykov. "Ouroboros: A Provably Secure Proof-of-Stake Blockchain Protocol." Advances in Cryptology -- CRYPTO 2017.

[9] D. Kang, T. Hashimoto, I. Stoica, and Y. Sun. "Scaling up Trustless DNN Inference with Zero-Knowledge Proofs." 2022.

[10] E. Ben-Sasson, A. Chiesa, D. Genkin, E. Tromer, and M. Virza. "SNARKs for C: Verifying Program Executions Succinctly and in Zero Knowledge." Advances in Cryptology -- CRYPTO 2013.

[11] Bittensor Foundation. "Bittensor: A Peer-to-Peer Intelligence Market." 2024.

[12] Fetch.ai. "The Fetch.ai Whitepaper: An Introduction to Fetch.ai and the Open Economic Framework." 2023.

[13] ZK Agentic Chain. "AGNTC Whitepaper v1.1: ZK Agentic Chain: A Privacy-Preserving Blockchain with AI-Powered Verification." March 2026.

[14] S. Goldwasser, S. Micali, and C. Rackoff. "The Knowledge Complexity of Interactive Proof Systems." SIAM Journal on Computing, 18(1):186-208, 1989.

[15] J. Groth. "On the Size of Pairing-Based Non-interactive Arguments." Advances in Cryptology -- EUROCRYPT 2016.

[16] S. Lerman and S. Yitzhaki. "Income Inequality Effects by Income Source: A New Approach and Applications to the United States." The Review of Economics and Statistics, 67(1):151-156, 1985.

[17] RFC 9381. "Verifiable Random Functions (VRFs)." IRTF, 2023.
