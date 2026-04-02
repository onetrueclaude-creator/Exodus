# Phase 1: Whitepaper Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Systematically audit whitepaper v1.2 against testnet code, fix all discrepancies, verify math formulas, and produce whitepaper v1.3 with zero code-spec mismatches.

**Architecture:** Three megatasks executed sequentially — (1) cross-reference audit produces a concordance table + discrepancy reports, (2) math verification produces simulation outputs, (3) whitepaper polish produces v1.3. Each megatask builds on the prior one's findings.

**Tech Stack:** Python 3 (pytest), existing testnet at `vault/agentic-chain/`, whitepaper at `vault/whitepaper.md`

---

## Megatask 1.1: Cross-Reference Audit (Whitepaper vs Testnet Code)

### Task 1: Parameter Concordance — Consensus & Staking

**Files:**
- Read: `vault/whitepaper.md:2064-2092` (Section 22, Consensus + Staking tables)
- Read: `vault/agentic-chain/agentic/params.py`
- Create: `vault/agentic-chain/tests/test_whitepaper_audit.py`
- Create: `vault/audit-report/parameter-concordance.md`

**Step 1: Write the parameter concordance test — consensus params**

```python
"""Whitepaper v1.2 Section 22 cross-reference audit.

Each test asserts that a whitepaper parameter matches its code implementation.
A FAILING test is a discrepancy finding — document it, don't fix the test.
"""
import pytest
from agentic import params


class TestWhitepaperConsensusParams:
    """Section 22: Consensus Parameters — 8 params."""

    def test_block_time_ms(self):
        assert params.BLOCK_TIME_MS == 60_000

    def test_verifiers_per_block(self):
        assert params.VERIFIERS_PER_BLOCK == 13

    def test_verification_threshold(self):
        assert params.VERIFICATION_THRESHOLD == 9

    def test_zk_finality_target(self):
        assert params.ZK_FINALITY_TARGET_S == 20

    def test_slots_per_epoch(self):
        assert params.SLOTS_PER_EPOCH == 100

    def test_commit_window(self):
        assert params.VERIFICATION_COMMIT_WINDOW_S == 10.0

    def test_reveal_window(self):
        assert params.VERIFICATION_REVEAL_WINDOW_S == 20.0

    def test_hard_deadline(self):
        assert params.VERIFICATION_HARD_DEADLINE_S == 60.0
```

**Step 2: Run test to see baseline**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestWhitepaperConsensusParams -v`
Expected: All 8 PASS (these params exist and match)

**Step 3: Add staking parameter tests**

```python
class TestWhitepaperStakingParams:
    """Section 22: Staking Parameters — 7 params."""

    def test_alpha(self):
        assert params.ALPHA == 0.40

    def test_beta(self):
        assert params.BETA == 0.60

    def test_reward_split_verifier(self):
        assert params.REWARD_SPLIT_VERIFIER == 0.60

    def test_reward_split_staker(self):
        assert params.REWARD_SPLIT_STAKER == 0.40

    def test_reward_split_orderer(self):
        assert params.REWARD_SPLIT_ORDERER == 0.00

    def test_secure_reward_immediate(self):
        assert params.SECURE_REWARD_IMMEDIATE == 0.50

    def test_secure_reward_vest_days(self):
        assert params.SECURE_REWARD_VEST_DAYS == 30
```

**Step 4: Run all staking tests**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestWhitepaperStakingParams -v`
Expected: All 7 PASS

**Step 5: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: add whitepaper concordance tests — consensus + staking params"
```

---

### Task 2: Parameter Concordance — Token Economics & Mining

**Files:**
- Read: `vault/whitepaper.md:2093-2122` (Section 22, Token Economics + Mining tables)
- Read: `vault/agentic-chain/agentic/params.py`
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Add token economics tests (expect some FAILURES — missing params)**

```python
class TestWhitepaperTokenEconomics:
    """Section 22: Token Economics — 12 params.
    
    KNOWN GAPS: ANNUAL_INFLATION_CEILING, SIGNUP_BONUS,
    MACHINES_SELL_ALLOWED are in whitepaper but may be missing from params.py.
    """

    def test_max_supply(self):
        assert params.MAX_SUPPLY == 1_000_000_000

    def test_genesis_supply(self):
        assert params.GENESIS_SUPPLY == 900

    def test_grid_side(self):
        assert params.GRID_SIDE == 31_623

    def test_fee_burn_rate(self):
        assert params.FEE_BURN_RATE == 0.50

    def test_dist_community(self):
        assert params.DIST_COMMUNITY == 0.25

    def test_dist_machines(self):
        assert params.DIST_MACHINES == 0.25

    def test_dist_founders(self):
        assert params.DIST_FOUNDERS == 0.25

    def test_dist_professional(self):
        assert params.DIST_PROFESSIONAL == 0.25

    def test_machines_min_sell_ratio(self):
        # Whitepaper says MACHINES_SELL_ALLOWED=false; code uses MIN_SELL_RATIO=1.0
        # Both express "never sell below cost" — naming discrepancy, not value mismatch
        assert params.MACHINES_MIN_SELL_RATIO == 1.0

    def test_annual_inflation_ceiling(self):
        """Whitepaper: ANNUAL_INFLATION_CEILING = 0.05 (5%)."""
        assert hasattr(params, 'ANNUAL_INFLATION_CEILING'), \
            "MISSING: ANNUAL_INFLATION_CEILING not in params.py (whitepaper says 0.05)"
        assert params.ANNUAL_INFLATION_CEILING == 0.05

    def test_signup_bonus(self):
        """Whitepaper: SIGNUP_BONUS = 1.0 AGNTC per new user."""
        assert hasattr(params, 'SIGNUP_BONUS'), \
            "MISSING: SIGNUP_BONUS not in params.py (whitepaper says 1.0)"
        assert params.SIGNUP_BONUS == 1.0
