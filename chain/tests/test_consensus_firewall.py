"""P1-1 consensus firewall (security keystone).

INVARIANT: the consensus FINALITY weight — committee (verifier) selection and
leader selection — must be a function of AGNTC **token stake ONLY**. Sybil-weak
CPU / PoV-derived work must NEVER influence finality (it stays for liveness and
economic reward via `effective_stake`). If cheap CPU bought finality weight,
corrupting Proof-of-Vault would be a cheap path to consensus influence.

See docs/superpowers/specs/2026-06-20-security-hardening-blueprint.md (P1-1).
"""
import pytest
from agentic.consensus.validator import Validator
from agentic.consensus.vrf import select_verifiers


class TestFinalityWeightTokenOnly:
    def test_finality_weight_ignores_cpu(self):
        # Equal token, wildly different CPU → identical finality weight.
        a = Validator(id=0, token_stake=1000.0, cpu_vpu=10.0)
        b = Validator(id=1, token_stake=1000.0, cpu_vpu=500.0)
        assert a.finality_weight(2000.0) == b.finality_weight(2000.0)

    def test_finality_weight_proportional_to_token(self):
        a = Validator(id=0, token_stake=3000.0, cpu_vpu=10.0)
        b = Validator(id=1, token_stake=1000.0, cpu_vpu=500.0)
        assert a.finality_weight(4000.0) == pytest.approx(0.75)
        assert b.finality_weight(4000.0) == pytest.approx(0.25)

    def test_zero_token_high_cpu_gets_zero_finality_weight(self):
        v = Validator(id=0, token_stake=0.0, cpu_vpu=10000.0)
        assert v.finality_weight(1000.0) == 0.0

    def test_offline_validator_zero_finality_weight(self):
        v = Validator(id=0, token_stake=1000.0, cpu_vpu=100.0)
        v.online = False
        assert v.finality_weight(1000.0) == 0.0


class TestSelectionFirewall:
    def test_cpu_does_not_affect_committee_selection(self):
        # All equal token; half are 50x CPU-whales. Over many slots, the high-CPU
        # group must NOT be selected more than its token share (~half).
        validators = [
            Validator(id=i, token_stake=1000.0, cpu_vpu=(500.0 if i < 10 else 10.0))
            for i in range(20)
        ]
        high_cpu = 0
        total = 0
        for slot in range(400):
            for v in select_verifiers(validators, n=13, slot=slot, seed=42):
                total += 1
                if v.id < 10:
                    high_cpu += 1
        frac = high_cpu / total
        assert 0.42 < frac < 0.58, f"CPU influenced finality selection: {frac:.3f}"

    def test_token_still_drives_selection(self):
        # A token-whale (10x token) is selected far more than a token-minnow,
        # regardless of CPU — finality follows token stake.
        validators = [
            Validator(id=0, token_stake=10000.0, cpu_vpu=10.0),   # token whale, low CPU
            *[Validator(id=i, token_stake=1000.0, cpu_vpu=500.0) for i in range(1, 20)],
        ]
        whale = 0
        for slot in range(300):
            if any(v.id == 0 for v in select_verifiers(validators, n=10, slot=slot, seed=7)):
                whale += 1
        assert whale > 200  # selected most of the time despite the lowest CPU
