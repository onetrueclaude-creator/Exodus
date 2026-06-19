"""Tests for vault shard assignment + replication (Proof-of-Vault)."""
from agentic.vault.dag import compute_cid
from agentic.vault.shard import assign_shards, replicas_for_shard, shard_of_cid
from agentic.params import VAULT_SHARD_COUNT, VAULT_REPLICATION_FACTOR


def test_shard_of_cid_in_range_and_deterministic():
    cid = compute_cid(b"some content")
    s = shard_of_cid(cid)
    assert 0 <= s < VAULT_SHARD_COUNT
    assert shard_of_cid(cid) == s


def test_assign_shards_partitions_all_cids():
    cids = [compute_cid(bytes([i])) for i in range(40)]
    assignment = assign_shards(cids)
    flat = [c for shard in assignment.values() for c in shard]
    assert sorted(flat) == sorted(cids)            # no CID lost or duplicated
    for shard_id in assignment:
        assert 0 <= shard_id < VAULT_SHARD_COUNT
    for cid in cids:
        assert cid in assignment[shard_of_cid(cid)]  # placed in its own shard


def test_replicas_count_capped_by_replication_and_owner_count():
    owners = [f"owner-{i}" for i in range(10)]
    reps = replicas_for_shard(0, owners)
    assert len(reps) == VAULT_REPLICATION_FACTOR
    assert len(set(reps)) == len(reps)             # distinct owners
    assert set(reps) <= set(owners)
    # fewer owners than replication factor → capped at owner count
    assert len(replicas_for_shard(0, owners[:2])) == 2


def test_replicas_deterministic_and_shard_dependent():
    owners = [f"owner-{i}" for i in range(10)]
    assert replicas_for_shard(3, owners) == replicas_for_shard(3, owners)
    # different shards generally pick different replica sets
    assert replicas_for_shard(1, owners) != replicas_for_shard(2, owners)


def test_replicas_stable_when_unrelated_owner_added():
    owners = [f"owner-{i}" for i in range(6)]
    before = set(replicas_for_shard(4, owners))
    after = set(replicas_for_shard(4, owners + ["owner-new"]))
    # rendezvous hashing: adding one owner changes at most one slot
    assert len(before - after) <= 1