```

**Step 2: Run tests — document failures**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestWhitepaperTokenEconomics -v`
Expected: 9 PASS, 2 FAIL (ANNUAL_INFLATION_CEILING, SIGNUP_BONUS missing)

**Step 3: Add mining & epoch parameter tests**

```python
class TestWhitepaperMiningParams:
    """Section 22: Mining and Epoch Parameters — 9 params."""

    def test_base_mining_rate(self):
        assert params.BASE_MINING_RATE_PER_BLOCK == 0.5

    def test_hardness_multiplier(self):
        assert params.HARDNESS_MULTIPLIER == 16

    def test_genesis_epoch_ring(self):
        assert params.GENESIS_EPOCH_RING == 1

    def test_homenode_base_angle(self):
        assert params.HOMENODE_BASE_ANGLE == 137.5

    def test_node_grid_spacing(self):
        assert params.NODE_GRID_SPACING == 10

    def test_energy_per_claim(self):
        assert params.ENERGY_PER_CLAIM == 1.0

    def test_base_claim_cost(self):
        """Whitepaper: BASE_CLAIM_COST = 100 AGNTC."""
        assert hasattr(params, 'BASE_CLAIM_COST'), \
            "MISSING: BASE_CLAIM_COST not in params.py (whitepaper says 100)"
        assert params.BASE_CLAIM_COST == 100

    def test_base_cpu_claim_cost(self):
        """Whitepaper: BASE_CPU_CLAIM_COST = 50."""
        assert hasattr(params, 'BASE_CPU_CLAIM_COST'), \
            "MISSING: BASE_CPU_CLAIM_COST not in params.py (whitepaper says 50)"
        assert params.BASE_CPU_CLAIM_COST == 50

    def test_claim_cost_floor(self):
        """Whitepaper: CLAIM_COST_FLOOR = 0.01."""
        assert hasattr(params, 'CLAIM_COST_FLOOR'), \
            "MISSING: CLAIM_COST_FLOOR not in params.py (whitepaper says 0.01)"
        assert params.CLAIM_COST_FLOOR == 0.01
```

**Step 4: Run mining tests — document failures**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestWhitepaperMiningParams -v`
Expected: 6 PASS, 3 FAIL (BASE_CLAIM_COST, BASE_CPU_CLAIM_COST, CLAIM_COST_FLOOR missing)

**Step 5: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: add token economics + mining param concordance tests (5 missing params found)"
```

---

### Task 3: Parameter Concordance — Subgrid, Agent Lifecycle, Ledger, Genesis

**Files:**
- Read: `vault/whitepaper.md:2123-2165` (Section 22, remaining tables)
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Add remaining parameter categories**

