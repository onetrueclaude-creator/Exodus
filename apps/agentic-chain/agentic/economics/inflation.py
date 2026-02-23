"""Inflation and supply model for AGNTC token."""
from __future__ import annotations
from agentic.params import (
    TOTAL_SUPPLY, INITIAL_CIRCULATING,
    INITIAL_INFLATION_RATE, DISINFLATION_RATE,
    INFLATION_FLOOR, FEE_BURN_RATE,
)


class InflationModel:
    """Models AGNTC token inflation, supply, and burn dynamics."""

    def __init__(
        self,
        total_supply: float = TOTAL_SUPPLY,
        initial_circulating: float = INITIAL_CIRCULATING,
        monthly_fee_revenue: float = 0.0,
        fee_growth_rate: float = 0.0,  # monthly growth of fee revenue
        staking_participation: float = 0.65,
    ):
        self.total_supply = total_supply
        self.initial_circulating = initial_circulating
        self.monthly_fee_revenue = monthly_fee_revenue
        self.fee_growth_rate = fee_growth_rate
        self.staking_participation = staking_participation

    def rate_at_year(self, year: float) -> float:
        """Get inflation rate at a given year."""
        rate = INITIAL_INFLATION_RATE * ((1 - DISINFLATION_RATE) ** year)
        return max(rate, INFLATION_FLOOR)

    def project(self, years: int = 10) -> list[dict]:
        """Project month-by-month tokenomics over N years."""
        months = years * 12
        results = []
        circulating = self.initial_circulating
        total_burned = 0.0
        total_inflation_issued = 0.0
        fee_revenue = self.monthly_fee_revenue

        for month in range(months + 1):
            year = month / 12.0
            annual_rate = self.rate_at_year(year)
            monthly_rate = annual_rate / 12.0

            # Inflation issuance
            inflation_amount = circulating * monthly_rate
            total_inflation_issued += inflation_amount

            # Fee burn
            burn_amount = fee_revenue * FEE_BURN_RATE
            total_burned += burn_amount

            # Update supply
            circulating += inflation_amount - burn_amount

            # Staking yield (annualized)
            staked = circulating * self.staking_participation
            if staked > 0:
                staking_yield = (inflation_amount * 12) / staked
            else:
                staking_yield = 0.0

            results.append({
                'month': month,
                'year': year,
                'inflation_rate': annual_rate,
                'circulating_supply': circulating,
                'total_burned': total_burned,
                'total_inflation_issued': total_inflation_issued,
                'monthly_inflation': inflation_amount,
                'monthly_burn': burn_amount,
                'monthly_fee_revenue': fee_revenue,
                'net_monthly_issuance': inflation_amount - burn_amount,
                'staking_yield_annual': staking_yield,
            })

            # Grow fee revenue
            fee_revenue *= (1 + self.fee_growth_rate)

        return results
