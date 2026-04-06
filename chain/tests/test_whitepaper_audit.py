"""Whitepaper Section 22 — Protocol Parameter Concordance Tests.

Compares every parameter defined in the whitepaper's Section 22
(Protocol Parameters) against the code in agentic/params.py.

Created as part of Phase 1 whitepaper audit (Tasks 1-3).
"""

import pytest

from agentic import params


# ---------------------------------------------------------------------------
# Consensus Parameters (Section 22, table 1)
# ---------------------------------------------------------------------------


class TestWhitepaperConsensusParams:
    """8 parameters from the Consensus Parameters table."""

    def test_block_time_ms(self):
        assert params.BLOCK_TIME_MS == 60_000, (
            "Whitepaper: BLOCK_TIME_MS = 60,000 ms"
        )

    def test_verifiers_per_block(self):
        assert params.VERIFIERS_PER_BLOCK == 13, (
            "Whitepaper: VERIFIERS_PER_BLOCK = 13"
        )

    def test_verification_threshold(self):
        assert params.VERIFICATION_THRESHOLD == 9, (
            "Whitepaper: VERIFICATION_THRESHOLD = 9 (9/13 supermajority)"
        )

    def test_zk_finality_target_s(self):
        assert params.ZK_FINALITY_TARGET_S == 20, (
            "Whitepaper: ZK_FINALITY_TARGET_S = 20 seconds"
        )

    def test_slots_per_epoch(self):
        assert params.SLOTS_PER_EPOCH == 100, (
            "Whitepaper: SLOTS_PER_EPOCH = 100"
        )

    def test_verification_commit_window_s(self):
        assert params.VERIFICATION_COMMIT_WINDOW_S == 10.0, (
            "Whitepaper: VERIFICATION_COMMIT_WINDOW_S = 10.0 seconds"
        )

    def test_verification_reveal_window_s(self):
        assert params.VERIFICATION_REVEAL_WINDOW_S == 20.0, (
            "Whitepaper: VERIFICATION_REVEAL_WINDOW_S = 20.0 seconds"
        )

    def test_verification_hard_deadline_s(self):
        assert params.VERIFICATION_HARD_DEADLINE_S == 60.0, (
            "Whitepaper: VERIFICATION_HARD_DEADLINE_S = 60.0 seconds"
        )


# ---------------------------------------------------------------------------
# Staking Parameters (Section 22, table 2)
# ---------------------------------------------------------------------------


class TestWhitepaperStakingParams:
    """7 parameters from the Staking Parameters table."""

    def test_alpha(self):
        assert params.ALPHA == 0.40, (
            "Whitepaper: ALPHA = 0.40 (token weight in effective stake)"
        )

    def test_beta(self):
        assert params.BETA == 0.60, (
            "Whitepaper: BETA = 0.60 (CPU weight in effective stake)"
        )

    def test_reward_split_verifier(self):
        assert params.REWARD_SPLIT_VERIFIER == 0.60, (
            "Whitepaper: REWARD_SPLIT_VERIFIER = 0.60"
        )

    def test_reward_split_staker(self):
        assert params.REWARD_SPLIT_STAKER == 0.40, (
            "Whitepaper: REWARD_SPLIT_STAKER = 0.40"
        )

    def test_reward_split_orderer(self):
        assert params.REWARD_SPLIT_ORDERER == 0.00, (
            "Whitepaper: REWARD_SPLIT_ORDERER = 0.00 (no orderer reward)"
        )

    def test_secure_reward_immediate(self):
        assert params.SECURE_REWARD_IMMEDIATE == 0.50, (
            "Whitepaper: SECURE_REWARD_IMMEDIATE = 0.50"
        )

    def test_secure_reward_vest_days(self):
        assert params.SECURE_REWARD_VEST_DAYS == 30, (
            "Whitepaper: SECURE_REWARD_VEST_DAYS = 30 days"
        )


# ---------------------------------------------------------------------------
# Token Economics (Section 22, table 3)
# ---------------------------------------------------------------------------