```python
class TestWhitepaperSubgridParams:
    """Section 22: Subgrid Parameters — 6 params."""

    def test_subgrid_size(self):
        assert params.SUBGRID_SIZE == 64

    def test_base_secure_rate(self):
        assert params.BASE_SECURE_RATE == 0.5

    def test_base_develop_rate(self):
        assert params.BASE_DEVELOP_RATE == 1.0

    def test_base_research_rate(self):
        assert params.BASE_RESEARCH_RATE == 0.5

    def test_base_storage_rate(self):
        assert params.BASE_STORAGE_RATE == 1.0

    def test_level_exponent(self):
        assert params.LEVEL_EXPONENT == 0.8


class TestWhitepaperAgentLifecycle:
    """Section 22: Agent Lifecycle Parameters — 5 params."""

    def test_warmup_epochs(self):
        assert params.AGENT_WARMUP_EPOCHS == 1

    def test_probation_epochs(self):
        assert params.AGENT_PROBATION_EPOCHS == 3

    def test_safe_mode_threshold(self):
        assert params.SAFE_MODE_THRESHOLD == 0.20

    def test_safe_mode_recovery(self):
        assert params.SAFE_MODE_RECOVERY == 0.80

    def test_dispute_reverify(self):
        assert params.DISPUTE_REVERIFY_MULTIPLIER == 2


class TestWhitepaperLedgerParams:
    """Section 22: Ledger Parameters — 3 params."""

    def test_merkle_depth(self):
        assert params.MERKLE_TREE_DEPTH == 26

    def test_max_txs_per_block(self):
        assert params.MAX_TXS_PER_BLOCK == 50

    def test_max_planets(self):
        assert params.MAX_PLANETS_PER_SYSTEM == 10


class TestWhitepaperGenesisTopology:
    """Section 22: Genesis Topology — 3 params."""

    def test_genesis_origin(self):
        assert params.GENESIS_ORIGIN == (0, 0)

    def test_faction_masters(self):
        expected = [(0, 10), (10, 0), (0, -10), (-10, 0)]
        assert params.GENESIS_FACTION_MASTERS == expected

    def test_homenodes(self):
        expected = [(10, 10), (10, -10), (-10, -10), (-10, 10)]
        assert params.GENESIS_HOMENODES == expected
```

**Step 2: Run all whitepaper audit tests**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py -v`
Expected: ~44 PASS, ~5 FAIL (the missing params from Task 2)

**Step 3: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: complete parameter concordance — all 50+ whitepaper params tested"
```

---

### Task 4: Generate Parameter Concordance Report

**Files:**
- Create: `vault/audit-report/parameter-concordance.md`
- Read: Test output from Task 1-3

**Step 1: Create the audit report directory**

```bash
mkdir -p vault/audit-report
```

**Step 2: Write the concordance report**

Create `vault/audit-report/parameter-concordance.md` with a table listing every parameter from whitepaper Section 22, its whitepaper value, its `params.py` value (or "MISSING"), and the verdict (MATCH / MISMATCH / MISSING / NAMING_DIFF). Include:

- Header with date, whitepaper version, code commit hash
- One table per parameter category (8 categories)
- Summary: X matched, Y missing, Z mismatched
- Each MISSING/MISMATCH entry gets a recommendation: "Add to params.py" or "Update whitepaper"

**Step 3: Commit**

```bash
git add vault/audit-report/parameter-concordance.md
git commit -m "audit: parameter concordance report — N matched, M missing, K naming diffs"
```

---

### Task 5: Cross-Reference — Consensus Mechanics (Section 5 vs consensus/)

**Files:**
- Read: `vault/whitepaper.md:325-535` (Section 5: PoAIV)
- Read: `vault/agentic-chain/agentic/consensus/validator.py`
- Read: `vault/agentic-chain/agentic/consensus/vrf.py`
- Read: `vault/agentic-chain/agentic/consensus/simulator.py`
- Read: `vault/agentic-chain/agentic/consensus/block.py`
- Read: `vault/agentic-chain/agentic/verification/pipeline.py`
- Read: `vault/agentic-chain/agentic/verification/agent.py`
- Create: `vault/audit-report/consensus-discrepancies.md`

**Step 1: Read all whitepaper consensus sections and code**

Systematically compare:
- Committee selection (VRF-based, 13 agents) — does `vrf.py` implement the whitepaper VRF?
- Attestation protocol (commit-reveal) — does `commitment.py` match?
- Threshold (9/13) — is it enforced in `validator.py` or `pipeline.py`?
- Block lifecycle — does the code match the whitepaper's block proposal → commit → reveal → finalize flow?
- Safe mode — is it implemented per whitepaper spec?

**Step 2: Write discrepancy report**

Each finding gets:
- **Location:** Whitepaper section + code file:line
- **Whitepaper says:** [exact spec]
- **Code does:** [exact behavior]
- **Severity:** Critical / Major / Minor / Cosmetic
- **Recommendation:** Fix code / Fix whitepaper / Add TODO

**Step 3: Commit**

```bash
git add vault/audit-report/consensus-discrepancies.md
git commit -m "audit: consensus cross-reference — N discrepancies found"
```

---

### Task 6: Cross-Reference — Tokenomics (Sections 9-14 vs economics/)

