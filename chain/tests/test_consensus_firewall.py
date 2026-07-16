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
from agentic.verification.pipeline import VerificationPipeline
from agentic.verification.agent import VerificationAgent, AgentState


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


class TestPipelineSelectionFirewall:
    """P1-1 regression guard for the call site actually wired into the LIVE
    coordinator: agentic.testnet.api's /api/mine -> GenesisState.verification_
    pipeline.verify_block -> VerificationPipeline._select_verifiers.

    Unlike vrf.select_verifiers (already firewalled and covered above),
    _select_verifiers historically weighted by `effective_stake` (CPU-
    inclusive, ALPHA=0.40/BETA=0.60) instead of `finality_weight` (token
    stake only). That is the same P1-1 Sybil-selection gap this whole class
    exists to prevent — just at a call site the earlier firewall pass missed.
    These tests must hold against the fixed code exactly like the
    TestSelectionFirewall tests above hold for vrf.select_verifiers.
    """

    @staticmethod
    def _agents_for(validators: list[Validator]) -> list[VerificationAgent]:
        return [
            VerificationAgent(
                agent_id=f"agent-{v.id}", validator_id=v.id, vpu_capacity=50.0,
                registered_epoch=0, state=AgentState.ACTIVE,
            )
            for v in validators
        ]

    def test_pipeline_cpu_does_not_affect_verifier_selection(self):
        # All equal token; half are 50x CPU-whales. Over many slots, the
        # high-CPU group must NOT be selected more than its token share (~half).
        validators = [
            Validator(id=i, token_stake=1000.0, cpu_vpu=(500.0 if i < 10 else 10.0))
            for i in range(20)
        ]
        agents = self._agents_for(validators)
        pipeline = VerificationPipeline(seed=42)
        high_cpu = 0
        total = 0
        for slot in range(400):
            selected = pipeline._select_verifiers(agents, validators, n=13, slot=slot)
            for a in selected:
                total += 1
                if a.validator_id < 10:
                    high_cpu += 1
        frac = high_cpu / total
        assert 0.42 < frac < 0.58, (
            f"CPU influenced live pipeline verifier selection: {frac:.3f}"
        )

    def test_pipeline_token_whale_dominates_despite_low_cpu(self):
        # A token-whale (10x token, LOW cpu) must still be selected far more
        # than token-minnows regardless of its low CPU — the live pipeline's
        # committee selection follows token stake, never CPU.
        validators = [
            Validator(id=0, token_stake=10000.0, cpu_vpu=10.0),  # token whale, low CPU
            *[Validator(id=i, token_stake=1000.0, cpu_vpu=500.0) for i in range(1, 20)],
        ]
        agents = self._agents_for(validators)
        pipeline = VerificationPipeline(seed=7)
        whale = 0
        for slot in range(300):
            selected = pipeline._select_verifiers(agents, validators, n=10, slot=slot)
            if any(a.validator_id == 0 for a in selected):
                whale += 1
        assert whale > 200  # selected most of the time despite the lowest CPU
