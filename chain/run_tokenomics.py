#!/usr/bin/env python3
"""Run Agentic Chain tokenomics projection."""
import sys
sys.path.insert(0, '.')

from agentic.economics.sustainability import find_crossover
from agentic.visualization.dashboard import print_tokenomics_summary
from agentic.visualization.plots import plot_tokenomics


def main():
    print("Running 15-year tokenomics projection...")
    print("Assumptions:")
    print("  - Starting monthly fee revenue: 500,000 AGNTC")
    print("  - Fee revenue growth: 3% monthly (~43% annually)")
    print("  - Staking participation: 65%")
    print()

    report = find_crossover(
        monthly_fee_start=500_000,
        fee_growth_rate=0.03,
        years=15,
        staking_participation=0.65,
    )

    print_tokenomics_summary(report)
    plot_tokenomics(report.projections, save_path="tokenomics_results.png")


if __name__ == "__main__":
    main()
