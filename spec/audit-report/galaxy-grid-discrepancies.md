# Galaxy Grid Cross-Reference — Whitepaper Section 4 vs galaxy/

**Date:** 2026-04-02
**Whitepaper:** v1.2
**Code commit:** c4f7df35d

## Summary
- 5 findings total: 1 critical, 1 major, 2 minor, 1 cosmetic

## Findings

### Finding G-001: Claim cost city model NOT implemented
- **Severity:** Critical
- **Whitepaper says:** Section 4.3 + Section 10.2 — Node claims cost `BASE_CLAIM_COST × density / ring` AGNTC plus `BASE_CPU_CLAIM_COST × density / ring` CPU Energy, with floor `CLAIM_COST_FLOOR = 0.01`. Inner rings expensive, outer rings cheap (city economics model).
- **Code does:** `galaxy/coordinate.py` has no `claim_cost()` function. `galaxy/claims.py` processes claims without charging any cost. `params.py` has `BASE_BIRTH_COST = 100` which looks like a precursor to `BASE_CLAIM_COST`, but it's not wired into any cost calculation. `BASE_CPU_CLAIM_COST` and `CLAIM_COST_FLOOR` don't exist in code.
- **Recommendation:** Implement `claim_cost(ring, density)` function. Add missing params. Wire into claim pipeline. This is the economic backbone of the city model — without it, claims are free.

### Finding G-002: Dynamic grid bounds work correctly but no ring-based claim gating
- **Severity:** Major
- **Whitepaper says:** Section 4.2 — Grid expands as epochs advance. Only coordinates within revealed rings are claimable.
- **Code does:** `galaxy/coordinate.py` has `GridBounds` with `expand_to_ring()` — works correctly. `epoch.py:EpochTracker` tracks ring expansion. However, there's no check in the claim pipeline that verifies a coordinate is within the currently revealed ring before accepting the claim.
- **Recommendation:** Add ring-bounds validation to the claim flow: reject claims for coordinates beyond `current_ring`.

### Finding G-003: Epoch ring expansion threshold matches whitepaper
- **Severity:** Minor (positive finding)
- **Whitepaper says:** Section 11 — Ring N opens when total_mined >= `4N(N+1)`.
- **Code does:** `epoch.py:43` — `threshold(ring) = 4.0 * ring * (ring + 1)`. Exactly matches.
- **Recommendation:** None — matches.

### Finding G-004: Hardness formula matches whitepaper
- **Severity:** Minor (positive finding)
- **Whitepaper says:** Section 11 — `H(N) = 16 × N` (no cap).
- **Code does:** `epoch.py:47` — `hardness(ring) = HARDNESS_MULTIPLIER * max(ring, 1)` where `HARDNESS_MULTIPLIER = 16`. Uses `max(ring, 1)` to avoid zero-hardness at ring 0. Matches.
- **Recommendation:** None — matches.

### Finding G-005: "Galaxy Grid" naming throughout code
- **Severity:** Cosmetic
- **Whitepaper says:** Section 4 heading still says "The Galaxy Grid: Blockchain as Coordinate Space." The design doc mandates renaming to "Neural Lattice."
- **Code does:** Multiple files reference "galaxy grid" in docstrings, comments, and module names (`agentic/galaxy/`). The module name `galaxy/` is deeply embedded and renaming it would be disruptive.
- **Recommendation:** Rename in whitepaper and user-facing strings. Keep `galaxy/` as the Python module name (internal, not user-facing). Add comment: "galaxy/ module = Neural Lattice implementation."