**Files:**
- Read: `vault/whitepaper.md:858-1515` (Sections 9-15: Token Economics + Staking + Rewards + Slashing)
- Read: `vault/agentic-chain/agentic/economics/fees.py`
- Read: `vault/agentic-chain/agentic/economics/staking.py`
- Read: `vault/agentic-chain/agentic/economics/rewards.py`
- Read: `vault/agentic-chain/agentic/economics/vesting.py`
- Read: `vault/agentic-chain/agentic/economics/slashing.py`
- Read: `vault/agentic-chain/agentic/economics/inflation.py`
- Read: `vault/agentic-chain/agentic/galaxy/mining.py`
- Create: `vault/audit-report/tokenomics-discrepancies.md`

**Step 1: Read all tokenomics sections and code**

Systematically compare:
- Fee model: 50% burn, 50% to verifiers/stakers — does `fees.py` implement this?
- Staking: dual model (40% token, 60% CPU) — does `staking.py` compute `S_eff = 0.4T + 0.6C`?
- Rewards: verifier 60%, staker 40% — does `rewards.py` distribute correctly?
- Vesting: 50% immediate, 50% over 30 days — does `vesting.py` match?
- Slashing: conditions defined in Section 15 — are they enforced?
- Mining: yield formula `BASE_RATE × density / hardness` — does `mining.py` match?
- Inflation ceiling: 5% annual — is it enforced anywhere?
- Legacy code: identify all `_LEGACY_*` constants and determine if they're dead or active

**Step 2: Write discrepancy report**

Same format as Task 5. Pay special attention to:
- `rewards.py` references "whitepaper v0.2" in its docstring — is the implementation v2-compliant?
- Missing `ANNUAL_INFLATION_CEILING` enforcement
- Burn-Mint Equilibrium for node claims — implemented?

**Step 3: Commit**

```bash
git add vault/audit-report/tokenomics-discrepancies.md
git commit -m "audit: tokenomics cross-reference — N discrepancies found"
```

---

### Task 7: Cross-Reference — Privacy (Section 6 vs privacy/ + ledger/)

**Files:**
- Read: `vault/whitepaper.md:536-663` (Section 6: Privacy Architecture)
- Read: `vault/agentic-chain/agentic/ledger/merkle.py`
- Read: `vault/agentic-chain/agentic/ledger/nullifier.py`
- Read: `vault/agentic-chain/agentic/ledger/poseidon.py`
- Read: `vault/agentic-chain/agentic/ledger/record.py`
- Create: `vault/audit-report/privacy-discrepancies.md`

**Step 1: Read all privacy sections and code**

Systematically compare:
- Sparse Merkle Tree: depth 26, per-user — does `merkle.py` match?
- Nullifier system: Zcash Sapling-style — does `nullifier.py` match?
- Poseidon hash: used for SMT — does `poseidon.py` implement correctly?
- ZK proofs: which are simulated vs real?
- Private channels: how are verification agents communicating?

**Step 2: Write discrepancy report**

Same format. Key questions:
- What ZK functionality is simulated vs real?
- Does the SMT implementation match the whitepaper's depth 26 spec?
- Are nullifiers correctly preventing double-spend?

**Step 3: Commit**

```bash
git add vault/audit-report/privacy-discrepancies.md
git commit -m "audit: privacy cross-reference — N discrepancies found"
```

---

### Task 8: Cross-Reference — Galaxy Grid (Section 4 vs galaxy/)

**Files:**
- Read: `vault/whitepaper.md:239-324` (Section 4: Galaxy Grid)
- Read: `vault/agentic-chain/agentic/galaxy/coordinate.py`
- Read: `vault/agentic-chain/agentic/galaxy/claims.py`
- Read: `vault/agentic-chain/agentic/galaxy/allocator.py`
- Read: `vault/agentic-chain/agentic/galaxy/epoch.py`
- Create: `vault/audit-report/galaxy-grid-discrepancies.md`

**Step 1: Read all galaxy grid sections and code**

Systematically compare:
- Coordinate system: 2D grid, dynamic bounds — does `coordinate.py` match?
- Epoch expansion: ring-based, hardness=16N — does `epoch.py` match?
- Claims: node placement, 10x10 blocks — does `claims.py` match?
- Allocator: homenode placement, golden angle — does `allocator.py` match?
- Claim cost: city model (inner expensive, outer cheap) — implemented?

**Step 2: Write discrepancy report**

Key focus: the claim cost formula from the whitepaper (city model with density multiplier and ring divider) — is it implemented anywhere?

**Step 3: Commit**

```bash
git add vault/audit-report/galaxy-grid-discrepancies.md
git commit -m "audit: galaxy grid cross-reference — N discrepancies found"
```

---

### Task 9: Cross-Reference — Subgrid (Sections 16-17 vs galaxy/subgrid.py)

**Files:**
- Read: `vault/whitepaper.md:1515-1755` (Sections 16-17: Subgrid + Resource Calcs)
- Read: `vault/agentic-chain/agentic/galaxy/subgrid.py`
- Create: `vault/audit-report/subgrid-discrepancies.md`

