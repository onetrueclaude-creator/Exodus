"""Community pool and mining engine for galaxy grid."""
from __future__ import annotations

from dataclasses import dataclass, field

from agentic.params import (
    TOTAL_SUPPLY,
    DIST_COMMUNITY,
    BASE_MINING_RATE_PER_BLOCK,
)
from agentic.galaxy.coordinate import resource_density

COMMUNITY_POOL_TOTAL = TOTAL_SUPPLY * DIST_COMMUNITY  # 16,800,000 AGNTC


class CommunityPool:
    """Tracks the Community Pool balance for mining airdrop rewards."""

    def __init__(self):
        self._remaining: float = float(COMMUNITY_POOL_TOTAL)
        self._total_distributed: float = 0.0

    @property
    def remaining(self) -> float:
        return self._remaining

    @property
    def total_distributed(self) -> float:
        return self._total_distributed

    @property
    def is_exhausted(self) -> bool:
        return self._remaining <= 0.0

    @property
    def fraction_remaining(self) -> float:
        if COMMUNITY_POOL_TOTAL <= 0:
            return 0.0
        return self._remaining / COMMUNITY_POOL_TOTAL

    def withdraw(self, amount: float) -> float:
        """Withdraw from pool. Returns actual amount taken (capped at remaining)."""
        actual = min(amount, self._remaining)
        self._remaining -= actual
        self._total_distributed += actual
        return actual


@dataclass
class MiningEngine:
    """Computes per-block mining yields for active claims."""

    pool: CommunityPool
    total_blocks_processed: int = 0
    total_rewards_distributed: float = 0.0

    def compute_block_yields(self, claims: list[dict]) -> dict[bytes, float]:
        """Compute mining rewards for one block.

        Args:
            claims: list of dicts with keys: owner (bytes), coordinate (GridCoordinate), stake (int)

        Returns:
            dict mapping owner -> reward amount (float AGNTC)
        """
        if not claims or self.pool.is_exhausted:
            self.total_blocks_processed += 1
            return {}

        total_stake = sum(c["stake"] for c in claims)
        if total_stake <= 0:
            self.total_blocks_processed += 1
            return {}

        pool_frac = self.pool.fraction_remaining

        # Compute raw yields
        raw_yields: dict[bytes, float] = {}
        for claim in claims:
            density = resource_density(claim["coordinate"].x, claim["coordinate"].y)
            stake_weight = claim["stake"] / total_stake
            raw = BASE_MINING_RATE_PER_BLOCK * density * stake_weight * pool_frac
            owner = claim["owner"]
            raw_yields[owner] = raw_yields.get(owner, 0.0) + raw

        # Withdraw total from pool (capped)
        total_raw = sum(raw_yields.values())
        actual_total = self.pool.withdraw(total_raw)

        # Scale if pool didn't have enough
        if total_raw > 0 and actual_total < total_raw:
            scale = actual_total / total_raw
            raw_yields = {k: v * scale for k, v in raw_yields.items()}

        self.total_blocks_processed += 1
        self.total_rewards_distributed += actual_total
        return raw_yields

    def mint_block_rewards(
        self,
        yields: dict[bytes, float],
        state,
        viewing_keys: dict[bytes, bytes],
    ) -> int:
        """Convert float yields into ledger Records via validate_mint.

        Yields are scaled to microAGNTC (int, * 1_000_000) for integer-safe storage.
        Returns number of records created.
        """
        from agentic.ledger.transaction import MintTx, validate_mint
        from agentic.params import MINT_PROGRAM_ID

        records_created = 0
        slot = self.total_blocks_processed

        for owner, amount in yields.items():
            if amount <= 0:
                continue
            micro_amount = round(amount * 1_000_000)
            if micro_amount <= 0:
                continue
            vk = viewing_keys.get(owner, owner)
            tx = MintTx(
                recipient=owner,
                recipient_viewing_key=vk,
                amount=micro_amount,
                slot=slot,
            )
            validate_mint(tx, state)
            records_created += 1

        return records_created