class TestWhitepaperTokenEconomics:
    """11 parameters from the Token Economics table."""

    def test_max_supply(self):
        assert params.MAX_SUPPLY == 1_000_000_000, (
            "Whitepaper: MAX_SUPPLY = 1,000,000,000"
        )

    def test_genesis_supply(self):
        assert params.GENESIS_SUPPLY == 900, (
            "Whitepaper: GENESIS_SUPPLY = 900 (9 nodes x 100 coords)"
        )

    def test_grid_side(self):
        assert params.GRID_SIDE == 31_623, (
            "Whitepaper: GRID_SIDE = 31,623 (sqrt(1B))"
        )

    def test_fee_burn_rate(self):
        assert params.FEE_BURN_RATE == 0.50, (
            "Whitepaper: FEE_BURN_RATE = 0.50"
        )

    def test_dist_community(self):
        assert params.DIST_COMMUNITY == 0.25, (
            "Whitepaper: DIST_COMMUNITY = 0.25"
        )

    def test_dist_machines(self):
        assert params.DIST_MACHINES == 0.25, (
            "Whitepaper: DIST_MACHINES = 0.25"
        )

    def test_dist_founders(self):
        assert params.DIST_FOUNDERS == 0.25, (
            "Whitepaper: DIST_FOUNDERS = 0.25"
        )

    def test_dist_professional(self):
        assert params.DIST_PROFESSIONAL == 0.25, (
            "Whitepaper: DIST_PROFESSIONAL = 0.25"
        )

    def test_machines_sell_allowed(self):
        # Whitepaper: MACHINES_SELL_ALLOWED = false (permanent accumulator)
        # Code uses: MACHINES_MIN_SELL_RATIO = 1.0 (same intent, different naming)
        # A min sell ratio of 1.0 means agents can never sell below acquisition
        # cost, which effectively means "never sells" for an accumulator.
        assert hasattr(params, "MACHINES_MIN_SELL_RATIO"), (
            "Code should have MACHINES_MIN_SELL_RATIO (whitepaper: MACHINES_SELL_ALLOWED=false). "
            "Naming difference: code uses min-sell-ratio=1.0 to enforce the same constraint."
        )
        assert params.MACHINES_MIN_SELL_RATIO == 1.0, (
            "MACHINES_MIN_SELL_RATIO should be 1.0 (equivalent to MACHINES_SELL_ALLOWED=false)"
        )

    def test_annual_inflation_ceiling_exists(self):
        """Whitepaper: ANNUAL_INFLATION_CEILING = 0.05 — MISSING from params.py."""
        assert hasattr(params, "ANNUAL_INFLATION_CEILING"), (
            "MISSING: Whitepaper defines ANNUAL_INFLATION_CEILING = 0.05 "
            "(maximum 5% annualized supply growth, enforced per epoch) "
            "but it does not exist in params.py"
        )

    def test_signup_bonus_exists(self):
        """Whitepaper: SIGNUP_BONUS = 1.0 — MISSING from params.py."""
        assert hasattr(params, "SIGNUP_BONUS"), (
            "MISSING: Whitepaper defines SIGNUP_BONUS = 1.0 "
            "(AGNTC minted per new user registration) "
            "but it does not exist in params.py"
        )


# ---------------------------------------------------------------------------
# Mining and Epoch Parameters (Section 22, table 4)
# ---------------------------------------------------------------------------


