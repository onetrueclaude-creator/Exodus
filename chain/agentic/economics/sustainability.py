"""Sustainability crossover analysis for AGNTC tokenomics."""
from __future__ import annotations
from dataclasses import dataclass
from agentic.economics.inflation import InflationModel


@dataclass
class SustainabilityReport:
    """Results of sustainability crossover analysis."""
    crossover_month: int | None  # Month when fees > inflation rewards
    crossover_year: float | None
    projections: list[dict]
    final_inflation_rate: float
    final_fee_revenue: float
    final_circulating: float


def find_crossover(
    monthly_fee_start: float,
    fee_growth_rate: float,
    years: int = 15,
    staking_participation: float = 0.65,
) -> SustainabilityReport:
    """Find the month when fee revenue exceeds inflation rewards."""
    model = InflationModel(
        monthly_fee_revenue=monthly_fee_start,
        fee_growth_rate=fee_growth_rate,
        staking_participation=staking_participation,
    )
    projections = model.project(years=years)

    crossover_month = None
    for entry in projections:
        if entry['monthly_fee_revenue'] > entry['monthly_inflation'] and entry['month'] > 0:
            crossover_month = entry['month']
            break

    last = projections[-1]
    return SustainabilityReport(
        crossover_month=crossover_month,
        crossover_year=crossover_month / 12.0 if crossover_month else None,
        projections=projections,
        final_inflation_rate=last['inflation_rate'],
        final_fee_revenue=last['monthly_fee_revenue'],
        final_circulating=last['circulating_supply'],
    )
