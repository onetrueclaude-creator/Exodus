"""Tests for extended block statuses."""
from agentic.consensus.block import BlockStatus, Block


class TestExtendedBlockStatus:
    def test_dispute_status_exists(self):
        assert BlockStatus.DISPUTED.value == "disputed"

    def test_low_confidence_status_exists(self):
        assert BlockStatus.LOW_CONFIDENCE.value == "low_confidence"

    def test_timed_out_status_exists(self):
        assert BlockStatus.TIMED_OUT.value == "timed_out"


class TestBlockVerificationMetadata:
    def test_block_has_verification_round(self):
        block = Block(slot=0, leader_id=0)
        assert block.verification_round == 1

    def test_block_has_dispute_info(self):
        block = Block(slot=0, leader_id=0)
        assert block.dispute_reason is None

    def test_enter_dispute(self):
        block = Block(slot=0, leader_id=0)
        block.status = BlockStatus.ORDERED
        block.enter_dispute("split_verdict")
        assert block.status == BlockStatus.DISPUTED
        assert block.dispute_reason == "split_verdict"
        assert block.verification_round == 2
