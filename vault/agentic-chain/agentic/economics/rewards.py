"""Epoch-level reward distribution engine for AGNTC.

# TODO(v2): redesign for organic growth model — no scheduled inflation.
# Reward distribution will be based on mining yields, not inflation minting.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from agentic.params import (
    FEE_BURN_RATE, REWARD_SPLIT_ORDERER, REWARD_SPLIT_VERIFIER,
    REWARD_SPLIT_STAKER, ALPHA, BETA,
)

# Legacy inflation constants — kept for backward-compat reward projections.
_LEGACY_INITIAL_RATE = 0.10
_LEGACY_DISINFLATION = 0.10
_LEGACY_FLOOR = 0.01


@dataclass
class EpochRewardReport:
    """Complete reward accounting for one epoch."""
    epoch: int
    year: float
    inflation_rate: float
    inflation_minted: int
    fee_revenue: int
    fees_burned: int
    total_rewards: int  # inflation + (fees - burned)
    orderer_rewards: dict[int, int]     # validator_id -> reward
    verifier_rewards: dict[int, int]    # validator_id -> reward
    staker_rewards: dict[int, int]      # validator_id -> reward (delegator share)
    total_burned: int


class RewardsEngine:
    """Computes and distributes epoch rewards.

    Per whitepaper v0.2:
    - Inflation minting based on disinflation curve
    - 50% of transaction fees burned
    - Remaining fees + inflation split: Verifier 60%, Staker 40% (orderers fee-compensated)
    - Distribution weighted by effective stake (40% token, 60% CPU)
    """

    def __init__(self, epochs_per_year: int = 12):
        self.epochs_per_year = epochs_per_year
        self.cumulative_burned: int = 0
        self.cumulative_minted: int = 0

    def inflation_rate_at_epoch(self, epoch: int) -> float:
        """Get annual inflation rate at a given epoch."""
        year = epoch / self.epochs_per_year
        rate = _LEGACY_INITIAL_RATE * ((1 - _LEGACY_DISINFLATION) ** year)
        return max(rate, _LEGACY_FLOOR)

    def compute_epoch_rewards(
        self,
        epoch: int,
        circulating_supply: int,
        fee_revenue: int,
        validators: list,  # list of objects with .id, .token_stake, .cpu_vpu, .online
        orderer_id: int | None = None,
    ) -> EpochRewardReport:
        """Compute full reward distribution for one epoch.

        Args:
            epoch: Current epoch number
            circulating_supply: Total circulating tokens
            fee_revenue: Total fees collected this epoch
            validators: List of Validator objects
            orderer_id: ID of the block orderer (gets orderer share)
        """
        year = epoch / self.epochs_per_year
        inflation_rate = self.inflation_rate_at_epoch(epoch)
        epoch_rate = inflation_rate / self.epochs_per_year
        inflation_minted = int(circulating_supply * epoch_rate)

        # Fee burn
        fees_burned = int(fee_revenue * FEE_BURN_RATE)
        fee_remainder = fee_revenue - fees_burned

        # Total reward pool = inflation + remaining fees
        total_pool = inflation_minted + fee_remainder

        # Split into orderer/verifier/staker pools
        orderer_pool = int(total_pool * REWARD_SPLIT_ORDERER)
        verifier_pool = int(total_pool * REWARD_SPLIT_VERIFIER)
        staker_pool = total_pool - orderer_pool - verifier_pool  # avoid rounding loss

        # Calculate effective stakes for online validators
        online = [v for v in validators if v.online]
        if not online:
            return EpochRewardReport(
                epoch=epoch, year=year, inflation_rate=inflation_rate,
                inflation_minted=inflation_minted, fee_revenue=fee_revenue,
                fees_burned=fees_burned, total_rewards=0,
                orderer_rewards={}, verifier_rewards={}, staker_rewards={},
                total_burned=fees_burned,
            )

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

        # Distribute orderer rewards (all to the orderer, or equally if none specified)
        orderer_rewards = {}
        if orderer_id is not None and orderer_id in effective_stakes:
            orderer_rewards[orderer_id] = orderer_pool
        elif online:
            # Spread orderer pool equally among all (no designated orderer)
            per_validator = orderer_pool // len(online)
            for v in online:
                orderer_rewards[v.id] = per_validator

        # Distribute verifier rewards proportional to effective stake
        verifier_rewards = {}
        remaining = verifier_pool
        for i, v in enumerate(online):
            if total_es > 0:
                share = effective_stakes[v.id] / total_es
            else:
                share = 1.0 / len(online)
            reward = int(verifier_pool * share) if i < len(online) - 1 else remaining
            verifier_rewards[v.id] = reward
            remaining -= reward

        # Distribute staker rewards proportional to token stake (pure capital weight)
        staker_rewards = {}
        remaining = staker_pool
        for i, v in enumerate(online):
            if total_token > 0:
                share = v.token_stake / total_token
            else:
                share = 1.0 / len(online)
            reward = int(staker_pool * share) if i < len(online) - 1 else remaining
            staker_rewards[v.id] = reward
            remaining -= reward

        total_distributed = (
            sum(orderer_rewards.values())
            + sum(verifier_rewards.values())
            + sum(staker_rewards.values())
        )

        self.cumulative_burned += fees_burned
        self.cumulative_minted += inflation_minted

        return EpochRewardReport(
            epoch=epoch,
            year=year,
            inflation_rate=inflation_rate,
            inflation_minted=inflation_minted,
            fee_revenue=fee_revenue,
            fees_burned=fees_burned,
            total_rewards=total_distributed,
            orderer_rewards=orderer_rewards,
            verifier_rewards=verifier_rewards,
            staker_rewards=staker_rewards,
            total_burned=fees_burned,
        )
