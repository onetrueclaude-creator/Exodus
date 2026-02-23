"""Token vesting schedules for AGNTC distribution."""
from __future__ import annotations
from dataclasses import dataclass
from agentic.params import (
    TOTAL_SUPPLY, INITIAL_CIRCULATING,
    DIST_COMMUNITY, DIST_TEAM, DIST_TREASURY,
    DIST_AGENTS,
)


@dataclass
class VestingSchedule:
    """A vesting schedule for a token allocation."""
    name: str
    total_allocation: int
    cliff_months: int        # months before any tokens vest
    vesting_months: int      # total vesting period after cliff
    genesis_release: int = 0  # tokens released at genesis

    def vested_at_month(self, month: int) -> int:
        """Total tokens vested at a given month."""
        if month < self.cliff_months:
            return self.genesis_release

        months_vesting = month - self.cliff_months
        if self.vesting_months == 0:
            return self.total_allocation

        linear_vested = int(
            (self.total_allocation - self.genesis_release)
            * min(months_vesting / self.vesting_months, 1.0)
        )
        return self.genesis_release + linear_vested

    def unvested_at_month(self, month: int) -> int:
        return self.total_allocation - self.vested_at_month(month)


def create_default_schedules() -> list[VestingSchedule]:
    """Create vesting schedules matching 4-category distribution.

    Distribution: Community 40%, Foundation 30%, Team 20%, Agents 10%.
    Community Pool is locked — emitted to free CPU stakers over 5 years.
    """
    return [
        VestingSchedule(
            name="Community Staking Pool",
            total_allocation=int(TOTAL_SUPPLY * DIST_COMMUNITY),
            cliff_months=12,       # 1 year lock for free CPU stakers
            vesting_months=48,     # 4 years gradual emission after cliff
            genesis_release=0,
        ),
        VestingSchedule(
            name="Foundation Reserve",
            total_allocation=int(TOTAL_SUPPLY * DIST_TREASURY),
            cliff_months=6,
            vesting_months=48,
            genesis_release=0,
        ),
        VestingSchedule(
            name="Team & Advisors",
            total_allocation=int(TOTAL_SUPPLY * DIST_TEAM),
            cliff_months=12,
            vesting_months=48,
            genesis_release=0,
        ),
        VestingSchedule(
            name="AI Verification Agents",
            total_allocation=int(TOTAL_SUPPLY * DIST_AGENTS),
            cliff_months=0,
            vesting_months=36,     # 3 year agent provisioning
            genesis_release=0,
        ),
    ]


def total_circulating_at_month(
    month: int, schedules: list[VestingSchedule] | None = None
) -> int:
    """Total circulating supply at a given month from vesting alone (excluding inflation)."""
    if schedules is None:
        schedules = create_default_schedules()
    return sum(s.vested_at_month(month) for s in schedules)


def project_vesting(
    months: int = 60, schedules: list[VestingSchedule] | None = None
) -> list[dict]:
    """Project month-by-month vesting unlocks."""
    if schedules is None:
        schedules = create_default_schedules()
    results = []
    for month in range(months + 1):
        entry = {"month": month}
        total = 0
        for s in schedules:
            vested = s.vested_at_month(month)
            entry[s.name] = vested
            total += vested
        entry["total_circulating"] = total
        entry["pct_circulating"] = total / TOTAL_SUPPLY * 100
        results.append(entry)
    return results