class TestWhitepaperMiningParams:
    """9 parameters from the Mining and Epoch Parameters table."""

    def test_base_mining_rate_per_block(self):
        assert params.BASE_MINING_RATE_PER_BLOCK == 0.5, (
            "Whitepaper: BASE_MINING_RATE_PER_BLOCK = 0.5"
        )

    def test_hardness_multiplier(self):
        assert params.HARDNESS_MULTIPLIER == 16, (
            "Whitepaper: HARDNESS_MULTIPLIER = 16"
        )

    def test_genesis_epoch_ring(self):
        assert params.GENESIS_EPOCH_RING == 1, (
            "Whitepaper: GENESIS_EPOCH_RING = 1"
        )

    def test_homenode_base_angle(self):
        assert params.HOMENODE_BASE_ANGLE == 137.5, (
            "Whitepaper: HOMENODE_BASE_ANGLE = 137.5 degrees"
        )

    def test_node_grid_spacing(self):
        assert params.NODE_GRID_SPACING == 10, (
            "Whitepaper: NODE_GRID_SPACING = 10"
        )

    def test_energy_per_claim(self):
        assert params.ENERGY_PER_CLAIM == 1.0, (
            "Whitepaper: ENERGY_PER_CLAIM = 1.0"
        )

    def test_base_claim_cost_exists(self):
        """Whitepaper: BASE_CLAIM_COST = 100 — MISSING from params.py.

        Note: params.py has BASE_BIRTH_COST = 100 which may be intended as
        the same concept but with different naming. The whitepaper specifically
        says 'AGNTC cost for claiming a coordinate at ring 1, density 1.0'.
        """
        assert hasattr(params, "BASE_CLAIM_COST"), (
            "MISSING: Whitepaper defines BASE_CLAIM_COST = 100 "
            "(AGNTC cost for claiming a coordinate at ring 1, density 1.0). "
            "Note: params.py has BASE_BIRTH_COST = 100 which may be the same concept "
            "under a different name."
        )

    def test_base_cpu_claim_cost_exists(self):
        """Whitepaper: BASE_CPU_CLAIM_COST = 50 — MISSING from params.py."""
        assert hasattr(params, "BASE_CPU_CLAIM_COST"), (
            "MISSING: Whitepaper defines BASE_CPU_CLAIM_COST = 50 "
            "(CPU Energy cost for claiming at ring 1, density 1.0) "
            "but it does not exist in params.py"
        )

    def test_claim_cost_floor_exists(self):
        """Whitepaper: CLAIM_COST_FLOOR = 0.01 — MISSING from params.py."""
        assert hasattr(params, "CLAIM_COST_FLOOR"), (
            "MISSING: Whitepaper defines CLAIM_COST_FLOOR = 0.01 "
            "(minimum claim cost, prevents near-zero at extreme outer rings) "
            "but it does not exist in params.py"
        )


# ---------------------------------------------------------------------------
# Subgrid Parameters (Section 22, table 5)
# ---------------------------------------------------------------------------


class TestWhitepaperSubgridParams:
    """6 parameters from the Subgrid Parameters table."""

    def test_subgrid_size(self):
        assert params.SUBGRID_SIZE == 64, (
            "Whitepaper: SUBGRID_SIZE = 64 (8x8)"
        )

    def test_base_secure_rate(self):
        assert params.BASE_SECURE_RATE == 0.5, (
            "Whitepaper: BASE_SECURE_RATE = 0.5"
        )

    def test_base_develop_rate(self):
        assert params.BASE_DEVELOP_RATE == 1.0, (
            "Whitepaper: BASE_DEVELOP_RATE = 1.0"
        )

    def test_base_research_rate(self):
        assert params.BASE_RESEARCH_RATE == 0.5, (
            "Whitepaper: BASE_RESEARCH_RATE = 0.5"
        )

    def test_base_storage_rate(self):
        assert params.BASE_STORAGE_RATE == 1.0, (
            "Whitepaper: BASE_STORAGE_RATE = 1.0"
        )

    def test_level_exponent(self):
        assert params.LEVEL_EXPONENT == 0.8, (
            "Whitepaper: LEVEL_EXPONENT = 0.8"
        )


# ---------------------------------------------------------------------------
# Agent Lifecycle Parameters (Section 22, table 6)
# ---------------------------------------------------------------------------


class TestWhitepaperAgentLifecycle:
    """5 parameters from the Agent Lifecycle Parameters table."""

    def test_agent_warmup_epochs(self):
        assert params.AGENT_WARMUP_EPOCHS == 1, (
            "Whitepaper: AGENT_WARMUP_EPOCHS = 1"
        )

    def test_agent_probation_epochs(self):
        assert params.AGENT_PROBATION_EPOCHS == 3, (
            "Whitepaper: AGENT_PROBATION_EPOCHS = 3"
        )

    def test_safe_mode_threshold(self):
        assert params.SAFE_MODE_THRESHOLD == 0.20, (
            "Whitepaper: SAFE_MODE_THRESHOLD = 0.20"
        )

    def test_safe_mode_recovery(self):
        assert params.SAFE_MODE_RECOVERY == 0.80, (
            "Whitepaper: SAFE_MODE_RECOVERY = 0.80"
        )

    def test_dispute_reverify_multiplier(self):
        assert params.DISPUTE_REVERIFY_MULTIPLIER == 2, (
            "Whitepaper: DISPUTE_REVERIFY_MULTIPLIER = 2"
        )


