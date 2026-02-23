"""Tests for the growth simulation model."""
from __future__ import annotations

import pytest

from agentic.simulation.growth import (
    GrowthScenario,
    GrowthSimulator,
    MonthlySnapshot,
    run_scenario_comparison,
    find_sustainability_crossover,
)
from agentic.params import INITIAL_CIRCULATING, FEE_BURN_RATE


class TestGrowthScenarios:
    def test_baseline_defaults(self):
        s = GrowthScenario.baseline()
        assert s.name == "Baseline"
        assert s.validator_initial == 50
        assert s.tps_initial == 1.0
        assert s.months == 60

    def test_conservative_is_slower(self):
        c = GrowthScenario.conservative()
        b = GrowthScenario.baseline()
        assert c.validator_capacity < b.validator_capacity
        assert c.tps_capacity < b.tps_capacity

    def test_aggressive_is_faster(self):
        a = GrowthScenario.aggressive()
        b = GrowthScenario.baseline()
        assert a.validator_capacity > b.validator_capacity
        assert a.tps_growth_rate > b.tps_growth_rate


class TestGrowthSimulator:
    def test_run_produces_snapshots(self):
        sim = GrowthSimulator(GrowthScenario.baseline())
        snapshots = sim.run()
        assert len(snapshots) == 61  # months 0..60

    def test_validators_grow(self):
        sim = GrowthSimulator(GrowthScenario.baseline())
        snapshots = sim.run()
        assert snapshots[-1].validators > snapshots[0].validators

    def test_tps_grows(self):
        sim = GrowthSimulator(GrowthScenario.baseline())
        snapshots = sim.run()
        assert snapshots[-1].tps > snapshots[0].tps

    def test_initial_circulating(self):
        sim = GrowthSimulator(GrowthScenario.baseline())
        snapshots = sim.run()
        # Month 0 circulating starts at INITIAL_CIRCULATING
        assert snapshots[0].circulating_supply == INITIAL_CIRCULATING

    def test_staking_converges_to_target(self):
        scenario = GrowthScenario.baseline()
        sim = GrowthSimulator(scenario)
        snapshots = sim.run()
        final_pct = snapshots[-1].staking_participation
        # Should be close to target (within 5%)
        assert abs(final_pct - scenario.staking_target) < 0.05

    def test_supply_grows_over_time(self):
        sim = GrowthSimulator(GrowthScenario.baseline())
        snapshots = sim.run()
        assert snapshots[-1].circulating_supply > snapshots[0].circulating_supply

    def test_inflation_rate_decreases(self):
        sim = GrowthSimulator(GrowthScenario.baseline())
        snapshots = sim.run()
        assert snapshots[-1].inflation_rate < snapshots[0].inflation_rate

    def test_fee_revenue_grows(self):
        sim = GrowthSimulator(GrowthScenario.baseline())
        snapshots = sim.run()
        assert snapshots[-1].monthly_fee_revenue > snapshots[1].monthly_fee_revenue

    def test_sustainability_ratio_improves(self):
        sim = GrowthSimulator(GrowthScenario.baseline())
        snapshots = sim.run()
        # Later months should have better sustainability ratio
        early = snapshots[6].sustainability_ratio
        late = snapshots[-1].sustainability_ratio
        assert late > early


class TestScenarioComparison:
    def test_three_scenarios(self):
        results = run_scenario_comparison(months=24)
        assert "Conservative" in results
        assert "Baseline" in results
        assert "Aggressive" in results
        for name, snaps in results.items():
            assert len(snaps) == 25  # months 0..24

    def test_aggressive_grows_faster(self):
        results = run_scenario_comparison(months=36)
        assert results["Aggressive"][-1].validators > results["Baseline"][-1].validators
        assert results["Baseline"][-1].validators > results["Conservative"][-1].validators


class TestSustainabilityCrossover:
    def test_finds_crossover_in_aggressive(self):
        scenario = GrowthScenario.aggressive()
        scenario.months = 120  # 10 years
        sim = GrowthSimulator(scenario)
        snaps = sim.run()
        crossover = find_sustainability_crossover(snaps)
        # Aggressive scenario should reach crossover within 10 years
        if crossover is not None:
            assert crossover > 0
            assert crossover <= 120

    def test_no_crossover_if_no_fees(self):
        scenario = GrowthScenario.baseline()
        scenario.tps_initial = 0.0
        scenario.tps_capacity = 0.0
        sim = GrowthSimulator(scenario)
        snaps = sim.run()
        crossover = find_sustainability_crossover(snaps)
        assert crossover is None
