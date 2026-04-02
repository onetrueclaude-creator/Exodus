"""Token vesting schedules for AGNTC distribution.

# TODO(v2): redesign for organic growth model — vesting now applies to
# Secure action rewards (50% immediate, 50% linear 30-day vest) rather
# than pre-minted token allocations.
"""
from __future__ import annotations
from dataclasses import dataclass
from agentic.params import (
    GENESIS_SUPPLY,
    DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL,
)

# Legacy constants — kept for backward compatibility only.
_LEGACY_TOTAL_SUPPLY = 21_000_000


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
    """Create vesting schedules matching v2 4-faction distribution.

    # TODO(v2): redesign — v2 has no pre-minted allocations.
    # Supply is GENESIS_SUPPLY (900 AGNTC from 9 genesis nodes).
    # Keeping legacy schedule structure for backward compat with dashboards.

    Distribution: Community 25%, Machines 25%, Founders 25%, Professional 25%.
    """
    return [
        VestingSchedule(
            name="Community Staking Pool",
            total_allocation=int(_LEGACY_TOTAL_SUPPLY * DIST_COMMUNITY),
            cliff_months=12,       # 1 year lock for free CPU stakers
            vesting_months=48,     # 4 years gradual emission after cliff
            genesis_release=0,
        ),
        VestingSchedule(
            name="Machines Faction",
            total_allocation=int(_LEGACY_TOTAL_SUPPLY * DIST_MACHINES),
            cliff_months=0,
            vesting_months=36,     # 3 year agent provisioning
            genesis_release=0,
        ),
        VestingSchedule(
            name="Founder Pool",
            total_allocation=int(_LEGACY_TOTAL_SUPPLY * DIST_FOUNDERS),
            cliff_months=12,
            vesting_months=48,
            genesis_release=0,
        ),
        VestingSchedule(
            name="Professional Users",
            total_allocation=int(_LEGACY_TOTAL_SUPPLY * DIST_PROFESSIONAL),
            cliff_months=6,
            vesting_months=48,
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
        entry["pct_circulating"] = total / _LEGACY_TOTAL_SUPPLY * 100
        results.append(entry)
    return results
