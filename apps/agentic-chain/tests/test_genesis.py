"""Tests for testnet genesis initialization."""
import pytest


class TestGenesisState:
    def test_creates_ledger_state(self):
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        assert g.ledger_state is not None
        assert g.ledger_state.record_count > 0

    def test_creates_wallets(self):
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        assert len(g.wallets) == 5

    def test_creates_claims(self):
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        assert len(g.claim_registry.all_active_claims()) == 3

    def test_community_pool_initialized(self):
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        assert g.community_pool.remaining > 0

    def test_pipeline_functional(self):
        from agentic.testnet.genesis import create_genesis
        from agentic.actions.types import (
            ActionType, CallerType, ActionRequest, ReadRequest, ReadTarget,
        )
        from agentic.galaxy.coordinate import GridCoordinate
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        req = ActionRequest(
            action_type=ActionType.READ, caller_type=CallerType.USER,
            caller_pubkey=g.wallets[0].public_key, slot=0,
            request=ReadRequest(
                coordinate=GridCoordinate(x=0, y=0), slot=0,
                target=ReadTarget.RESOURCE_DENSITY, planet_index=-1,
                ownership_proof=None,
            ),
        )
        result = g.pipeline.execute(req)
        assert result.success is True

    def test_deterministic_with_same_seed(self):
        from agentic.testnet.genesis import create_genesis
        g1 = create_genesis(num_wallets=3, num_claims=2, seed=42)
        g2 = create_genesis(num_wallets=3, num_claims=2, seed=42)
        assert g1.ledger_state.get_state_root() == g2.ledger_state.get_state_root()

    def test_wallet_balances(self):
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        for w in g.wallets:
            bal = w.get_balance(g.ledger_state)
            assert bal > 0

    def test_coordinate_to_coin_mapping(self):
        from agentic.testnet.genesis import create_genesis
        from agentic.galaxy.coordinate import resource_density
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        for claim in g.claim_registry.all_active_claims():
            d = resource_density(claim.coordinate.x, claim.coordinate.y)
            assert 0.0 <= d <= 1.0
            owner_records = [
                g.ledger_state.get_record(pos)
                for pos in range(g.ledger_state.record_count)
                if g.ledger_state.get_record(pos).owner == claim.owner
            ]
            assert len(owner_records) > 0

    def test_genesis_creates_home_stars(self):
        from agentic.testnet.genesis import create_genesis
        from agentic.params import BIRTH_PROGRAM_ID
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        birth_records = []
        for i in range(g.ledger_state.record_count):
            r = g.ledger_state.get_record(i)
            if r.program_id == BIRTH_PROGRAM_ID:
                birth_records.append(r)
        assert len(birth_records) == 3  # one per claim = home star

    def test_home_star_records_have_coordinates(self):
        from agentic.testnet.genesis import create_genesis
        from agentic.params import BIRTH_PROGRAM_ID
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        for i in range(g.ledger_state.record_count):
            r = g.ledger_state.get_record(i)
            if r.program_id == BIRTH_PROGRAM_ID:
                assert len(r.data) == 5
                assert r.data[0] == 0  # genesis home stars are free

    def test_viewing_keys_populated(self):
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        assert hasattr(g, 'viewing_keys')
        assert len(g.viewing_keys) == 5  # one per wallet
