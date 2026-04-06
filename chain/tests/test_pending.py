"""Tests for the pending transaction write-through processor (Phase 2)."""
import pytest
from unittest.mock import patch, MagicMock

from agentic.testnet.genesis import create_genesis
from agentic.testnet.pending import (
    process_pending_transactions,
    _handle_assign_subgrid,
    _handle_claim,
)


@pytest.fixture
def genesis():
    """Fresh genesis state for each test."""
    from agentic.verification.pipeline import VerificationPipeline
    from agentic.params import SIM_ADVERSARIAL_RATE
    g = create_genesis(seed=42)
    g.verification_pipeline = VerificationPipeline(adversarial_rate=SIM_ADVERSARIAL_RATE)
    return g


class TestHandleAssignSubgrid:
    """Test the assign_subgrid handler directly."""

    def test_valid_assignment(self, genesis):
        g = genesis
        payload = {"wallet_index": 0, "secure": 16, "develop": 16, "research": 16, "storage": 16}
        _handle_assign_subgrid(g, payload)
        owner = g.wallets[0].public_key
        alloc = g.subgrid_allocators[owner]
        from agentic.lattice.subgrid import SubcellType
        assert alloc.count(SubcellType.SECURE) == 16
        assert alloc.count(SubcellType.DEVELOP) == 16

    def test_exceeds_64_cells(self, genesis):
        payload = {"wallet_index": 0, "secure": 40, "develop": 30, "research": 0, "storage": 0}
        with pytest.raises(ValueError, match="exceeds 64"):
            _handle_assign_subgrid(genesis, payload)

    def test_invalid_wallet(self, genesis):
        payload = {"wallet_index": 999, "secure": 10, "develop": 10, "research": 10, "storage": 10}
        with pytest.raises(ValueError, match="Invalid wallet_index"):
            _handle_assign_subgrid(genesis, payload)

    def test_wallet_without_subgrid(self, genesis):
        # Wallet 9+ don't have genesis claims → no subgrid allocator
        payload = {"wallet_index": 10, "secure": 10, "develop": 10, "research": 10, "storage": 10}
        with pytest.raises(ValueError, match="No subgrid"):
            _handle_assign_subgrid(genesis, payload)


class TestHandleClaim:
    """Test the claim handler directly."""

    def test_valid_claim(self, genesis):
        g = genesis
        initial_claims = len(g.claim_registry.all_active_claims())
        # Use a coord in ring 1 that isn't already a genesis claim
        payload = {"wallet_index": 0, "x": 10, "y": 10, "stake": 200}
        # (10,10) is a genesis homenode — pick a free one
        # Genesis homenodes: (10,10),(10,-10),(-10,-10),(-10,10) — all taken
        # Try (0,10) — that's a faction master. Try (-10,0) — also faction master.
        # Genesis claims occupy 9 coords. Free ring-1 coords: none with spacing 10.
        # Expand to ring 2 by advancing epoch:
        # Force ring expansion so ring 2 is open
        g.epoch_tracker.current_ring = 2
        payload = {"wallet_index": 0, "x": 20, "y": 0, "stake": 200}
        _handle_claim(g, payload)
        assert len(g.claim_registry.all_active_claims()) == initial_claims + 1

    def test_duplicate_claim(self, genesis):
        # (0, 0) is genesis origin — already claimed
        payload = {"wallet_index": 1, "x": 0, "y": 0, "stake": 200}
        with pytest.raises(ValueError, match="already claimed"):
            _handle_claim(genesis, payload)

    def test_beyond_current_ring(self, genesis):
        # Ring 1 is open (genesis). (100, 0) = ring 10 → should fail
        payload = {"wallet_index": 0, "x": 100, "y": 0, "stake": 200}
        with pytest.raises(ValueError, match="ring"):
            _handle_claim(genesis, payload)

    def test_missing_coordinates(self, genesis):
        payload = {"wallet_index": 0, "stake": 200}
        with pytest.raises(ValueError, match="requires x and y"):
            _handle_claim(genesis, payload)


