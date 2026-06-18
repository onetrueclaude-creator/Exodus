"""Proof-of-Vault: content-addressed knowledge vault + sampled-PDP securing.

TESTNET ONLY trust model: the Singularity is the trusted coordinator/verifier.
Mainnet unique-encoding / anti-sybil (PoRep, timed/keyed challenges,
Merkle-CRDT) is a DEFERRED research milestone — see the 2026-06-18
Proof-of-Vault feasibility report §6/§8.
"""
from agentic.vault.dag import Atom, Link, VaultDag, compute_cid
from agentic.vault.shard import assign_shards, replicas_for_shard, shard_of_cid

__all__ = [
    "Atom", "Link", "VaultDag", "compute_cid",
    "assign_shards", "replicas_for_shard", "shard_of_cid",
]
