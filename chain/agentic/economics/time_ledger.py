"""Soulbound Time (tenure) ledger — DePIN Vault S3 (design spec 2026-07-02
§2.1; founder round 2026-07-05: GATES ONLY).

Time is the third real resource: elapsed faithful service, epoch-counted.
+TIME_TICKS_PER_EPOCH accrues per fixed block window in which the owner passed
>= 1 storage audit (present AND serving; pass facts come from PlayerPinRegistry).

GATES ONLY: Time is a SINGLE monotonic counter — never spent, never consumed,
never moved. Utility is pure threshold reads: node level N requires cumulative
Time >= gate_threshold(N). Influence-type benefits (leaderboard rank weight,
governance weight) scale with time_accrued ** TIME_INFLUENCE_EXPONENT (sqrt:
veterans lead, late joiners are never mathematically locked out).

Hard boundaries (dossier §6, enforced by structural tests in both directions):
  - Time appears in NO AGNTC-yield term. The modules that compute or allocate
    AGNTC never reference this module, and this module never touches balances,
    the tx ledger, or any reward path.
  - Soulbound: no operation takes two owners; no API path moves Time.

Persistence semantics — why the watermark rides the row (vs the score ledger)
------------------------------------------------------------------------------
The score ledger keeps its metric watermark in-memory-only because its metric
sources reset to 0 on restart, so an empty watermark measures the first
post-restart delta from 0. That trick does NOT transfer here: pin-registry
pass counts are cumulative-since-genesis AND persisted, so an empty in-memory
watermark after a reboot would re-count every historical pass as "this
epoch's" and grant one free tick per restart (restart-farmed tenure).
``passes_watermark`` therefore persists INSIDE each row, and save_state
writes it in the same SQLite transaction as the epoch ring and the pin rows —
the three fact sets advance or revert together, so a crash can never
double-grant or skip-grant.

NOTE: this docstring deliberately avoids the CamelCase class names of the
money/reward machinery — the reverse Howey guard
(tests/test_economy_simulation.py::test_time_ledger_never_touches_money)
scans this module's source for them.
"""
from __future__ import annotations

import math

from agentic.params import (
    TIME_TICKS_PER_EPOCH,
    TIME_INFLUENCE_EXPONENT,
    TIME_GATE_BASE,
    TIME_GATE_GROWTH,
)


def gate_threshold(level: int) -> int:
    """Cumulative Time required to reach node level ``level`` (T(N), spec §2.1).

    T(1) = 0 — the starting level is never gated. For N >= 2 the founder-tunable
    geometric curve applies: T(N) = ceil(TIME_GATE_BASE * TIME_GATE_GROWTH**(N-2)).
    """
    if level <= 1:
        return 0
    return math.ceil(TIME_GATE_BASE * TIME_GATE_GROWTH ** (level - 2))


def _empty_row(block: int) -> dict:
    return {
        "time_accrued": 0,      # epochs of service; monotonic, never decreases
        "passes_watermark": 0,  # pin-registry cumulative passes at last boundary
        "updated_at_block": block,
    }


class TimeLedger:
    """Public surface (exact names): accrue_epoch, sqrt_influence, meets_gate,
    get, all. No method takes two owners; nothing moves Time between
    identities (soulbound — frozen by the structural allowlist test)."""

    def __init__(self, rows: dict[str, dict] | None = None) -> None:
        # Persisted rows (restored from SQLite on boot). Copy each row so we
        # never alias the dict the caller handed us (e.g. a prior ledger's all()).
        self._rows: dict[str, dict] = {}
        if rows:
            for owner_hex, row in rows.items():
                self._rows[owner_hex] = dict(row)

    def accrue_epoch(self, pass_totals: dict[str, int], block: int) -> None:
        """Grant Time for the block window that just closed.

        ``pass_totals[owner_hex]`` is the owner's cumulative-since-genesis
        passed-audit count (from PlayerPinRegistry). The persisted per-row
        ``passes_watermark`` turns it into a binary window-attendance fact:
        >= 1 new pass since the last boundary -> exactly +TIME_TICKS_PER_EPOCH
        (flat; the pass COUNT never scales the grant). The S1.5 desktop tier
        raises the effective per-owner rate at this seam, nowhere else.
        """
        for owner_hex, total in pass_totals.items():
            total = max(int(total), 0)
            row = self._rows.get(owner_hex)
            if row is None:
                if total <= 0:
                    continue  # miss-only / idle owner: nothing to track yet
                row = _empty_row(block)
                self._rows[owner_hex] = row
            delta = total - row["passes_watermark"]
            if delta >= 1:
                row["time_accrued"] += TIME_TICKS_PER_EPOCH
            # delta <= 0: no new passes (or the registry regressed after a
            # reseed) — resync the watermark, never subtract accrued tenure.
            row["passes_watermark"] = total
            row["updated_at_block"] = block

    def sqrt_influence(self, owner_hex: str) -> float:
        """Leaderboard/governance weight = accrued ** TIME_INFLUENCE_EXPONENT.

        Computed from the monotonic counter, so influence never decreases
        (spec §2.1: veteran standing is historical)."""
        row = self._rows.get(owner_hex)
        if row is None:
            return 0.0
        return float(row["time_accrued"]) ** TIME_INFLUENCE_EXPONENT

    def meets_gate(self, owner_hex: str, level: int) -> bool:
        """Pure threshold read (spec §2.1): cumulative Time >= T(level).

        GATES ONLY — reading a gate consumes nothing."""
        row = self._rows.get(owner_hex)
        accrued = row["time_accrued"] if row is not None else 0
        return accrued >= gate_threshold(level)

    def get(self, owner_hex: str) -> dict | None:
        """Return a copy of an owner's row, or ``None`` if the owner is unknown."""
        row = self._rows.get(owner_hex)
        return dict(row) if row is not None else None

    def all(self) -> dict[str, dict]:
        """Return ``{owner_hex: row}`` for every owner (row copies)."""
        return {owner_hex: dict(row) for owner_hex, row in self._rows.items()}
