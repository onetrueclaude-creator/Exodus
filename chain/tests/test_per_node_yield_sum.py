import pytest
from agentic.testnet.genesis import create_genesis
from agentic.lattice.node_subgrid import (
    CellType, WARMUP_BLOCKS, NodeSubgrid, node_id_from_coord,
)


@pytest.fixture
def genesis_with_flag_off(monkeypatch):
    monkeypatch.setattr("agentic.testnet.api.LEGACY_PER_WALLET_SUBGRID", False)
    return create_genesis(seed=42)


def test_compute_per_wallet_yields_sums_across_all_owned_nodes(genesis_with_flag_off):
    from agentic.testnet.api import _compute_per_wallet_yields
    g = genesis_with_flag_off
    # v1.2 §10.1: genesis seats no homenode subgrids — seat two ring-1 nodes
    # for ONE wallet so the per-wallet yield must sum across both owned nodes.
    owner = g.wallets[1].public_key
    for (x, y) in [(10, 0), (0, 10)]:
        nid = node_id_from_coord(x, y)
        g.node_subgrids[nid] = NodeSubgrid.new(
            node_id=nid, owner=owner, created_at_block=0)
    owned_nodes = [ns for ns in g.node_subgrids.values() if ns.owner == owner]
    assert len(owned_nodes) >= 2
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
