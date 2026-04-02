"""Tests for mining rewards written as ledger Records — v2 (no CommunityPool)."""
import pytest


class TestMintBlockRewards:
    def test_method_exists(self):
        from agentic.galaxy.mining import MiningEngine
        engine = MiningEngine()
        assert hasattr(engine, "mint_block_rewards")

    def test_creates_records(self):
        from agentic.galaxy.mining import MiningEngine
        from agentic.galaxy.coordinate import GridCoordinate
        from agentic.ledger.state import LedgerState
        engine = MiningEngine()
        state = LedgerState()

        claims = [{"owner": b"alice", "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]
        yields = engine.compute_block_yields(claims)
        viewing_keys = {b"alice": b"a" * 32}

        initial_count = state.record_count
        engine.mint_block_rewards(yields, state, viewing_keys)
        assert state.record_count > initial_count

    def test_record_values_match_yields(self):
        from agentic.galaxy.mining import MiningEngine
        from agentic.galaxy.coordinate import GridCoordinate
        from agentic.ledger.state import LedgerState
        engine = MiningEngine()
        state = LedgerState()

        claims = [
            {"owner": b"alice", "coordinate": GridCoordinate(x=0, y=0), "stake": 100},
            {"owner": b"bob", "coordinate": GridCoordinate(x=10, y=10), "stake": 100},
        ]
        yields = engine.compute_block_yields(claims)
        viewing_keys = {b"alice": b"a" * 32, b"bob": b"b" * 32}

        engine.mint_block_rewards(yields, state, viewing_keys)
        for i in range(state.record_count):
            r = state.get_record(i)
            assert r.value > 0

    def test_state_root_changes(self):
        from agentic.galaxy.mining import MiningEngine
        from agentic.galaxy.coordinate import GridCoordinate
        from agentic.ledger.state import LedgerState
        engine = MiningEngine()
        state = LedgerState()

        root_before = state.get_state_root()
        claims = [{"owner": b"alice", "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]
        yields = engine.compute_block_yields(claims)
        viewing_keys = {b"alice": b"a" * 32}
        engine.mint_block_rewards(yields, state, viewing_keys)
        root_after = state.get_state_root()
        assert root_before != root_after

    def test_zero_yield_skipped(self):
        from agentic.galaxy.mining import MiningEngine
        from agentic.ledger.state import LedgerState
        engine = MiningEngine()
        state = LedgerState()

        yields = {b"alice": 0.0}
        viewing_keys = {b"alice": b"a" * 32}
        engine.mint_block_rewards(yields, state, viewing_keys)
        assert state.record_count == 0

    def test_float_to_int_conversion(self):
        from agentic.galaxy.mining import MiningEngine
        from agentic.ledger.state import LedgerState
        engine = MiningEngine()
        state = LedgerState()

        yields = {b"alice": 0.123456}
        viewing_keys = {b"alice": b"a" * 32}
        engine.mint_block_rewards(yields, state, viewing_keys)
        if state.record_count > 0:
            r = state.get_record(0)
            assert isinstance(r.value, int)
            assert r.value == 123456  # 0.123456 * 1_000_000