**Step 1: Compare subgrid spec to implementation**

Check:
- 4 cell types (Secure/Develop/Research/Storage) — all present?
- 64 cells (8x8) — correct?
- Level scaling: `output = base × level^0.8` — formula matches?
- Per-block resource calculations — match Section 17?
- WARMUP→ACTIVE→COOLDOWN lifecycle — matches whitepaper?

**Step 2: Write discrepancy report**

**Step 3: Commit**

```bash
git add vault/audit-report/subgrid-discrepancies.md
git commit -m "audit: subgrid cross-reference — N discrepancies found"
```

---

### Task 10: Cross-Reference — Migration Path (Section 20)

**Files:**
- Read: `vault/whitepaper.md:1890-2060` (Section 20: Migration Path + Section 21: Roadmap)
- Create: `vault/audit-report/migration-feasibility.md`

**Step 1: Evaluate migration path feasibility**

Assess:
- Lock-and-mint bridge at 1:1 ratio — technically feasible?
- SPL → L1 token migration — are there precedents?
- Timeline consistency with Phase pipeline
- Any contradictions between whitepaper roadmap and design doc rollout plan?

**Step 2: Write feasibility note**

Not a discrepancy report — a forward-looking assessment of whether the migration path as described is realistic and consistent.

**Step 3: Commit**

```bash
git add vault/audit-report/migration-feasibility.md
git commit -m "audit: migration path feasibility assessment"
```

---

## Megatask 1.2: Math Verification

### Task 11: Effective Stake Formula Verification

**Files:**
- Read: `vault/whitepaper.md:1205-1354` (Section 13: Dual Staking)
- Read: `vault/agentic-chain/agentic/economics/staking.py`
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Write math verification tests**

```python
class TestMathEffectiveStake:
    """Verify S_eff = alpha*T + beta*C (Section 13 + Section 23.3)."""

    def test_equal_stake(self):
        """Equal token and CPU → S_eff = 1.0."""
        s_eff = 0.40 * 1.0 + 0.60 * 1.0
        assert s_eff == 1.0

    def test_token_only(self):
        """All token, no CPU → S_eff = 0.40."""
        s_eff = 0.40 * 1.0 + 0.60 * 0.0
        assert s_eff == 0.40

    def test_cpu_only(self):
        """All CPU, no token → S_eff = 0.60."""
        s_eff = 0.40 * 0.0 + 0.60 * 1.0
        assert s_eff == 0.60

    def test_code_matches_formula(self):
        """Verify staking.py computes S_eff per whitepaper formula."""
        from agentic.economics.staking import compute_effective_stake
        # If this import fails, the function doesn't exist — document as gap
        result = compute_effective_stake(token_share=0.5, cpu_share=0.8)
        expected = 0.40 * 0.5 + 0.60 * 0.8
        assert abs(result - expected) < 1e-10
```

**Step 2: Run tests**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestMathEffectiveStake -v`
Expected: First 3 PASS (pure math). 4th may FAIL if `compute_effective_stake` doesn't exist or has different signature.

**Step 3: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: math verification — effective stake formula"
```

---

### Task 12: Hardness Curve Simulation

**Files:**
- Read: `vault/whitepaper.md:2168-2218` (Section 23.1: Hardness Curve Convergence)
- Read: `vault/agentic-chain/agentic/galaxy/epoch.py`
- Read: `vault/agentic-chain/agentic/galaxy/mining.py`
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Write hardness simulation tests**

```python
class TestMathHardnessCurve:
    """Verify H(N) = 16N and yield convergence (Section 23.1)."""

    def test_hardness_formula(self):
        """H(N) = 16 * N for rings 1-100."""
        for n in range(1, 101):
            assert 16 * n == 16 * n  # trivial, but verifies the formula
        # Now check the code
        from agentic.galaxy.epoch import EpochTracker
        tracker = EpochTracker()
        assert tracker.hardness(1) == 16
        assert tracker.hardness(10) == 160
        assert tracker.hardness(100) == 1600

    def test_yield_per_block_decreases(self):
        """yield(N) = BASE_RATE * density / hardness decreases with ring."""
        base = 0.5
        density = 0.5
        yields = [base * density / (16 * n) for n in range(1, 51)]
        # Verify monotonically decreasing
        for i in range(len(yields) - 1):
            assert yields[i] > yields[i + 1]

    def test_supply_at_ring_10(self):
        """Whitepaper Table: ring 10 → ~440 AGNTC cumulative."""
        # S(N) = sum of 8k for k=1..N = 4N(N+1)
        s_10 = 4 * 10 * 11  # = 440
        assert s_10 == 440

    def test_supply_formula(self):
        """S(N) = 4N(N+1) — cumulative supply from mining."""
        for n in [10, 50, 100, 324]:
            s = 4 * n * (n + 1)
            s_sum = sum(8 * k for k in range(1, n + 1))
            assert s == s_sum
```

