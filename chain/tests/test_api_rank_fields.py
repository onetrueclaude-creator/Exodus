"""/api/agents phyllotaxis bridge: rank / band / activity / is_singularity.

These fields let the renderer drop its client-side proxy and read seats straight
from the chain (Plan 2, Task 8). All additive — `is_user_agent` semantics and the
existing user_count math are unchanged.
"""
import pytest
from fastapi.testclient import TestClient

from agentic.lattice.seating import band_of
from agentic.testnet.api import app
from tests.conftest import TEST_ADMIN_TOKEN, seat_player_claims

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        # v1.2 §10.1: genesis seats only the Singularity (origin). Seat several
        # ring-1 player nodes so there are real seats to rank/band. Deterministic
        # seed keeps the Singularity at the origin (rank 0). Seated directly on
        # the ClaimRegistry to avoid the /api/claim rate limiter (5 / 10s).
        c.post("/api/reset?wallets=50&seed=42", headers=_ADMIN)
        seat_player_claims(
            [(10, 0), (0, 10), (-10, 0), (0, -10), (10, 10), (-10, -10)],
            wallet_index=1,
        )
        yield c


def test_agents_expose_rank_band_activity(client):
    resp = client.get("/api/agents?user_count=3")
    assert resp.status_code == 200
    agents = resp.json()
    assert agents
    for a in agents:
        assert "rank" in a and "band" in a and "activity" in a and "is_singularity" in a
        # band is exactly the radial band of the seat's rank
        assert a["band"] == band_of(a["rank"])


def test_singularity_is_origin_rank_zero(client):
    agents = client.get("/api/agents?user_count=3").json()
    singular = [a for a in agents if a["is_singularity"]]
    assert len(singular) == 1                       # exactly the origin protocol node
    s = singular[0]
    assert (s["x"], s["y"]) == (0, 0)               # Singularity sits at the origin
    assert s["rank"] == 0 and s["band"] == 0        # core seat is rank 0 / band 0
    # every other agent gets a contiguous, unique phyllotaxis rank 1..N
    others = [a for a in agents if not a["is_singularity"]]
    ranks = sorted(a["rank"] for a in others)
    assert ranks == list(range(1, len(others) + 1))


def test_activity_orders_ranks(client):
    """Among non-Singularity agents, activity is non-increasing as rank grows."""
    agents = client.get("/api/agents?user_count=10").json()
    others = sorted(
        (a for a in agents if not a["is_singularity"]), key=lambda a: a["rank"]
    )
    activities = [a["activity"] for a in others]
    assert all(activities[i] >= activities[i + 1] for i in range(len(activities) - 1))


def test_rank_fields_do_not_change_user_count(client):
    """Additive: the new rank fields don't perturb the user_count slice.

    user_count=5 marks the first 5 claims as user-owned, but the Singularity
    (the origin, claim index 0) is excluded from is_user_agent (Bug #9), so the
    slice yields 5 − 1 = 4 user agents.
    """
    agents = client.get("/api/agents?user_count=5").json()
    user_agents = [a for a in agents if a["is_user_agent"]]
    assert len(user_agents) == 4
    assert all(not a["is_singularity"] for a in user_agents)