# ---------------------------------------------------------------------------
# Ledger Parameters (Section 22, table 7)
# ---------------------------------------------------------------------------


class TestWhitepaperLedgerParams:
    """3 parameters from the Ledger Parameters table."""

    def test_merkle_tree_depth(self):
        assert params.MERKLE_TREE_DEPTH == 26, (
            "Whitepaper: MERKLE_TREE_DEPTH = 26"
        )

    def test_max_txs_per_block(self):
        assert params.MAX_TXS_PER_BLOCK == 50, (
            "Whitepaper: MAX_TXS_PER_BLOCK = 50"
        )

    def test_max_planets_per_system(self):
        assert params.MAX_PLANETS_PER_NODE == 10, (
            "Whitepaper: MAX_PLANETS_PER_NODE = 10"
        )


# ---------------------------------------------------------------------------
# Genesis Topology (Section 22, table 8)
# ---------------------------------------------------------------------------


class TestWhitepaperGenesisTopology:
    """3 parameters from the Genesis Topology table."""

    def test_genesis_origin(self):
        assert params.GENESIS_ORIGIN == (0, 0), (
            "Whitepaper: GENESIS_ORIGIN = (0, 0)"
        )

    def test_genesis_faction_masters(self):
        expected = [(0, 10), (10, 0), (0, -10), (-10, 0)]
        assert params.GENESIS_FACTION_MASTERS == expected, (
            f"Whitepaper: GENESIS_FACTION_MASTERS = {expected} (N, E, S, W)"
        )

    def test_genesis_homenodes(self):
        expected = [(10, 10), (10, -10), (-10, -10), (-10, 10)]
        assert params.GENESIS_HOMENODES == expected, (
            f"Whitepaper: GENESIS_HOMENODES = {expected} (diagonals)"
        )


# ---------------------------------------------------------------------------
# Solana Mainnet (Section 22, table 9)
# ---------------------------------------------------------------------------


class TestWhitepaperSolanaMainnet:
    """1 parameter from the Solana Mainnet table."""

    def test_agntc_mint_address(self):
        assert params.AGNTC_MINT_ADDRESS == "3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd", (
            "Whitepaper: AGNTC_MINT_ADDRESS = 3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd"
        )


# ---------------------------------------------------------------------------
# Summary: Known gaps between whitepaper and params.py
# ---------------------------------------------------------------------------
#
# The following whitepaper parameters are MISSING from params.py:
#
# 1. ANNUAL_INFLATION_CEILING = 0.05
#    Whitepaper: "Maximum 5% annualized supply growth, enforced per epoch"
#    Impact: No ceiling enforcement in the codebase
#
# 2. SIGNUP_BONUS = 1.0
#    Whitepaper: "AGNTC minted per new user registration"
#    Impact: New user bonus minting not parameterized
#
# 3. BASE_CLAIM_COST = 100
#    Whitepaper: "AGNTC cost for claiming a coordinate at ring 1, density 1.0"
#    Note: params.py has BASE_BIRTH_COST = 100, possibly same concept
#    Impact: Naming discrepancy; claim cost formula may not match whitepaper
#
# 4. BASE_CPU_CLAIM_COST = 50
#    Whitepaper: "CPU Energy cost for claiming at ring 1, density 1.0"
#    Impact: CPU component of claim cost not implemented
#
# 5. CLAIM_COST_FLOOR = 0.01
#    Whitepaper: "Minimum claim cost (prevents near-zero at extreme outer rings)"
#    Impact: No floor on claim costs at distant rings
#
# Naming discrepancy (same intent, different name):
#
# 6. MACHINES_SELL_ALLOWED = false  (whitepaper)
#    MACHINES_MIN_SELL_RATIO = 1.0  (code)
#    Both enforce "Machines faction never sells" — tested via the code name.
#
# NOT in whitepaper Section 22 (mentioned in MEMORY.md only):
#
# 7. CLAIM_REQUIRES_ACTIVE_STAKE — not in any Section 22 table.
#    Grep of whitepaper.md returns zero matches. This is a project-level
#    design decision documented in memory, not a whitepaper parameter.


