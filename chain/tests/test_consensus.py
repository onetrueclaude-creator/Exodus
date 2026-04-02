"""Tests for block model and consensus simulator."""
import pytest
from agentic.consensus.block import Block, BlockStatus
from agentic.consensus.validator import create_validator_set
from agentic.consensus.simulator import ConsensusSimulator


class TestBlock:
    def test_block_creation(self):
        b = Block(slot=0, leader_id=1)
        assert b.slot == 0
        assert b.leader_id == 1
        assert b.status == BlockStatus.PROPOSED

    def test_add_proof(self):
        b = Block(slot=0, leader_id=1)
        b.add_proof(validator_id=5, proof_time_s=12.0)
        assert len(b.proofs) == 1
        assert b.proofs[0] == (5, 12.0)

    def test_finalize_at_threshold(self):
        b = Block(slot=0, leader_id=1)
        for i in range(9):  # threshold = 9
            b.add_proof(validator_id=i, proof_time_s=10.0 + i)
        b.try_finalize(threshold=9)
        assert b.status == BlockStatus.FINALIZED
        assert b.finality_time_s == 18.0  # max proof time = 10+8=18

    def test_not_finalized_below_threshold(self):
        b = Block(slot=0, leader_id=1)
        for i in range(5):
            b.add_proof(validator_id=i, proof_time_s=10.0)
        b.try_finalize(threshold=9)
        assert b.status == BlockStatus.VERIFIED  # has proofs but not enough


class TestConsensusSimulator:
    def test_run_epoch(self):
        validators = create_validator_set(n=30, seed=42)
        sim = ConsensusSimulator(validators=validators, seed=42)
        results = sim.run_epoch()
        assert results.slots_run > 0
        assert results.blocks_finalized >= 0
        assert results.avg_finality_s >= 0

    def test_multiple_epochs(self):
        validators = create_validator_set(n=30, seed=42)
        sim = ConsensusSimulator(validators=validators, seed=42)
        all_results = sim.run(n_epochs=5)
        assert len(all_results) == 5

    def test_high_offline_rate_reduces_finalization(self):
        validators = create_validator_set(n=30, seed=42)
        # Take 90% offline — only 3 remain, far below threshold of 9
        for v in validators[:27]:
            v.online = False
        sim = ConsensusSimulator(validators=validators, seed=42)
        results = sim.run_epoch()
        # With only 3 online and needing 9 threshold, no blocks should finalize
        assert results.blocks_finalized < results.slots_run