**Step 2: Run tests**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestMathHardnessCurve -v`
Expected: Math tests PASS. `EpochTracker.hardness()` test depends on method signature.

**Step 3: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: math verification — hardness curve + supply convergence"
```

---

### Task 13: Fee Burn Equilibrium Verification

**Files:**
- Read: `vault/whitepaper.md:1117-1202` (Section 12: Fee Model)
- Read: `vault/agentic-chain/agentic/economics/fees.py`
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Write fee burn tests**

```python
class TestMathFeeBurn:
    """Verify 50% fee burn equilibrium (Section 12)."""

    def test_burn_rate(self):
        """50% of fees are burned."""
        fee = 100
        burned = fee * 0.50
        remaining = fee - burned
        assert burned == 50
        assert remaining == 50

    def test_remaining_split(self):
        """Remaining 50% split: 60% verifier, 40% staker."""
        remaining = 50
        verifier = remaining * 0.60
        staker = remaining * 0.40
        assert verifier == 30
        assert staker == 20

    def test_code_fee_burn(self):
        """Verify fees.py implements 50% burn."""
        from agentic.economics.fees import compute_fee_distribution
        result = compute_fee_distribution(fee_amount=100)
        assert result.burned == 50
        assert result.verifier_share == 30
        assert result.staker_share == 20
```

**Step 2: Run tests — document if fee distribution function doesn't exist or has different signature**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestMathFeeBurn -v`

**Step 3: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: math verification — fee burn equilibrium"
```

---

### Task 14: Byzantine Tolerance Verification

**Files:**
- Read: `vault/whitepaper.md:2219-2244` (Section 23.2: Byzantine Tolerance Proof)
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Write BFT verification tests**

```python
class TestMathByzantineTolerance:
    """Verify BFT parameters (Section 23.2)."""

    def test_bft_formula(self):
        """f = floor((k-1)/3) = 4 for k=13."""
        k = 13
        f = (k - 1) // 3
        assert f == 4

    def test_threshold(self):
        """t = k - f = 9."""
        k, f = 13, 4
        assert k - f == 9

    def test_safety_pigeonhole(self):
        """Two sets of 9 must overlap by at least 5."""
        k, t = 13, 9
        overlap = 2 * t - k  # 18 - 13 = 5
        assert overlap == 5
        # At most 4 byzantine, so at least 1 honest in overlap
        assert overlap > 4

    def test_liveness(self):
        """9 honest agents meet the threshold of 9."""
        honest = 13 - 4
        threshold = 9
        assert honest >= threshold
```

**Step 2: Run tests**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestMathByzantineTolerance -v`
Expected: All PASS (pure math)

**Step 3: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: math verification — BFT tolerance proof"
```

---

### Task 15: VRF Fairness Statistical Test

**Files:**
- Read: `vault/agentic-chain/agentic/consensus/vrf.py`
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Write VRF fairness simulation test**

```python
import statistics

class TestMathVRFFairness:
    """Verify VRF produces fair committee distribution (Section 5)."""

    def test_committee_selection_uniformity(self):
        """Over 1000 rounds, each of 50 validators should be selected ~260 times.
        
        (13 slots × 1000 rounds / 50 validators = 260 expected per validator)
        Chi-squared test: p > 0.01.
        """
        from agentic.consensus.vrf import select_committee
        # Run 1000 rounds, count selections per validator
        counts = [0] * 50
        for round_num in range(1000):
            # Adapt to actual VRF API — may need different args
            committee = select_committee(
                num_validators=50,
                committee_size=13,
                seed=round_num,
            )
            for idx in committee:
                counts[idx] += 1

        # Each validator should be selected ~260 times
        mean = statistics.mean(counts)
        stdev = statistics.stdev(counts)
        
        # Coefficient of variation should be < 0.3 for reasonable fairness
        cv = stdev / mean
        assert cv < 0.3, f"VRF selection too uneven: CV={cv:.3f}, counts range [{min(counts)}, {max(counts)}]"
```

**Step 2: Run test — adapt to actual VRF API if needed**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestMathVRFFairness -v`
Note: May need to adjust the `select_committee` import and arguments to match actual VRF code.

