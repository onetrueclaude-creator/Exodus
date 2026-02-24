"""Console dashboard for simulation results."""


def print_consensus_summary(epoch_results: list):
    """Print summary table of consensus simulation."""
    print("\n" + "=" * 70)
    print("AGENTIC CHAIN — CONSENSUS SIMULATION RESULTS")
    print("=" * 70)
    print(f"{'Epoch':>6} {'Finalized':>10} {'Failed':>8} {'Avg(s)':>8} {'Med(s)':>8} {'P99(s)':>8} {'Gini':>6}")
    print("-" * 70)
    for r in epoch_results:
        print(f"{r.epoch:>6} {r.blocks_finalized:>10} {r.blocks_failed:>8} "
              f"{r.avg_finality_s:>8.2f} {r.median_finality_s:>8.2f} "
              f"{r.p99_finality_s:>8.2f} {r.reward_gini:>6.3f}")
    print("=" * 70)

    # Aggregate stats
    total_finalized = sum(r.blocks_finalized for r in epoch_results)
    total_slots = sum(r.slots_run for r in epoch_results)
    avg_finality = sum(r.avg_finality_s for r in epoch_results) / len(epoch_results)
    print(f"\nTotal blocks finalized: {total_finalized}/{total_slots} "
          f"({total_finalized/total_slots*100:.1f}%)")
    print(f"Average finality: {avg_finality:.2f}s")
    print(f"Final Gini coefficient: {epoch_results[-1].reward_gini:.3f}")


def print_tokenomics_summary(report):
    """Print sustainability crossover summary."""
    print("\n" + "=" * 70)
    print("AGENTIC CHAIN — TOKENOMICS SUSTAINABILITY ANALYSIS")
    print("=" * 70)
    if report.crossover_month:
        print(f"Sustainability crossover: Month {report.crossover_month} "
              f"(Year {report.crossover_year:.1f})")
    else:
        print("No sustainability crossover found in projection period")
    print(f"Final inflation rate: {report.final_inflation_rate*100:.2f}%")
    print(f"Final monthly fee revenue: {report.final_fee_revenue:,.0f} AGNTC")
    print(f"Final circulating supply: {report.final_circulating:,.0f} AGNTC")
    print("=" * 70)
