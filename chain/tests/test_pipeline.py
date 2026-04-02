"""Tests for the PoAIV verification pipeline orchestrator."""
import pytest
from agentic.consensus.block import Block, BlockStatus
from agentic.consensus.validator import Validator
from agentic.verification.pipeline import VerificationPipeline, BlockVerificationResult
from agentic.verification.agent import VerificationAgent, AgentState
from agentic.verification.verdict import Verdict
from agentic.verification.dispute import DisputeOutcome


def _make_agents(n: int, active: bool = True) -> list[VerificationAgent]:
    agents = []
    for i in range(n):
        a = VerificationAgent(
            agent_id=f"agent_{i}", validator_id=i,
            vpu_capacity=50.0, registered_epoch=0,
        )
        if active:
            a.state = AgentState.ACTIVE
        agents.append(a)
    return agents


def _make_validators(n: int) -> list[Validator]:
    return [
        Validator(id=i, token_stake=1000.0, cpu_vpu=50.0)
        for i in range(n)
    ]


class TestVerificationPipeline:
    def test_create_pipeline(self):
        pipeline = VerificationPipeline(seed=42)
        assert pipeline is not None

    def test_verify_block_happy_path(self):
        agents = _make_agents(20)
        validators = _make_validators(20)
        block = Block(slot=1, leader_id=0, status=BlockStatus.ORDERED)
        state_root = b"\x01" * 32

        pipeline = VerificationPipeline(seed=42)
        result = pipeline.verify_block(
            block=block, agents=agents, validators=validators,
            state_root=state_root,
        )
        assert result.outcome == DisputeOutcome.FINALIZED
        assert block.status == BlockStatus.FINALIZED
        assert result.valid_proof_count >= 9
        assert len(result.mismatched_agents) == 0

    def test_verify_block_with_adversarial_agents(self):
        agents = _make_agents(20)
        validators = _make_validators(20)
        block = Block(slot=1, leader_id=0, status=BlockStatus.ORDERED)

        pipeline = VerificationPipeline(seed=42, adversarial_rate=0.2)
        result = pipeline.verify_block(
            block=block, agents=agents, validators=validators,
            state_root=b"\x01" * 32,
        )
        assert result.outcome == DisputeOutcome.FINALIZED

    def test_verify_block_all_invalid(self):
        agents = _make_agents(20)
        validators = _make_validators(20)
        block = Block(slot=1, leader_id=0, status=BlockStatus.ORDERED)

        pipeline = VerificationPipeline(seed=42, adversarial_rate=1.0)
        result = pipeline.verify_block(
            block=block, agents=agents, validators=validators,
            state_root=b"\x01" * 32,
        )
        assert result.outcome == DisputeOutcome.REJECTED
        assert block.status == BlockStatus.FAILED

    def test_verify_block_insufficient_agents(self):
        agents = _make_agents(5)
        validators = _make_validators(5)
        block = Block(slot=1, leader_id=0, status=BlockStatus.ORDERED)

        pipeline = VerificationPipeline(seed=42)
        result = pipeline.verify_block(
            block=block, agents=agents, validators=validators,
            state_root=b"\x01" * 32,
        )
        # With only 5 agents, threshold is reduced but block may still finalize
        # or be low_confidence depending on safe mode
        assert result.assigned_count == 5

    def test_result_contains_timing(self):
        agents = _make_agents(20)
        validators = _make_validators(20)
        block = Block(slot=1, leader_id=0, status=BlockStatus.ORDERED)

        pipeline = VerificationPipeline(seed=42)
        result = pipeline.verify_block(
            block=block, agents=agents, validators=validators,
            state_root=b"\x01" * 32,
        )
        assert result.total_time_s > 0
        assert result.assigned_count == 13

    def test_zero_agents(self):
        agents = []
        validators = []
        block = Block(slot=1, leader_id=0, status=BlockStatus.ORDERED)

        pipeline = VerificationPipeline(seed=42)
        result = pipeline.verify_block(
            block=block, agents=agents, validators=validators,
            state_root=b"\x01" * 32,
        )
        assert result.outcome == DisputeOutcome.INSUFFICIENT
        assert block.status == BlockStatus.LOW_CONFIDENCE
