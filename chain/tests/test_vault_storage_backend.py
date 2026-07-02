"""StorageBackend seam (spec §3.4): conformance suite over every implementation
+ VaultDag write-through/fallback. Backends are swappable behind this protocol
— LocalSqlite/Backbone today, erasure/federated in Stage 2 — without touching
the DAG or the game."""
import pytest

from agentic.vault.dag import VaultDag
from agentic.vault.storage_backend import BackboneBackend, BackendStats, MemoryBackend


@pytest.fixture(params=["memory", "backbone"])
def backend(request, tmp_path):
    if request.param == "memory":
        return MemoryBackend()
    return BackboneBackend(root_dir=tmp_path / "backbone")


def test_put_get_has_delete_roundtrip(backend):
    assert backend.get_shard("cid-x") is None and not backend.has_shard("cid-x")
    backend.put_shard("cid-x", b"payload-bytes")
    assert backend.has_shard("cid-x")
    assert backend.get_shard("cid-x") == b"payload-bytes"
    backend.delete_shard("cid-x")
    assert backend.get_shard("cid-x") is None


def test_stats_counts_and_bytes(backend):
    backend.put_shard("a", b"12345")
    backend.put_shard("b", b"123")
    s = backend.stats()
    assert s == BackendStats(count=2, total_bytes=8)


def test_put_is_idempotent_overwrite(backend):
    backend.put_shard("a", b"one")
    backend.put_shard("a", b"two")
    assert backend.get_shard("a") == b"two"
    assert backend.stats().count == 1


def test_dag_write_through_and_fallback(tmp_path):
    bb = BackboneBackend(root_dir=tmp_path / "bb")
    dag = VaultDag(backend=bb)
    cid = dag.add_atom(b"atom-payload")
    assert bb.get_shard(cid) == b"atom-payload"       # write-through happened
    dag._atoms.pop(cid)                                 # simulate memory loss (dag.py's actual internal dict is `_atoms`, not `_payloads`)
    assert dag.get_payload(cid) == b"atom-payload"     # served from the backbone


class _RaisingBackend:
    """Backend whose put always fails — proves write-through can't break ingestion."""

    def put_shard(self, cid: str, data: bytes) -> None:
        raise RuntimeError("disk full")

    def get_shard(self, cid: str):
        return None

    def has_shard(self, cid: str) -> bool:
        return False

    def delete_shard(self, cid: str) -> None:
        pass

    def stats(self):
        return BackendStats(count=0, total_bytes=0)


def test_add_atom_survives_backend_put_failure():
    """Plan mandate: write-through must never break atom ingestion."""
    dag = VaultDag(backend=_RaisingBackend())
    cid = dag.add_atom(b"payload-x")              # must not raise
    assert dag.get_payload(cid) == b"payload-x"   # memory state intact


def test_get_payload_true_miss_with_backend_raises_original_keyerror():
    """Backend present AND missing the CID → the ORIGINAL KeyError contract holds."""
    dag = VaultDag(backend=MemoryBackend())
    with pytest.raises(KeyError, match="unknown CID"):
        dag.get_payload("never-inserted-cid")


def test_delete_shard_missing_cid_is_noop(backend):
    backend.delete_shard("never-inserted")        # must not raise
    assert backend.stats().count == 0
