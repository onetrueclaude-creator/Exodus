"""EpochTracker — mining-driven galaxy grid ring expansion."""
from __future__ import annotations

import math

from agentic.params import HARDNESS_MULTIPLIER, GENESIS_EPOCH_RING, HOMENODE_BASE_ANGLE


def _nth_prime(n: int) -> int:
    """Return the N-th prime number (1-indexed: prime(1)=2, prime(2)=3, ...)."""
    if n <= 0:
        raise ValueError(f"n must be >= 1, got {n}")
    primes = []
    candidate = 2
    while len(primes) < n:
        if all(candidate % p != 0 for p in primes):
            primes.append(candidate)
        candidate += 1
    return primes[-1]


# Faction arm center angles (degrees from positive x-axis, CCW)
_FACTION_ANGLES = {
    "community":    135.0,   # NW arm — Free Community (N)
    "machines":      45.0,   # NE arm — Machines Faction (E)
    "founders":     315.0,   # SE arm — Founder Pool (S)
    "professional": 225.0,   # SW arm — Professional Pool (W)
}


class EpochTracker:
    """Tracks cumulative AGNTC mined and opens grid rings as thresholds are crossed.

    One Epoch = one ring expansion. Ring N opens when total_mined >= threshold(N).
    threshold(N) = 4 * N * (N+1)  [cumulative AGNTC required]
    """

    def __init__(self, genesis_ring: int = GENESIS_EPOCH_RING) -> None:
        self.current_ring: int = genesis_ring
        self.total_mined: float = 0.0

    def threshold(self, ring: int) -> float:
        """Cumulative AGNTC needed to open ring N."""
        return 4.0 * ring * (ring + 1)

    def hardness(self, ring: int) -> int:
        """Mining difficulty multiplier at ring N. Hardness = HARDNESS_MULTIPLIER × ring."""
        return HARDNESS_MULTIPLIER * max(ring, 1)

    def record_mined(self, amount: float) -> list[int]:
        """Add amount to total_mined. Returns list of newly opened rings (usually [])."""
        self.total_mined += amount
        newly_opened: list[int] = []
        while self.threshold(self.current_ring + 1) <= self.total_mined:
            self.current_ring += 1
            newly_opened.append(self.current_ring)
        return newly_opened

    def next_epoch_threshold(self) -> float:
        """Cumulative AGNTC needed to open next ring."""
        return self.threshold(self.current_ring + 1)

    def agntc_to_next_epoch(self) -> float:
        """Remaining AGNTC needed to trigger next ring expansion."""
        return max(0.0, self.next_epoch_threshold() - self.total_mined)

    def progress_to_next(self) -> float:
        """Fraction [0.0, 1.0] of progress toward next epoch threshold."""
        prev = self.threshold(self.current_ring) if self.current_ring > 1 else 0.0
        next_ = self.next_epoch_threshold()
        span = next_ - prev
        if span <= 0:
            return 1.0
        progress = (self.total_mined - prev) / span
        return max(0.0, min(1.0, progress))

    def homenode_coordinate(self, faction: str, ring_n: int) -> tuple[int, int]:
        """Compute homenode position for the N-th player in a faction.

        Uses prime-angle twist: angle = faction_base + prime(ring_n) * BASE_ANGLE.
        Snaps to nearest integer grid cell center.
        Chebyshev distance from origin = ring_n.
        """
        base_angle = _FACTION_ANGLES.get(faction, 0.0)
        prime_n = _nth_prime(ring_n)
        angle_deg = (base_angle + prime_n * HOMENODE_BASE_ANGLE) % 360.0
        angle_rad = math.radians(angle_deg)

        # Project ring_n outward in angular direction
        raw_x = ring_n * math.cos(angle_rad)
        raw_y = ring_n * math.sin(angle_rad)

        # Snap to nearest integer
        x = round(raw_x)
        y = round(raw_y)

        # Ensure Chebyshev distance = ring_n by adjusting dominant axis if needed
        chebyshev = max(abs(x), abs(y))
        if chebyshev != ring_n and chebyshev > 0:
            scale = ring_n / chebyshev
            x = round(raw_x * scale)
            y = round(raw_y * scale)

        return x, y
