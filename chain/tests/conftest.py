"""Global test fixtures for the Agentic Chain test suite."""
import pytest

# A shared admin token for all tests that call admin-gated endpoints.
TEST_ADMIN_TOKEN = "test-admin-token"


@pytest.fixture(autouse=True, scope="session")
def _enable_admin_endpoints():
    """Patch _ADMIN_TOKEN so /api/reset and /api/automine work in tests.

    The token is set at session scope so all test modules see it.
    Test code must still send the ``X-Admin-Token`` header (use the
    ``admin_headers`` fixture) when calling admin endpoints.
    """
    from agentic.testnet import api as _api_module

    original = _api_module._ADMIN_TOKEN
    _api_module._ADMIN_TOKEN = TEST_ADMIN_TOKEN
    yield
    _api_module._ADMIN_TOKEN = original


@pytest.fixture(scope="session")
def admin_headers() -> dict:
    """Return headers dict for admin-gated endpoints."""
    return {"X-Admin-Token": TEST_ADMIN_TOKEN}


def seat_player_claims(coords, *, wallet_index: int = 1, stake: int = 200):
    """Seat player claims directly on the live ``_genesis`` for API tests.

    v1.2 §10.1: genesis seats only the Singularity (origin), so tests that need
    real player seats must claim some first. The public ``/api/claim`` endpoint
    is rate-limited (5 / 10s), which trips when a test seats several nodes in a
    tight loop, so this helper registers claims straight on the ClaimRegistry and
    creates the matching validator + verification agent — the same internal
    bookkeeping ``/api/claim`` does (so staked_cpu and rank resolution work),
    minus the HTTP rate limiter / coordinate snapping / ring-gating.

    Returns the number of claims actually seated (skips already-claimed coords).
    """
    import random as _random

    from agentic.lattice.coordinate import GridCoordinate, GLOBAL_BOUNDS
    from agentic.lattice.node_subgrid import NodeSubgrid, node_id_from_coord
    from agentic.lattice.subgrid import SubgridAllocator
    from agentic.testnet import api as _api
    from agentic.verification.agent import VerificationAgent, AgentState
    from agentic.consensus.validator import Validator

    g = _api._genesis
    assert g is not None, "genesis not initialized — reset the API first"
    seated = 0
    for x, y in coords:
        GLOBAL_BOUNDS.expand_to_contain(x, y)
        coord = GridCoordinate(x=x, y=y)
        if g.claim_registry.get_claim_at(coord) is not None:
            continue
        wallet = g.wallets[wallet_index]
        g.claim_registry.register(
            owner=wallet.public_key, coordinate=coord, stake=stake,
            slot=g.mining_engine.total_blocks_processed,
        )
        vid = len(g.validators)
        rng_vpu = _random.Random(vid + 7)
        v = Validator(id=vid, token_stake=float(stake),
                      cpu_vpu=float(rng_vpu.randint(20, 120)), online=True)
        g.validators.append(v)
        g.agents.append(VerificationAgent(
            agent_id=f"verifier-{vid:03d}", validator_id=vid,
            vpu_capacity=v.cpu_vpu, registered_epoch=0, state=AgentState.ACTIVE))
        g.viewing_keys[wallet.public_key] = wallet.viewing_key
        node_id = node_id_from_coord(x, y)
        if node_id not in g.node_subgrids:
            g.node_subgrids[node_id] = NodeSubgrid.new(
                node_id=node_id, owner=wallet.public_key,
                created_at_block=g.mining_engine.total_blocks_processed,
            )
        if wallet.public_key not in g.subgrid_allocators:
            g.subgrid_allocators[wallet.public_key] = SubgridAllocator(owner=wallet.public_key)
        seated += 1
    return seated
