"""Consensus simulator for Agentic Chain."""
from __future__ import annotations
from dataclasses import dataclass
import numpy as np
from agentic.params import (
    SLOTS_PER_EPOCH, VERIFIERS_PER_BLOCK, VERIFICATION_THRESHOLD,
    BLOCK_TIME_MS, REWARD_SPLIT_ORDERER, REWARD_SPLIT_VERIFIER,
)
from agentic.consensus.validator import Validator
from agentic.consensus.vrf import select_verifiers
from agentic.consensus.block import Block, BlockStatus


@dataclass
class EpochResults:
    """Results from one epoch of simulation."""
    epoch: int
    slots_run: int
    blocks_finalized: int
    blocks_failed: int
    avg_finality_s: float
    median_finality_s: float
    p99_finality_s: float
    reward_gini: float  # inequality of reward distribution


class ConsensusSimulator:
    """Simulates Agentic Chain pipelined consensus."""

    def __init__(self, validators: list[Validator], seed: int = 42):
        self.validators = validators
        self.seed = seed
        self.epoch_count = 0

    def run(self, n_epochs: int) -> list[EpochResults]:
        return [self.run_epoch() for _ in range(n_epochs)]

    def run_epoch(self) -> EpochResults:
        epoch = self.epoch_count
        self.epoch_count += 1

        online = [v for v in self.validators if v.online]
        if not online:
            return EpochResults(
                epoch=epoch, slots_run=0, blocks_finalized=0,
                blocks_failed=0, avg_finality_s=0, median_finality_s=0,
                p99_finality_s=0, reward_gini=0,
            )

        total_token = sum(v.token_stake for v in online)
        total_cpu = sum(v.cpu_vpu for v in online)

        # Compute leader schedule (weighted by effective stake)
        weights = np.array([
            v.effective_stake(total_token, total_cpu) for v in online
        ])
        if weights.sum() > 0:
            weights = weights / weights.sum()
        else:
            weights = np.ones(len(online)) / len(online)

        rng = np.random.default_rng(self.seed + epoch)
        leader_indices = rng.choice(len(online), size=SLOTS_PER_EPOCH, p=weights)

        finality_times = []
        blocks_failed = 0

        for slot in range(SLOTS_PER_EPOCH):
            leader = online[leader_indices[slot]]
            block = Block(slot=slot, leader_id=leader.id)
            block.status = BlockStatus.ORDERED
            leader.blocks_ordered += 1

            # Select verifiers — exclude the leader from their own block
            non_leader_online = [v for v in online if v.id != leader.id]
            n_verifiers = min(VERIFIERS_PER_BLOCK, len(non_leader_online))
            try:
                verifiers = select_verifiers(
                    self.validators, n=n_verifiers,
                    slot=epoch * SLOTS_PER_EPOCH + slot,
                    seed=self.seed, total_token=total_token, total_cpu=total_cpu,
                    exclude_ids={leader.id},
                )
            except ValueError:
                blocks_failed += 1
                continue

            # Each verifier generates proof
            for v in verifiers:
                proof_time = v.proof_generation_time_s()
                # Add jitter
                proof_time *= rng.uniform(0.8, 1.2)
                block.add_proof(v.id, proof_time)
                v.blocks_verified += 1

            if block.try_finalize(threshold=VERIFICATION_THRESHOLD):
                finality_times.append(block.finality_time_s)
                # Distribute rewards
                self._distribute_rewards(leader, verifiers, epoch_reward=1.0)
            else:
                blocks_failed += 1

        # Calculate Gini coefficient for reward distribution
        rewards = np.array([v.total_rewards for v in self.validators])
        reward_gini = self._gini(rewards) if rewards.sum() > 0 else 0.0

        return EpochResults(
            epoch=epoch,
            slots_run=SLOTS_PER_EPOCH,
            blocks_finalized=len(finality_times),
            blocks_failed=blocks_failed,
            avg_finality_s=float(np.mean(finality_times)) if finality_times else 0.0,
            median_finality_s=float(np.median(finality_times)) if finality_times else 0.0,
            p99_finality_s=float(np.percentile(finality_times, 99)) if finality_times else 0.0,
            reward_gini=reward_gini,
        )

    def _distribute_rewards(
        self, leader: Validator, verifiers: list[Validator], epoch_reward: float
    ):
        leader.total_rewards += epoch_reward * REWARD_SPLIT_ORDERER
        verifier_share = epoch_reward * REWARD_SPLIT_VERIFIER / len(verifiers)
        for v in verifiers:
            v.total_rewards += verifier_share

    @staticmethod
    def _gini(values: np.ndarray) -> float:
        """Calculate Gini coefficient (0=equal, 1=unequal)."""
        values = np.sort(values)
        n = len(values)
        if n == 0 or values.sum() == 0:
            return 0.0
        index = np.arange(1, n + 1)
        return float((2 * np.sum(index * values) - (n + 1) * np.sum(values)) / (n * np.sum(values)))
