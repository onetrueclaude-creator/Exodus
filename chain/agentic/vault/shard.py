"""Shard assignment + replica selection for the vault (Proof-of-Vault).

Shards partition the CID space by CID prefix. Replicas per shard are chosen by
rendezvous (highest-random-weight) hashing so the responsible owner set is
deterministic and changes minimally when the owner set churns.
"""
from __future__ import annotations

import hashlib

from agentic.params import VAULT_REPLICATION_FACTOR, VAULT_SHARD_COUNT


def shard_of_cid(cid: str, *, shard_count: int = VAULT_SHARD_COUNT) -> int:
    """Map a CID to a shard id in [0, shard_count) by its hex prefix."""
    return int(cid[:8], 16) % shard_count


def assign_shards(
    cids: list[str], *, shard_count: int = VAULT_SHARD_COUNT
) -> dict[int, list[str]]:
    """Group CIDs into shards. Returns shard_id -> sorted CID list."""
    out: dict[int, list[str]] = {}
    for cid in cids:
        out.setdefault(shard_of_cid(cid, shard_count=shard_count), []).append(cid)
    for shard_id in out:
        out[shard_id].sort()
    return out


def _weight(shard_id: int, owner_id: str) -> int:
    h = hashlib.sha256(f"{shard_id}:{owner_id}".encode()).digest()
    return int.from_bytes(h[:8], "big")


def replicas_for_shard(
    shard_id: int,
    owner_ids: list[str],
    *,
    replication: int = VAULT_REPLICATION_FACTOR,
) -> list[str]:
    """Deterministically pick up to `replication` owners for a shard.

    Rendezvous hashing: rank owners by SHA-256(shard:owner) weight, take the
    top `replication`. Stable: adding/removing one owner changes at most one
    slot of any shard's replica set.
    """
    ranked = sorted(owner_ids, key=lambda o: (_weight(shard_id, o), o), reverse=True)
    return ranked[: min(replication, len(ranked))]
