"""PlayerPinRegistry — durable per-(owner, shard) pin + audit history (spec §3.4).

The Disk resource's fact source: which shards each player pins, how many
beacon-seeded audits they passed/missed, and how many real bytes they hold.
Downstream consumers: Disk score = pinned_bytes × blocks-served × pass_rate
(S5 economy), Time accrual = "passed ≥1 audit this epoch" (S3).

Persistence follows ScoreLedger's restart-safe semantics: rows are
cumulative-since-genesis, saved/restored whole by persistence.py (one SQLite
row per (owner, shard)); there is no since-restart watermark because audit
events are recorded exactly once, at the moment they happen.
"""
from __future__ import annotations


def _empty_pin(block: int, size_bytes: int) -> dict:
    return {
        "assigned_block": block,
        "size_bytes": int(size_bytes),
        "passes": 0,
        "misses": 0,
        "last_pass_block": None,
        "last_miss_block": None,
        "active": True,
    }


class PlayerPinRegistry:
    """Public surface (exact names — spec §3.4): assign_pin, deactivate_pin,
    record_audit, pinned_bytes, pass_rate, get, all."""

    def __init__(self, rows: dict[str, dict[int, dict]] | None = None) -> None:
        self._rows: dict[str, dict[int, dict]] = {}
        if rows:
            for owner_hex, shards in rows.items():
                self._rows[owner_hex] = {int(sid): dict(r) for sid, r in shards.items()}

    def assign_pin(self, owner_hex: str, shard_id: int, block: int, size_bytes: int) -> None:
        shards = self._rows.setdefault(owner_hex, {})
        pin = shards.get(shard_id)
        if pin is None:
            shards[shard_id] = _empty_pin(block, size_bytes)
        else:  # re-assign refreshes size + reactivates; history is kept
            pin["size_bytes"] = int(size_bytes)
            pin["active"] = True

    def deactivate_pin(self, owner_hex: str, shard_id: int, block: int) -> None:
        pin = self._rows.get(owner_hex, {}).get(shard_id)
        if pin is not None:
            pin["active"] = False

    def record_audit(self, owner_hex: str, shard_id: int, passed: bool, block: int) -> None:
        shards = self._rows.setdefault(owner_hex, {})
        pin = shards.get(shard_id)
        if pin is None:  # audit for an unknown pin: auto-assign, never raise
            pin = _empty_pin(block, 0)
            shards[shard_id] = pin
        if passed:
            pin["passes"] += 1
            pin["last_pass_block"] = block
        else:
            pin["misses"] += 1
            pin["last_miss_block"] = block

    def pinned_bytes(self, owner_hex: str) -> int:
        return sum(
            p["size_bytes"] for p in self._rows.get(owner_hex, {}).values() if p["active"]
        )

    def pass_rate(self, owner_hex: str) -> float:
        passes = sum(p["passes"] for p in self._rows.get(owner_hex, {}).values())
        misses = sum(p["misses"] for p in self._rows.get(owner_hex, {}).values())
        total = passes + misses
        return 1.0 if total == 0 else passes / total

    def get(self, owner_hex: str) -> dict[int, dict] | None:
        shards = self._rows.get(owner_hex)
        if shards is None:
            return None
        return {sid: dict(r) for sid, r in shards.items()}

    def all(self) -> dict[str, dict[int, dict]]:
        return {
            owner: {sid: dict(r) for sid, r in shards.items()}
            for owner, shards in self._rows.items()
        }
