"""Activity score + rank resolution (v1.2 phyllotaxis movement).

Each owner's activity is an EMA of weighted per-block work. Secure/attest work
dominates; cheap actions (reads/NCP) are capped per block so they can't farm
standing. The rolling score is sorted each block into phyllotaxis ranks
(1 = innermost), with incumbency hysteresis to damp per-block flicker.
"""
from __future__ import annotations

import math

from agentic.params import ACTIVITY_CHEAP_ACTION_CAP, ACTIVITY_HALF_LIFE_BLOCKS


class ActivityTracker:
    """Per-owner rolling activity = EMA of weighted work (drives the rank)."""

    def __init__(
        self,
        half_life_blocks: int = ACTIVITY_HALF_LIFE_BLOCKS,
        cheap_cap: float = ACTIVITY_CHEAP_ACTION_CAP,
    ) -> None:
        # EMA weight derived from the half-life: score halves in half_life_blocks idle ticks.
        self.alpha = 1.0 - math.pow(0.5, 1.0 / max(1, half_life_blocks))
        self.cheap_cap = cheap_cap
        self._score: dict[str, float] = {}
        self._pending: dict[str, float] = {}

    def cheap_cap_value(self) -> float:
        return self.cheap_cap

    def record(self, owner: str, *, secure_cpu: float = 0.0, cheap_units: float = 0.0) -> None:
        """Accumulate this block's contribution for ``owner`` (applied on tick())."""
        contrib = secure_cpu + min(self.cheap_cap, cheap_units * 1e-6)
        self._pending[owner] = self._pending.get(owner, 0.0) + contrib

    def tick(self) -> None:
        """Advance one block: EMA each score toward its pending contribution, then reset."""
        for owner in set(self._score) | set(self._pending):
            target = self._pending.get(owner, 0.0)
            prev = self._score.get(owner, 0.0)
            self._score[owner] = prev + self.alpha * (target - prev)
        self._pending.clear()

    def score(self, owner: str) -> float:
        return self._score.get(owner, 0.0)

    def all_scores(self) -> dict[str, float]:
        return dict(self._score)


def resolve_ranks(
    scores: dict[str, float],
    *,
    singularity_id: str | None = None,
    prev_ranks: dict[str, int] | None = None,
    hysteresis: float = 0.0,
) -> dict[str, int]:
    """Sort owners by score desc → rank k (1 = innermost). Singularity → 0.

    ``hysteresis`` gives an incumbent a small score bonus (stronger the more
    central it already is), so a rival that only narrowly overtakes it doesn't
    cause a per-block swap (anti-flicker).
    """
    out: dict[str, int] = {}
    if singularity_id is not None:
        out[singularity_id] = 0
    players = [o for o in scores if o != singularity_id]
    top = max(scores.values()) if scores else 1.0

    def key(o: str) -> tuple[float, str]:
        bias = 0.0
        if prev_ranks and o in prev_ranks:
            bias = hysteresis * top / max(1, prev_ranks[o])
        return (-(scores[o] + bias), o)

    for i, o in enumerate(sorted(players, key=key)):
        out[o] = i + 1
    return out
