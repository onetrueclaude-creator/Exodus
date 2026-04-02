"""Cross-check: SQLite persistence.

Validates that save_state → clear genesis → load_state restores
all mutable state faithfully, and that /api/reset wipes the DB.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from agentic.testnet.api import app
from agentic.testnet.genesis import create_genesis
from agentic.testnet.persistence import init_db, save_state, load_state, clear_state
from agentic.galaxy.subgrid import SubcellType
from tests.monitor_crosscheck.conftest import TEST_ADMIN_TOKEN

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture()
def tmp_db():
    """Provide a temporary SQLite DB path cleaned up after each test."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = Path(f.name)
    init_db(db_path)
    yield db_path
    db_path.unlink(missing_ok=True)


@pytest.fixture()
def fresh_genesis():
    return create_genesis(num_wallets=50, num_claims=0, seed=42)


class TestScalarPersistence:
    """Block count, epoch, supply, burned fees survive save → load."""

    def test_blocks_processed_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        g.mining_engine.total_blocks_processed = 42
        g.mining_engine.total_rewards_distributed = 12.34
        save_state(g, last_block_time=1234567.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        lbt = load_state(g2, tmp_db)

        assert g2.mining_engine.total_blocks_processed == 42
        assert abs(g2.mining_engine.total_rewards_distributed - 12.34) < 1e-9
        assert abs(lbt - 1234567.0) < 1e-6

    def test_epoch_ring_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        g.epoch_tracker.current_ring = 3
        g.epoch_tracker.total_mined = 99.0
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        assert g2.epoch_tracker.current_ring == 3
        assert abs(g2.epoch_tracker.total_mined - 99.0) < 1e-9

    def test_burned_fees_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        g.fee_engine.total_burned = 500
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        assert g2.fee_engine.total_burned == 500

    def test_message_counter_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        g._message_counter = 17
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        assert g2._message_counter == 17


class TestUserClaimsPersistence:
    """Non-genesis claims survive save → load."""

    def test_user_claim_restored(self, fresh_genesis, tmp_db):
        from agentic.galaxy.coordinate import GridCoordinate, GLOBAL_BOUNDS
        g = fresh_genesis
        # Expand bounds first, then register a user claim beyond genesis coords
        GLOBAL_BOUNDS.expand_to_contain(30, 30)
        wallet = g.wallets[10]
        coord = GridCoordinate(x=30, y=30)
        g.claim_registry.register(owner=wallet.public_key, coordinate=coord, stake=150, slot=5)
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        restored = g2.claim_registry.get_claim_at(coord)
        assert restored is not None
        assert restored.stake_amount == 150
        assert restored.owner == wallet.public_key

    def test_genesis_claims_not_duplicated(self, fresh_genesis, tmp_db):
        """Genesis coords (0,0) etc. must not appear twice after load."""
        save_state(fresh_genesis, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        all_claims = g2.claim_registry.all_active_claims()
        coords = [(c.coordinate.x, c.coordinate.y) for c in all_claims]
        assert len(coords) == len(set(coords)), "Duplicate coords after restore"
        assert len(all_claims) == 9  # still exactly 9 genesis claims

    def test_user_claim_creates_subgrid_allocator(self, fresh_genesis, tmp_db):
        from agentic.galaxy.coordinate import GridCoordinate, GLOBAL_BOUNDS
        g = fresh_genesis
        GLOBAL_BOUNDS.expand_to_contain(50, 50)
        wallet = g.wallets[20]
        coord = GridCoordinate(x=50, y=50)
        g.claim_registry.register(owner=wallet.public_key, coordinate=coord, stake=100, slot=1)
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        # Subgrid allocator should have been created for restored wallet
        assert wallet.public_key in g2.subgrid_allocators


class TestSubgridPersistence:
    """Subgrid cell allocations and levels survive save → load."""

    def test_cell_counts_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        wallet = g.wallets[0]
        alloc = g.subgrid_allocators[wallet.public_key]
        alloc.assign(SubcellType.SECURE, 20)
        alloc.assign(SubcellType.DEVELOP, 10)
        alloc.assign(SubcellType.RESEARCH, 5)
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        alloc2 = g2.subgrid_allocators[wallet.public_key]
        assert alloc2.count(SubcellType.SECURE) == 20
        assert alloc2.count(SubcellType.DEVELOP) == 10
        assert alloc2.count(SubcellType.RESEARCH) == 5
        assert alloc2.count(SubcellType.STORAGE) == 0
        assert alloc2.free_cells == 64 - 35

    def test_levels_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        wallet = g.wallets[1]
        alloc = g.subgrid_allocators[wallet.public_key]
        alloc.assign(SubcellType.SECURE, 10)
        alloc.set_level(SubcellType.SECURE, 3)
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        alloc2 = g2.subgrid_allocators[wallet.public_key]
        assert alloc2.get_level(SubcellType.SECURE) == 3

    def test_64_cell_invariant_preserved_after_restore(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        for i in range(9):
            wallet = g.wallets[i]
            alloc = g.subgrid_allocators[wallet.public_key]
            alloc.assign(SubcellType.SECURE, 16)
            alloc.assign(SubcellType.DEVELOP, 16)
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        for i in range(9):
            wallet = g2.wallets[i]
            alloc = g2.subgrid_allocators[wallet.public_key]
            total = alloc.total_cells + alloc.free_cells
            assert total == 64


class TestResourceTotalsPersistence:
    """Per-wallet resource earnings survive save → load."""

    def test_resource_totals_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        wallet = g.wallets[0]
        g.resource_totals[wallet.public_key] = {
            "dev_points": 42.5,
            "research_points": 17.0,
            "storage_units": 3.14,
        }
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        totals = g2.resource_totals.get(wallet.public_key, {})
        assert abs(totals.get("dev_points", 0) - 42.5) < 1e-9
        assert abs(totals.get("research_points", 0) - 17.0) < 1e-9
        assert abs(totals.get("storage_units", 0) - 3.14) < 1e-9


class TestIntroAndMessagePersistence:
    """Intro messages and message history survive save → load."""

    def test_intro_message_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        g.intro_messages[(0, 0)] = "Hello from genesis"
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        assert g2.intro_messages.get((0, 0)) == "Hello from genesis"

    def test_message_history_restored(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        msg = {
            "id": "msg-001",
            "sender_coord": {"x": 0, "y": 0},
            "target_coord": {"x": 10, "y": 10},
            "text": "Greetings",
            "timestamp": 1234567.0,
        }
        g.message_history[(10, 10)] = [msg]
        save_state(g, last_block_time=0.0, db_path=tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, tmp_db)

        history = g2.message_history.get((10, 10), [])
        assert len(history) == 1
        assert history[0]["id"] == "msg-001"
        assert history[0]["text"] == "Greetings"


class TestClearState:
    """clear_state wipes all tables."""

    def test_clear_removes_all_data(self, fresh_genesis, tmp_db):
        g = fresh_genesis
        g.mining_engine.total_blocks_processed = 99
        g.intro_messages[(0, 0)] = "test"
        save_state(g, last_block_time=99.0, db_path=tmp_db)

        clear_state(tmp_db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        lbt = load_state(g2, tmp_db)

        assert g2.mining_engine.total_blocks_processed == 0
        assert lbt == 0.0
        assert (0, 0) not in g2.intro_messages

    def test_clear_on_missing_db_is_noop(self, tmp_path):
        missing = tmp_path / "nonexistent.db"
        clear_state(missing)  # must not raise


class TestLoadOnMissingDb:
    """load_state is a no-op when DB file doesn't exist."""

    def test_load_missing_db_returns_zero(self, fresh_genesis, tmp_path):
        missing = tmp_path / "no.db"
        lbt = load_state(fresh_genesis, missing)
        assert lbt == 0.0
        assert fresh_genesis.mining_engine.total_blocks_processed == 0


class TestStakedCpuField:
    """staked_cpu field is present on /api/agents response."""

    def test_agents_expose_staked_cpu(self):
        with TestClient(app) as client:
            client.post("/api/reset?wallets=50&seed=42", headers=_ADMIN)
            resp = client.get("/api/agents")
            assert resp.status_code == 200
            for agent in resp.json():
                assert "staked_cpu" in agent, f"staked_cpu missing on agent {agent.get('id')}"
                assert isinstance(agent["staked_cpu"], int)
                assert agent["staked_cpu"] >= 0
