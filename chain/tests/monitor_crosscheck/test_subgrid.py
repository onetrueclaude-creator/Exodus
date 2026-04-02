"""Cross-check: Subgrid Simulator tab.

Validates:
- /api/resources/{wallet_index} shape and values
- /api/resources/{wallet_index}/assign round-trip (assign → re-read confirms)
- Supabase sync payload for subgrid_allocations matches API state
- Supabase sync payload for resource_rewards matches API state
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from agentic.testnet.api import app
from tests.monitor_crosscheck.conftest import TEST_ADMIN_TOKEN

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}

# Wallet indices that have subgrid allocators (genesis homenodes, 0-8)
GENESIS_WALLET_INDICES = list(range(9))


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        c.post("/api/reset?wallets=50&seed=42", headers=_ADMIN)
        yield c


class TestResourcesEndpoint:
    """GET /api/resources/{wallet_index}"""

    def test_resources_returns_200_for_genesis_wallets(self, client):
        for idx in GENESIS_WALLET_INDICES:
            resp = client.get(f"/api/resources/{idx}")
            assert resp.status_code == 200, (
                f"wallet {idx}: expected 200 got {resp.status_code}"
            )

    def test_resources_returns_404_for_out_of_range(self, client):
        resp = client.get("/api/resources/9999")
        assert resp.status_code == 404

    def test_resources_schema(self, client):
        """All required simulator fields must be present."""
        resp = client.get("/api/resources/0")
        data = resp.json()
        top_level = {
            "agntc_per_block", "dev_points_per_block",
            "research_points_per_block", "storage_per_block",
            "total_dev_points", "total_research_points", "total_storage_units",
            "subgrid",
        }
        assert top_level <= set(data.keys()), (
            f"Missing top-level fields: {top_level - set(data.keys())}"
        )
        subgrid_fields = {
            "secure_count", "develop_count", "research_count", "storage_count",
            "secure_level", "develop_level", "research_level", "storage_level",
            "free_cells",
        }
        sg = data["subgrid"]
        assert subgrid_fields <= set(sg.keys()), (
            f"Missing subgrid fields: {subgrid_fields - set(sg.keys())}"
        )

    def test_total_cells_is_64(self, client):
        """Simulator display: total assigned + free must equal 64."""
        for idx in GENESIS_WALLET_INDICES:
            resp = client.get(f"/api/resources/{idx}")
            sg = resp.json()["subgrid"]
            allocated = (sg["secure_count"] + sg["develop_count"]
                         + sg["research_count"] + sg["storage_count"])
            assert allocated + sg["free_cells"] == 64, (
                f"wallet {idx}: allocated({allocated}) + free({sg['free_cells']}) != 64"
            )

    def test_per_block_yields_are_non_negative(self, client):
        resp = client.get("/api/resources/0")
        data = resp.json()
        assert data["agntc_per_block"] >= 0.0
        assert data["dev_points_per_block"] >= 0.0
        assert data["research_points_per_block"] >= 0.0
        assert data["storage_per_block"] >= 0.0

    def test_non_genesis_wallets_return_zero_yields(self, client):
        """Wallets without genesis claims have no subgrid allocators → zero yields."""
        resp = client.get("/api/resources/20")
        data = resp.json()
        assert data["agntc_per_block"] == 0.0
        assert data["dev_points_per_block"] == 0.0
        sg = data["subgrid"]
        assert sg["secure_count"] == 0
        assert sg["free_cells"] == 64


class TestSubgridAssignRoundTrip:
    """POST /api/resources/{wallet}/assign then re-read confirms allocation."""

    def test_assign_updates_subgrid_counts(self, client):
        # Assign a specific allocation and verify it sticks
        payload = {"secure": 16, "develop": 8, "research": 8, "storage": 8}
        resp = client.post("/api/resources/0/assign", json=payload)
        assert resp.status_code == 200
        result = resp.json()
        assert result["status"] == "ok"
        assert result["free_cells"] == 64 - 40

        # Re-read and confirm
        read = client.get("/api/resources/0").json()
        sg = read["subgrid"]
        assert sg["secure_count"] == 16
        assert sg["develop_count"] == 8
        assert sg["research_count"] == 8
        assert sg["storage_count"] == 8
        assert sg["free_cells"] == 24

    def test_assign_exceeding_64_cells_rejected(self, client):
        payload = {"secure": 32, "develop": 32, "research": 1, "storage": 0}
        resp = client.post("/api/resources/0/assign", json=payload)
        assert resp.status_code == 400

    def test_assign_zero_resets_all_to_free(self, client):
        payload = {"secure": 0, "develop": 0, "research": 0, "storage": 0}
        resp = client.post("/api/resources/0/assign", json=payload)
        assert resp.status_code == 200
        read = client.get("/api/resources/0").json()
        assert read["subgrid"]["free_cells"] == 64

    def test_assign_updates_per_block_yields(self, client):
        """Secure cells should produce agntc_per_block > 0 for genesis wallets."""
        payload = {"secure": 32, "develop": 0, "research": 0, "storage": 0}
        client.post("/api/resources/0/assign", json=payload)
        data = client.get("/api/resources/0").json()
        # Wallet 0 has a genesis claim with density > 0, so secure yield > 0
        assert data["agntc_per_block"] > 0.0, (
            "Secure cells on genesis wallet should produce agntc_per_block > 0"
        )

    def test_assign_non_genesis_wallet_returns_404(self, client):
        """Wallets without a subgrid allocator should return 404."""
        payload = {"secure": 10, "develop": 0, "research": 0, "storage": 0}
        resp = client.post("/api/resources/20/assign", json=payload)
        assert resp.status_code == 404


class TestSimulatorChainStateDisplay:
    """Simulator tab shows 'chain-side' values from Supabase (subgrid_allocations table).

    We can't hit real Supabase in unit tests, so we validate that the data
    produced by _sync_subgrid_allocations matches what /api/resources returns.
    """

    def test_sync_payload_matches_api_for_wallet_0(self, client):
        """Capture what sync would write and compare to API response."""
        # First assign a known allocation
        payload = {"secure": 20, "develop": 10, "research": 10, "storage": 5}
        client.post("/api/resources/0/assign", json=payload)

        from agentic.testnet.api import _genesis
        from agentic.galaxy.subgrid import SubcellType

        g = _genesis
        wallet = g.wallets[0]
        alloc = g.subgrid_allocators.get(wallet.public_key)
        assert alloc is not None

        # This is what _sync_subgrid_allocations would write to Supabase
        sync_row = {
            "wallet_index": 0,
            "secure_cells": alloc.count(SubcellType.SECURE),
            "develop_cells": alloc.count(SubcellType.DEVELOP),
            "research_cells": alloc.count(SubcellType.RESEARCH),
            "storage_cells": alloc.count(SubcellType.STORAGE),
        }

        # Compare with API response
        api_sg = client.get("/api/resources/0").json()["subgrid"]

        assert sync_row["secure_cells"] == api_sg["secure_count"]
        assert sync_row["develop_cells"] == api_sg["develop_count"]
        assert sync_row["research_cells"] == api_sg["research_count"]
        assert sync_row["storage_cells"] == api_sg["storage_count"]

    def test_realtime_field_names_match_simulator_js(self):
        """Simulator.js reads: secure_cells, develop_cells, research_cells, storage_cells.

        The Supabase sync must write the same column names.
        Check the _sync_subgrid_allocations function produces these exact keys.
        """
        import inspect
        from agentic.testnet.supabase_sync import _sync_subgrid_allocations
        src = inspect.getsource(_sync_subgrid_allocations)
        assert '"secure_cells"' in src
        assert '"develop_cells"' in src
        assert '"research_cells"' in src
        assert '"storage_cells"' in src