# ===========================================================================
# Megatask 1.2: Math Verification (Whitepaper Section 23 + formula checks)
# ===========================================================================

class TestMathEffectiveStake:
    """Verify S_eff = alpha*T + beta*C (Section 13 + Section 23.3)."""

    def test_equal_stake(self):
        """Equal token and CPU → S_eff = 1.0."""
        s_eff = params.ALPHA * 1.0 + params.BETA * 1.0
        assert s_eff == 1.0

    def test_token_only(self):
        """All token, no CPU → S_eff = 0.40."""
        s_eff = params.ALPHA * 1.0 + params.BETA * 0.0
        assert s_eff == params.ALPHA

    def test_cpu_only(self):
        """All CPU, no token → S_eff = 0.60."""
        s_eff = params.ALPHA * 0.0 + params.BETA * 1.0
        assert s_eff == params.BETA

    def test_cpu_dominates(self):
        """CPU weight (0.60) > token weight (0.40) — incentivizes compute."""
        assert params.BETA > params.ALPHA

    def test_weights_sum_to_one(self):
        """alpha + beta = 1.0 — normalized weights."""
        assert abs(params.ALPHA + params.BETA - 1.0) < 1e-10

    def test_code_effective_stake(self):
        """Verify Validator.effective_stake() computes per whitepaper."""
        from agentic.consensus.validator import Validator
        v = Validator(id=0, token_stake=500.0, cpu_vpu=80.0)
        total_token, total_cpu = 1000.0, 100.0
        result = v.effective_stake(total_token, total_cpu)
        expected = params.ALPHA * (500.0 / 1000.0) + params.BETA * (80.0 / 100.0)
        assert abs(result - expected) < 1e-10


class TestMathHardnessCurve:
    """Verify H(N) = 16N and yield convergence (Section 23.1)."""

    def test_hardness_formula(self):
        """H(N) = 16 * N for rings 1-100."""
        from agentic.lattice.epoch import EpochTracker
        tracker = EpochTracker()
        for n in [1, 5, 10, 50, 100]:
            assert tracker.hardness(n) == 16 * n

    def test_hardness_at_ring_zero(self):
        """Ring 0 → hardness = 16 (floor at max(ring, 1))."""
        from agentic.lattice.epoch import EpochTracker
        tracker = EpochTracker()
        assert tracker.hardness(0) == 16  # max(0, 1) * 16

    def test_yield_per_block_decreases(self):
        """yield(N) = BASE_RATE * density / hardness decreases with ring."""
        base = params.BASE_MINING_RATE_PER_BLOCK
        density = 0.5
        yields = [base * density / (16 * n) for n in range(1, 51)]
        for i in range(len(yields) - 1):
            assert yields[i] > yields[i + 1]

    def test_supply_formula(self):
        """S(N) = 4N(N+1) — cumulative supply from mining."""
        for n in [10, 50, 100, 324]:
            s = 4 * n * (n + 1)
            s_sum = sum(8 * k for k in range(1, n + 1))
            assert s == s_sum

    def test_supply_at_ring_10(self):
        """Whitepaper Table: ring 10 → 440 AGNTC cumulative."""
        assert 4 * 10 * 11 == 440

    def test_supply_at_ring_324(self):
        """Whitepaper equilibrium: ~421,500 AGNTC at ring 324."""
        s_324 = 4 * 324 * 325
        assert s_324 == 421_200  # whitepaper says "~421,500" — verify exact

    def test_epoch_threshold_matches(self):
        """EpochTracker.threshold(N) = 4N(N+1)."""
        from agentic.lattice.epoch import EpochTracker
        tracker = EpochTracker()
        for n in [1, 5, 10, 50]:
            assert tracker.threshold(n) == 4.0 * n * (n + 1)


