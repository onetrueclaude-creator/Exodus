"""S5 claims-migration invariants and behavior (economy design E1–E4)."""
from agentic import params


def test_s5_params_exist_and_are_sane():
    # Dated cut: a block height >= 0; before it, legacy gameplay basis; at/after, Disk facts.
    assert isinstance(params.SCORE_BASIS_CUT_BLOCK, int)
    # DEFAULT is a HIGH sentinel — no cut announced yet, so the LEGACY gameplay
    # basis runs and every existing economy test is preserved (E1's E_CUT is a
    # FUTURE founder-announced height, never genesis).
    assert params.SCORE_BASIS_CUT_BLOCK >= 10**9
    # Disk-fact weight scales the (Δaudit-passes × pinned_bytes) increment.
    assert isinstance(params.SCORE_W_DISK, float) and params.SCORE_W_DISK > 0
    # Eligibility gate: node-level threshold read via TimeLedger.meets_gate.
    assert params.CLAIM_ELIGIBILITY_GATE_LEVEL == 2
    # Recency window: an owner must have >= 1 audit pass within this many blocks.
    assert params.CLAIM_ELIGIBILITY_WINDOW_BLOCKS > 0


from agentic.testnet.api import _build_score_metrics
from agentic.testnet.genesis import create_genesis
from agentic.vault.pin_registry import PlayerPinRegistry


def _owner0(g):
    return g.wallets[0].public_key.hex()


def test_build_score_metrics_includes_disk_facts():
    g = create_genesis(seed=42)
    owner = _owner0(g)
    pr = PlayerPinRegistry()
    pr.assign_pin(owner, shard_id=3, block=10, size_bytes=4096)
    pr.record_audit(owner, shard_id=3, passed=True, block=10)
    pr.record_audit(owner, shard_id=3, passed=True, block=40)
    g.pin_registry = pr

    metrics = _build_score_metrics(g)
    assert owner in metrics
    assert metrics[owner]["disk_passes"] == 2          # two attested passes
    assert metrics[owner]["disk_bytes"] == 4096         # current active bytes