**Step 3: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: math verification — VRF fairness simulation"
```

---

### Task 16: Gini Coefficient Verification

**Files:**
- Read: `vault/whitepaper.md:2246-2300` (Section 23.3: Gini Analysis)
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Write Gini verification tests**

```python
class TestMathGiniCoefficient:
    """Verify dual staking reduces Gini (Section 23.3)."""

    def test_gini_reduction_basic(self):
        """G_eff < G_t when CPU is less concentrated than tokens."""
        alpha, beta = 0.40, 0.60
        g_t, g_c = 0.65, 0.35
        r_t, r_c = 0.85, 0.70
        # Lerman-Yitzhaki formula (corrected in v1.2)
        g_eff = (alpha * g_t * r_t + beta * g_c * r_c)
        # = 0.4*0.65*0.85 + 0.6*0.35*0.70 = 0.221 + 0.147 = 0.368
        assert abs(g_eff - 0.368) < 0.001
        assert g_eff < g_t  # Must reduce concentration

    def test_gini_equal_distribution(self):
        """If CPU is equally concentrated, weighted sum still <= G_t."""
        alpha, beta = 0.40, 0.60
        g_t = g_c = 0.65
        g_eff = alpha * g_t + beta * g_c  # = 0.65 (equal, not worse)
        assert g_eff <= g_t + 1e-10  # At most equal

    def test_whitepaper_numerical_example(self):
        """Whitepaper claims 43% reduction from 0.65 to 0.368."""
        reduction = 1 - 0.368 / 0.65
        assert abs(reduction - 0.434) < 0.01  # ~43%
```

**Step 2: Run tests**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py::TestMathGiniCoefficient -v`
Expected: All PASS (pure math verification)

**Step 3: Commit**

```bash
git add vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "audit: math verification — Gini coefficient analysis"
```

---

## Megatask 1.3: Whitepaper Polish → v1.3

### Task 17: Fix Missing Parameters in params.py

**Files:**
- Modify: `vault/agentic-chain/agentic/params.py`
- Modify: `vault/agentic-chain/tests/test_whitepaper_audit.py`

**Step 1: Add missing parameters to params.py**

Add the 5+ parameters identified in Tasks 1-3 (exact list determined by audit findings):

```python
# Claim costs — city model (inner rings expensive, outer cheap)
BASE_CLAIM_COST = 100             # AGNTC cost at ring 1, density 1.0
BASE_CPU_CLAIM_COST = 50          # CPU Energy cost at ring 1, density 1.0
CLAIM_COST_FLOOR = 0.01           # Minimum claim cost at extreme outer rings
CLAIM_REQUIRES_ACTIVE_STAKE = True  # Must stake before claiming

# Inflation cap
ANNUAL_INFLATION_CEILING = 0.05   # 5% max annualized supply growth

# User registration
SIGNUP_BONUS = 1.0                # 1 AGNTC fresh-minted per new user
```

**Step 2: Run audit tests — all should now PASS**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py -v`
Expected: All tests PASS (zero discrepancies for parameters)

**Step 3: Commit**

```bash
git add vault/agentic-chain/agentic/params.py vault/agentic-chain/tests/test_whitepaper_audit.py
git commit -m "fix: add 6 missing whitepaper parameters to params.py"
```

---

### Task 18: Fix Code Discrepancies from Cross-Reference Reports

**Files:**
- Read: All files in `vault/audit-report/` (from Tasks 4-10)
- Modify: Files identified in discrepancy reports

**Step 1: Triage discrepancies**

For each finding from Tasks 5-10:
- **Code is wrong, whitepaper is right** → fix code
- **Whitepaper is wrong, code is right** → mark for Task 19
- **Both wrong** → fix code first, mark whitepaper for Task 19
- **Naming mismatch only** → decide canonical name, update both

Apply the design doc rule: "code wins if correct, whitepaper wins if code is wrong."

**Step 2: Fix code issues**

Fix each code-side discrepancy. For each fix:
1. Write a failing test that asserts the whitepaper-correct behavior
2. Fix the code
3. Verify the test passes

**Step 3: Run full test suite — no regressions**

Run: `cd vault/agentic-chain && python3 -m pytest tests/ -v`
Expected: All 800+ tests PASS

**Step 4: Commit (one per logical fix)**

```bash
git commit -m "fix: [specific discrepancy description]"
```

---

### Task 19: Update Whitepaper Language — "Neural Lattice" Rename

**Files:**
- Modify: `vault/whitepaper.md`

**Step 1: Replace all "galaxy grid" / "galaxy" / "Stellaris" references**

Search and replace:
- "galaxy grid" → "Neural Lattice" (the visualization)
- "Galaxy Grid" → "Neural Lattice"
- "galaxy" (as standalone noun referring to the grid) → "lattice" or "Neural Lattice"
- Any "Stellaris" references → remove or replace with "Neural Lattice"

**Important:** Do NOT replace:
- "galaxy" in academic references or background sections where it's not referring to the product
- File path references (Section 4 heading can keep its `#4-the-galaxy-grid` anchor for backward compat, but title should update)

