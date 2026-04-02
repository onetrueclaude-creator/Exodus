"""Tests for Validator model."""
import pytest
from agentic.consensus.validator import Validator, create_validator_set


class TestValidator:
    def test_create_validator(self):
        v = Validator(id=0, token_stake=1000.0, cpu_vpu=50.0)
        assert v.id == 0
        assert v.token_stake == 1000.0
        assert v.cpu_vpu == 50.0
        assert v.online is True

    def test_effective_stake(self):
        v = Validator(id=0, token_stake=1000.0, cpu_vpu=100.0)
        # effective = alpha * normalized_token + beta * normalized_cpu
        # With single validator, both normalize to 1.0
        # effective = 0.4 * 1.0 + 0.6 * 1.0 = 1.0
        es = v.effective_stake(total_token=1000.0, total_cpu=100.0)
        assert abs(es - 1.0) < 1e-6

    def test_effective_stake_weighted(self):
        from agentic.params import ALPHA, BETA
        v = Validator(id=0, token_stake=500.0, cpu_vpu=75.0)
        # normalized_token = 500/2000 = 0.25
        # normalized_cpu = 75/100 = 0.75
        expected = ALPHA * 0.25 + BETA * 0.75
        es = v.effective_stake(total_token=2000.0, total_cpu=100.0)
        assert abs(es - expected) < 1e-6

    def test_offline_validator_zero_effective_stake(self):
        v = Validator(id=0, token_stake=1000.0, cpu_vpu=100.0)
        v.online = False
        es = v.effective_stake(total_token=1000.0, total_cpu=100.0)
        assert es == 0.0


class TestCreateValidatorSet:
    def test_creates_correct_count(self):
        validators = create_validator_set(n=50)
        assert len(validators) == 50

    def test_unique_ids(self):
        validators = create_validator_set(n=20)
        ids = [v.id for v in validators]
        assert len(set(ids)) == 20

    def test_all_have_positive_stakes(self):
        validators = create_validator_set(n=30)
        for v in validators:
            assert v.token_stake > 0
            assert v.cpu_vpu > 0
