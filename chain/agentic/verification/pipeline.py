"""PoAIV Verification Pipeline -- the core orchestrator.

Manages the two-phase block lifecycle:
Phase 1 (existing): BFT ordering -> block reaches ORDERED status
Phase 2 (this module): VRF assignment -> verification -> commitment-reveal -> finalization

Whitepaper Section 5 (PoAIV Verification).
"""
from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field

import numpy as np

import time

from agentic.params import (
    VERIFIERS_PER_BLOCK, VERIFICATION_THRESHOLD, ALPHA, BETA,
    DISPUTE_REVERIFY_MULTIPLIER,
)
from agentic.consensus.block import Block, BlockStatus
from agentic.consensus.validator import Validator
from agentic.verification.agent import VerificationAgent, AgentState
from agentic.verification.commitment import CommitmentRevealProtocol
from agentic.verification.dispute import DisputeResolver, DisputeOutcome, SafeMode
from agentic.verification.proof import (
    SimulatedZKProof, SimulatedAttestation, VerificationProof, ProofMetadata,
)
from agentic.verification.task import TaskType, VerificationTask
from agentic.verification.verdict import Verdict


@dataclass
class BlockVerificationResult:
    """Result of running the verification pipeline on a block."""
    block_slot: int
    outcome: DisputeOutcome
    assigned_count: int
    valid_proof_count: int
    invalid_proof_count: int
    inconclusive_proof_count: int
    mismatched_agents: list[str]
    total_time_s: float
    proofs: list[VerificationProof] = field(default_factory=list)


