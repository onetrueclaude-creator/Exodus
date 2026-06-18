"""Tests for VaultRegistry: assignment, challenge, verify, rate-limit, slash."""
import pytest
from agentic.vault.dag import VaultDag
from agentic.vault.pdp import make_proof
from agentic.vault.registry import Challenge, VaultRegistry
from agentic.params import (
    VAULT_PROOF_CPU_CREDIT,
    VAULT_CHALLENGE_WINDOW_BLOCKS,
)


def _dag_with(n: int) -> VaultDag:
    dag = VaultDag()
    for i in range(n):
        dag.add_atom(f"vault-atom-{i}".encode())
    return dag


def _owners(n: int) -> list[str]:
    return [f"{i:064x}" for i in range(n)]


def test_set_owners_assigns_shards():
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    assigned = {s for o in _owners(5) for s in reg.shards_for_owner(o)}
    assert assigned                                  # at least one shard covered
    for o in _owners(5):
        for s in reg.shards_for_owner(o):
            assert 0 <= s < 16


def test_block_seed_is_deterministic_and_changes_per_block():
    reg = VaultRegistry(_dag_with(20))
    assert reg.block_seed(5) == reg.block_seed(5)
    assert reg.block_seed(5) != reg.block_seed(6)


def test_issue_challenge_only_for_responsible_owner():
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    my_shards = reg.shards_for_owner(owner)
    assert my_shards, "test needs the owner to hold a shard"
    ch = reg.issue_challenge(owner, my_shards[0], block_slot=10)
    assert ch is not None
    assert ch.shard_id == my_shards[0]
    assert ch.issued_block == 10
    assert ch.expires_block == 10 + VAULT_CHALLENGE_WINDOW_BLOCKS
    # an owner not responsible for shard gets None
    not_mine = next(s for s in range(16) if s not in my_shards)
    assert reg.issue_challenge(owner, not_mine, block_slot=10) is None


def test_valid_proof_passes_and_credits_cpu():
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    ch = reg.issue_challenge(owner, shard_id, block_slot=10)
    units = reg.shard_sub_units(shard_id)
    proof = make_proof(units, ch.indices)
    assert reg.submit_proof(owner, ch, proof, block_slot=11) is True
    passes = reg.take_passes(block_slot=11)
    assert passes[owner] == VAULT_PROOF_CPU_CREDIT
    assert reg.last_pass_block(owner) == 11
    # buffer drained
    assert reg.take_passes(block_slot=11) == {}


def test_expired_proof_rejected():
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    ch = reg.issue_challenge(owner, shard_id, block_slot=10)
    units = reg.shard_sub_units(shard_id)
    proof = make_proof(units, ch.indices)
    too_late = ch.expires_block + 1
    assert reg.submit_proof(owner, ch, proof, block_slot=too_late) is False


def test_duplicate_proof_in_window_rate_limited():
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    ch = reg.issue_challenge(owner, shard_id, block_slot=10)
    units = reg.shard_sub_units(shard_id)
    proof = make_proof(units, ch.indices)
    assert reg.submit_proof(owner, ch, proof, block_slot=11) is True
    # second accepted proof for same (owner, shard) within the window is refused
    assert reg.submit_proof(owner, ch, proof, block_slot=12) is False


def test_tampered_proof_rejected_and_not_credited():
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    ch = reg.issue_challenge(owner, shard_id, block_slot=10)
    units = reg.shard_sub_units(shard_id)
    proof = make_proof(units, ch.indices)
    proof["leaves"][ch.indices[0]] = "ff" * 32
    assert reg.submit_proof(owner, ch, proof, block_slot=11) is False
    assert reg.take_passes(block_slot=11) == {}


def test_missed_challenge_window_yields_slash_list():
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    reg.issue_challenge(owner, shard_id, block_slot=10)
    # window expires with no submit_proof -> owner appears in misses at expiry block
    expiry = 10 + VAULT_CHALLENGE_WINDOW_BLOCKS
    misses = reg.take_misses(block_slot=expiry)
    assert owner in misses
    # drained
    assert reg.take_misses(block_slot=expiry) == []
