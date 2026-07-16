"""Tests for VaultRegistry: assignment, challenge, verify, rate-limit, slash."""
import pytest
from agentic.vault.dag import VaultDag, compute_cid
from agentic.vault.pdp import build_shard_tree, make_proof, sub_units_for_shard
from agentic.vault.registry import Challenge, VaultRegistry
from agentic.vault.shard import shard_of_cid
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


def _atom_for_shard(shard_id: int) -> bytes:
    """Mint a fresh payload whose CID lands in ``shard_id`` — simulates a runtime
    ``ingest_entry`` (S4) folding a new atom into that exact shard, which mutates
    ``shard_sub_units(shard_id)`` and thus the on-demand canonical root."""
    i = 0
    while True:
        payload = f"runtime-entry-{shard_id}-{i}".encode()
        if shard_of_cid(compute_cid(payload)) == shard_id:
            return payload
        i += 1


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


def test_block_seed_mixes_beacon_when_provided():
    reg = VaultRegistry(_dag_with(20))
    plain = reg.block_seed(7)
    mixed_a = reg.block_seed(7, beacon=b"\xaa" * 32)
    mixed_b = reg.block_seed(7, beacon=b"\xbb" * 32)
    assert plain != mixed_a                      # beacon changes the seed
    assert mixed_a != mixed_b                    # different beacons differ
    assert mixed_a == reg.block_seed(7, beacon=b"\xaa" * 32)  # deterministic


# --------------------------------------------------------------------------- #
# Possession-proof soundness regression suite (security fix:
# canonical-root binding). Each test below encodes an attack from the
# verified diagnosis (verify-possession-proof-soundness.md) as MUST-REJECT.
# They FAIL against the pre-fix code (client-bound expected_root, no
# server-authoritative challenge, no responsibility gate) and PASS after.
# --------------------------------------------------------------------------- #

def test_forged_tree_over_never_held_bytes_rejected():
    """PoC-A: a fully self-consistent Merkle tree over FABRICATED bytes the
    prover never held must be REJECTED. A *real* server-issued challenge is
    opened first, so this isolates the root-binding hole (fix #1): the server
    must verify against its OWN canonical per-shard root, not the client's root.
    """
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    ch = reg.issue_challenge(owner, shard_id, block_slot=10)       # genuine challenge
    real_units = reg.shard_sub_units(shard_id)
    canonical_root, _ = build_shard_tree(real_units)
    # attacker fabricates a DIFFERENT tree (same shape) over bytes never held
    fabricated = sub_units_for_shard(
        [f"FABRICATED-GARBAGE-{i}".encode() for i in range(len(real_units))]
    )
    forged = make_proof(fabricated, ch.indices)                   # self-consistent
    assert forged["root"] != canonical_root, "pick other bytes: roots collided"
    assert reg.submit_proof(owner, ch, forged, block_slot=11) is False
    assert reg.take_passes(block_slot=11) == {}                   # no credit leaked


def test_proof_without_open_challenge_rejected():
    """PoC-B core (fix #2): a genuinely valid proof over real bytes for a shard
    the owner IS responsible for must still be REJECTED when NO server-issued
    challenge was opened — the accept path must be gated on server state, not a
    client-fabricated Challenge object."""
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    units = reg.shard_sub_units(shard_id)
    indices = [0]
    proof = make_proof(units, indices)                            # a REAL, valid proof
    forged_challenge = Challenge(                                 # never issued by server
        shard_id=shard_id, indices=indices,
        issued_block=0, expires_block=10**9, block_seed_hex="00" * 32,
    )
    assert reg.submit_proof(owner, forged_challenge, proof, block_slot=1) is False
    assert reg.take_passes(block_slot=1) == {}


def test_proof_for_unowned_shard_rejected():
    """PoC-B (fix #3): even a correct proof over the REAL bytes of a shard the
    submitter is NOT responsible for must be REJECTED (shard responsibility)."""
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    my_shards = reg.shards_for_owner(owner)
    not_mine = next(
        (s for s in range(16) if s not in my_shards and reg.shard_sub_units(s)), None
    )
    if not_mine is None:
        pytest.skip("no data shard unowned by this owner in this seeding")
    units = reg.shard_sub_units(not_mine)                         # real bytes of a foreign shard
    indices = [0]
    proof = make_proof(units, indices)
    ch = Challenge(shard_id=not_mine, indices=indices,
                   issued_block=0, expires_block=10**9, block_seed_hex="00" * 32)
    assert reg.submit_proof(owner, ch, proof, block_slot=1) is False
    assert reg.take_passes(block_slot=1) == {}


