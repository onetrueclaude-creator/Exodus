"""Sampled Provable Data Possession over a vault shard (Proof-of-Vault §5).

Cheap SHA-256 random-sample proof (Filecoin PDP pattern): the Singularity
issues a per-shard random-byte challenge bound to fresh per-block randomness
(anti-precompute), the holder returns Merkle paths over the sampled sub-units,
and verify recomputes ~sample_size SHA-256 paths. The shard data is never
returned. TESTNET trust model — the coordinator is trusted; mainnet
unique-encoding is DEFERRED (report §6/§8).
"""
from __future__ import annotations

import hashlib

from agentic.params import VAULT_PROOF_SAMPLE_SIZE


def _h(*parts: bytes) -> str:
    d = hashlib.sha256()
    for p in parts:
        d.update(p)
    return d.hexdigest()


def sub_units_for_shard(payloads: list[bytes]) -> list[bytes]:
    """Canonical (sorted) ordering of a shard's payloads into PDP sub-units."""
    return sorted(payloads)


def derive_challenge(
    block_seed: bytes,
    shard_id: int,
    n_sub_units: int,
    *,
    sample_size: int = VAULT_PROOF_SAMPLE_SIZE,
) -> list[int]:
    """Deterministic sorted distinct sub-unit indices to spot-check.

    Bound to ``block_seed`` (fresh per-block randomness) so a holder cannot
    precompute proofs ahead of the challenge.
    """
    if n_sub_units <= 0:
        return []
    want = min(sample_size, n_sub_units)
    chosen: list[int] = []
    seen: set[int] = set()
    counter = 0
    while len(chosen) < want:
        digest = hashlib.sha256(
            block_seed + b":" + str(shard_id).encode() + b":" + str(counter).encode()
        ).digest()
        idx = int.from_bytes(digest[:8], "big") % n_sub_units
        if idx not in seen:
            seen.add(idx)
            chosen.append(idx)
        counter += 1
    return sorted(chosen)


def build_shard_tree(sub_units: list[bytes]) -> tuple[str, list[list[str]]]:
    """SHA-256 binary Merkle tree. Returns (root_hex, levels) bottom-up.

    Odd nodes at a level are duplicated (Bitcoin-style). levels[0] = leaves.
    """
    if not sub_units:
        return _h(b"empty-shard"), [[]]
    level = [_h(b"leaf\x00", u) for u in sub_units]
    levels = [level]
    while len(level) > 1:
        nxt: list[str] = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else level[i]
            nxt.append(_h(b"node\x00", bytes.fromhex(left), bytes.fromhex(right)))
        level = nxt
        levels.append(level)
    return level[0], levels


def make_proof(sub_units: list[bytes], indices: list[int]) -> dict:
    """Build leaves + sibling paths for the sampled indices."""
    root, levels = build_shard_tree(sub_units)
    leaves: dict[int, str] = {}
    paths: dict[int, list[str]] = {}
    for idx in indices:
        leaves[idx] = _h(b"leaf\x00", sub_units[idx])
        path: list[str] = []
        cur = idx
        for level in levels[:-1]:
            sib = cur + 1 if cur % 2 == 0 else cur - 1
            if sib >= len(level):
                sib = cur  # duplicated odd node
            path.append(level[sib])
            cur //= 2
        paths[idx] = path
    return {"root": root, "leaves": leaves, "paths": paths}


def verify_proof(challenge_indices: list[int], expected_root: str, proof: dict) -> bool:
    """Recompute each sampled leaf's path to the root; reject on any mismatch."""
    if proof.get("root") != expected_root:
        return False
    leaves = proof.get("leaves", {})
    paths = proof.get("paths", {})
    for idx in challenge_indices:
        if idx not in leaves or idx not in paths:
            return False
        cur_hash = leaves[idx]
        cur = idx
        for sib in paths[idx]:
            if cur % 2 == 0:
                cur_hash = _h(b"node\x00", bytes.fromhex(cur_hash), bytes.fromhex(sib))
            else:
                cur_hash = _h(b"node\x00", bytes.fromhex(sib), bytes.fromhex(cur_hash))
            cur //= 2
        if cur_hash != expected_root:
            return False
    return True
