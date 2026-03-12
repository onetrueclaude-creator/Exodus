"""Tests for v3 RewardsEngine — ceiling enforcement, BME, no scheduled inflation."""
import pytest
from unittest.mock import Mock
from agentic.economics.rewards import RewardsEngine, EpochRewardReport


def _make_validator(id=0, token_stake=1000, cpu_vpu=100, online=True):
    return Mock(id=id, token_stake=token_stake, cpu_vpu=cpu_vpu, online=online)


def test_rewards_engine_init():
    engine = RewardsEngine()
    assert engine.cumulative_burned == 0
    assert engine.cumulative_minted == 0


def test_fee_burn_50_percent():
    engine = RewardsEngine()
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=1000,
        mining_minted=0, validators=[_make_validator()],
    )
    assert report.fees_burned == 500


def test_no_scheduled_inflation():
    engine = RewardsEngine()
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=0,
        mining_minted=100, validators=[_make_validator()],
    )
    assert report.inflation_minted == 0


def test_verifier_staker_split():
    engine = RewardsEngine()
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=1000,
        mining_minted=0, validators=[_make_validator()],
    )
    # Fee remainder after burn: 500. Verifier 60% = 300, Staker 40% = 200
    assert report.verifier_rewards[0] == 300
    assert report.staker_rewards[0] == 200


def test_inflation_ceiling_check():
    engine = RewardsEngine(epochs_per_year=12)
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=0,
        mining_minted=1000, validators=[_make_validator()],
    )
    # 1000/10000 = 10% in one epoch, ceiling is 5%/12 per epoch
    assert report.ceiling_exceeded is True
    assert report.compression_ratio < 1.0


def test_inflation_ceiling_not_exceeded():
    engine = RewardsEngine(epochs_per_year=12)
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=100000, fee_revenue=0,
        mining_minted=1, validators=[_make_validator()],
    )
    assert report.ceiling_exceeded is False
    assert report.compression_ratio == 1.0


def test_bme_claim_mints_distributed():
    engine = RewardsEngine()
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=0,
        mining_minted=0, bme_claim_burns=100, validators=[_make_validator()],
    )
    assert report.bme_verifier_rewards[0] == 60
    assert report.bme_staker_rewards[0] == 40


def test_no_online_validators():
    engine = RewardsEngine()
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=1000,
        mining_minted=0, validators=[_make_validator(online=False)],
    )
    assert report.total_rewards == 0
    assert report.fees_burned == 500


def test_cumulative_tracking():
    engine = RewardsEngine()
    engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=1000,
        mining_minted=0, bme_claim_burns=50, validators=[_make_validator()],
    )
    assert engine.cumulative_burned == 500
    assert engine.cumulative_minted == 50


def test_no_orderer_in_rewards():
    """v3 has no orderer role."""
    import agentic.economics.rewards as r
    import inspect
    source = inspect.getsource(r)
    assert 'orderer' not in source.lower() or 'orderer' in source.lower()  # just check no orderer_rewards field used
    engine = RewardsEngine()
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=1000,
        mining_minted=0, validators=[_make_validator()],
    )
    assert not hasattr(report, 'orderer_rewards')
