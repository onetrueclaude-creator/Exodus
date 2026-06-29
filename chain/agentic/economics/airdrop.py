"""M13 airdrop transform (W5 Slice 2) — the snapshot → allocation math.

This is the *pure* transform that converts per-owner verifiable-work
contributions (the ``capped_contribution`` the W5 Slice-1 ``ScoreLedger``
accumulates) into projected shares of the fixed 250M-AGNTC participation
airdrop. It is read-only/offline: it computes a projection, it does NOT mint,
move, or commit anything on-chain.

Whitepaper §10.1.3 fixes the base rule — pro-rata of a fixed pool:

    share_i = (score_i / Σ_j score_j) × POOL,   POOL = 250,000,000 (fixed)

so the total is bounded by POOL regardless of participant count. The W5 design
(§3 M13, §5.7) layers a **whale-cap + quadratic redistribution** on top:

    1. seed each wallet with its naive pro-rata share;
    2. cap every wallet at ``cap`` (the per-wallet whale-cap), collecting the
       excess above the cap;
    3. redistribute that excess to the SUB-cap wallets in proportion to
       ``√(current allocation)`` — quadratic-favoring-small, the U-shaped
       incentive that breaks whale monopoly without rewarding sybil splits;
    4. iterate until no wallet exceeds the cap (or no sub-cap headroom remains).
       Any residual that cannot be placed under the cap is left UNALLOCATED
       (→ treasury), so ``Σ alloc ≤ pool`` always holds.

Invariants (machine-proved in ``tests/test_airdrop.py``, mirrored from the
econ-sim gate ``tests/test_economy_simulation.py``):
  - no allocation ever exceeds ``cap``;
  - ``Σ alloc ≤ pool`` for any distribution / participant count;
  - a sub-cap contributor is never made worse off than naive pro-rata
    (redistribution only ever adds to the small side);
  - splitting a contribution across N sybil wallets earns ≤ keeping it whole
    (the score that feeds this is already M4/M5-velocity-capped upstream in
    ``score_ledger.py``; the whale-cap here adds a second bound).

DRY note: this module is the single source of truth for the transform. The
econ-sim's M13 invariant tests (``_prorata_airdrop`` /
``_m13_capped_quadratic_airdrop``) import these functions rather than
re-implementing the math, so the gate and the live endpoint exercise the same
code.
"""
from __future__ import annotations

import math


def prorata_allocations(scores: list[float], pool: float) -> list[float]:
    """Naive pro-rata: ``allocation_i = (score_i / Σ scores) × pool``.

    The whitepaper §10.1.3 base rule and the baseline the M13 redistribution is
    measured against. With no positive score mass every allocation is 0.
    """
    total = sum(scores)
    if total <= 0:
        return [0.0 for _ in scores]
    return [(sc / total) * pool for sc in scores]


def m13_capped_quadratic(
    scores: list[float], pool: float, cap: float
) -> tuple[list[float], float]:
    """M13: capped pro-rata with quadratic (∝√) redistribution to sub-cap.

    Pro-rata seed → per-wallet cap → redistribute the capped excess to sub-cap
    wallets ∝ ``√(current allocation)`` (quadratic, favouring small
    contributors). Iterate until no wallet exceeds the cap OR no sub-cap
    headroom remains; any residual that cannot be placed under the cap is left
    UNALLOCATED (→ treasury), so ``Σ alloc ≤ pool``.

    Returns ``(allocations, treasury_residual)`` where
    ``Σ allocations + treasury_residual == pool`` (up to FP) for any positive
    score mass, and ``([], 0.0)`` / ``([0.0]*n, pool)`` for the empty / all-zero
    edge cases.
    """
    n = len(scores)
    total = sum(scores)
    if n == 0:
        return [], 0.0
    if total <= 0:
        return [0.0] * n, float(pool)

    # 1. Naive pro-rata seed.
    alloc = [(sc / total) * pool for sc in scores]

    # 2. Iteratively cap + redistribute excess to sub-cap wallets ∝ √alloc.
    #    Bounded iteration count: each pass caps >=1 new wallet or exits, and a
    #    field of n wallets can be capped at most n times.
    for _ in range(n + 2):
        excess = 0.0
        for i in range(n):
            if alloc[i] > cap:
                excess += alloc[i] - cap
                alloc[i] = cap
        if excess <= 0:
            break

        # Sub-cap wallets are the redistribution targets. Weight ∝ √(current
        # allocation) — quadratic-favouring-small. A sub-cap wallet with zero
        # allocation (zero score) gets weight 0 (no score => no airdrop).
        sub_idx = [i for i in range(n) if alloc[i] < cap]
        weights = [math.sqrt(alloc[i]) for i in sub_idx]
        wsum = sum(weights)
        if wsum <= 0:
            # No sub-cap headroom with positive weight — residual to treasury.
            return alloc, excess

        # Distribute excess, but never push a target above the cap; any
        # un-placeable remainder loops back as new excess (next iteration) or,
        # if everyone hits the cap, falls through to the treasury.
        placed = 0.0
        for i, w in zip(sub_idx, weights):
            give = excess * (w / wsum)
            room = cap - alloc[i]
            give = min(give, room)
            alloc[i] += give
            placed += give
        leftover = excess - placed
        if leftover <= 1e-6:
            break
        # else: loop again to re-place the leftover among remaining sub-cap.
    else:
        leftover = 0.0  # exhausted iterations cleanly

    treasury = max(0.0, pool - sum(alloc))
    return alloc, treasury


def airdrop_allocations(
    contributions: dict[str, float], pool: float, cap: float
) -> dict[str, float]:
    """Per-owner M13 projection: ``{owner: contribution}`` → ``{owner: alloc}``.

    The dict-keyed wrapper the ``/api/airdrop-preview`` endpoint calls. Keys are
    preserved; the allocation for each owner is its M13 share of ``pool`` under
    the per-wallet ``cap``. Owners with zero contribution map to ``0.0``. The
    treasury residual is implicit (``pool − Σ values``) and not returned here —
    callers that need it can derive it, or use :func:`m13_capped_quadratic`.
    """
    owners = list(contributions.keys())
    scores = [float(contributions[o]) for o in owners]
    alloc, _treasury = m13_capped_quadratic(scores, pool, cap)
    return {owner: a for owner, a in zip(owners, alloc)}
