import pytest
from agentic.testnet.genesis import create_genesis
from agentic.lattice.node_subgrid import CellType, WARMUP_BLOCKS


@pytest.fixture
def genesis_with_flag_off(monkeypatch):
    monkeypatch.setattr("agentic.testnet.api.LEGACY_PER_WALLET_SUBGRID", False)
    return create_genesis(seed=42)


def test_compute_per_wallet_yields_sums_across_all_owned_nodes(genesis_with_flag_off):
    from agentic.testnet.api import _compute_per_wallet_yields
    g = genesis_with_flag_off
    # Pick a wallet that owns at least one homenode
    first_ns = next(iter(g.node_subgrids.values()))
    owner = first_ns.owner
    owned_nodes = [ns for ns in g.node_subgrids.values() if ns.owner == owner]
    assert len(owned_nodes) >= 1
    # Commit 8 SECURE cells and promote to ACTIVE on each owned node
    for ns in owned_nodes:
        ns.commit_diff([(i, CellType.SECURE) for i in range(8)], current_block=0)
        ns.tick(current_block=WARMUP_BLOCKS)

    totals = _compute_per_wallet_yields(g)
    assert owner in totals
    # Sum should be strictly positive (density > 0 for all genesis coords)
    assert totals[owner].agntc > 0.0


def test_compute_per_wallet_yields_empty_when_flag_on():
    from agentic.testnet.api import _compute_per_wallet_yields
    g = create_genesis(seed=42)
    # Flag defaults to True — new path should return empty
    totals = _compute_per_wallet_yields(g)
    assert totals == {}
