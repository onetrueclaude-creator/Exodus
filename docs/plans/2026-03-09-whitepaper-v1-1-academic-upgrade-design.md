# Whitepaper v1.1 Academic Upgrade — Design Document

> **Date:** 2026-03-09
> **Status:** APPROVED
> **Branch:** exodus-dev

---

## Goal

Upgrade the AGNTC whitepaper from a strong v1.0 product document to a peer-review-quality technical specification, and produce three companion documents. Close every gap identified in the competitor analysis (Solana, Zcash, zkSync, Bitcoin).

## Deliverables

| # | Document | Path | Audience | Est. Pages |
|---|----------|------|----------|-----------|
| 1 | Whitepaper v1.1 | `vault/whitepaper.md` | Engineers + investors | ~70 |
| 2 | PoAIV Formal Paper | `vault/poaiv-formal.md` | Academics + auditors | ~20 |
| 3 | Feasibility Report | `vault/feasibility-report.md` | Investors + partners | ~15 |
| 4 | Litepaper | `vault/litepaper.md` | Community + casual investors | 5-8 |

**Backup:** `vault/whitepaper-v1-0.md` (already created)

---

## 1. Whitepaper v1.1 — Section-by-Section Changes

### 1.1 Structural Additions (New Sections)

| Addition | Where | Why |
|----------|-------|-----|
| Table of Contents | After abstract | Navigation for 70+ page document |
| Diagrams (5-6) | Throughout | Zero diagrams currently; every competitor has visual aids |
| "Limitations and Open Problems" (new Section 24) | Before glossary | Zcash-style honesty builds credibility; disclose ZKML gap |
| Competitor Comparison Table | Section 2 | Position AGNTC vs SOL, ZEC, zkSync, Bittensor, Lightchain |
| Notation/Conventions | After TOC | Standardize math notation (currently mixes LaTeX and code) |

### 1.2 Diagrams to Create

All diagrams as ASCII art within markdown (PDF generator renders as code blocks):

1. **Galaxy Grid Structure** — 4-arm logarithmic spiral with faction quadrants, epoch rings, coordinate system
2. **Block Production Lifecycle** — VRF selection → committee formation → AI verification → attestation → finality
3. **Subgrid Allocation Model** — 8x8 grid showing 4 cell types with resource flow
4. **ZK Proof Pipeline** — Transaction → Circuit → Proof → Verification → State Update
5. **Dual Staking Model** — Token stake + CPU stake → S_eff calculation → committee selection weight
6. **Migration Architecture** — Solana SPL → Bridge → Layer-1 native token

### 1.3 Section Upgrades

#### Sections 3-5: PoAIV Consensus (CRITICAL — weakest area)

**Current state:** Prose description of AI verification without formalizing what "reasoning" means or what AI catches that deterministic code cannot.

**Changes:**
- Add pseudocode for: committee selection algorithm, attestation voting protocol, block production sequence
- Add per-mechanism attack analysis (Solana pattern):
  - PoAIV → model poisoning attack + mitigation (heterogeneous model requirement)
  - PoAIV → prompt injection attack + mitigation (JSON schema enforcement, no tool calls during voting)
  - PoAIV → inference cost attack + mitigation (fee market, minimum stake threshold)
  - Committee → Sybil attack + mitigation (dual staking makes it 2.5x more expensive — derive the 2.5x!)
  - Committee → model collusion + mitigation (≥3 distinct providers required)
- Reference the separate PoAIV formal paper for full security proofs
- Add concrete claim: "PoAIV adds value over deterministic verification by detecting [specific class of attacks] that require semantic understanding"

#### Section 4: Verification Committee

**Changes:**
- Specify VRF construction (Ed25519-based VRF, RFC 9381)
- Specify seed derivation (previous block hash + epoch counter)
- Specify output format and thresholding
- Fix selection probability formula: change from geometric to hypergeometric distribution (without-replacement sampling)
- Add committee formation timing diagram

#### Section 6: ZK Privacy Layer

**Changes:**
- Add estimated constraint counts for planned circuits
- Add proving time targets (reference enforced ZK L1 design: `docs/plans/2026-03-04-enforced-zk-l1-design.md`)
- Add circuit architecture overview (Groth16 for per-transaction, recursive PLONK for batch)
- Clarify cross-user verification: how verifiers confirm global state root with private subtrees