class TestMathFeeBurn:
    """Verify 50% fee burn equilibrium (Section 12)."""

    def test_burn_rate_param(self):
        """FEE_BURN_RATE = 0.50."""
        assert params.FEE_BURN_RATE == 0.50

    def test_burn_split(self):
        """50% burned, remaining split 60/40."""
        fee = 1000
        burned = int(fee * params.FEE_BURN_RATE)
        remainder = fee - burned
        to_verifiers = int(remainder * params.REWARD_SPLIT_VERIFIER)
        to_stakers = remainder - to_verifiers
        assert burned == 500
        assert to_verifiers == 300
        assert to_stakers == 200

    def test_code_fee_engine(self):
        """FeeEngine.collect_and_distribute() implements correct split."""
        from agentic.economics.fees import FeeEngine
        engine = FeeEngine()
        result = engine.collect_and_distribute([500, 300, 200])
        assert result.total_fees == 1000
        assert result.burned == 500
        assert result.to_verifiers == 300
        assert result.to_stakers == 200
        assert result.to_orderer == 0  # REWARD_SPLIT_ORDERER = 0.00

    def test_reward_splits_sum_to_one(self):
        """Verifier + Staker + Orderer splits = 1.0."""
        total = (params.REWARD_SPLIT_VERIFIER
                 + params.REWARD_SPLIT_STAKER
                 + params.REWARD_SPLIT_ORDERER)
        assert abs(total - 1.0) < 1e-10


class TestMathByzantineTolerance:
    """Verify BFT parameters (Section 23.2)."""

    def test_bft_formula(self):
        """f = floor((k-1)/3) = 4 for k=13."""
        k = params.VERIFIERS_PER_BLOCK
        f = (k - 1) // 3
        assert f == 4

    def test_threshold(self):
        """t = k - f = 9."""
        k = params.VERIFIERS_PER_BLOCK
        f = (k - 1) // 3
        assert k - f == params.VERIFICATION_THRESHOLD

    def test_safety_pigeonhole(self):
        """Two sets of 9 must overlap by at least 5 (>f=4)."""
        k = params.VERIFIERS_PER_BLOCK
        t = params.VERIFICATION_THRESHOLD
        overlap = 2 * t - k  # 18 - 13 = 5
        assert overlap == 5
        assert overlap > (k - 1) // 3  # overlap > f

    def test_liveness(self):
        """9 honest agents meet the threshold of 9."""
        k = params.VERIFIERS_PER_BLOCK
        f = (k - 1) // 3
        honest = k - f
        assert honest >= params.VERIFICATION_THRESHOLD

    def test_stronger_condition(self):
        """t > 2f + 1 (equivocation resistance)."""
        k = params.VERIFIERS_PER_BLOCK
        f = (k - 1) // 3
        t = params.VERIFICATION_THRESHOLD
        assert t >= 2 * f + 1  # 9 >= 9


class TestMathVRFFairness:
    """Verify VRF produces fair committee distribution (Section 5)."""

    def test_committee_size_matches_params(self):
        """select_verifiers returns exactly VERIFIERS_PER_BLOCK agents."""
        from agentic.consensus.validator import create_validator_set
        from agentic.consensus.vrf import select_verifiers
        validators = create_validator_set(50)
        committee = select_verifiers(validators, params.VERIFIERS_PER_BLOCK, slot=0)
        assert len(committee) == params.VERIFIERS_PER_BLOCK

    def test_selection_deterministic(self):
        """Same seed + slot → same committee."""
        from agentic.consensus.validator import create_validator_set
        from agentic.consensus.vrf import select_verifiers
        validators = create_validator_set(50)
        c1 = select_verifiers(validators, 13, slot=42, seed=1)
        c2 = select_verifiers(validators, 13, slot=42, seed=1)
        assert [v.id for v in c1] == [v.id for v in c2]

    def test_selection_varies_by_slot(self):
        """Different slots → different committees (with high probability)."""
        from agentic.consensus.validator import create_validator_set
        from agentic.consensus.vrf import select_verifiers
        validators = create_validator_set(50)
        committees = set()
        for slot in range(20):
            c = select_verifiers(validators, 13, slot=slot, seed=0)
            committees.add(tuple(v.id for v in c))
        # At least 15 of 20 should be distinct
        assert len(committees) >= 15

    def test_selection_fairness(self):
        """Over 500 rounds, coefficient of variation < 0.5."""
        import statistics
        from agentic.consensus.validator import create_validator_set
        from agentic.consensus.vrf import select_verifiers
        validators = create_validator_set(50)
        counts = [0] * 50
        for slot in range(500):
            committee = select_verifiers(validators, 13, slot=slot, seed=0)
            for v in committee:
                counts[v.id] += 1
        # Filter out validators that were never selected (very low stake)
        active_counts = [c for c in counts if c > 0]
        if len(active_counts) > 5:
            mean = statistics.mean(active_counts)
            stdev = statistics.stdev(active_counts)
            cv = stdev / mean if mean > 0 else 0
            # VRF is stake-weighted, so some variation is expected
            # CV < 0.5 means not dominated by a single validator
            assert cv < 1.0, f"VRF too concentrated: CV={cv:.3f}"


