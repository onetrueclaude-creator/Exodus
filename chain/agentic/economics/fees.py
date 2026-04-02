"""Fee model for AGNTC transactions.

NOT cryptographically secure -- prototype only.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from agentic.params import FEE_BURN_RATE, REWARD_SPLIT_ORDERER, REWARD_SPLIT_VERIFIER, REWARD_SPLIT_STAKER


@dataclass
class FeeSchedule:
    """Fee schedule for different transaction types."""

    base_fee: int = 100          # base fee in smallest AGNTC unit
    transfer_fee: int = 200      # transfer tx fee
    stake_fee: int = 150         # staking tx fee
    unstake_fee: int = 150       # unstaking tx fee
    per_byte_fee: int = 1        # per-byte data fee

    def compute_fee(self, tx_type: str, data_bytes: int = 0) -> int:
        """Compute total fee for a transaction."""
        type_fees = {
            "mint": self.base_fee,
            "transfer": self.transfer_fee,
            "stake": self.stake_fee,
            "unstake": self.unstake_fee,
        }
        return type_fees.get(tx_type, self.base_fee) + data_bytes * self.per_byte_fee


@dataclass
class FeeDistribution:
    """Result of distributing fees for a block."""

    total_fees: int
    burned: int
    to_orderer: int
    to_verifiers: int
    to_stakers: int


class FeeEngine:
    """Handles fee collection, burn, and distribution."""

    def __init__(self, schedule: FeeSchedule | None = None):
        self.schedule = schedule or FeeSchedule()
        self.total_collected: int = 0
        self.total_burned: int = 0

    def collect_and_distribute(self, fees: list[int]) -> FeeDistribution:
        """Collect fees from a block's transactions, burn portion, distribute rest.

        Per whitepaper: 50% burned, remaining 50% split among orderer/verifiers/stakers
        using the REWARD_SPLIT ratios.
        """
        total = sum(fees)
        self.total_collected += total

        burned = int(total * FEE_BURN_RATE)
        self.total_burned += burned

        remainder = total - burned
        split_total = REWARD_SPLIT_ORDERER + REWARD_SPLIT_VERIFIER + REWARD_SPLIT_STAKER
        to_orderer = int(remainder * REWARD_SPLIT_ORDERER / split_total)
        to_verifiers = int(remainder * REWARD_SPLIT_VERIFIER / split_total)
        to_stakers = remainder - to_orderer - to_verifiers  # avoid rounding errors

        return FeeDistribution(
            total_fees=total,
            burned=burned,
            to_orderer=to_orderer,
            to_verifiers=to_verifiers,
            to_stakers=to_stakers,
        )