#### Section 7: Isolated Ledger Spaces

**Changes:**
- Add cryptographic specification for cross-user verification
- Describe the ZK circuit that enables "verify consistency without accessing data"
- Reference the Sparse Merkle Tree proof structure

#### Section 8: Security Analysis

**Restructure as per-mechanism attack vectors:**
- Rename to "Threat Model and Security Analysis"
- Add formal adversary model: computational bound, network model (partial synchrony), corruption model (adaptive vs static)
- Derive the 2.5x Sybil cost claim with explicit cost model
- Address deterministic inference limitation (temperature=0 is NOT fully deterministic across hardware)
- Add: "What survives compromised components" table (following Zcash model)

#### Section 13: ZK-CPU Dual Staking

**Changes:**
- Address CPU measurement centralization: Anthropic API as trusted third party is an explicit trust assumption
- Describe mitigation path: multi-provider CPU measurement, future TEE attestation
- Fix VRF selection formula (hypergeometric, not geometric)

#### Section 14.4: Reward Projections

**Changes:**
- Complete the APY table with actual projections from testnet simulations
- Add assumptions column (total staked, mining rate, epoch)

#### Section 23: Mathematical Proofs

**Changes:**
- Convert hardness curve "proof sketch" to full proof with explicit economic assumptions stated separately
- Fix Gini coefficient formula: standard weighted Gini decomposition, remove unexplained "correction" term
- Add proof of committee unbiasability under dual staking

#### Existing Strong Sections (Minimal Changes)

- **Sections 9-12 (Tokenomics):** Keep as-is, add one comparison table vs Bitcoin/Ethereum/Solana/Filecoin inflation models
- **Sections 16-17 (Subgrid):** Keep as-is, add one ASCII diagram
- **Section 22 (Parameters):** Keep as-is

---

## 2. PoAIV Formal Paper

**Purpose:** The separate academic-quality paper that the whitepaper references for full proofs. This is the "Casper FFG paper" equivalent for AGNTC.

### Structure

```
1. Abstract
2. Introduction & Motivation
   2.1 Why AI Verification?
   2.2 Comparison with Traditional BFT
   2.3 Contribution Summary
3. System Model
   3.1 Network Model (partial synchrony)
   3.2 Adversary Model (bounded, adaptive)
   3.3 AI Agent Model (capabilities, limitations)
4. Formal Definitions
   4.1 PoAIV Scheme = (Setup, SelectCommittee, Verify, Attest, Finalize)
   4.2 Security Property: Verification Integrity (formal game)
   4.3 Security Property: Verification Privacy (formal game)
   4.4 Security Property: Committee Unbiasability (formal game)
5. Construction
   5.1 Committee Selection Protocol (full pseudocode)
   5.2 AI Verification Protocol (what the agent checks, in formal terms)
   5.3 Attestation and Finality Protocol
   5.4 Commit-Reveal Scheme (message formats)
6. Security Analysis
   6.1 Proof of Verification Integrity
   6.2 Proof of Verification Privacy
   6.3 Proof of Committee Unbiasability
   6.4 BFT Safety and Liveness (existing proof, cleaned up)
7. Anti-Injection Guarantees
   7.1 Prompt Injection Defense Model
   7.2 Agent Memory Integrity (isolation guarantees)
   7.3 Consensus Isolation (no external influence on voting)
   7.4 Multi-Model Diversity Requirement
8. Smart Contract Verification Flow
   8.1 On-Chain Verification Contract
   8.2 State Transition Validation
   8.3 Slash Conditions as Smart Contract Logic
9. Limitations and Open Problems
   9.1 ZKML Gap (honest disclosure)
   9.2 Deterministic Inference Limitation
   9.3 API Provider Trust Assumption
   9.4 Roadmap to Full ZK Verification of Inference
10. Conclusion
11. References
```

### Key Formal Definitions to Write

**Verification Integrity Game:**
```
Game VER-INT(A, lambda):
  1. Challenger C runs Setup(lambda) → (params, committee_keys)
  2. Adversary A gets oracle access to Verify, Attest
  3. A adaptively corrupts up to t < n/3 committee members
  4. A outputs (block*, attestation*) where block* contains invalid state transition
  5. A wins if Finalize(block*, attestation*) = ACCEPT

PoAIV is VER-INT secure if Pr[A wins] <= negl(lambda) for all PPT A
```

