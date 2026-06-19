"""Tests for sampled Provable Data Possession (Proof-of-Vault §5)."""
import pytest
from agentic.vault.pdp import (
    build_shard_tree,
    derive_challenge,
    make_proof,
    sub_units_for_shard,
    verify_proof,
)
from agentic.params import VAULT_PROOF_SAMPLE_SIZE


def _units(n: int) -> list[bytes]:
    return [f"sub-unit-{i}".encode() for i in range(n)]


def test_challenge_size_and_in_range():
    idx = derive_challenge(b"block-seed", shard_id=2, n_sub_units=100)
    assert len(idx) == VAULT_PROOF_SAMPLE_SIZE
    assert len(set(idx)) == len(idx)                 # distinct
    assert idx == sorted(idx)                        # sorted
    assert all(0 <= i < 100 for i in idx)


def test_challenge_caps_at_available_units():
    idx = derive_challenge(b"seed", shard_id=0, n_sub_units=3)
    assert len(idx) == 3                             # fewer units than sample size


def test_challenge_is_freshness_bound_anti_precompute():
    # Different per-block seed -> different sampled indices (cannot precompute).
    a = derive_challenge(b"block-100", shard_id=1, n_sub_units=64)
    b = derive_challenge(b"block-101", shard_id=1, n_sub_units=64)
    assert a != b
    # Same seed -> deterministic (verifier reproduces it).
    assert derive_challenge(b"block-100", shard_id=1, n_sub_units=64) == a


def test_valid_proof_verifies():
    units = _units(50)
    root, _ = build_shard_tree(units)
    idx = derive_challenge(b"seed", shard_id=0, n_sub_units=len(units))
    proof = make_proof(units, idx)
    assert proof["root"] == root
    assert verify_proof(idx, root, proof) is True


def test_proof_with_tampered_leaf_fails():
    units = _units(50)
    root, _ = build_shard_tree(units)
    idx = derive_challenge(b"seed", shard_id=0, n_sub_units=len(units))
    proof = make_proof(units, idx)
    # Tamper one sampled leaf — possession spot-check must reject.
    bad_idx = idx[0]
    proof["leaves"][bad_idx] = ("ff" * 32)
    assert verify_proof(idx, root, proof) is False


def test_proof_against_wrong_root_fails():
    units = _units(50)
    idx = derive_challenge(b"seed", shard_id=0, n_sub_units=len(units))
    proof = make_proof(units, idx)
    assert verify_proof(idx, "00" * 32, proof) is False


def test_proof_missing_sampled_index_fails():
    units = _units(50)
    root, _ = build_shard_tree(units)
    idx = derive_challenge(b"seed", shard_id=0, n_sub_units=len(units))
    proof = make_proof(units, idx)
    del proof["paths"][idx[0]]                       # omit a required path
    assert verify_proof(idx, root, proof) is False


def test_sub_units_for_shard_is_canonical():
    payloads = [b"c", b"a", b"b"]
    assert sub_units_for_shard(payloads) == sorted(payloads)
