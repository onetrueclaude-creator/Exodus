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


from agentic.economics.score_ledger import ScoreLedger


def _metrics(owner, mined=0, proofs=0, disk_passes=0, disk_bytes=0):
    return {owner: {"mined": mined, "proofs": proofs, "activity": 0.0,
                    "disk_passes": disk_passes, "disk_bytes": disk_bytes}}


def test_pre_cut_uses_gameplay_basis(monkeypatch):
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 1000)
    led = ScoreLedger()
    # Before the cut: mining still earns (legacy basis preserved).
    led.record_epoch(_metrics("o", mined=5), block=10)
    assert led.get("o")["capped_contribution"] > 0


def test_post_cut_mining_stops_earning_disk_facts_earn(monkeypatch):
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 0)  # facts-only from block 0
    monkeypatch.setattr(params, "SCORE_W_DISK", 1.0)
    monkeypatch.setattr(params, "SCORE_EPOCH_CAP", 1e12)     # lift cap to see raw math
    led = ScoreLedger()
    # Mining grows but disk facts flat → NO contribution (E1: game action stops).
    led.record_epoch(_metrics("o", mined=100, disk_passes=0, disk_bytes=0), block=5)
    assert led.get("o")["capped_contribution"] == 0.0
    # A new audit pass over 2048 held bytes → contribution = 1 × 2048.
    led.record_epoch(_metrics("o", mined=200, disk_passes=1, disk_bytes=2048), block=6)
    assert led.get("o")["capped_contribution"] == 2048.0


def test_post_cut_restart_no_double_count(monkeypatch):
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 0)
    monkeypatch.setattr(params, "SCORE_W_DISK", 1.0)
    monkeypatch.setattr(params, "SCORE_EPOCH_CAP", 1e12)
    led = ScoreLedger()
    led.record_epoch(_metrics("o", disk_passes=3, disk_bytes=1000), block=6)
    saved = led.all()  # persisted rows include disk_passes_watermark == 3
    assert saved["o"]["disk_passes_watermark"] == 3
    # Simulate restart: rebuild from persisted rows; pin registry still reports 3.
    led2 = ScoreLedger(rows=saved)
    led2.record_epoch(_metrics("o", disk_passes=3, disk_bytes=1000), block=7)
    # No NEW passes since the watermark → no double-count on the reloaded cumulative.
    assert led2.get("o")["capped_contribution"] == saved["o"]["capped_contribution"]
