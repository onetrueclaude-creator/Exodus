"""Tests for verification task types and verdicts."""
import pytest
from agentic.verification.verdict import Verdict
from agentic.verification.task import TaskType, VerificationTask


class TestVerdict:
    def test_verdict_values(self):
        assert Verdict.VALID.value == "valid"
        assert Verdict.INVALID.value == "invalid"
        assert Verdict.INCONCLUSIVE.value == "inconclusive"

    def test_verdict_is_definitive(self):
        assert Verdict.VALID.is_definitive()
        assert Verdict.INVALID.is_definitive()
        assert not Verdict.INCONCLUSIVE.is_definitive()


class TestTaskType:
    def test_four_task_types(self):
        assert len(TaskType) == 4

    def test_task_type_values(self):
        assert TaskType.TX_VALIDITY.value == "tx_validity"
        assert TaskType.STATE_TRANSITION.value == "state_transition"
        assert TaskType.CROSS_LEDGER.value == "cross_ledger"
        assert TaskType.PROOF_CORRECTNESS.value == "proof_correctness"

    def test_mandatory_tasks(self):
        mandatory = TaskType.mandatory_per_block()
        assert TaskType.TX_VALIDITY in mandatory
        assert TaskType.STATE_TRANSITION in mandatory
        assert TaskType.CROSS_LEDGER not in mandatory


class TestVerificationTask:
    def test_create_task(self):
        task = VerificationTask(
            block_hash=b"\x01" * 32,
            task_type=TaskType.TX_VALIDITY,
            state_snapshot=b"\x02" * 32,
            assignment_proof=b"\x03" * 32,
            assigned_agent_id="agent_0",
            created_at=1.0,
        )
        assert task.block_hash == b"\x01" * 32
        assert task.task_type == TaskType.TX_VALIDITY
        assert task.assigned_agent_id == "agent_0"

    def test_task_id_is_deterministic(self):
        task = VerificationTask(
            block_hash=b"\x01" * 32,
            task_type=TaskType.TX_VALIDITY,
            state_snapshot=b"\x02" * 32,
            assignment_proof=b"\x03" * 32,
            assigned_agent_id="agent_0",
            created_at=1.0,
        )
        assert isinstance(task.task_id, bytes)
        assert len(task.task_id) == 32
        task2 = VerificationTask(
            block_hash=b"\x01" * 32,
            task_type=TaskType.TX_VALIDITY,
            state_snapshot=b"\x02" * 32,
            assignment_proof=b"\x03" * 32,
            assigned_agent_id="agent_0",
            created_at=1.0,
        )
        assert task.task_id == task2.task_id

    def test_estimated_proving_time(self):
        task = VerificationTask(
            block_hash=b"\x01" * 32,
            task_type=TaskType.TX_VALIDITY,
            state_snapshot=b"\x02" * 32,
            assignment_proof=b"\x03" * 32,
            assigned_agent_id="agent_0",
            created_at=1.0,
        )
        lo, hi = task.estimated_proving_time_s()
        assert 1.0 <= lo <= hi <= 5.0
