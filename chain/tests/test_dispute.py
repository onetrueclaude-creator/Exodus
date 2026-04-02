"""Tests for dispute resolution (Whitepaper Section 5.6)."""
import pytest
from agentic.verification.dispute import DisputeResolver, DisputeOutcome, SafeMode
from agentic.verification.verdict import Verdict


class TestDisputeResolver:
    def test_unanimous_valid(self):
        verdicts = [Verdict.VALID] * 9
        result = DisputeResolver.classify(verdicts, threshold=9)
        assert result == DisputeOutcome.FINALIZED

    def test_unanimous_invalid(self):
        verdicts = [Verdict.INVALID] * 9
        result = DisputeResolver.classify(verdicts, threshold=9)
        assert result == DisputeOutcome.REJECTED

    def test_split_verdict(self):
        verdicts = [Verdict.VALID] * 6 + [Verdict.INVALID] * 3
        result = DisputeResolver.classify(verdicts, threshold=9)
        assert result == DisputeOutcome.DISPUTED

    def test_insufficient_proofs(self):
        verdicts = [Verdict.VALID] * 5
        result = DisputeResolver.classify(verdicts, threshold=9)
        assert result == DisputeOutcome.DISPUTED

    def test_no_proofs(self):
        result = DisputeResolver.classify([], threshold=9)
        assert result == DisputeOutcome.INSUFFICIENT

    def test_threshold_met_with_some_invalid(self):
        verdicts = [Verdict.VALID] * 10 + [Verdict.INVALID] * 3
        result = DisputeResolver.classify(verdicts, threshold=9)
        assert result == DisputeOutcome.FINALIZED

    def test_inconclusive_not_counted_as_valid(self):
        verdicts = [Verdict.VALID] * 8 + [Verdict.INCONCLUSIVE] * 5
        result = DisputeResolver.classify(verdicts, threshold=9)
        assert result == DisputeOutcome.DISPUTED


class TestSafeMode:
    def test_not_triggered_below_threshold(self):
        sm = SafeMode()
        sm.update(total_validators=100, offline_count=10)
        assert not sm.active

    def test_triggered_above_threshold(self):
        sm = SafeMode()
        sm.update(total_validators=100, offline_count=25)
        assert sm.active

    def test_deactivated_on_recovery(self):
        sm = SafeMode()
        sm.update(total_validators=100, offline_count=25)
        assert sm.active
        sm.update(total_validators=100, offline_count=15)
        assert not sm.active

    def test_reduced_threshold(self):
        sm = SafeMode()
        sm.update(total_validators=100, offline_count=25)
        reduced = sm.effective_threshold(normal_threshold=9, available_agents=10)
        assert reduced < 9
        assert reduced >= 1
