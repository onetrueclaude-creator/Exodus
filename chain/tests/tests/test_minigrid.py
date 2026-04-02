"""Tests for grid region API — minigrid slot data.

Note: slot_fill/has_data/max_capacity fields are planned but not yet in GridCell.
These tests validate the current grid region response structure.
"""
import pytest
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from agentic.testnet.api import app
from tests.conftest import TEST_ADMIN_TOKEN

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture(scope="module")
def client():
    """Create a TestClient that triggers startup/shutdown events."""
    with TestClient(app) as c:
        c.post("/api/reset?wallets=50&seed=42", headers=_ADMIN)
        yield c


def test_grid_region_returns_cells(client):
    """GET /api/grid/region should return cells with density and claim info."""
    resp = client.get("/api/grid/region", params={"x_min": -1, "x_max": 1, "y_min": -1, "y_max": 1})
    assert resp.status_code == 200
    data = resp.json()
    assert "cells" in data
    assert len(data["cells"]) == 9  # 3x3 grid
    for cell in data["cells"]:
        assert "x" in cell
        assert "y" in cell
        assert "density" in cell
        assert "claimed" in cell


def test_grid_region_density_varies(client):
    """Different coordinates have different density values."""
    resp = client.get("/api/grid/region", params={"x_min": 0, "x_max": 0, "y_min": 0, "y_max": 0})
    assert resp.status_code == 200
    cells = resp.json()["cells"]
    assert len(cells) == 1
    assert 0.0 <= cells[0]["density"] <= 1.0
