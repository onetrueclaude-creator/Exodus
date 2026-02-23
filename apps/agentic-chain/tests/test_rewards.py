"""Tests for epoch reward distribution engine."""
import pytest
from agentic.economics.rewards import RewardsEngine, EpochRewardReport
from agentic.consensus.validator import Validator
from agentic.params import (
    INITIAL_INFLATION_RATE, DISINFLATION_RATE, INFLATION_FLOOR,
    FEE_BURN_RATE, REWARD_SPLIT_ORDERER, REWARD_SPLIT_VERIFIER,
    REWARD_SPLIT_STAKER, ALPHA, BETA,
)


def _make_validators(n: int = 3) -> list[Validator]:
    """Create a simple set of validators for testing."""
    return [
        Validator(id=i, token_stake=1000.0 * (i + 1), cpu_vpu=50.0 * (i + 1))
        for i in range(n)
    ]


class TestInflationRateAtEpoch:
    def test_epoch_zero_gives_initial_rate(self):
        engine = RewardsEngine(epochs_per_year=12)
        rate = engine.inflation_rate_at_epoch(0)
        assert abs(rate - INITIAL_INFLATION_RATE) < 1e-9

    def test_epoch_12_gives_one_year_disinflation(self):
        engine = RewardsEngine(epochs_per_year=12)
        rate = engine.inflation_rate_at_epoch(12)
        expected = INITIAL_INFLATION_RATE * (1 - DISINFLATION_RATE)
        assert abs(rate - expected) < 1e-9

    def test_rate_decreases_over_time(self):
        engine = RewardsEngine(epochs_per_year=12)
        rate_0 = engine.inflation_rate_at_epoch(0)
        rate_12 = engine.inflation_rate_at_epoch(12)
        rate_24 = engine.inflation_rate_at_epoch(24)
        assert rate_0 > rate_12 > rate_24

    def test_rate_respects_floor(self):
        engine = RewardsEngine(epochs_per_year=12)
        # At very high epochs, rate should hit the floor
        rate = engine.inflation_rate_at_epoch(12 * 100)  # 100 years
        assert abs(rate - INFLATION_FLOOR) < 1e-9

    def test_floor_is_minimum(self):
        engine = RewardsEngine(epochs_per_year=12)
        for epoch in [0, 12, 60, 120, 600, 1200]:
            assert engine.inflation_rate_at_epoch(epoch) >= INFLATION_FLOOR


class TestComputeEpochRewards:
    def test_fee_burn_is_50_percent(self):
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(3)
        report = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=10_000, validators=validators,
        )
        assert report.fees_burned == int(10_000 * FEE_BURN_RATE)
        assert report.fees_burned == 5_000

    def test_total_rewards_equals_pool(self):
        """Total distributed should equal inflation + (fees - burned)."""
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(3)
        report = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=10_000, validators=validators,
        )
        expected_pool = report.inflation_minted + (report.fee_revenue - report.fees_burned)
        # Due to integer rounding in splits, total_rewards should be close
        assert abs(report.total_rewards - expected_pool) <= len(validators)

    def test_reward_split_ratios(self):
        """Verify the orderer/verifier/staker pools roughly match configured splits."""
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(3)
        report = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=100_000, validators=validators,
        )
        total_pool = report.inflation_minted + (report.fee_revenue - report.fees_burned)
        orderer_total = sum(report.orderer_rewards.values())
        verifier_total = sum(report.verifier_rewards.values())
        staker_total = sum(report.staker_rewards.values())

        # Check approximate ratios (within rounding tolerance)
        assert abs(orderer_total - int(total_pool * REWARD_SPLIT_ORDERER)) <= len(validators)
        assert abs(verifier_total - int(total_pool * REWARD_SPLIT_VERIFIER)) <= len(validators)

    def test_effective_stake_weighting(self):
        """Validator with more CPU+token should get more verifier rewards."""
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(3)
        # Validator 2 has 3x the stake and CPU of validator 0
        report = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=10_000, validators=validators,
        )
        assert report.verifier_rewards[2] > report.verifier_rewards[0]

    def test_orderer_gets_orderer_pool(self):
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(3)
        report = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=10_000, validators=validators,
            orderer_id=1,
        )
        total_pool = report.inflation_minted + (report.fee_revenue - report.fees_burned)
        expected_orderer_pool = int(total_pool * REWARD_SPLIT_ORDERER)
        assert report.orderer_rewards[1] == expected_orderer_pool
        # Other validators should not get orderer rewards
        assert 0 not in report.orderer_rewards
        assert 2 not in report.orderer_rewards

    def test_no_orderer_spreads_equally(self):
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(3)
        report = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=10_000, validators=validators,
            orderer_id=None,
        )
        # All three should get equal orderer share
        values = list(report.orderer_rewards.values())
        assert len(values) == 3
        assert all(v == values[0] for v in values)

    def test_no_online_validators_returns_zero_rewards(self):
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(3)
        for v in validators:
            v.online = False
        report = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=10_000, validators=validators,
        )
        assert report.total_rewards == 0
        assert report.orderer_rewards == {}
        assert report.verifier_rewards == {}
        assert report.staker_rewards == {}

    def test_cumulative_tracking(self):
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(3)
        r1 = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=10_000, validators=validators,
        )
        r2 = engine.compute_epoch_rewards(
            epoch=1, circulating_supply=21_000_000,
            fee_revenue=20_000, validators=validators,
        )
        assert engine.cumulative_burned == r1.fees_burned + r2.fees_burned
        assert engine.cumulative_minted == r1.inflation_minted + r2.inflation_minted

    def test_staker_rewards_proportional_to_token_stake(self):
        """Staker rewards should be proportional to token stake, not CPU."""
        engine = RewardsEngine(epochs_per_year=12)
        # Create validators with same CPU but different token stakes
        validators = [
            Validator(id=0, token_stake=1000.0, cpu_vpu=100.0),
            Validator(id=1, token_stake=3000.0, cpu_vpu=100.0),
        ]
        report = engine.compute_epoch_rewards(
            epoch=0, circulating_supply=21_000_000,
            fee_revenue=10_000, validators=validators,
        )
        # Validator 1 has 3x the token stake, should get ~3x staker rewards
        ratio = report.staker_rewards[1] / max(report.staker_rewards[0], 1)
        assert 2.5 < ratio < 3.5

    def test_report_fields_populated(self):
        engine = RewardsEngine(epochs_per_year=12)
        validators = _make_validators(2)
        report = engine.compute_epoch_rewards(
            epoch=5, circulating_supply=50_000_000,
            fee_revenue=25_000, validators=validators,
        )
        assert report.epoch == 5
        assert report.year == pytest.approx(5 / 12)
        assert report.inflation_rate > 0
        assert report.inflation_minted > 0
        assert report.fee_revenue == 25_000
        assert report.total_burned == report.fees_burned
