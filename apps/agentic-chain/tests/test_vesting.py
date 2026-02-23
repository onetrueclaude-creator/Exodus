"""Tests for token vesting schedules."""
import pytest
from agentic.economics.vesting import (
    VestingSchedule, create_default_schedules,
    total_circulating_at_month, project_vesting,
)
from agentic.params import TOTAL_SUPPLY, INITIAL_CIRCULATING, DIST_AGENTS


class TestVestingSchedule:
    def test_cliff_blocks_vesting(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=100_000,
            cliff_months=12, vesting_months=48,
        )
        assert schedule.vested_at_month(0) == 0
        assert schedule.vested_at_month(6) == 0
        assert schedule.vested_at_month(11) == 0

    def test_vesting_starts_after_cliff(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=100_000,
            cliff_months=12, vesting_months=48,
        )
        # At cliff month, 0 months of vesting have passed -> 0 vested beyond genesis
        assert schedule.vested_at_month(12) == 0
        # At cliff + 1, 1/48 of allocation vests
        assert schedule.vested_at_month(13) == int(100_000 * (1 / 48))

    def test_linear_vesting_midpoint(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=100_000,
            cliff_months=0, vesting_months=100,
        )
        # At month 50, should be 50% vested
        assert schedule.vested_at_month(50) == 50_000

    def test_full_vest_at_end(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=100_000,
            cliff_months=12, vesting_months=48,
        )
        # At cliff + vesting_months, should be fully vested
        assert schedule.vested_at_month(12 + 48) == 100_000

    def test_past_full_vest_stays_at_total(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=100_000,
            cliff_months=12, vesting_months=48,
        )
        assert schedule.vested_at_month(200) == 100_000

    def test_genesis_release(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=100_000,
            cliff_months=6, vesting_months=12,
            genesis_release=10_000,
        )
        # Before cliff, only genesis release
        assert schedule.vested_at_month(0) == 10_000
        assert schedule.vested_at_month(3) == 10_000

    def test_genesis_release_plus_linear(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=100_000,
            cliff_months=0, vesting_months=10,
            genesis_release=10_000,
        )
        # At month 5: genesis + 50% of (100k - 10k) = 10k + 45k = 55k
        assert schedule.vested_at_month(5) == 10_000 + int(90_000 * 0.5)

    def test_unvested_at_month(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=100_000,
            cliff_months=0, vesting_months=100,
        )
        assert schedule.unvested_at_month(0) == 100_000
        assert schedule.unvested_at_month(50) == 50_000
        assert schedule.unvested_at_month(100) == 0

    def test_zero_vesting_months_full_at_cliff(self):
        schedule = VestingSchedule(
            name="Test", total_allocation=50_000,
            cliff_months=6, vesting_months=0,
        )
        assert schedule.vested_at_month(5) == 0
        assert schedule.vested_at_month(6) == 50_000


class TestAgentsSchedule:
    def test_agents_allocation(self):
        schedules = create_default_schedules()
        agents = [s for s in schedules if s.name == "AI Verification Agents"][0]
        # Agents = 10% of 21M = 2.1M
        assert agents.total_allocation == int(TOTAL_SUPPLY * DIST_AGENTS)

    def test_agents_vested_at_month_zero(self):
        schedules = create_default_schedules()
        agents = [s for s in schedules if s.name == "AI Verification Agents"][0]
        # No cliff, 0 genesis release → 0 at month 0
        assert agents.vested_at_month(0) == 0


class TestTotalCirculatingAtMonth:
    def test_month_zero_is_zero(self):
        """At month 0, no tokens have vested (all have cliffs or vesting periods)."""
        circulating = total_circulating_at_month(0)
        # Only AI Agents has cliff=0, but 0 genesis release → starts vesting immediately
        assert circulating == 0

    def test_circulating_increases_over_time(self):
        c0 = total_circulating_at_month(0)
        c12 = total_circulating_at_month(12)
        c36 = total_circulating_at_month(36)
        assert c0 < c12 < c36

    def test_all_schedules_fully_vest(self):
        """After sufficient time, all tokens should be vested."""
        schedules = create_default_schedules()
        # Maximum vest end: 12 cliff + 60 vesting = 72 for community pool
        # But team is 12 + 48 = 60, community is 0 + 60 = 60
        # All end by month 72 at most
        circulating = total_circulating_at_month(200)
        assert circulating == TOTAL_SUPPLY


class TestDefaultSchedules:
    def test_four_schedules_created(self):
        schedules = create_default_schedules()
        assert len(schedules) == 4

    def test_total_allocation_matches_supply(self):
        schedules = create_default_schedules()
        total = sum(s.total_allocation for s in schedules)
        assert total == TOTAL_SUPPLY

    def test_schedule_names(self):
        schedules = create_default_schedules()
        names = {s.name for s in schedules}
        expected = {
            "Community Staking Pool", "Team & Advisors",
            "Foundation Reserve", "AI Verification Agents",
        }
        assert names == expected


class TestProjectVesting:
    def test_projection_length(self):
        results = project_vesting(months=60)
        assert len(results) == 61  # months 0..60

    def test_projection_fields(self):
        results = project_vesting(months=1)
        entry = results[0]
        assert "month" in entry
        assert "total_circulating" in entry
        assert "pct_circulating" in entry

    def test_month_zero_projection_matches(self):
        results = project_vesting(months=1)
        assert results[0]["total_circulating"] == 0

    def test_pct_circulating_grows(self):
        results = project_vesting(months=60)
        # At month 0, only ~10% circulating; by month 60, most vested
        assert results[-1]["pct_circulating"] > results[0]["pct_circulating"]
        assert results[0]["pct_circulating"] < 15  # ~10% at genesis
