"""Tests for verification agent lifecycle."""
import pytest
from agentic.verification.agent import VerificationAgent, AgentState


class TestAgentState:
    def test_all_states_exist(self):
        states = [s.value for s in AgentState]
        assert "registered" in states
        assert "warming_up" in states
        assert "active" in states
        assert "verifying" in states
        assert "proof_submitted" in states
        assert "probation" in states
        assert "cooldown" in states
        assert "slashed" in states


class TestVerificationAgent:
    def test_create_agent(self):
        agent = VerificationAgent(
            agent_id="agent_0", validator_id=0,
            vpu_capacity=50.0, registered_epoch=0,
        )
        assert agent.state == AgentState.REGISTERED
        assert agent.proofs_generated == 0

    def test_warmup_to_active(self):
        agent = VerificationAgent(
            agent_id="agent_0", validator_id=0,
            vpu_capacity=50.0, registered_epoch=0,
        )
        agent.begin_warmup()
        assert agent.state == AgentState.WARMING_UP
        agent.advance_epoch(current_epoch=1)
        assert agent.state == AgentState.ACTIVE

    def test_cannot_verify_when_not_active(self):
        agent = VerificationAgent(
            agent_id="agent_0", validator_id=0,
            vpu_capacity=50.0, registered_epoch=0,
        )
        assert not agent.can_verify()
        agent.begin_warmup()
        assert not agent.can_verify()

    def test_verify_lifecycle(self):
        agent = VerificationAgent(
            agent_id="agent_0", validator_id=0,
            vpu_capacity=50.0, registered_epoch=0,
        )
        agent.begin_warmup()
        agent.advance_epoch(current_epoch=1)
        assert agent.can_verify()
        agent.begin_verification(task_id=b"\x01" * 32)
        assert agent.state == AgentState.VERIFYING
        agent.submit_proof()
        assert agent.state == AgentState.PROOF_SUBMITTED
        assert agent.proofs_generated == 1
        agent.proof_accepted()
        assert agent.state == AgentState.ACTIVE
        assert agent.proofs_accepted == 1

    def test_probation(self):
        agent = VerificationAgent(
            agent_id="agent_0", validator_id=0,
            vpu_capacity=50.0, registered_epoch=0,
        )
        agent.begin_warmup()
        agent.advance_epoch(current_epoch=1)
        agent.enter_probation(epoch=2)
        assert agent.state == AgentState.PROBATION
        assert not agent.can_verify()
        agent.advance_epoch(current_epoch=3)
        agent.advance_epoch(current_epoch=4)
        agent.advance_epoch(current_epoch=5)
        assert agent.state == AgentState.ACTIVE

    def test_slash(self):
        agent = VerificationAgent(
            agent_id="agent_0", validator_id=0,
            vpu_capacity=50.0, registered_epoch=0,
        )
        agent.begin_warmup()
        agent.advance_epoch(current_epoch=1)
        agent.slash()
        assert agent.state == AgentState.SLASHED
        assert not agent.can_verify()

    def test_cooldown_exit(self):
        agent = VerificationAgent(
            agent_id="agent_0", validator_id=0,
            vpu_capacity=50.0, registered_epoch=0,
        )
        agent.begin_warmup()
        agent.advance_epoch(current_epoch=1)
        agent.begin_cooldown()
        assert agent.state == AgentState.COOLDOWN
