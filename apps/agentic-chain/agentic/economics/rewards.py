"""Epoch-level reward distribution engine for AGNTC — v3 (ceiling enforcement, BME)."""
from __future__ import annotations
from dataclasses import dataclass, field
from agentic.params import (
    FEE_BURN_RATE, REWARD_SPLIT_VERIFIER, REWARD_SPLIT_STAKER,
    ALPHA, BETA, ANNUAL_INFLATION_CEILING,
)


@dataclass
class EpochRewardReport:
    """Complete reward accounting for one epoch."""
    epoch: int
    inflation_minted: int           # always 0 in v3 — mining handles supply
    fee_revenue: int
    fees_burned: int
    total_rewards: int              # fee remainder distributed
    verifier_rewards: dict[int, int]
    staker_rewards: dict[int, int]
    total_burned: int
    # BME fields
    bme_claim_burns: int = 0
    bme_verifier_rewards: dict[int, int] = field(default_factory=dict)
    bme_staker_rewards: dict[int, int] = field(default_factory=dict)
    # Inflation ceiling
    mining_minted: int = 0
    ceiling_exceeded: bool = False
    compression_ratio: float = 1.0


class RewardsEngine:
    """Computes and distributes epoch rewards — v3.

    - No scheduled inflation (mining engine creates supply directly)
    - 50% of transaction fees burned
    - Remaining fees split: Verifier 60%, Staker 40%
    - BME claim burns re-minted to verifiers/stakers at same 60/40 split
    - Inflation ceiling enforcement: reports compression_ratio if exceeded
    """

    def __init__(self, epochs_per_year: int = 12):
        self.epochs_per_year = epochs_per_year
        self.cumulative_burned: int = 0
        self.cumulative_minted: int = 0

    def compute_epoch_rewards(
        self,
        epoch: int,
        circulating_supply: int,
        fee_revenue: int,
        mining_minted: int,
        validators: list,
        bme_claim_burns: int = 0,
    ) -> EpochRewardReport:
        # Fee burn
        fees_burned = int(fee_revenue * FEE_BURN_RATE)
        fee_remainder = fee_revenue - fees_burned

        # Inflation ceiling check
        epoch_ceiling = circulating_supply * (ANNUAL_INFLATION_CEILING / self.epochs_per_year)
        ceiling_exceeded = mining_minted > epoch_ceiling
        compression_ratio = (epoch_ceiling / mining_minted) if (ceiling_exceeded and mining_minted > 0) else 1.0

        # Online validators
        online = [v for v in validators if v.online]
        if not online:
            self.cumulative_burned += fees_burned
            return EpochRewardReport(
                epoch=epoch, inflation_minted=0, fee_revenue=fee_revenue,
                fees_burned=fees_burned, total_rewards=0,
                verifier_rewards={}, staker_rewards={},
                total_burned=fees_burned, mining_minted=mining_minted,
                ceiling_exceeded=ceiling_exceeded, compression_ratio=compression_ratio,
                bme_claim_burns=bme_claim_burns,
            )

        # Effective stakes
        total_token = sum(v.token_stake for v in online)
        total_cpu = sum(v.cpu_vpu for v in online)

        effective_stakes = {}
        for v in online:
            if total_token > 0 and total_cpu > 0:
                es = ALPHA * (v.token_stake / total_token) + BETA * (v.cpu_vpu / total_cpu)
            else:
                es = 1.0 / len(online)
            effective_stakes[v.id] = es
        total_es = sum(effective_stakes.values())

        # Distribute fee remainder: 60% verifiers, 40% stakers
        verifier_pool = int(fee_remainder * REWARD_SPLIT_VERIFIER)
        staker_pool = fee_remainder - verifier_pool

        verifier_rewards = self._distribute(online, verifier_pool, effective_stakes, total_es)
        staker_rewards = self._distribute_by_token(online, staker_pool, total_token)

        # BME claim mints
        bme_verifier_rewards = {}
        bme_staker_rewards = {}
        if bme_claim_burns > 0:
            bme_v_pool = int(bme_claim_burns * REWARD_SPLIT_VERIFIER)
            bme_s_pool = bme_claim_burns - bme_v_pool
            bme_verifier_rewards = self._distribute(online, bme_v_pool, effective_stakes, total_es)
            bme_staker_rewards = self._distribute_by_token(online, bme_s_pool, total_token)

        total_distributed = sum(verifier_rewards.values()) + sum(staker_rewards.values())
        self.cumulative_burned += fees_burned
        self.cumulative_minted += bme_claim_burns

        return EpochRewardReport(
            epoch=epoch, inflation_minted=0, fee_revenue=fee_revenue,
            fees_burned=fees_burned, total_rewards=total_distributed,
            verifier_rewards=verifier_rewards, staker_rewards=staker_rewards,
            total_burned=fees_burned, mining_minted=mining_minted,
            ceiling_exceeded=ceiling_exceeded, compression_ratio=compression_ratio,
            bme_claim_burns=bme_claim_burns,
            bme_verifier_rewards=bme_verifier_rewards,
            bme_staker_rewards=bme_staker_rewards,
        )

    def _distribute(self, validators, pool, effective_stakes, total_es) -> dict[int, int]:
        rewards = {}
        remaining = pool
        for i, v in enumerate(validators):
            share = effective_stakes[v.id] / total_es if total_es > 0 else 1.0 / len(validators)
            reward = int(pool * share) if i < len(validators) - 1 else remaining
            rewards[v.id] = reward
            remaining -= reward
        return rewards

    def _distribute_by_token(self, validators, pool, total_token) -> dict[int, int]:
        rewards = {}
        remaining = pool
        for i, v in enumerate(validators):
            share = v.token_stake / total_token if total_token > 0 else 1.0 / len(validators)
            reward = int(pool * share) if i < len(validators) - 1 else remaining
            rewards[v.id] = reward
            remaining -= reward
        return rewards
