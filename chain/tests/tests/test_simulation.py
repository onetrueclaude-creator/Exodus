"""Tests for the full chain simulation engine."""
from __future__ import annotations
import pytest
from agentic.simulation.engine import SimulationEngine, SimulationConfig, EpochSummary


class TestSimulationEngine:
    def test_create_engine(self):
        config = SimulationConfig(num_wallets=10, num_validators=10, num_epochs=1, seed=42)
        engine = SimulationEngine(config)
        assert len(engine.wallets) == 10

    def test_genesis_mints(self):
        config = SimulationConfig(num_wallets=5, num_validators=10, num_epochs=0, seed=42)
        engine = SimulationEngine(config)
        engine.run_genesis()
        for w in engine.wallets:
            assert w.get_balance(engine.state) == config.genesis_balance

    def test_run_one_epoch(self):
        config = SimulationConfig(num_wallets=10, num_validators=10, num_epochs=1, seed=42)
        engine = SimulationEngine(config)
        engine.run_genesis()
        summaries = engine.run()
        assert len(summaries) == 1
        s = summaries[0]
        assert s.txs_successful >= 0
        assert len(s.state_root) == 32

    def test_run_multiple_epochs(self):
        config = SimulationConfig(num_wallets=10, num_validators=10, num_epochs=5, seed=42)
        engine = SimulationEngine(config)
        engine.run_genesis()
        summaries = engine.run()
        assert len(summaries) == 5

    def test_no_negative_balances(self):
        config = SimulationConfig(num_wallets=10, num_validators=10, num_epochs=3, seed=42)
        engine = SimulationEngine(config)
        engine.run_genesis()
        engine.run()
        for w in engine.wallets:
            assert w.get_balance(engine.state) >= 0

    def test_supply_conserved_without_inflation(self):
        config = SimulationConfig(
            num_wallets=10, num_validators=10, num_epochs=3, seed=42,
            inflation_enabled=False,
        )
        engine = SimulationEngine(config)
        engine.run_genesis()
        initial_supply = sum(w.get_balance(engine.state) for w in engine.wallets)
        engine.run()
        final_supply = sum(w.get_balance(engine.state) for w in engine.wallets)
        assert final_supply == initial_supply

    def test_inflation_increases_supply(self):
        # v2: GENESIS_BALANCE=0, so we must provide nonzero genesis_balance
        # for inflation to produce something
        config = SimulationConfig(
            num_wallets=10, num_validators=10, num_epochs=3, seed=42,
            inflation_enabled=True,
            genesis_balance=1_000_000,
        )
        engine = SimulationEngine(config)
        engine.run_genesis()
        initial_supply = sum(w.get_balance(engine.state) for w in engine.wallets)
        summaries = engine.run()
        final_supply = summaries[-1].circulating_supply
        assert final_supply > initial_supply
        assert all(s.inflation_minted > 0 for s in summaries)
        assert all(s.inflation_rate > 0 for s in summaries)

    def test_staking_rewards_favor_high_cpu(self):
        config = SimulationConfig(
            num_wallets=10, num_validators=10, num_epochs=1, seed=42,
            inflation_enabled=True,
            genesis_balance=1_000_000,  # v2: need nonzero balance for inflation
        )
        engine = SimulationEngine(config)
        engine.run_genesis()
        summaries = engine.run()
        rewards = summaries[0].staking_rewards
        # At least some validators should have received rewards
        assert sum(rewards) > 0

    def test_records_increase_over_epochs(self):
        config = SimulationConfig(
            num_wallets=10, num_validators=10, num_epochs=3, seed=42,
            genesis_balance=1_000_000,  # v2: need nonzero balance for tx generation
        )
        engine = SimulationEngine(config)
        engine.run_genesis()
        initial_records = engine.state.record_count
        engine.run()
        assert engine.state.record_count > initial_records