def test_empty_indices_junk_root_rejected():
    """PoC-A trivial variant: empty indices + an arbitrary root with zero Merkle
    work must be REJECTED (no open challenge -> no accept)."""
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    junk = Challenge(shard_id=shard_id, indices=[],
                     issued_block=0, expires_block=10**9, block_seed_hex="")
    accepted = reg.submit_proof(
        owner, junk, {"root": "deadbeefdeadbeef", "leaves": {}, "paths": {}},
        block_slot=1,
    )
    assert accepted is False
    assert reg.take_passes(block_slot=1) == {}


# --------------------------------------------------------------------------- #
# S4 root-pinning precondition (verify-possession-proof-soundness.md "forward
# coordination finding"). The #224 fix verified against a per-shard root
# recomputed ON-DEMAND at submit — sound ONLY while the vault DAG is immutable
# after genesis. S4 adds runtime entry-writes (ingest_entry -> add_atom ->
# _refresh_vault_owners) so the DAG mutates between challenge-issue and
# proof-submit. The server must pin the per-shard root AT CHALLENGE-ISSUE and
# verify honest proofs against THAT ("prove the bytes as committed when
# challenged"), never a freshly-recomputed root, while keeping the #224
# root-binding (root stays SERVER-computed — the prover cannot influence it).
# --------------------------------------------------------------------------- #

def test_runtime_ingest_between_issue_and_submit_does_not_false_reject():
    """DISCRIMINATING (RED pre-fix, GREEN after): an honest holder is challenged
    on the OLD shard state and builds a correct proof over it; a runtime entry is
    then ingested into that SAME shard (mutating shard_sub_units and thus the
    on-demand root) BEFORE the proof arrives. Pre-fix (root recomputed at submit
    from the mutated DAG) FALSE-REJECTS the honest holder; with the pinned
    challenge-issue root it ACCEPTS.
    """
    dag = _dag_with(60)
    reg = VaultRegistry(dag)
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]

    ch = reg.issue_challenge(owner, shard_id, block_slot=10)
    # honest holder proves the shard bytes AS COMMITTED WHEN CHALLENGED
    units_at_challenge = reg.shard_sub_units(shard_id)
    proof = make_proof(units_at_challenge, ch.indices)

    # a runtime entry lands in THIS shard between issue and submit (S4 ingest)
    dag.add_atom(_atom_for_shard(shard_id))
    assert reg.shard_sub_units(shard_id) != units_at_challenge, "mutation must change the shard"
    # diagnostic: the on-demand root now differs from the honest proof's root —
    # exactly what the pre-fix on-demand path would (wrongly) verify against.
    live_root, _ = build_shard_tree(reg.shard_sub_units(shard_id))
    assert proof["root"] != live_root, "mutation must change the on-demand root"

    # the honest, challenge-time-correct proof must still be ACCEPTED
    assert reg.submit_proof(owner, ch, proof, block_slot=11) is True
    assert reg.take_passes(block_slot=11)[owner] == VAULT_PROOF_CPU_CREDIT
    assert reg.last_pass_block(owner) == 11


def test_issue_challenge_pins_canonical_root_on_open_challenge():
    """The server pins the per-shard canonical root on the open challenge at issue
    time (= build_shard_tree over the shard's sub-units THEN). That stored value is
    what submit_proof verifies against. Open challenges are in-memory only (not
    persisted — VaultRegistry is rebuilt fresh at genesis on restart), so no
    save/load round-trip is involved for this field."""
    reg = VaultRegistry(_dag_with(60))
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    reg.issue_challenge(owner, shard_id, block_slot=10)
    oc = reg._open[-1]
    expected_root, _ = build_shard_tree(reg.shard_sub_units(shard_id))
    assert oc.canonical_root == expected_root


def test_pinned_root_still_rejects_forged_proof_after_ingest():
    """#224 PRESERVED: root-pinning must NOT weaken the root-binding gate. A forged
    proof over never-held bytes is still REJECTED even after a runtime ingest — the
    pinned root is server-computed at issue, so the prover cannot fabricate a
    passing tree. (GREEN before and after the fix — a property-preservation guard.)
    """
    dag = _dag_with(60)
    reg = VaultRegistry(dag)
    reg.set_owners(_owners(5))
    owner = _owners(5)[0]
    shard_id = reg.shards_for_owner(owner)[0]
    ch = reg.issue_challenge(owner, shard_id, block_slot=10)
    real_units = reg.shard_sub_units(shard_id)
    canonical_root, _ = build_shard_tree(real_units)
    fabricated = sub_units_for_shard(
        [f"FABRICATED-AFTER-INGEST-{i}".encode() for i in range(len(real_units))]
    )
    forged = make_proof(fabricated, ch.indices)
    assert forged["root"] != canonical_root, "pick other bytes: roots collided"

    dag.add_atom(_atom_for_shard(shard_id))          # runtime mutation after issue
    assert reg.submit_proof(owner, ch, forged, block_slot=11) is False
    assert reg.take_passes(block_slot=11) == {}       # no credit leaked