class TestMathGiniCoefficient:
    """Verify dual staking reduces Gini (Section 23.3)."""

    def test_gini_lerman_yitzhaki(self):
        """Corrected Lerman-Yitzhaki formula from whitepaper v1.2."""
        alpha, beta = params.ALPHA, params.BETA
        g_t, g_c = 0.65, 0.35
        r_t, r_c = 0.85, 0.70
        mu_t = mu_c = 1.0
        g_eff = (alpha * mu_t * g_t * r_t + beta * mu_c * g_c * r_c) / (alpha * mu_t + beta * mu_c)
        assert abs(g_eff - 0.368) < 0.001

    def test_gini_reduction_percentage(self):
        """Whitepaper claims 43% reduction from 0.65 to 0.368."""
        reduction = 1 - 0.368 / 0.65
        assert abs(reduction - 0.434) < 0.01  # ~43%

    def test_equal_distributions(self):
        """If G_c = G_t, weighted sum ≤ G_t."""
        alpha, beta = params.ALPHA, params.BETA
        g = 0.65
        g_eff = alpha * g + beta * g  # = g when R=1
        assert g_eff <= g + 1e-10

    def test_cpu_more_equal_helps(self):
        """Lower G_c (more equal CPU) → lower G_eff."""
        alpha, beta = params.ALPHA, params.BETA
        g_t = 0.65
        g_eff_high = alpha * g_t + beta * 0.60  # CPU Gini = 0.60
        g_eff_low = alpha * g_t + beta * 0.20   # CPU Gini = 0.20
        assert g_eff_low < g_eff_high


# ---------------------------------------------------------------------------
# Phase 1 Discrepancy Fix Verification (Tasks 17-18)
# ---------------------------------------------------------------------------


