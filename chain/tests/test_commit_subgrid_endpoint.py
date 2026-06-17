"""Tests for POST /api/resources/node/{node_id}/commit endpoint."""
import os

import pytest
from fastapi.testclient import TestClient

from agentic.testnet.api import app, _g
from tests.conftest import TEST_ADMIN_TOKEN, seat_player_claims

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}

client = TestClient(app)


def _reset_and_seat(c):
    """Reset to a known genesis (inside the given live client ``c``), seat a
    player claim, and return (g, node_id, wallet_index).

    v1.2 §10.1: genesis seats only the Singularity (no homenode subgrids), so we
    seat a ring-1 player claim for wallet 1 — that creates the NodeSubgrid the
    commit endpoint operates on. The seat MUST happen inside the same TestClient
    context that issues the commit, because each ``with TestClient(app)`` fires
    the startup event which rebuilds genesis from scratch.
    """
    c.post("/api/reset?wallets=10&seed=42", headers=_ADMIN)
    wallet_index = 1
    seat_player_claims([(10, 0)], wallet_index=wallet_index)
    g = _g()
    node_id = next(
        nid for nid, ns in g.node_subgrids.items()
        if ns.owner == g.wallets[wallet_index].public_key
    )
    return g, node_id, wallet_index


def test_commit_subgrid_puts_cells_in_warmup():
    with TestClient(app) as c:
        g, node_id, wallet_index = _reset_and_seat(c)
        resp = c.post(
            f"/api/resources/node/{node_id}/commit",
            json={
                "wallet_index": wallet_index,
                "diffs": [
                    {"index": 0, "new_type": "secure"},
                    {"index": 1, "new_type": "develop"},
                ],
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["node_id"] == node_id
        assert body["cells_changed"] == 2

        ns = _g().node_subgrids[node_id]
        assert ns.cells[0].state.value == "warmup"
        assert ns.cells[0].pending_type.value == "secure"
        assert ns.cells[1].pending_type.value == "develop"


def test_commit_subgrid_rejects_wrong_owner():
    with TestClient(app) as c:
        g, node_id, correct_wallet = _reset_and_seat(c)
        wrong_wallet = (correct_wallet + 1) % len(g.wallets)
        # Make sure we actually have a different wallet
        assert g.wallets[wrong_wallet].public_key != g.wallets[correct_wallet].public_key
        resp = c.post(
            f"/api/resources/node/{node_id}/commit",
            json={
                "wallet_index": wrong_wallet,
                "diffs": [{"index": 0, "new_type": "secure"}],
            },
        )
        assert resp.status_code == 403


def test_commit_subgrid_rejects_unknown_node():
    with TestClient(app) as c:
        c.post("/api/reset?wallets=10&seed=42", headers=_ADMIN)
        resp = c.post(
            "/api/resources/node/99999,99999/commit",
            json={"wallet_index": 0, "diffs": []},
        )
    assert resp.status_code == 404


def test_commit_subgrid_rejects_invalid_new_type():
    client.post("/api/reset")
    g = _g()
    # v1.2 §10.1: genesis seats no homenode subgrids — seat a player claim first.
    wallet_index = 1
    seat_player_claims([(10, 0)], wallet_index=wallet_index)
    g = _g()
    node_id = next(
        nid for nid, ns in g.node_subgrids.items()
        if ns.owner == g.wallets[wallet_index].public_key
    )
    resp = client.post(
        f"/api/resources/node/{node_id}/commit",
        json={
            "wallet_index": wallet_index,
            "diffs": [{"index": 0, "new_type": "mine"}],  # "mine" is not a valid CellType
        },
    )
    assert resp.status_code == 422, f"expected 422, got {resp.status_code}: {resp.text}"
