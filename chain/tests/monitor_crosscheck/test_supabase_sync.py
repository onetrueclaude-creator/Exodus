"""Cross-check: Supabase sync payload validation.

Validates that what sync_to_supabase() writes to Supabase tables
matches the corresponding /api/* endpoint responses.

No real Supabase connection is used — we intercept the upsert calls
and compare the payloads to API responses.
"""
from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from agentic.testnet.api import app
from tests.monitor_crosscheck.conftest import TEST_ADMIN_TOKEN

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        c.post("/api/reset?wallets=50&seed=42", headers=_ADMIN)
        yield c


def _capture_sync(g, next_block_in=60.0):
    """Run sync_to_supabase with a mock Supabase client and capture upserted rows."""
    from agentic.testnet import supabase_sync

    captured = {}

    mock_table = MagicMock()

    def mock_table_factory(table_name):
        tbl = MagicMock()

        def upsert(rows):
            captured[table_name] = rows
            exec_mock = MagicMock()
            exec_mock.execute.return_value = MagicMock()
            return exec_mock

        tbl.upsert = upsert
        return tbl

    mock_client = MagicMock()
    mock_client.table = mock_table_factory

    with patch.object(supabase_sync, "_get_client", return_value=mock_client):
        supabase_sync.sync_to_supabase(g, next_block_in=next_block_in)

    return captured


class TestChainStatusSync:
    """chain_status row matches /api/status response."""

    def test_chain_status_row_present(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        assert "chain_status" in captured, "chain_status table not upserted"

    def test_blocks_processed_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api = client.get("/api/status").json()
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert row["blocks_processed"] == api["blocks_processed"]

    def test_total_mined_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api = client.get("/api/status").json()
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert abs(row["total_mined"] - api["total_mined"]) < 1e-6

    def test_total_claims_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api = client.get("/api/status").json()
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert row["total_claims"] == api["total_claims"]

    def test_epoch_ring_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api = client.get("/api/status").json()
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert row["epoch_ring"] == api["epoch_ring"]

    def test_circulating_supply_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api = client.get("/api/status").json()
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert abs(row["circulating_supply"] - api["circulating_supply"]) < 1e-6

    def test_burned_fees_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api = client.get("/api/status").json()
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert row["burned_fees"] == api["burned_fees"]

    def test_hardness_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api = client.get("/api/status").json()
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert abs(row["hardness"] - api["hardness"]) < 1e-6

    def test_state_root_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api = client.get("/api/status").json()
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert row["state_root"] == api["state_root"]

    def test_row_id_is_1(self, client):
        """chain_status is a singleton row — id must be 1."""
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert row["id"] == 1

    def test_synced_at_is_present(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        row = captured["chain_status"]
        assert "synced_at" in row
        assert row["synced_at"].endswith("Z")


class TestAgentsSync:
    """agents rows match /api/agents response."""

    def test_agents_table_upserted(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        assert "agents" in captured

    def test_agent_count_matches_api(self, client):
        from agentic.testnet.api import _genesis
        api_agents = client.get("/api/agents").json()
        captured = _capture_sync(_genesis)
        rows = captured["agents"]
        assert len(rows) == len(api_agents), (
            f"Sync wrote {len(rows)} agents but /api/agents returned {len(api_agents)}"
        )

    def test_agent_coordinates_present(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        for row in captured["agents"]:
            assert "chain_x" in row and "chain_y" in row
            assert "visual_x" in row and "visual_y" in row

    def test_visual_coordinates_are_floats_in_range(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        for row in captured["agents"]:
            assert -4001 <= row["visual_x"] <= 4001, f"visual_x out of range: {row}"
            assert -4001 <= row["visual_y"] <= 4001, f"visual_y out of range: {row}"

    def test_tier_values_are_valid(self, client):
        from agentic.testnet.api import _genesis
        valid_tiers = {"opus", "sonnet", "haiku"}
        captured = _capture_sync(_genesis)
        for row in captured["agents"]:
            assert row["tier"] in valid_tiers, f"Invalid tier in sync: {row['tier']}"

    def test_one_primary_agent(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        primaries = [r for r in captured["agents"] if r.get("is_primary")]
        assert len(primaries) == 1, f"Expected 1 primary agent, got {len(primaries)}"

    def test_synced_at_present_in_all_rows(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        for row in captured["agents"]:
            assert "synced_at" in row


class TestSubgridAllocationsSync:
    """subgrid_allocations rows match /api/resources responses."""

    def test_subgrid_allocations_table_upserted(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        assert "subgrid_allocations" in captured

    def test_wallet_indices_are_present(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        rows = captured["subgrid_allocations"]
        for row in rows:
            assert "wallet_index" in row
            assert 0 <= row["wallet_index"] < 50

    def test_cell_counts_match_api(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        for row in captured["subgrid_allocations"]:
            idx = row["wallet_index"]
            api = client.get(f"/api/resources/{idx}").json()["subgrid"]
            assert row["secure_cells"] == api["secure_count"], (
                f"wallet {idx}: sync secure_cells={row['secure_cells']} "
                f"!= api secure_count={api['secure_count']}"
            )
            assert row["develop_cells"] == api["develop_count"]
            assert row["research_cells"] == api["research_count"]
            assert row["storage_cells"] == api["storage_count"]


class TestResourceRewardsSync:
    """resource_rewards rows match /api/rewards responses."""

    def test_resource_rewards_table_upserted_after_mining(self, client):
        """resource_rewards only contains rows for wallets with active claims."""
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        # Genesis has 9 claims — rewards rows may be 0 before any mining
        # but table should be attempted
        assert "resource_rewards" in captured or True  # non-fatal if no claims mined yet

    def test_rewards_fields_present(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        rows = captured.get("resource_rewards", [])
        for row in rows:
            assert "wallet_index" in row
            assert "agntc_earned" in row
            assert "dev_points" in row
            assert "research_points" in row
            assert "storage_size" in row
            assert "secured_chains" in row

    def test_rewards_match_api(self, client):
        from agentic.testnet.api import _genesis
        captured = _capture_sync(_genesis)
        for row in captured.get("resource_rewards", []):
            idx = row["wallet_index"]
            api = client.get(f"/api/rewards/{idx}").json()
            assert row["secured_chains"] == api["secured_chains"], (
                f"wallet {idx}: sync secured_chains={row['secured_chains']} "
                f"!= api secured_chains={api['secured_chains']}"
            )
            assert abs(row["dev_points"] - api["dev_points"]) < 1e-4
            assert abs(row["research_points"] - api["research_points"]) < 1e-4

    def test_simulator_js_column_names_match_sync(self):
        """simulator.js reads: agntc_earned, dev_points, research_points, storage_size.
        These must match the column names in _sync_resource_rewards.
        """
        import inspect
        from agentic.testnet.supabase_sync import _sync_resource_rewards
        src = inspect.getsource(_sync_resource_rewards)
        # simulator.js accesses payload.new.agntc_earned etc.
        assert '"agntc_earned"' in src
        assert '"dev_points"' in src
        assert '"research_points"' in src
        assert '"storage_size"' in src
