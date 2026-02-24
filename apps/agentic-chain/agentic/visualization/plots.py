"""Matplotlib visualizations for Agentic Chain tokenomics."""
from __future__ import annotations
import matplotlib.pyplot as plt
import numpy as np


def plot_tokenomics(projections: list[dict], save_path: str | None = None):
    """Generate tokenomics dashboard with 4 subplots."""
    months = [p['month'] for p in projections]
    years = [p['year'] for p in projections]

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('Agentic Chain (AGNTC) — Tokenomics Projection', fontsize=14)

    # 1. Inflation rate
    ax = axes[0, 0]
    ax.plot(years, [p['inflation_rate'] * 100 for p in projections], 'b-', linewidth=2)
    ax.set_title('Inflation Rate')
    ax.set_xlabel('Year')
    ax.set_ylabel('Annual Rate (%)')
    ax.set_ylim(0, 6)
    ax.grid(True, alpha=0.3)

    # 2. Circulating supply
    ax = axes[0, 1]
    ax.plot(years, [p['circulating_supply'] / 1e9 for p in projections], 'g-', linewidth=2)
    ax.set_title('Circulating Supply')
    ax.set_xlabel('Year')
    ax.set_ylabel('Billions AGNTC')
    ax.grid(True, alpha=0.3)

    # 3. Fee revenue vs inflation (crossover chart)
    ax = axes[1, 0]
    ax.plot(years, [p['monthly_inflation'] / 1e6 for p in projections], 'r-', label='Inflation', linewidth=2)
    ax.plot(years, [p['monthly_fee_revenue'] / 1e6 for p in projections], 'b-', label='Fee Revenue', linewidth=2)
    ax.set_title('Sustainability Crossover')
    ax.set_xlabel('Year')
    ax.set_ylabel('Monthly (Millions AGNTC)')
    ax.legend()
    ax.grid(True, alpha=0.3)

    # 4. Staking yield
    ax = axes[1, 1]
    ax.plot(years, [p['staking_yield_annual'] * 100 for p in projections], 'm-', linewidth=2)
    ax.set_title('Staking Yield (Annualized)')
    ax.set_xlabel('Year')
    ax.set_ylabel('APY (%)')
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
        print(f"Saved to {save_path}")
    else:
        plt.show()


def plot_consensus(epoch_results: list, save_path: str | None = None):
    """Generate consensus simulation dashboard."""
    epochs = [r.epoch for r in epoch_results]

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('Agentic Chain — Consensus Simulation', fontsize=14)

    # 1. Finality times
    ax = axes[0, 0]
    ax.plot(epochs, [r.avg_finality_s for r in epoch_results], 'b-', label='Avg', linewidth=2)
    ax.plot(epochs, [r.median_finality_s for r in epoch_results], 'g--', label='Median')
    ax.plot(epochs, [r.p99_finality_s for r in epoch_results], 'r:', label='P99')
    ax.set_title('Finality Time')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Seconds')
    ax.legend()
    ax.grid(True, alpha=0.3)

    # 2. Block finalization rate
    ax = axes[0, 1]
    rates = [r.blocks_finalized / r.slots_run * 100 if r.slots_run > 0 else 0 for r in epoch_results]
    ax.plot(epochs, rates, 'g-', linewidth=2)
    ax.set_title('Block Finalization Rate')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('%')
    ax.set_ylim(0, 105)
    ax.grid(True, alpha=0.3)

    # 3. Reward Gini coefficient
    ax = axes[1, 0]
    ax.plot(epochs, [r.reward_gini for r in epoch_results], 'orange', linewidth=2)
    ax.set_title('Reward Distribution (Gini)')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Gini (0=equal, 1=unequal)')
    ax.set_ylim(0, 1)
    ax.grid(True, alpha=0.3)

    # 4. Failed blocks
    ax = axes[1, 1]
    ax.bar(epochs, [r.blocks_failed for r in epoch_results], color='red', alpha=0.7)
    ax.set_title('Failed Blocks per Epoch')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Count')
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
        print(f"Saved to {save_path}")
    else:
        plt.show()
