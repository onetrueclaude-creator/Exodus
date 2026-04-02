"""Epoch manager: orchestrates reward distribution, fee burn, vesting,
and staking lifecycle per epoch.

An epoch = SLOTS_PER_EPOCH slots. Each epoch:
  1. Advance staking lifecycle (warmup → active, cooldown → released)
  2. Collect fees from all blocks in the epoch
  3. Compute and distribute rewards (inflation + fees)
  4. Apply slashing penalties
  5. Burn slashed + fee-burned tokens
  6. Update circulating supply
"""
from __future__ import annotations

from dataclasses import dataclass, field

from agentic.params import (
    FEE_BURN_RATE,
    REWARD_SPLIT_ORDERER,
    REWARD_SPLIT_VERIFIER,
    REWARD_SPLIT_STAKER,
    ALPHA,
    BETA,
    SLOTS_PER_EPOCH,
)

# TODO(v2): redesign for organic growth model — no scheduled inflation.
# Legacy inflation constants kept for backward-compat epoch processing.
_LEGACY_INITIAL_RATE = 0.10
_LEGACY_DISINFLATION = 0.10
_LEGACY_FLOOR = 0.01


@dataclass
class EpochAccount:
    """Full accounting for one epoch."""

    epoch: int
    year: float

    # Inflation
    inflation_rate: float = 0.0
    inflation_minted: int = 0

    # Fees
    fee_revenue: int = 0
    fees_burned: int = 0

    # Rewards
    orderer_total: int = 0
    verifier_total: int = 0
    staker_total: int = 0
    total_distributed: int = 0

    # Slashing
    total_slashed: int = 0
    slash_burned: int = 0

    # Supply
    circulating_start: int = 0
    circulating_end: int = 0
    total_burned_epoch: int = 0  # fees_burned + slash_burned

    # Staking
    total_staked: int = 0
    staking_participation: float = 0.0

    # Validators
    active_validators: int = 0
    validator_rewards: dict[int, int] = field(default_factory=dict)