**Step 2: Verify no broken references**

Check that all internal `#section` anchors still work after renames.

**Step 3: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs: replace galaxy grid/Stellaris with Neural Lattice globally"
```

---

### Task 20: Fix Whitepaper-Side Discrepancies

**Files:**
- Modify: `vault/whitepaper.md`
- Read: Discrepancy reports from `vault/audit-report/`

**Step 1: Apply all whitepaper-side fixes from audit findings**

For each case where "whitepaper is wrong, code is right" (from Task 18 triage):
- Update the whitepaper text/tables/formulas to match the verified code behavior
- Add a footnote if the change is substantive

**Step 2: Update the Parameter table (Section 22)**

Ensure Section 22 exactly matches `params.py` after Task 17's additions.

**Step 3: Update docstring references**

Fix `rewards.py` docstring from "whitepaper v0.2" to "whitepaper v1.3".

**Step 4: Commit**

```bash
git add vault/whitepaper.md vault/agentic-chain/agentic/economics/rewards.py
git commit -m "docs: fix whitepaper discrepancies found during audit"
```

---

### Task 21: Version Bump + Changelog + Diagrams

**Files:**
- Modify: `vault/whitepaper.md` (header, changelog, diagrams)

**Step 1: Update version to v1.3**

- Change header: "Version 1.2 | March 2026" → "Version 1.3 | April 2026"
- Add changelog entry after the abstract (or at end of document):
  ```
  ### Changelog
  - **v1.3 (April 2026):** Internal audit — zero code-spec discrepancies confirmed. 
    6 missing parameters added to reference implementation. Neural Lattice terminology 
    adopted globally. Gini formula corrected per Lerman-Yitzhaki. Migration feasibility 
    assessed. All 50+ protocol parameters verified against testnet code.
  - **v1.2 (March 2026):** BME city economics, governance scaffolding.
  - **v1.1 (March 2026):** Academic upgrade — formal proofs, adversary model, competitor comparison.
  ```

**Step 2: Verify all ASCII diagrams match current architecture**

Read each diagram in the whitepaper and compare to the code's actual data flow. Update any that are out of date.

**Step 3: Review Section 24 (Limitations)**

Check if the 7 open problems listed are still accurate. Update if any have been resolved or if new limitations should be added.

**Step 4: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs: whitepaper v1.3 — version bump, changelog, diagram review"
```

---

### Task 22: Final Verification + Audit Summary

**Files:**
- Create: `vault/audit-report/SUMMARY.md`

**Step 1: Run the complete audit test suite**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_whitepaper_audit.py -v`
Expected: ALL PASS — zero discrepancies

**Step 2: Run the full testnet test suite**

Run: `cd vault/agentic-chain && python3 -m pytest tests/ -v`
Expected: ALL 800+ PASS — zero regressions

**Step 3: Write audit summary**

Create `vault/audit-report/SUMMARY.md`:
- Date range
- Scope: whitepaper v1.2 → v1.3 cross-reference against testnet code
- Findings count by severity
- All discrepancies resolved
- Parameters added/fixed
- Math formulas verified
- Gate checklist status

**Step 4: Check Phase 1 gate**

From the design doc:
- [ ] Zero discrepancies between whitepaper v1.3 and testnet code
- [ ] All math formulas verified with simulation output
- [ ] Updated PDF live on zkagentic.com (defer — needs deploy)
- [ ] ePrint submission prepared (defer — needs formatting)

**Step 5: Commit**

```bash
git add vault/audit-report/SUMMARY.md
git commit -m "audit: Phase 1 complete — whitepaper v1.3, zero discrepancies"
```

---

## Task Dependency Graph

```
Tasks 1-3 (params)  ──→  Task 4 (concordance report)
Tasks 5-10 (cross-ref) ──→  Task 18 (fix code)  ──→  Task 20 (fix whitepaper)
Tasks 11-16 (math)  ──→  Task 18 (fix code)  ──→  Task 20 (fix whitepaper)
Task 17 (add params)  ──→  Task 20 (fix whitepaper)  ──→  Task 21 (version bump)
Task 19 (Neural Lattice rename) ──→ Task 21 (version bump)
Task 21 (version bump)  ──→  Task 22 (final verification)
```

**Parallelizable groups:**
- Tasks 1-3 can run in sequence (same test file, additive)
- Tasks 5-10 can run in PARALLEL (independent cross-reference audits)
- Tasks 11-16 can run in PARALLEL (independent math verifications)
- Tasks 17-20 must be SEQUENTIAL (fixes depend on findings)
- Task 21-22 must be LAST
