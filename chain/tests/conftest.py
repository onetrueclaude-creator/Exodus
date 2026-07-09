"""Global test fixtures for the Agentic Chain test suite."""
import os
os.environ.setdefault("ALLOW_DEV_CUSTODIAL_SIGN", "1")

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


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Clear SlowAPI rate-limit state before each test.

    The TestClient sends every request from a single client IP, so the rate
    limiter's counters accumulate across tests and can spuriously 429 a later
    test that passes fine in isolation. Resetting before each test gives a clean
    slate while preserving within-test rate limiting (the reset runs before the
    test body, so a test that fires several requests still trips its own limit).
    """
    try:
        from agentic.testnet.api import limiter
        limiter.reset()
    except Exception:
        pass
    yield


@pytest.fixture(autouse=True)
def _snapshot_admin_token():
    """Defense-in-depth for the whole _ADMIN_TOKEN-clobber class (#205, #208,
    #209): unconditionally snapshot api._ADMIN_TOKEN before every test and
    restore it after, regardless of how (or whether) the test mutated it.

    monkeypatch.setattr already self-restores correctly (that is the fix
    applied to test_signed_writes_b4b.py in #208 and to test_bind_signing_key.py
    in #209) — this fixture is a blanket safety net for anything that bypasses
    monkeypatch entirely (a stray importlib.reload(api), or a test that
    assigns the module attribute directly), so a future instance of the same
    bug class can no longer leak past the end of the one test that caused it.

    Ordering vs monkeypatch, verified empirically (#209, probe run then
    deleted — see the PR description): autouse fixtures at a given scope are
    set up before explicitly-requested fixtures at the same scope, so this
    fixture's snapshot is always taken before any monkeypatch.setattr in the
    test body runs. Teardown reverses that (LIFO): monkeypatch's own restore
    fires first, then this fixture's restore runs last. In the common case
    (the mutation went through monkeypatch) that makes this fixture's restore
    a harmless no-op — monkeypatch already put the value back to exactly what
    this fixture snapshotted. It only does real work when something mutated
    _ADMIN_TOKEN outside monkeypatch's reach.
    """
    from agentic.testnet import api as _api_module

    before = _api_module._ADMIN_TOKEN
    yield
    _api_module._ADMIN_TOKEN = before


def reset_chain(client, *, wallets=None, claims=None, seed=None, token=None):
    """POST /api/reset and assert it actually succeeded.

    Several test files used to fire-and-forget this call with no status-code
    check (#209): a clobbered or expired admin token made the request 403
    silently, and the test then ran against whatever stale state a previous
    test file had left behind, passing by luck instead of by a clean reset.
    This wraps the same call with a loud assertion so that failure mode can
    no longer hide.

    Only params explicitly passed are put on the query string; omitting one
    falls through to the /api/reset endpoint's own default. This mirrors
    each original call site's exact semantics (some passed wallets/seed, one
    also passed claims, one passed no params at all) — only the missing
    status-code check changes, never what state a given call resets to.
    """
    params = {}
    if wallets is not None:
        params["wallets"] = wallets
    if claims is not None:
        params["claims"] = claims
    if seed is not None:
        params["seed"] = seed
    headers = {"X-Admin-Token": token if token is not None else TEST_ADMIN_TOKEN}
    r = client.post("/api/reset", params=params, headers=headers)
    assert r.status_code == 200, f"/api/reset failed ({r.status_code}): {r.text}"
    return r


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