**Verification Privacy Game:**
```
Game VER-PRIV(A, lambda):
  1. A submits two transactions tx0, tx1 with identical public outputs
  2. Challenger selects b ← {0,1}, runs Verify on tx_b
  3. A sees committee attestations
  4. A outputs guess b'
  5. A wins if b' = b

PoAIV is VER-PRIV secure if |Pr[A wins] - 1/2| <= negl(lambda)
```

**Committee Unbiasability Game:**
```
Game COM-UNBIAS(A, lambda):
  1. A controls stake < 1/3 of total
  2. A adaptively chooses VRF inputs
  3. Let C_actual = selected committee, C_target = A's preferred committee
  4. A wins if Pr[C_actual = C_target] > poly-advantage over random

PoAIV is COM-UNBIAS secure if A's advantage <= negl(lambda)
```

---

## 3. Feasibility Report

### Structure

```
1. Executive Summary
2. Technology Assessment
   2.1 What's Built and Tested (593+ tests, 60+ modules)
   2.2 What's Simulated (ZK proofs, AI verification)
   2.3 What's Theoretical (bridge, governance, TEE)
3. Competitor Positioning
   3.1 Comparison Matrix (35+ projects)
   3.2 Novel Claims Assessment
   3.3 Market Gap Analysis
4. Technical Risk Analysis
   4.1 Consensus Risk (PoAIV — novel, unproven at scale)
   4.2 ZK Implementation Risk (circuit complexity, proving times)
   4.3 AI Provider Dependency Risk (Anthropic API as trust anchor)
   4.4 Scalability Risk (13-agent committee per block)
5. Economic Risk Analysis
   5.1 Token Economics Sustainability
   5.2 Mining Economics (hardness curve convergence)
   5.3 Staking Incentive Alignment
6. Regulatory Considerations
   6.1 Token Classification
   6.2 AI Liability
   6.3 Privacy Compliance (GDPR, local laws)
7. Implementation Timeline
   7.1 Phase 1: Enforced ZK L1 (current)
   7.2 Phase 2: Alpha (real AI verification)
   7.3 Phase 3: Beta (NCP privacy, bridges)
   7.4 Phase 4: Mainnet
8. Resource Requirements
9. Conclusion
```

---

## 4. Litepaper

### Structure (5-8 pages, non-technical)

```
1. The Problem: Why Current Blockchains Fall Short (1 page)
2. The Solution: AI-Verified, Privacy-First (1 page)
3. How It Works (2 pages)
   - Galaxy Grid visual explanation
   - PoAIV in plain English
   - Dual staking explained simply
4. Token Economics (1 page)
   - Supply: 1B AGNTC
   - 4 factions, equal distribution
   - Organic growth (no scheduled inflation)
5. Roadmap (1 page)
   - Testnet → Alpha → Beta → Mainnet
6. Get Involved (0.5 page)
```

---

## 5. PDF Generator Fix

**Issue:** Header line crosses text on every page.

**Fix in `gen_whitepaper_pdf.py`:**
- Move header text up by adjusting `self.ln()` spacing
- Ensure `self.line()` draws below the text baseline
- Update version string to "v1.1"

---

## 6. Execution Strategy

**Order:** Whitepaper v1.1 → PoAIV Paper → Feasibility Report → Litepaper → PDF Generation

**Writing approach:** Each document is a markdown file in `vault/`. The existing PDF generator converts `vault/whitepaper.md` to PDF. New generators (or the same one parameterized) handle the other docs.

**Quality gates:**
- Each document reviewed against competitor benchmarks before marking complete
- Cross-references between documents verified
- All claims traceable to implementation (`vault/agentic-chain/`) or explicitly marked as "planned"

---

## Key Design Decisions

1. **Honest limitations section** — disclose ZKML gap openly, following Zcash model
2. **Solana-style attack analysis** — Description → Algorithm → Verification → Attack per mechanism
3. **Zcash-style security games** — formal cryptographic experiments for 3 core properties
4. **Separate PoAIV paper** — keeps whitepaper accessible while providing academic depth
5. **ASCII diagrams** — work within markdown + fpdf2 Latin-1 constraint (no image embedding needed)
6. **Backup strategy** — v1.0 preserved as `whitepaper-v1-0.md`, all changes in v1.1
