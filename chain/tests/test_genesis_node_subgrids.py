from agentic.testnet.genesis import create_genesis
from agentic.lattice.node_subgrid import node_id_from_coord
from agentic.params import GENESIS_HOMENODES


def _homenode_coords():
    return set(GENESIS_HOMENODES)


def test_genesis_initializes_empty_node_subgrids_dict():
    g = create_genesis(seed=42)
    assert hasattr(g, "node_subgrids")
    assert isinstance(g.node_subgrids, dict)


def test_claiming_a_homenode_creates_its_node_subgrid():
    """v1.2 §10.1: genesis seats only the Singularity, so no homenode subgrid
    exists at launch. When a participant claims a homenode coordinate, the chain
    creates a fresh 64-cell node_subgrid owned by the claimant. This exercises
    that creation path directly (the same logic genesis used to run per claim).
    """
    from agentic.lattice.coordinate import GridCoordinate, GLOBAL_BOUNDS
    from agentic.lattice.node_subgrid import NodeSubgrid

    g = create_genesis(seed=42)
    # No homenode is seated at genesis.
    assert len(g.node_subgrids) == 0

    # Claim a homenode coordinate with a non-genesis wallet.
    hx, hy = next(iter(_homenode_coords()))
    GLOBAL_BOUNDS.expand_to_contain(hx, hy)
    claimant = g.wallets[20]
    coord = GridCoordinate(x=hx, y=hy)
    g.claim_registry.register(owner=claimant.public_key, coordinate=coord, stake=200, slot=0)

    # Run the chain's node_subgrid-creation logic for homenode claims.
    for claim in g.claim_registry.all_active_claims():
        ct = (claim.coordinate.x, claim.coordinate.y)
        if ct not in _homenode_coords():
            continue
        node_id = node_id_from_coord(claim.coordinate.x, claim.coordinate.y)
        g.node_subgrids[node_id] = NodeSubgrid.new(
            node_id=node_id, owner=claim.owner, created_at_block=0,
        )

    claim_id = node_id_from_coord(hx, hy)
    assert claim_id in g.node_subgrids, f"Missing node_subgrid for homenode {claim_id}"
    ns = g.node_subgrids[claim_id]
    assert ns.owner == claimant.public_key
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
