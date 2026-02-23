"""Tests for fee model."""
from __future__ import annotations
import pytest
from agentic.economics.fees import FeeSchedule, FeeEngine, FeeDistribution
from agentic.params import FEE_BURN_RATE, REWARD_SPLIT_ORDERER, REWARD_SPLIT_VERIFIER, REWARD_SPLIT_STAKER


class TestFeeSchedule:
    def test_mint_fee(self):
        schedule = FeeSchedule()
        assert schedule.compute_fee("mint") == 100

    def test_transfer_fee(self):
        schedule = FeeSchedule()
        assert schedule.compute_fee("transfer") == 200

    def test_stake_fee(self):
        schedule = FeeSchedule()
        assert schedule.compute_fee("stake") == 150

    def test_unstake_fee(self):
        schedule = FeeSchedule()
        assert schedule.compute_fee("unstake") == 150

    def test_unknown_type_uses_base(self):
        schedule = FeeSchedule()
        assert schedule.compute_fee("unknown") == 100

    def test_per_byte_fee(self):
        schedule = FeeSchedule()
        fee = schedule.compute_fee("transfer", data_bytes=100)
        assert fee == 200 + 100 * 1  # transfer_fee + 100 bytes

    def test_custom_schedule(self):
        schedule = FeeSchedule(base_fee=50, transfer_fee=300, per_byte_fee=2)
        assert schedule.compute_fee("mint") == 50
        assert schedule.compute_fee("transfer") == 300
        assert schedule.compute_fee("transfer", data_bytes=10) == 300 + 20


class TestFeeEngine:
    def test_collect_and_distribute_burn_rate(self):
        engine = FeeEngine()
        dist = engine.collect_and_distribute([1000])
        assert dist.total_fees == 1000
        assert dist.burned == int(1000 * FEE_BURN_RATE)
        assert dist.burned == 500  # 50% of 1000

    def test_remainder_split(self):
        engine = FeeEngine()
        dist = engine.collect_and_distribute([1000])
        remainder = dist.total_fees - dist.burned
        assert remainder == 500
        # Verify all remainder is accounted for
        assert dist.to_orderer + dist.to_verifiers + dist.to_stakers == remainder

    def test_split_ratios(self):
        engine = FeeEngine()
        dist = engine.collect_and_distribute([10000])
        remainder = dist.total_fees - dist.burned  # 5000
        split_total = REWARD_SPLIT_ORDERER + REWARD_SPLIT_VERIFIER + REWARD_SPLIT_STAKER
        expected_orderer = int(remainder * REWARD_SPLIT_ORDERER / split_total)
        expected_verifiers = int(remainder * REWARD_SPLIT_VERIFIER / split_total)
        expected_stakers = remainder - expected_orderer - expected_verifiers
        assert dist.to_orderer == expected_orderer
        assert dist.to_verifiers == expected_verifiers
        assert dist.to_stakers == expected_stakers

    def test_multiple_fees(self):
        engine = FeeEngine()
        dist = engine.collect_and_distribute([200, 300, 500])
        assert dist.total_fees == 1000
        assert dist.burned == 500

    def test_cumulative_totals(self):
        engine = FeeEngine()
        engine.collect_and_distribute([1000])
        engine.collect_and_distribute([2000])
        assert engine.total_collected == 3000
        assert engine.total_burned == int(1000 * FEE_BURN_RATE) + int(2000 * FEE_BURN_RATE)

    def test_zero_fees(self):
        engine = FeeEngine()
        dist = engine.collect_and_distribute([])
        assert dist.total_fees == 0
        assert dist.burned == 0
        assert dist.to_orderer == 0
        assert dist.to_verifiers == 0
        assert dist.to_stakers == 0

    def test_custom_schedule_in_engine(self):
        schedule = FeeSchedule(base_fee=50, transfer_fee=100)
        engine = FeeEngine(schedule=schedule)
        assert engine.schedule.base_fee == 50
        assert engine.schedule.transfer_fee == 100
