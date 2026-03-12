"""Mining engine for galaxy grid — v3 (no CommunityPool, hardness-only)."""
from __future__ import annotations

from dataclasses import dataclass, field

from agentic.params import BASE_MINING_RATE_PER_BLOCK
from agentic.galaxy.coordinate import resource_density


@dataclass
class MiningEngine:
    """Computes per-block mining yields for active claims.

    v3: No CommunityPool — mining creates new supply directly.
    Yield = BASE_RATE * density * stake_weight / hardness.
    Supply growth is bounded by ANNUAL_INFLATION_CEILING (checked by RewardsEngine).
    """

    total_blocks_processed: int = 0
    total_rewards_distributed: float = 0.0
    _last_newly_opened: list[int] = field(default_factory=list, repr=False)

    def compute_block_yields(
        self, claims: list[dict], *, epoch_tracker=None,
    ) -> dict[bytes, float]:
        if not claims:
            self.total_blocks_processed += 1
            return {}

        total_stake = sum(c["stake"] for c in claims)
        if total_stake <= 0:
            self.total_blocks_processed += 1
            return {}

        hardness = 1
        if epoch_tracker is not None:
            hardness = epoch_tracker.hardness(epoch_tracker.current_ring)

        raw_yields: dict[bytes, float] = {}
        for claim in claims:
            density = resource_density(claim["coordinate"].x, claim["coordinate"].y)
            stake_weight = claim["stake"] / total_stake
            raw = BASE_MINING_RATE_PER_BLOCK * density * stake_weight / hardness
            owner = claim["owner"]
            raw_yields[owner] = raw_yields.get(owner, 0.0) + raw

        total_mined = sum(raw_yields.values())

        if epoch_tracker is not None:
            self._last_newly_opened = epoch_tracker.record_mined(total_mined)
        else:
            self._last_newly_opened = []

        self.total_blocks_processed += 1
        self.total_rewards_distributed += total_mined
        return raw_yields

    def mint_block_rewards(
        self,
        yields: dict[bytes, float],
        state,
        viewing_keys: dict[bytes, bytes],
    ) -> int:
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