class VerificationPipeline:
    """Orchestrates PoAIV verification for ordered blocks."""

    def __init__(self, seed: int = 42, adversarial_rate: float = 0.0):
        self.seed = seed
        self.adversarial_rate = adversarial_rate
        self.safe_mode = SafeMode()
        self._rng = np.random.default_rng(seed)

    def verify_block(
        self,
        block: Block,
        agents: list[VerificationAgent],
        validators: list[Validator],
        state_root: bytes,
    ) -> BlockVerificationResult:
        active_agents = [a for a in agents if a.can_verify()]

        n_target = VERIFIERS_PER_BLOCK
        threshold = VERIFICATION_THRESHOLD

        if len(active_agents) < n_target:
            n_target = len(active_agents)
            # Scale threshold proportionally to available agents.
            # If safe mode is active, SafeMode.effective_threshold applies
            # its own stricter scaling (67% of available).  Otherwise we
            # use a simple proportional reduction so that a smaller pool
            # can still finalize blocks.
            if self.safe_mode.active:
                threshold = self.safe_mode.effective_threshold(
                    VERIFICATION_THRESHOLD, n_target,
                )
            else:
                threshold = max(
                    1,
                    math.ceil(
                        n_target * VERIFICATION_THRESHOLD / VERIFIERS_PER_BLOCK
                    ),
                )

        if n_target == 0:
            block.status = BlockStatus.LOW_CONFIDENCE
            return BlockVerificationResult(
                block_slot=block.slot, outcome=DisputeOutcome.INSUFFICIENT,
                assigned_count=0, valid_proof_count=0, invalid_proof_count=0,
                inconclusive_proof_count=0, mismatched_agents=[], total_time_s=0.0,
            )

        # Step 1: VRF-based verifier selection
        selected = self._select_verifiers(active_agents, validators, n_target, block.slot)

        # Step 2: Create verification tasks
        block_hash = hashlib.sha256(
            f"block:{block.slot}:{block.leader_id}".encode(),
        ).digest()
        tasks = self._create_tasks(block_hash, state_root, selected)

        # Step 3: Each agent independently verifies
        proofs: dict[str, VerificationProof] = {}
        for agent, task in zip(selected, tasks):
            agent.begin_verification(task.task_id)
            proof = self._simulate_verification(agent, task, block_hash)
            agent.submit_proof()
            proofs[agent.agent_id] = proof

        # Step 4-5: Commitment-reveal protocol
        cr = CommitmentRevealProtocol(block_hash=block_hash)
        for agent_id, proof in proofs.items():
            cr.submit_commitment(agent_id, proof.commitment_hash())
        cr.advance_to_reveal()
        for agent_id, proof in proofs.items():
            cr.submit_reveal(agent_id, proof)

        mismatches = cr.find_mismatches()
        non_reveals = cr.find_non_reveals()
        valid_proofs = cr.get_valid_proofs()
        cr.close()

        # Step 6: Classify outcome via dispute resolver
        verdicts = [p.verdict for p in valid_proofs]
        outcome = DisputeResolver.classify(verdicts, threshold)

        valid_count = sum(1 for v in verdicts if v == Verdict.VALID)
        invalid_count = sum(1 for v in verdicts if v == Verdict.INVALID)
        inconclusive_count = sum(1 for v in verdicts if v == Verdict.INCONCLUSIVE)

        # Step 7: Update block status based on outcome
        if outcome == DisputeOutcome.FINALIZED:
            block.status = BlockStatus.FINALIZED
            block.finality_time_s = max(
                (p.metadata.total_time_s for p in valid_proofs), default=0.0,
            )
        elif outcome == DisputeOutcome.REJECTED:
            block.status = BlockStatus.FAILED
        elif outcome == DisputeOutcome.DISPUTED:
            block.enter_dispute("split_verdict")
        elif outcome == DisputeOutcome.INSUFFICIENT:
            block.status = BlockStatus.LOW_CONFIDENCE

        # Return honest agents to ACTIVE; misbehaving agents stay flagged
        misbehaving = set(mismatches) | set(non_reveals)
        for agent in selected:
            if agent.state == AgentState.PROOF_SUBMITTED:
                if agent.agent_id in misbehaving:
                    agent.enter_probation(epoch=block.slot)
                else:
                    agent.proof_accepted()

        total_time = max(
            (p.metadata.total_time_s for p in proofs.values()), default=0.0,
        )

        return BlockVerificationResult(
            block_slot=block.slot,
            outcome=outcome,
            assigned_count=len(selected),
            valid_proof_count=valid_count,
            invalid_proof_count=invalid_count,
            inconclusive_proof_count=inconclusive_count,
            mismatched_agents=mismatches + non_reveals,
            total_time_s=total_time,
            proofs=valid_proofs,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _select_verifiers(
        self,
        active_agents: list[VerificationAgent],
        validators: list[Validator],
        n: int,
        slot: int,
    ) -> list[VerificationAgent]:
        """VRF-weighted verifier selection (Whitepaper Section 4.3)."""
        validator_map = {v.id: v for v in validators}

        total_token = sum(v.token_stake for v in validators if v.online)
        total_cpu = sum(v.cpu_vpu for v in validators if v.online)

        # Filter to agents whose validator is online (no uniform fallback)
        eligible = []
        for agent in active_agents:
            v = validator_map.get(agent.validator_id)
            if v and v.online:
                eligible.append((agent, v))

        if not eligible:
            return []

        weights = []
        for _agent, v in eligible:
            if total_token > 0 and total_cpu > 0:
                w = v.effective_stake(total_token, total_cpu)
            else:
                w = 1.0 / len(eligible)
            weights.append(w)

        active_agents = [a for a, _ in eligible]
        weights_arr = np.array(weights)
        if weights_arr.sum() > 0:
            weights_arr = weights_arr / weights_arr.sum()
        else:
            weights_arr = np.ones(len(active_agents)) / len(active_agents)

        # Deterministic VRF seed derived from pipeline seed + slot (128-bit)
        vrf_seed = int(
            hashlib.sha256(
                f"{self.seed}:{slot}:verify".encode(),
            ).hexdigest()[:32],
            16,
        )
        rng = np.random.default_rng(vrf_seed)

        n = min(n, len(active_agents))
        indices = rng.choice(len(active_agents), size=n, replace=False, p=weights_arr)
        return [active_agents[i] for i in indices]

    def _create_tasks(
        self,
        block_hash: bytes,
        state_root: bytes,
        agents: list[VerificationAgent],
    ) -> list[VerificationTask]:
        """Create verification tasks for each assigned agent.

        Mandatory task types (TX_VALIDITY and STATE_TRANSITION) are
        distributed round-robin among assigned agents so that every block
        has at least one of each when the pool is large enough.
        """
        mandatory = TaskType.mandatory_per_block()
        now = time.time()
        tasks = []
        for i, agent in enumerate(agents):
            task_type = mandatory[i % len(mandatory)]
            assignment_proof = hashlib.sha256(
                block_hash + agent.agent_id.encode(),
            ).digest()
            task = VerificationTask(
                block_hash=block_hash,
                task_type=task_type,
                state_snapshot=state_root,
                assignment_proof=assignment_proof,
                assigned_agent_id=agent.agent_id,
                created_at=now,
            )
            tasks.append(task)
        return tasks

    def _simulate_verification(
        self,
        agent: VerificationAgent,
        task: VerificationTask,
        block_hash: bytes,
    ) -> VerificationProof:
        """Simulate a single agent performing verification work."""
        is_adversarial = self._rng.random() < self.adversarial_rate

        # Proving time proportional to VPU capacity (50 VPU = base time)
        base_time = 15.0
        proving_time = base_time * (50.0 / max(agent.vpu_capacity, 1.0))
        jitter = self._rng.uniform(0.8, 1.2)
        proving_time *= jitter

        computation_hash = hashlib.sha256(
            block_hash + task.state_snapshot + agent.agent_id.encode(),
        ).digest()

        zk_proof = SimulatedZKProof.generate(
            circuit_id=f"{task.task_type.value}_v1",
            public_inputs=[block_hash, task.state_snapshot],
            computation_hash=computation_hash,
            proving_time_s=proving_time,
        )

        if is_adversarial:
            analysis = "ANOMALY DETECTED: Invalid state transition."
            verdict = Verdict.INVALID
        else:
            analysis = "No anomalies detected. All transactions valid."
            verdict = Verdict.VALID

        attestation = SimulatedAttestation.generate(
            query_data=block_hash + task.task_type.value.encode(),
            analysis=analysis,
            authority_id="anthropic_primary",
        )

        metadata = ProofMetadata(
            agent_id=agent.agent_id,
            task_type=task.task_type,
            block_hash=block_hash,
            total_time_s=proving_time,
        )

        return VerificationProof(
            zk_proof=zk_proof,
            attestation=attestation,
            verdict=verdict,
            metadata=metadata,
        )
