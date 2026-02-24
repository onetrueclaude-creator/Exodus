"""Tests for the epoch manager."""
from __future__ import annotations

import pytest

from agentic.economics.epoch import EpochManager, EpochAccount
from agentic.consensus.validator import Validator
from agentic.params import (
    INITIAL_INFLATION_RATE,
    DISINFLATION_RATE,
    INFLATION_FLOOR,
    FEE_BURN_RATE,
    REWARD_SPLIT_ORDERER,
    REWARD_SPLIT_VERIFIER,
    REWARD_SPLIT_STAKER,
)


@pytest.fixture
def manager():
    return EpochManager(epochs_per_year=12)


@pytest.fixture
def validators():
    return [
        Validator(id=0, token_stake=5000, cpu_vpu=100),
        Validator(id=1, token_stake=3000, cpu_vpu=150),
        Validator(id=2, token_stake=2000, cpu_vpu=50),
    ]


class TestInflationRate:
    def test_epoch_zero(self, manager):
        rate = manager.inflation_rate(0)
        assert abs(rate - INITIAL_INFLATION_RATE) < 1e-9

    def test_disinflation(self, manager):
        rate_y0 = manager.inflation_rate(0)
        rate_y1 = manager.inflation_rate(12)  # epoch 12 = year 1
        expected = INITIAL_INFLATION_RATE * (1 - DISINFLATION_RATE)
        assert abs(rate_y1 - expected) < 1e-9
        assert rate_y1 < rate_y0

    def test_floor(self, manager):
        rate = manager.inflation_rate(1200)  # epoch 1200 = year 100
        assert abs(rate - INFLATION_FLOOR) < 1e-9


class TestProcessEpoch:
    def test_basic_epoch(self, manager, validators):
        acct = manager.process_epoch(
            circulating_supply=42_000_000,
            fee_revenue=100_000,
            validators=validators,
            orderer_id=0,
        )
        assert acct.epoch == 0
        assert acct.inflation_minted > 0
        assert acct.fees_burned == int(100_000 * FEE_BURN_RATE)
        assert acct.total_distributed > 0
        assert acct.circulating_end > 0

    def test_fee_burn_is_50_percent(self, manager, validators):
        acct = manager.process_epoch(
            circulating_supply=1_000_000,
            fee_revenue=10_000,
            validators=validators,
        )
        assert acct.fees_burned == 5_000  # 50% of 10_000

    def test_reward_split_sums_to_pool(self, manager, validators):
        acct = manager.process_epoch(
            circulating_supply=42_000_000,
            fee_revenue=50_000,
            validators=validators,
        )
        total_pool = acct.inflation_minted + (acct.fee_revenue - acct.fees_burned)
        # Allow for integer rounding (±len(validators))
        assert abs(acct.total_distributed - total_pool) <= len(validators)

    def test_orderer_gets_orderer_share(self, manager, validators):
        acct = manager.process_epoch(
            circulating_supply=42_000_000,
            fee_revenue=0,
            validators=validators,
            orderer_id=1,
        )
        total_pool = acct.inflation_minted
        orderer_expected = int(total_pool * REWARD_SPLIT_ORDERER)
        # Orderer (id=1) should have at least the orderer pool
        assert acct.validator_rewards[1] >= orderer_expected

    def test_supply_increases_with_inflation(self, manager, validators):
        acct = manager.process_epoch(
            circulating_supply=1_000_000,
            fee_revenue=0,
            validators=validators,
        )
        assert acct.circulating_end > acct.circulating_start

    def test_slashing_reduces_supply(self, manager, validators):
        acct = manager.process_epoch(
            circulating_supply=1_000_000,
            fee_revenue=0,
            validators=validators,
            slashed_amount=10_000,
        )
        # Supply should increase less because of slashing burn
        expected_no_slash = 1_000_000 + acct.inflation_minted
        assert acct.circulating_end == expected_no_slash - 10_000

    def test_epoch_counter_advances(self, manager, validators):
        manager.process_epoch(circulating_supply=1_000_000, fee_revenue=0, validators=validators)
        manager.process_epoch(circulating_supply=1_000_000, fee_revenue=0, validators=validators)
        assert manager.current_epoch == 2

    def test_no_online_validators(self, manager):
        offline = [Validator(id=0, token_stake=100, cpu_vpu=10, online=False)]
        acct = manager.process_epoch(
            circulating_supply=1_000_000,
            fee_revenue=1000,
            validators=offline,
        )
        assert acct.total_distributed == 0
        assert acct.fees_burned == 500


class TestCumulativeStats:
    def test_cumulative_tracking(self, manager, validators):
        for _ in range(5):
            manager.process_epoch(
                circulating_supply=1_000_000,
                fee_revenue=10_000,
                validators=validators,
            )
        stats = manager.get_cumulative_stats()
        assert stats["epochs_processed"] == 5
        assert stats["cumulative_fees"] == 50_000
        assert stats["cumulative_burned"] > 0
        assert stats["cumulative_minted"] > 0


class TestAnnualizedYield:
    def test_yield_calculation(self, manager):
        yld = manager.get_annualized_yield(
            epoch=0,
            circulating=21_000_000,
            staked=8_400_000,
        )
        # At 10% inflation with 40% staked: yield ≈ 10%/40% = 25%
        assert 0.20 < yld < 0.30

    def test_yield_zero_when_nothing_staked(self, manager):
        assert manager.get_annualized_yield(epoch=0, circulating=1_000_000, staked=0) == 0.0
