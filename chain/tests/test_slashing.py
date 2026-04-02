"""Tests for slashing mechanism."""
import pytest
from agentic.economics.slashing import (
    SlashingEngine, SlashReason, SlashEvent, SlashingRecord, SLASH_RATES,
)


class TestSlashRates:
    def test_false_attestation_rate(self):
        assert SLASH_RATES[SlashReason.FALSE_ATTESTATION] == 0.50

    def test_commitment_reveal_mismatch_rate(self):
        assert SLASH_RATES[SlashReason.COMMITMENT_REVEAL_MISMATCH] == 0.25

    def test_double_signing_rate(self):
        assert SLASH_RATES[SlashReason.DOUBLE_SIGNING] == 1.00

    def test_liveness_failure_rate(self):
        assert SLASH_RATES[SlashReason.LIVENESS_FAILURE] == 0.01

    def test_invalid_proof_rate(self):
        assert SLASH_RATES[SlashReason.INVALID_PROOF] == 0.10

    def test_all_reasons_have_rates(self):
        for reason in SlashReason:
            assert reason in SLASH_RATES


class TestSlashComputation:
    def test_false_attestation_slashes_50_percent(self):
        engine = SlashingEngine()
        event = engine.slash(
            validator_id=1, reason=SlashReason.FALSE_ATTESTATION,
            staked_amount=10_000, epoch=5,
        )
        assert event.amount_slashed == 5_000

    def test_double_signing_slashes_100_percent(self):
        engine = SlashingEngine()
        event = engine.slash(
            validator_id=2, reason=SlashReason.DOUBLE_SIGNING,
            staked_amount=10_000, epoch=3,
        )
        assert event.amount_slashed == 10_000

    def test_liveness_failure_slashes_1_percent(self):
        engine = SlashingEngine()
        event = engine.slash(
            validator_id=3, reason=SlashReason.LIVENESS_FAILURE,
            staked_amount=10_000, epoch=7,
        )
        assert event.amount_slashed == 100

    def test_invalid_proof_slashes_10_percent(self):
        engine = SlashingEngine()
        event = engine.slash(
            validator_id=4, reason=SlashReason.INVALID_PROOF,
            staked_amount=10_000, epoch=1,
        )
        assert event.amount_slashed == 1_000

    def test_commitment_reveal_slashes_25_percent(self):
        engine = SlashingEngine()
        event = engine.slash(
            validator_id=5, reason=SlashReason.COMMITMENT_REVEAL_MISMATCH,
            staked_amount=10_000, epoch=2,
        )
        assert event.amount_slashed == 2_500

    def test_slash_event_burned_flag(self):
        engine = SlashingEngine()
        event = engine.slash(
            validator_id=1, reason=SlashReason.DOUBLE_SIGNING,
            staked_amount=5_000, epoch=0,
        )
        assert event.burned is True

    def test_slash_event_fields(self):
        engine = SlashingEngine()
        event = engine.slash(
            validator_id=42, reason=SlashReason.INVALID_PROOF,
            staked_amount=20_000, epoch=10,
        )
        assert event.epoch == 10
        assert event.validator_id == 42
        assert event.reason == SlashReason.INVALID_PROOF
        assert event.amount_slashed == 2_000


class TestSlashingRecord:
    def test_record_tracks_totals(self):
        engine = SlashingEngine()
        engine.slash(validator_id=1, reason=SlashReason.DOUBLE_SIGNING,
                     staked_amount=10_000, epoch=0)
        engine.slash(validator_id=2, reason=SlashReason.LIVENESS_FAILURE,
                     staked_amount=10_000, epoch=1)
        assert engine.record.total_slashed == 10_000 + 100
        assert engine.record.total_burned == 10_000 + 100

    def test_record_event_count(self):
        engine = SlashingEngine()
        engine.slash(validator_id=1, reason=SlashReason.DOUBLE_SIGNING,
                     staked_amount=5_000, epoch=0)
        engine.slash(validator_id=1, reason=SlashReason.LIVENESS_FAILURE,
                     staked_amount=5_000, epoch=1)
        engine.slash(validator_id=2, reason=SlashReason.INVALID_PROOF,
                     staked_amount=8_000, epoch=1)
        assert len(engine.record.events) == 3

    def test_empty_record(self):
        engine = SlashingEngine()
        assert engine.record.total_slashed == 0
        assert engine.record.total_burned == 0
        assert engine.record.events == []


class TestSlashingQueries:
    def test_get_validator_slashes(self):
        engine = SlashingEngine()
        engine.slash(validator_id=1, reason=SlashReason.DOUBLE_SIGNING,
                     staked_amount=5_000, epoch=0)
        engine.slash(validator_id=2, reason=SlashReason.LIVENESS_FAILURE,
                     staked_amount=5_000, epoch=1)
        engine.slash(validator_id=1, reason=SlashReason.INVALID_PROOF,
                     staked_amount=5_000, epoch=2)

        v1_slashes = engine.get_validator_slashes(1)
        assert len(v1_slashes) == 2
        assert all(e.validator_id == 1 for e in v1_slashes)

        v2_slashes = engine.get_validator_slashes(2)
        assert len(v2_slashes) == 1

        v3_slashes = engine.get_validator_slashes(3)
        assert len(v3_slashes) == 0

    def test_get_epoch_slashes(self):
        engine = SlashingEngine()
        engine.slash(validator_id=1, reason=SlashReason.DOUBLE_SIGNING,
                     staked_amount=5_000, epoch=0)
        engine.slash(validator_id=2, reason=SlashReason.LIVENESS_FAILURE,
                     staked_amount=5_000, epoch=1)
        engine.slash(validator_id=3, reason=SlashReason.INVALID_PROOF,
                     staked_amount=5_000, epoch=1)

        epoch_0 = engine.get_epoch_slashes(0)
        assert len(epoch_0) == 1
        assert epoch_0[0].validator_id == 1

        epoch_1 = engine.get_epoch_slashes(1)
        assert len(epoch_1) == 2

        epoch_2 = engine.get_epoch_slashes(2)
        assert len(epoch_2) == 0
