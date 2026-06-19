"""Tests for the content-addressed vault Merkle-DAG (Proof-of-Vault)."""
import pytest
from agentic.vault.dag import Atom, Link, VaultDag, compute_cid


def test_cid_is_content_addressed_and_64_hex():
    cid = compute_cid(b"hello vault")
    assert isinstance(cid, str)
    assert len(cid) == 64
    int(cid, 16)  # valid hex
    assert compute_cid(b"hello vault") == cid          # deterministic
    assert compute_cid(b"different") != cid            # content sensitive


def test_cid_depends_on_links():
    base = compute_cid(b"x")
    assert compute_cid(b"x", links=("aa", "bb")) != base
    # link order must not matter (sorted internally)
    assert compute_cid(b"x", links=("aa", "bb")) == compute_cid(b"x", links=("bb", "aa"))


def test_atom_cid_matches_compute_cid():
    a = Atom(payload=b"atom-content")
    assert a.cid == compute_cid(b"atom-content")


def test_add_atom_returns_cid_and_payload_roundtrips():
    dag = VaultDag()
    cid = dag.add_atom(b"note one")
    assert cid == compute_cid(b"note one")
    assert dag.get_payload(cid) == b"note one"


def test_cids_are_sorted_and_deterministic():
    dag = VaultDag()
    dag.add_atom(b"b-content")
    dag.add_atom(b"a-content")
    cids = dag.cids()
    assert cids == sorted(cids)


def test_root_cid_changes_when_content_added():
    dag = VaultDag()
    dag.add_atom(b"first")
    r1 = dag.root_cid()
    dag.add_atom(b"second")
    r2 = dag.root_cid()
    assert r1 != r2
    assert len(r2) == 64


def test_root_cid_changes_when_link_added():
    dag = VaultDag()
    c1 = dag.add_atom(b"src")
    c2 = dag.add_atom(b"dst")
    before = dag.root_cid()
    dag.add_link(c1, c2)
    assert dag.root_cid() != before


def test_add_link_requires_known_cids():
    dag = VaultDag()
    c1 = dag.add_atom(b"only-one")
    with pytest.raises(KeyError):
        dag.add_link(c1, "deadbeef" * 8)


def test_get_payload_unknown_cid_raises():
    dag = VaultDag()
    with pytest.raises(KeyError):
        dag.get_payload("00" * 32)
