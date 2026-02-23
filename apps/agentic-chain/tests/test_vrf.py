"""Tests for VRF-based verifier selection."""
import pytest
from agentic.consensus.validator import Validator
from agentic.consensus.vrf import select_verifiers


def make_validators(n=20):
    return [Validator(id=i, token_stake=1000.0, cpu_vpu=50.0) for i in range(n)]


class TestSelectVerifiers:
    def test_selects_correct_count(self):
        validators = make_validators(20)
        selected = select_verifiers(validators, n=13, slot=0, seed=42)
        assert len(selected) == 13

    def test_no_duplicates(self):
        validators = make_validators(20)
        selected = select_verifiers(validators, n=13, slot=0, seed=42)
        ids = [v.id for v in selected]
        assert len(set(ids)) == 13

    def test_different_slots_different_selection(self):
        validators = make_validators(50)
        sel1 = select_verifiers(validators, n=13, slot=0, seed=42)
        sel2 = select_verifiers(validators, n=13, slot=1, seed=42)
        ids1 = {v.id for v in sel1}
        ids2 = {v.id for v in sel2}
        assert ids1 != ids2  # Very unlikely to be identical

    def test_weighted_by_effective_stake(self):
        """Validators with higher effective stake should be selected more often."""
        validators = [
            Validator(id=0, token_stake=10000.0, cpu_vpu=200.0),  # whale
            *[Validator(id=i, token_stake=100.0, cpu_vpu=10.0) for i in range(1, 50)],
        ]
        selections = 0
        for slot in range(200):
            selected = select_verifiers(validators, n=13, slot=slot, seed=42)
            if any(v.id == 0 for v in selected):
                selections += 1
        # Whale should be selected much more often than random (13/50 = 26%)
        assert selections > 100  # >50% of the time

    def test_skips_offline_validators(self):
        validators = make_validators(20)
        for v in validators[:10]:
            v.online = False
        selected = select_verifiers(validators, n=10, slot=0, seed=42)
        for v in selected:
            assert v.online is True

    def test_raises_if_not_enough_online(self):
        validators = make_validators(5)
        for v in validators[:4]:
            v.online = False
        with pytest.raises(ValueError):
            select_verifiers(validators, n=3, slot=0, seed=42)