class TestProcessPendingTransactions:
    """Test the full processor with mocked Supabase."""

    def _mock_fetch(self, rows):
        """Create a mock that returns given rows from fetch_pending."""
        return patch(
            "agentic.testnet.pending.fetch_pending",
            return_value=rows,
        )

    def _mock_mark(self):
        """Mock both mark_processed and mark_failed."""
        return (
            patch("agentic.testnet.pending.mark_processed") ,
            patch("agentic.testnet.pending.mark_failed"),
        )

    def test_empty_queue(self, genesis):
        with self._mock_fetch([]):
            result = process_pending_transactions(genesis)
        assert result == 0

    def test_assign_subgrid_processed(self, genesis):
        rows = [{
            "id": "txn-001",
            "wallet_index": 0,
            "action_type": "assign_subgrid",
            "payload": {"secure": 32, "develop": 16, "research": 8, "storage": 8},
        }]
        mp_ctx, mf_ctx = self._mock_mark()
        with self._mock_fetch(rows), mp_ctx as mp, mf_ctx as mf:
            result = process_pending_transactions(genesis)

        assert result == 1
        mp.assert_called_once_with("txn-001")
        mf.assert_not_called()

        # Verify state changed
        owner = genesis.wallets[0].public_key
        from agentic.lattice.subgrid import SubcellType
        assert genesis.subgrid_allocators[owner].count(SubcellType.SECURE) == 32

    def test_unknown_action_type_fails(self, genesis):
        rows = [{
            "id": "txn-002",
            "wallet_index": 0,
            "action_type": "launch_missiles",
            "payload": {},
        }]
        mp_ctx, mf_ctx = self._mock_mark()
        with self._mock_fetch(rows), mp_ctx as mp, mf_ctx as mf:
            result = process_pending_transactions(genesis)

        assert result == 1
        mp.assert_not_called()
        mf.assert_called_once()
        assert "Unknown action_type" in mf.call_args[0][1]

    def test_invalid_payload_fails(self, genesis):
        rows = [{
            "id": "txn-003",
            "wallet_index": 0,
            "action_type": "assign_subgrid",
            "payload": {"secure": 100, "develop": 0, "research": 0, "storage": 0},
        }]
        mp_ctx, mf_ctx = self._mock_mark()
        with self._mock_fetch(rows), mp_ctx as mp, mf_ctx as mf:
            result = process_pending_transactions(genesis)

        assert result == 1
        mp.assert_not_called()
        mf.assert_called_once()
        assert "exceeds 64" in mf.call_args[0][1]

    def test_multiple_transactions(self, genesis):
        rows = [
            {
                "id": "txn-010",
                "wallet_index": 0,
                "action_type": "assign_subgrid",
                "payload": {"secure": 16, "develop": 16, "research": 16, "storage": 16},
            },
            {
                "id": "txn-011",
                "wallet_index": 1,
                "action_type": "assign_subgrid",
                "payload": {"secure": 32, "develop": 32, "research": 0, "storage": 0},
            },
        ]
        mp_ctx, mf_ctx = self._mock_mark()
        with self._mock_fetch(rows), mp_ctx as mp, mf_ctx as mf:
            result = process_pending_transactions(genesis)

        assert result == 2
        assert mp.call_count == 2

    def test_claim_via_processor(self, genesis):
        genesis.epoch_tracker.current_ring = 2  # open ring 2
        rows = [{
            "id": "txn-020",
            "wallet_index": 2,
            "action_type": "claim",
            "payload": {"x": 20, "y": 0, "stake": 150},  # ring 2
        }]
        initial = len(genesis.claim_registry.all_active_claims())
        mp_ctx, mf_ctx = self._mock_mark()
        with self._mock_fetch(rows), mp_ctx as mp, mf_ctx as mf:
            result = process_pending_transactions(genesis)

        assert result == 1
        mp.assert_called_once_with("txn-020")
        assert len(genesis.claim_registry.all_active_claims()) == initial + 1