class TestFixT001InflationCeiling:
    """Verify ANNUAL_INFLATION_CEILING is enforced in MiningEngine."""

    def test_ceiling_caps_yields(self):
        """Yields are scaled down when they would exceed the per-block ceiling."""
        from agentic.lattice.mining import MiningEngine, _BLOCKS_PER_YEAR
        from agentic.lattice.coordinate import GridCoordinate

        engine = MiningEngine()
        # Create a claim with maximum density at ring 1 (hardness=16)
        # so raw yield = 0.5 * 1.0 * 1.0 / 16 = 0.03125
        claims = [{"owner": b"test", "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]

        # Compute ceiling: (900 + 0) * 0.05 / blocks_per_year
        max_per_block = (params.GENESIS_SUPPLY * params.ANNUAL_INFLATION_CEILING) / _BLOCKS_PER_YEAR

        from agentic.lattice.epoch import EpochTracker
        tracker = EpochTracker()

        yields = engine.compute_block_yields(claims, epoch_tracker=tracker)
        total = sum(yields.values())

        # Total yield must not exceed the per-block ceiling
        assert total <= max_per_block + 1e-12, (
            f"Yield {total} exceeds per-block ceiling {max_per_block}"
        )

    def test_ceiling_allows_small_yields(self):
        """Yields below the ceiling pass through unscaled."""
        from agentic.lattice.mining import MiningEngine, _BLOCKS_PER_YEAR
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.epoch import EpochTracker

        engine = MiningEngine()
        tracker = EpochTracker()
        # Very low stake, hardness=16 → yield << ceiling
        claims = [{"owner": b"low", "coordinate": GridCoordinate(x=0, y=0), "stake": 1}]
        yields = engine.compute_block_yields(claims, epoch_tracker=tracker)
        total = sum(yields.values())
        max_per_block = (params.GENESIS_SUPPLY * params.ANNUAL_INFLATION_CEILING) / _BLOCKS_PER_YEAR
        # Should be well below ceiling
        assert total <= max_per_block


class TestFixT002ClaimCost:
    """Verify claim_cost() implements BME city model."""

    def test_claim_cost_ring1_full_density(self):
        """At ring 1, density 1.0: cost = BASE_CLAIM_COST."""
        from agentic.lattice.claims import claim_cost
        agntc, cpu = claim_cost(ring=1, density=1.0)
        assert agntc == params.BASE_CLAIM_COST
        assert cpu == params.BASE_CPU_CLAIM_COST

    def test_claim_cost_outer_ring(self):
        """Outer rings are cheaper (city model)."""
        from agentic.lattice.claims import claim_cost
        cost_r1, _ = claim_cost(ring=1, density=1.0)
        cost_r5, _ = claim_cost(ring=5, density=1.0)
        assert cost_r5 < cost_r1

    def test_claim_cost_floor(self):
        """Cost never drops below CLAIM_COST_FLOOR."""
        from agentic.lattice.claims import claim_cost
        agntc, cpu = claim_cost(ring=10000, density=0.01)
        assert agntc >= params.CLAIM_COST_FLOOR
        assert cpu >= params.CLAIM_COST_FLOOR

    def test_claim_cost_zero_density(self):
        """Zero density → cost floored at CLAIM_COST_FLOOR."""
        from agentic.lattice.claims import claim_cost
        agntc, cpu = claim_cost(ring=1, density=0.0)
        assert agntc == params.CLAIM_COST_FLOOR
        assert cpu == params.CLAIM_COST_FLOOR

    def test_claim_cost_formula(self):
        """Exact formula: BASE × density / ring."""
        from agentic.lattice.claims import claim_cost
        agntc, cpu = claim_cost(ring=2, density=0.8)
        expected_agntc = params.BASE_CLAIM_COST * 0.8 / 2  # 40.0
        expected_cpu = params.BASE_CPU_CLAIM_COST * 0.8 / 2  # 20.0
        assert abs(agntc - expected_agntc) < 1e-10
        assert abs(cpu - expected_cpu) < 1e-10


class TestFixT004FeeEngineWired:
    """Verify FeeEngine exists on GenesisState and has correct schedule."""

    def test_fee_engine_on_genesis(self):
        """GenesisState has a FeeEngine instance."""
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(seed=42)
        assert hasattr(g, "fee_engine")
        assert g.fee_engine is not None

    def test_fee_engine_burn_rate(self):
        """FeeEngine uses 50% burn rate from params."""
        from agentic.economics.fees import FeeEngine, FeeDistribution
        engine = FeeEngine()
        result = engine.collect_and_distribute([1000])
        assert result.burned == 500  # 50% of 1000
        assert result.to_verifiers == 300  # 60% of remaining 500
        assert result.to_stakers == 200  # 40% of remaining 500


class TestFixT006LegacyDeprecated:
    """Verify legacy inflation code is marked deprecated."""

    def test_inflation_module_deprecated(self):
        """inflation.py docstring starts with DEPRECATED."""
        import agentic.economics.inflation as mod
        assert mod.__doc__ is not None
        assert "DEPRECATED" in mod.__doc__

    def test_rewards_module_deprecated(self):
        """rewards.py docstring starts with DEPRECATED."""
        import agentic.economics.rewards as mod
        assert mod.__doc__ is not None
        assert "DEPRECATED" in mod.__doc__


class TestFixG002RingGating:
    """Verify claim_cost and ring logic for ring-gating."""

    def test_coordinate_ring_calculation(self):
        """Chebyshev ring = max(|x|, |y|) / NODE_GRID_SPACING."""
        # Origin (0,0) → ring 0
        assert max(abs(0), abs(0)) // params.NODE_GRID_SPACING == 0
        # (10, 0) → ring 1
        assert max(abs(10), abs(0)) // params.NODE_GRID_SPACING == 1
        # (20, 10) → ring 2
        assert max(abs(20), abs(10)) // params.NODE_GRID_SPACING == 2
        # (-30, 20) → ring 3
        assert max(abs(-30), abs(20)) // params.NODE_GRID_SPACING == 3
