from agentic.testnet.genesis import create_genesis
from agentic.lattice.node_subgrid import node_id_from_coord
from agentic.params import GENESIS_HOMENODES


def _homenode_coords():
    return set(GENESIS_HOMENODES)


def test_genesis_initializes_empty_node_subgrids_dict():
    g = create_genesis(seed=42)
    assert hasattr(g, "node_subgrids")
    assert isinstance(g.node_subgrids, dict)


def test_genesis_creates_one_node_subgrid_per_homenode_claim():
    g = create_genesis(seed=42)
    homenode_coords = _homenode_coords()
    homenode_claims = [
        c for c in g.claim_registry.all_active_claims()
        if (c.coordinate.x, c.coordinate.y) in homenode_coords
    ]
    assert len(homenode_claims) > 0
    for claim in homenode_claims:
        claim_id = node_id_from_coord(claim.coordinate.x, claim.coordinate.y)
        assert claim_id in g.node_subgrids, f"Missing node_subgrid for homenode {claim_id}"
        ns = g.node_subgrids[claim_id]
        assert ns.owner == claim.owner
        assert len(ns.cells) == 64
        assert all(ct_level == 1 for ct_level in ns.type_levels.values())


def test_genesis_non_homenode_claims_have_no_node_subgrid():
    g = create_genesis(seed=42)
    homenode_coords = _homenode_coords()
    non_homenode_claims = [
        c for c in g.claim_registry.all_active_claims()
        if (c.coordinate.x, c.coordinate.y) not in homenode_coords
    ]
    for claim in non_homenode_claims:
        claim_id = node_id_from_coord(claim.coordinate.x, claim.coordinate.y)
        assert claim_id not in g.node_subgrids, (
            f"node_subgrid unexpectedly present for non-homenode {claim_id}"
        )


def test_genesis_node_subgrid_count_equals_homenode_count():
    g = create_genesis(seed=42)
    homenode_coords = _homenode_coords()
    expected_count = sum(
        1 for c in g.claim_registry.all_active_claims()
        if (c.coordinate.x, c.coordinate.y) in homenode_coords
    )
    assert len(g.node_subgrids) == expected_count
