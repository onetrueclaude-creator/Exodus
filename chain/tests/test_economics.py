"""Tests for tokenomics models — v2 organic growth model."""
import pytest
from agentic.economics.inflation import InflationModel
from agentic.economics.sustainability import find_crossover, SustainabilityReport

# Legacy inflation constants — removed from params.py in v2.
# The InflationModel itself uses internal _LEGACY_* constants.
_LEGACY_INITIAL_RATE = 0.10
_LEGACY_FLOOR = 0.01


class TestInflationModel:
    def test_year_zero_rate(self):
        model = InflationModel()
        assert abs(model.rate_at_year(0) - _LEGACY_INITIAL_RATE) < 1e-6

    def test_disinflation(self):
        model = InflationModel()
        year1 = model.rate_at_year(1)
        assert year1 < _LEGACY_INITIAL_RATE  # lower than starting
        assert year1 > _LEGACY_FLOOR  # above floor

    def test_floor(self):
        model = InflationModel()
        rate = model.rate_at_year(50)
        assert abs(rate - _LEGACY_FLOOR) < 1e-6  # should hit floor

    def test_ten_year_projection(self):
        model = InflationModel()
        projection = model.project(years=10)
        assert len(projection) == 121  # 10 years * 12 months + month 0
        assert abs(projection[0]['inflation_rate'] - _LEGACY_INITIAL_RATE) < 1e-6
        # Check supply grows
        assert projection[-1]['circulating_supply'] > projection[0]['circulating_supply']

    def test_supply_with_burn(self):
        model = InflationModel(monthly_fee_revenue=1_000_000)
        projection = model.project(years=5)
        # With fee burn, supply should grow slower
        model_no_burn = InflationModel(monthly_fee_revenue=0)
        proj_no_burn = model_no_burn.project(years=5)
        assert projection[-1]['circulating_supply'] < proj_no_burn[-1]['circulating_supply']


class TestSustainability:
    def test_crossover_with_growing_fees(self):
        report = find_crossover(
            monthly_fee_start=100_000,
            fee_growth_rate=0.03,  # 3% monthly growth
            years=15,
        )
        assert report.crossover_month is not None
        assert report.crossover_month > 0

    def test_no_crossover_without_fees(self):
        report = find_crossover(
            monthly_fee_start=0,
            fee_growth_rate=0,
            years=15,
        )
        assert report.crossover_month is None

    def test_report_has_projections(self):
        report = find_crossover(
            monthly_fee_start=500_000,
            fee_growth_rate=0.02,
            years=10,
        )
        assert len(report.projections) > 0
        assert 'monthly_fee_revenue' in report.projections[0]