class EpochManager:
    """Manages epoch-level lifecycle for the Agentic Chain.

    Combines inflation computation, fee collection/burn, reward
    distribution, and supply tracking into a single orchestrator.
    """

    def __init__(self, epochs_per_year: int = 12):
        self.epochs_per_year = epochs_per_year
        self.current_epoch: int = 0
        self.history: list[EpochAccount] = []

        # Cumulative tracking
        self.cumulative_minted: int = 0
        self.cumulative_burned: int = 0
        self.cumulative_fees: int = 0

    def inflation_rate(self, epoch: int) -> float:
        """Annual inflation rate at a given epoch."""
        year = epoch / self.epochs_per_year
        rate = _LEGACY_INITIAL_RATE * ((1 - _LEGACY_DISINFLATION) ** year)
        return max(rate, _LEGACY_FLOOR)

    def process_epoch(
        self,
        circulating_supply: int,
        fee_revenue: int,
        validators: list,
        orderer_id: int | None = None,
        slashed_amount: int = 0,
        total_staked: int = 0,
    ) -> EpochAccount:
        """Process one full epoch and return the accounting report.

        Args:
            circulating_supply: Tokens in circulation at epoch start.
            fee_revenue: Total transaction fees collected this epoch.
            validators: List of validator objects (need .id, .token_stake,
                        .cpu_vpu, .online attributes).
            orderer_id: Designated block orderer for this epoch (gets orderer share).
            slashed_amount: Tokens slashed this epoch (already computed externally).
            total_staked: Total tokens currently staked.
        """
        epoch = self.current_epoch
        year = epoch / self.epochs_per_year

        acct = EpochAccount(
            epoch=epoch,
            year=year,
            circulating_start=circulating_supply,
            total_staked=total_staked,
        )

        # --- Inflation ---
        annual_rate = self.inflation_rate(epoch)
        epoch_rate = annual_rate / self.epochs_per_year
        inflation_minted = int(circulating_supply * epoch_rate)

        acct.inflation_rate = annual_rate
        acct.inflation_minted = inflation_minted
        self.cumulative_minted += inflation_minted

        # --- Fee burn ---
        fees_burned = int(fee_revenue * FEE_BURN_RATE)
        fee_remainder = fee_revenue - fees_burned

        acct.fee_revenue = fee_revenue
        acct.fees_burned = fees_burned
        self.cumulative_fees += fee_revenue

        # --- Reward pool ---
        total_pool = inflation_minted + fee_remainder

        orderer_pool = int(total_pool * REWARD_SPLIT_ORDERER)
        verifier_pool = int(total_pool * REWARD_SPLIT_VERIFIER)
        staker_pool = total_pool - orderer_pool - verifier_pool

        # --- Validator distribution ---
        online = [v for v in validators if v.online]
        acct.active_validators = len(online)

        if online:
            total_token = sum(v.token_stake for v in online)
            total_cpu = sum(v.cpu_vpu for v in online)

            effective_stakes: dict[int, float] = {}
            for v in online:
                if total_token > 0 and total_cpu > 0:
                    es = ALPHA * (v.token_stake / total_token) + BETA * (v.cpu_vpu / total_cpu)
                else:
                    es = 1.0 / len(online)
                effective_stakes[v.id] = es
            total_es = sum(effective_stakes.values())

            # Orderer rewards
            if orderer_id is not None and orderer_id in effective_stakes:
                acct.validator_rewards[orderer_id] = (
                    acct.validator_rewards.get(orderer_id, 0) + orderer_pool
                )
                acct.orderer_total = orderer_pool
            elif online:
                per_v = orderer_pool // len(online)
                for v in online:
                    acct.validator_rewards[v.id] = acct.validator_rewards.get(v.id, 0) + per_v
                acct.orderer_total = per_v * len(online)

            # Verifier rewards — proportional to effective stake
            remaining = verifier_pool
            for i, v in enumerate(online):
                share = effective_stakes[v.id] / total_es if total_es > 0 else 1.0 / len(online)
                reward = int(verifier_pool * share) if i < len(online) - 1 else remaining
                acct.validator_rewards[v.id] = acct.validator_rewards.get(v.id, 0) + reward
                remaining -= reward
            acct.verifier_total = verifier_pool

            # Staker rewards — proportional to token stake (capital weight)
            remaining = staker_pool
            for i, v in enumerate(online):
                share = v.token_stake / total_token if total_token > 0 else 1.0 / len(online)
                reward = int(staker_pool * share) if i < len(online) - 1 else remaining
                acct.validator_rewards[v.id] = acct.validator_rewards.get(v.id, 0) + reward
                remaining -= reward
            acct.staker_total = staker_pool

        acct.total_distributed = sum(acct.validator_rewards.values())

        # --- Slashing ---
        acct.total_slashed = slashed_amount
        acct.slash_burned = slashed_amount  # all slashed tokens are burned

        # --- Supply update ---
        total_burned = fees_burned + slashed_amount
        acct.total_burned_epoch = total_burned
        self.cumulative_burned += total_burned

        acct.circulating_end = circulating_supply + inflation_minted - total_burned
        acct.staking_participation = (
            total_staked / acct.circulating_end if acct.circulating_end > 0 else 0.0
        )

        # --- Bookkeeping ---
        self.history.append(acct)
        self.current_epoch += 1

        return acct

    def get_cumulative_stats(self) -> dict:
        """Return cumulative stats across all processed epochs."""
        return {
            "epochs_processed": self.current_epoch,
            "cumulative_minted": self.cumulative_minted,
            "cumulative_burned": self.cumulative_burned,
            "cumulative_fees": self.cumulative_fees,
            "net_issuance": self.cumulative_minted - self.cumulative_burned,
        }

    def get_annualized_yield(self, epoch: int, circulating: int, staked: int) -> float:
        """Estimate annualized staking yield at a given epoch.

        yield = (annual_inflation * circulating) / staked
        """
        if staked <= 0:
            return 0.0
        annual_rate = self.inflation_rate(epoch)
        annual_inflation = circulating * annual_rate
        return annual_inflation / staked
