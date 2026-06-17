"""Phyllotaxis seating math (v1.2).

Seat = rank ``k``. Hardness tiers come from equal-width radial bands so inner
bands are scarce/cheap and outer bands hold proportionally more:

    band(k)    = ceil(sqrt(k / SEATS_INNER_BAND))     # band 1 = ranks 1..K1
    hardness   = HARDNESS_MULTIPLIER * band(k)        # mirrors v1.1 16*ring
    seat_cost  = BASE * density / band                # inner expensive (city model)

Band ``b`` holds ``(2b−1)·K1`` seats (annulus area); cumulative ∝ B², which
recovers the v1.1 epoch-threshold shape ``4N(N+1)``.
"""
from __future__ import annotations

import math

from agentic.params import (
    BASE_CLAIM_COST,
    BASE_CPU_CLAIM_COST,
    CLAIM_COST_FLOOR,
    HARDNESS_MULTIPLIER,
    SEATS_INNER_BAND,
)


def band_of(k: int, k1: int = SEATS_INNER_BAND) -> int:
    """Equal-width radial band for rank k. band 1 = ranks 1..k1. k<=0 → 0 (core)."""
    if k <= 0:
        return 0
    return math.ceil(math.sqrt(k / k1))


def hardness_of(k: int) -> int:
    """Hardness tier = HARDNESS_MULTIPLIER × band (16 × band)."""
    return HARDNESS_MULTIPLIER * max(1, band_of(k))


def seat_cost(band: int, density: float) -> tuple[float, float]:
    """(AGNTC, CPU) cost to take a seat in ``band`` at ``density``.

    Inner bands expensive, outer cheap: BASE × density / band, floored.
    """
    b = max(1, band)
    agntc = max(BASE_CLAIM_COST * density / b, CLAIM_COST_FLOOR)
    cpu = max(BASE_CPU_CLAIM_COST * density / b, CLAIM_COST_FLOOR)
    return (agntc, cpu)
