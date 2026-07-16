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
