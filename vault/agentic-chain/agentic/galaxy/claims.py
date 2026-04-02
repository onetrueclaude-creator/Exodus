"""Claim transactions and registry for galaxy star system claims."""
from __future__ import annotations

from dataclasses import dataclass, field

from agentic.galaxy.coordinate import GridCoordinate
from agentic.params import BASE_CLAIM_COST, BASE_CPU_CLAIM_COST, CLAIM_COST_FLOOR


def claim_cost(ring: int, density: float) -> tuple[float, float]:
    """Compute AGNTC + CPU cost to claim a coordinate (city model).

    Inner rings are expensive, outer rings are cheap.
    Formula: BASE × density / ring, floored at CLAIM_COST_FLOOR.

    Returns:
        (agntc_cost, cpu_cost) both as floats.
    """
    ring = max(ring, 1)
    agntc = max(BASE_CLAIM_COST * density / ring, CLAIM_COST_FLOOR)
    cpu = max(BASE_CPU_CLAIM_COST * density / ring, CLAIM_COST_FLOOR)
    return (agntc, cpu)


@dataclass
class ClaimEntry:
    """A user's claim on a star system."""

    owner: bytes
    coordinate: GridCoordinate
    stake_amount: int
    slot: int
    active: bool = True


class ClaimRegistry:
    """Tracks all active star system claims."""

    def __init__(self):
        self._claims: list[ClaimEntry] = []
        self._by_coord: dict[GridCoordinate, ClaimEntry] = {}

    def register(
        self, owner: bytes, coordinate: GridCoordinate, stake: int, slot: int,
    ) -> ClaimEntry | None:
        """Register a new claim. Returns None if coordinate is already claimed."""
        if coordinate in self._by_coord:
            return None
        entry = ClaimEntry(owner=owner, coordinate=coordinate, stake_amount=stake, slot=slot)
        self._claims.append(entry)
        self._by_coord[coordinate] = entry
        return entry

    def release(self, owner: bytes, coordinate: GridCoordinate) -> bool:
        """Release a claim. Returns True if found and released."""
        entry = self._by_coord.get(coordinate)
        if entry is None or entry.owner != owner:
            return False
        entry.active = False
        del self._by_coord[coordinate]
        self._claims = [c for c in self._claims if c.active]
        return True

    def get_claims(self, owner: bytes) -> list[ClaimEntry]:
        """All active claims for an owner."""
        return [c for c in self._claims if c.owner == owner and c.active]

    def get_claim_at(self, coordinate: GridCoordinate) -> ClaimEntry | None:
        """Get the active claim at a coordinate, if any."""
        return self._by_coord.get(coordinate)

    def all_active_claims(self) -> list[ClaimEntry]:
        """All active claims across all owners."""
        return [c for c in self._claims if c.active]

    def total_mining_stake(self) -> int:
        """Total AGNTC staked for mining across all active claims."""
        return sum(c.stake_amount for c in self._claims if c.active)

    def as_mining_claims(self) -> list[dict]:
        """Convert active claims to MiningEngine input format."""
        return [
            {"owner": c.owner, "coordinate": c.coordinate, "stake": c.stake_amount}
            for c in self._claims if c.active
        ]
