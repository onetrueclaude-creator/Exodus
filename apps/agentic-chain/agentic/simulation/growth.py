"""Network growth simulation for Agentic Chain.

Models the growth trajectory of:
  - Validator count (network participation)
  - Transaction volume (adoption)
  - Fee revenue (economic sustainability)
  - Token price pressure (supply/demand)
  - Staking participation (security budget)

Uses S-curve (logistic) growth models calibrated to real blockchain
launch data (Solana, Aleo, Mina for reference).

All monetary values are in AGNTC (float). This is a projection model,
not a ledger — float precision is appropriate and avoids the need for
sub-unit arithmetic.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from agentic.params import (
    TOTAL_SUPPLY,
    INITIAL_CIRCULATING,
    INITIAL_INFLATION_RATE,
    DISINFLATION_RATE,
    INFLATION_FLOOR,
    FEE_BURN_RATE,
)


@dataclass
class GrowthScenario:
    """Parameters for a growth simulation scenario."""

    name: str

    # Validator growth (S-curve)
    validator_initial: int = 50
    validator_capacity: int = 10_000       # carrying capacity
    validator_growth_rate: float = 0.15     # monthly growth rate at midpoint

    # Transaction volume (S-curve)
    tps_initial: float = 1.0               # transactions per second at launch
    tps_capacity: float = 1_000.0          # max TPS at network maturity
    tps_growth_rate: float = 0.12          # monthly growth rate

    # Fee per transaction (in AGNTC — fractional)
    avg_fee_initial: float = 0.0005        # 0.0005 AGNTC per tx (~like Solana fees)
    fee_growth_rate: float = 0.005         # monthly fee growth (adoption pressure)

    # Staking participation
    staking_initial: float = 0.30          # 30% at launch
    staking_target: float = 0.65           # 65% equilibrium
    staking_convergence: float = 0.05      # monthly convergence rate to target

    # Duration
    months: int = 60                       # 5 years

    @classmethod
    def conservative(cls) -> GrowthScenario:
        """Conservative growth: slow adoption, moderate validator growth."""
        return cls(
            name="Conservative",
            validator_capacity=5_000,
            validator_growth_rate=0.10,
            tps_capacity=500,
            tps_growth_rate=0.08,
            staking_target=0.55,
        )

    @classmethod
    def baseline(cls) -> GrowthScenario:
        """Baseline growth: expected trajectory."""
        return cls(name="Baseline")

    @classmethod
    def aggressive(cls) -> GrowthScenario:
        """Aggressive growth: fast adoption, high validator participation."""
        return cls(
            name="Aggressive",
            validator_capacity=20_000,
            validator_growth_rate=0.20,
            tps_capacity=2_000,
            tps_growth_rate=0.18,
            staking_target=0.75,
            fee_growth_rate=0.01,
        )


@dataclass
class MonthlySnapshot:
    """State of the network at a given month."""

    month: int
    year: float

    # Network
    validators: int = 0
    tps: float = 0.0
    daily_transactions: int = 0

    # Economics (all in AGNTC, float)
    monthly_fee_revenue: float = 0.0
    monthly_fees_burned: float = 0.0
    monthly_inflation_minted: float = 0.0
    monthly_vesting_unlocked: float = 0.0
    net_issuance: float = 0.0

    # Supply
    circulating_supply: float = 0.0
    total_staked: float = 0.0
    staking_participation: float = 0.0

    # Derived
    inflation_rate: float = 0.0
    annualized_staking_yield: float = 0.0
    fee_burn_rate_effective: float = 0.0
    sustainability_ratio: float = 0.0  # fee_revenue / inflation_cost


class GrowthSimulator:
    """Simulates network growth over time."""

    def __init__(self, scenario: GrowthScenario | None = None):
        self.scenario = scenario or GrowthScenario.baseline()

    @staticmethod
    def _logistic(t: float, initial: float, capacity: float, rate: float) -> float:
        """Logistic (S-curve) growth function."""
        if capacity <= initial:
            return capacity
        try:
            k = math.log((capacity / initial) - 1)
        except (ValueError, ZeroDivisionError):
            return capacity
        return capacity / (1 + math.exp(k - rate * t))

    def _inflation_rate_at_year(self, year: float) -> float:
        rate = INITIAL_INFLATION_RATE * ((1 - DISINFLATION_RATE) ** year)
        return max(rate, INFLATION_FLOOR)

    @staticmethod
    def _compute_vesting_schedule(months: int) -> list[float]:
        """Pre-compute cumulative vesting unlocks per month."""
        from agentic.params import (
            DIST_COMMUNITY, DIST_TEAM, DIST_TREASURY, DIST_AGENTS,
        )

        schedules = [
            # (share, cliff_months, vest_months, genesis_release)
            (DIST_COMMUNITY, 12, 48, 0),   # 40% — locked 1yr, 4yr vest
            (DIST_TREASURY, 6, 48, 0),     # 30%
            (DIST_TEAM, 12, 48, 0),        # 20%
            (DIST_AGENTS, 0, 36, 0),       # 10%
        ]

        result = []
        for month in range(months + 1):
            total = 0.0
            for share, cliff, vest, genesis in schedules:
                allocation = TOTAL_SUPPLY * share
                if month < cliff:
                    total += genesis
                elif vest == 0:
                    total += allocation
                else:
                    vested_months = month - cliff
                    linear = (allocation - genesis) * min(vested_months / vest, 1.0)
                    total += genesis + linear
            result.append(total)
        return result

    def run(self) -> list[MonthlySnapshot]:
        """Run the growth simulation.

        Circulating supply = vesting unlocks + inflation - fee burn.
        """
        s = self.scenario
        snapshots: list[MonthlySnapshot] = []

        vesting_schedule = self._compute_vesting_schedule(s.months)
        circulating = float(INITIAL_CIRCULATING)
        cumulative_inflation = 0.0
        cumulative_burned = 0.0

        for month in range(s.months + 1):
            year = month / 12.0
            snap = MonthlySnapshot(month=month, year=year)

            # Vesting unlocks
            if month > 0:
                vesting_unlock = vesting_schedule[month] - vesting_schedule[month - 1]
                circulating += max(0.0, vesting_unlock)
                snap.monthly_vesting_unlocked = max(0.0, vesting_unlock)

            # Month 0 is genesis
            if month == 0:
                snap.validators = s.validator_initial
                snap.inflation_rate = self._inflation_rate_at_year(0)
                snap.staking_participation = s.staking_initial
                snap.circulating_supply = circulating
                snap.total_staked = circulating * s.staking_initial
                snapshots.append(snap)
                continue

            # --- Validator growth ---
            snap.validators = int(
                self._logistic(month, s.validator_initial, s.validator_capacity, s.validator_growth_rate)
            )

            # --- TPS growth ---
            snap.tps = self._logistic(month, s.tps_initial, s.tps_capacity, s.tps_growth_rate)
            snap.daily_transactions = int(snap.tps * 86_400)

            # --- Fee revenue ---
            avg_fee = s.avg_fee_initial * ((1 + s.fee_growth_rate) ** month)
            snap.monthly_fee_revenue = snap.daily_transactions * 30 * avg_fee
            snap.monthly_fees_burned = snap.monthly_fee_revenue * FEE_BURN_RATE
            # Can't burn more than circulating
            snap.monthly_fees_burned = min(snap.monthly_fees_burned, max(circulating, 0.0))

            # --- Inflation ---
            snap.inflation_rate = self._inflation_rate_at_year(year)
            epoch_rate = snap.inflation_rate / 12.0
            snap.monthly_inflation_minted = circulating * epoch_rate

            # --- Net issuance ---
            snap.net_issuance = snap.monthly_inflation_minted - snap.monthly_fees_burned
            cumulative_inflation += snap.monthly_inflation_minted
            cumulative_burned += snap.monthly_fees_burned

            # --- Staking ---
            prev_pct = snapshots[-1].staking_participation
            staking_pct = prev_pct + s.staking_convergence * (s.staking_target - prev_pct)
            snap.staking_participation = staking_pct

            # --- Supply ---
            circulating += snap.net_issuance
            snap.circulating_supply = max(circulating, 0.0)
            snap.total_staked = snap.circulating_supply * snap.staking_participation

            # --- Derived ---
            if snap.total_staked > 0:
                snap.annualized_staking_yield = (
                    snap.circulating_supply * snap.inflation_rate / snap.total_staked
                )

            if snap.monthly_inflation_minted > 0:
                snap.sustainability_ratio = snap.monthly_fee_revenue / snap.monthly_inflation_minted
            else:
                snap.sustainability_ratio = float("inf") if snap.monthly_fee_revenue > 0 else 0.0

            snap.fee_burn_rate_effective = FEE_BURN_RATE
            snapshots.append(snap)

        return snapshots


def run_scenario_comparison(
    months: int = 60,
) -> dict[str, list[MonthlySnapshot]]:
    """Run conservative, baseline, and aggressive scenarios side-by-side."""
    results = {}
    for scenario_fn in [GrowthScenario.conservative, GrowthScenario.baseline, GrowthScenario.aggressive]:
        scenario = scenario_fn()
        scenario.months = months
        sim = GrowthSimulator(scenario)
        results[scenario.name] = sim.run()
    return results


def find_sustainability_crossover(snapshots: list[MonthlySnapshot]) -> int | None:
    """Find the month when fee revenue first exceeds inflation cost (ratio >= 1.0)."""
    for snap in snapshots:
        if snap.month > 0 and snap.sustainability_ratio >= 1.0:
            return snap.month
    return None
