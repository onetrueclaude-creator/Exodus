"""Persistent contribution ledger (W5 Slice 1).

The ``ScoreLedger`` composes the chain's per-owner *verifiable work* metrics —
cumulative mined blocks and accepted PoAW vault proofs — into a velocity-capped
cumulative ``capped_contribution``. That cumulative is the durable, anti-sybil
input the mainnet 250M-AGNTC participation airdrop snapshot will weight
(earn-don't-sell). It does NOT compute the airdrop allocation itself (that is the
deferred M13 snapshot-transform).

Keying
------
The ledger keys every row by ``owner_hex`` (the wallet's BLAKE2b public-key hex).
Mining (``MiningEngine._blocks_mined_per_owner``) and activity
(``ActivityTracker._score``) are already per-owner_hex; securing's
``SecuringRegistry._proof_secured`` is per-``wallet_index`` and is mapped to
``owner_hex`` by the caller via ``GenesisState.wallets[i].public_key``.

Persistence semantics — the key risk (no double-count across restarts)
----------------------------------------------------------------------
The in-memory metric dicts are **cumulative-since-restart** (they reset to 0 on
reboot); the ledger is **cumulative-since-genesis** (it never resets). To compose
them without double-counting:

1. ``_rows`` holds the persisted cumulative (restored from SQLite on boot).
2. ``_last_flushed`` holds, per owner, the last metric snapshot we accrued from.
   It is **in-memory only** and starts empty on every (re)start.
3. Each :meth:`record_epoch` accrues ``delta = current_metric - _last_flushed``,
   caps the delta (M4/M5), adds it to the cumulative, and updates
   ``_last_flushed``.

On restart the cumulative is reloaded but ``_last_flushed`` is empty, and the
in-memory metrics have reset to 0, so the first post-restart delta is measured
from 0 → no double-count of the already-recorded cumulative.

Anti-sybil (this slice)
-----------------------
``SCORE_EPOCH_CAP`` bounds each wallet's contribution gain per epoch. A split
(N wallets each doing C/N work) earns at most what one honest wallet (doing C)
earns — the proven load-bearing defense (see ``test_economy_simulation.py``).
M13 whale-cap/quadratic and M14 NCP-trust are deferred; ``activity_score`` is
**recorded** for the future M14 trust-multiplier but is NOT a slice-1 earn term.
"""
from __future__ import annotations

from agentic.params import SCORE_W_MINE, SCORE_W_SECURE, SCORE_EPOCH_CAP


def _empty_row(block: int) -> dict:
    """A fresh cumulative row, all zero, stamped with the current block."""
    return {
        "mined_blocks": 0,            # cumulative-since-genesis
        "proof_secured_count": 0,     # cumulative-since-genesis
        "activity_score": 0.0,        # latest activity EMA (recorded, not earned)
        "capped_contribution": 0.0,   # the M4/M5-capped composite = airdrop-weight input
        "last_activity_block": None,
        "updated_at_block": block,
    }


class ScoreLedger:
    """Accumulates capped, cumulative per-owner contribution from work deltas.

    Public surface:
      - ``record_epoch(metrics, block)`` — accrue this epoch's NEW work.
      - ``get(owner_hex)`` — that owner's row (a copy), or ``None`` if unknown.
      - ``all()`` — ``{owner_hex: row}`` for every owner (copies).

    ``metrics[owner_hex] = {"mined": int, "proofs": int, "activity": float}`` are
    the **cumulative-since-restart** values read live from the metric sources.
    """

    def __init__(self, rows: dict[str, dict] | None = None) -> None:
        # Persisted cumulative (restored from SQLite on boot). Copy each row so we
        # never alias the dict the caller handed us (e.g. a prior ledger's all()).
        self._rows: dict[str, dict] = {}
        if rows:
            for owner_hex, row in rows.items():
                self._rows[owner_hex] = dict(row)
        # Per-owner last-seen metric snapshot. In-memory only; empty on (re)start.
        self._last_flushed: dict[str, dict] = {}

    @staticmethod
    def _norm(x: float) -> float:
        """Scale a raw metric delta to a comparable range.

        Slice 1 is linear (identity-as-float). A min-max / reference-scaled
        normalization is a future refinement (kept simple per YAGNI).
        """
        return float(x)

    def record_epoch(self, metrics: dict[str, dict], block: int) -> None:
        """Accrue one epoch of NEW verifiable work into the cumulative ledger.

        For each owner: ``delta = current_metric - _last_flushed``;
        ``raw = W_MINE*norm(Δmined) + W_SECURE*norm(Δproofs)``;
        ``Δcapped = min(raw, SCORE_EPOCH_CAP)`` is added to the cumulative
        ``capped_contribution``. ``activity_score`` is recorded (latest value),
        not added to the contribution.
        """
        for owner_hex, m in metrics.items():
            mined = int(m.get("mined", 0))
            proofs = int(m.get("proofs", 0))
            activity = float(m.get("activity", 0.0))

            last = self._last_flushed.get(owner_hex, {})
            d_mined = mined - last.get("mined", 0)
            d_proofs = proofs - last.get("proofs", 0)
            # Metrics are monotonic counts; clamp defensively so a spurious
            # decrease (or a stale snapshot) can never subtract from the ledger.
            if d_mined < 0:
                d_mined = 0
            if d_proofs < 0:
                d_proofs = 0

            raw = SCORE_W_MINE * self._norm(d_mined) + SCORE_W_SECURE * self._norm(d_proofs)
            d_capped = min(raw, SCORE_EPOCH_CAP)

            row = self._rows.get(owner_hex)
            if row is None:
                row = _empty_row(block)
                self._rows[owner_hex] = row
            row["mined_blocks"] += d_mined
            row["proof_secured_count"] += d_proofs
            row["capped_contribution"] += d_capped
            row["activity_score"] = activity
            row["last_activity_block"] = block
            row["updated_at_block"] = block

            # Advance the watermark to the current cumulative metric.
            self._last_flushed[owner_hex] = {"mined": mined, "proofs": proofs}

    def get(self, owner_hex: str) -> dict | None:
        """Return a copy of an owner's row, or ``None`` if the owner is unknown."""
        row = self._rows.get(owner_hex)
        return dict(row) if row is not None else None

    def all(self) -> dict[str, dict]:
        """Return ``{owner_hex: row}`` for every owner (row copies)."""
        return {owner_hex: dict(row) for owner_hex, row in self._rows.items()}
