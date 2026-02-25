#!/usr/bin/env python3
"""Generate capacity and performance charts for the management document.

Usage:
    python3 -m agentic.visualization.capacity_charts

Outputs PNG charts to ../docs/charts/
"""
import hashlib
import os
import sys
import time

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

from agentic.ledger.merkle import SparseMerkleTree
from agentic.params import MERKLE_TREE_DEPTH, GENESIS_SUPPLY, DIST_COMMUNITY
from agentic.testnet.genesis import create_genesis

# TODO(v2): redesign — CommunityPool removed in v2; pool depletion chart is legacy.
_LEGACY_TOTAL_SUPPLY = 21_000_000

CHART_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "docs", "charts"
)


def ensure_dir():
    os.makedirs(CHART_DIR, exist_ok=True)


def chart_merkle_insert_throughput():
    """Chart: Merkle insert time vs leaf count."""
    sizes = [100, 500, 1_000, 5_000, 10_000, 25_000, 50_000]
    times_us = []
    for n in sizes:
        tree = SparseMerkleTree(depth=MERKLE_TREE_DEPTH)
        start = time.perf_counter()
        for i in range(n):
            leaf = hashlib.sha256(i.to_bytes(4, "big")).digest()
            tree.insert(i, leaf)
        elapsed = time.perf_counter() - start
        times_us.append((elapsed / n) * 1e6)

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(sizes, times_us, "o-", color="#00D4FF", linewidth=2, markersize=6)
    ax.set_xlabel("Leaves in Tree", fontsize=12)
    ax.set_ylabel("Insert Time (us/leaf)", fontsize=12)
    ax.set_title("Sparse Merkle Tree Insert Throughput", fontsize=14, fontweight="bold")
    ax.set_xscale("log")
    ax.grid(True, alpha=0.3)
    ax.get_xaxis().set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{int(x):,}"))
    fig.tight_layout()
    fig.savefig(os.path.join(CHART_DIR, "merkle_insert_throughput.png"), dpi=150)
    plt.close(fig)
    print(f"  merkle_insert_throughput.png")


def chart_memory_per_leaf():
    """Chart: Memory footprint vs leaf count."""
    sizes = [100, 500, 1_000, 5_000, 10_000, 50_000]
    bytes_per_leaf = []
    total_bytes = []
    for n in sizes:
        tree = SparseMerkleTree(depth=MERKLE_TREE_DEPTH)
        for i in range(n):
            leaf = hashlib.sha256(i.to_bytes(4, "big")).digest()
            tree.insert(i, leaf)
        node_bytes = sum(
            sys.getsizeof(k) + sys.getsizeof(v)
            for k, v in tree.nodes.items()
        )
        bytes_per_leaf.append(node_bytes / n)
        total_bytes.append(node_bytes)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    ax1.bar([str(s) for s in sizes], bytes_per_leaf, color="#8B5CF6", alpha=0.8)
    ax1.set_xlabel("Leaves", fontsize=12)
    ax1.set_ylabel("Bytes / Leaf", fontsize=12)
    ax1.set_title("Memory Efficiency", fontsize=14, fontweight="bold")
    ax1.tick_params(axis="x", rotation=45)

    ax2.plot(sizes, [b / 1024 / 1024 for b in total_bytes], "s-",
             color="#00D4FF", linewidth=2, markersize=6)
    ax2.set_xlabel("Leaves", fontsize=12)
    ax2.set_ylabel("Total Memory (MB)", fontsize=12)
    ax2.set_title("Total Memory Usage", fontsize=14, fontweight="bold")
    ax2.set_xscale("log")
    ax2.grid(True, alpha=0.3)
    ax2.get_xaxis().set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{int(x):,}"))

    fig.tight_layout()
    fig.savefig(os.path.join(CHART_DIR, "memory_footprint.png"), dpi=150)
    plt.close(fig)
    print(f"  memory_footprint.png")


def chart_genesis_scaling():
    """Chart: Genesis creation time vs scale."""
    configs = [(10, 5), (25, 12), (50, 25), (100, 50), (150, 75), (200, 100)]
    wallets = [c[0] for c in configs]
    times = []
    for w, c in configs:
        start = time.perf_counter()
        create_genesis(num_wallets=w, num_claims=c, seed=42)
        elapsed = time.perf_counter() - start
        times.append(elapsed)

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar([str(w) for w in wallets], [t * 1000 for t in times],
           color="#00D4FF", alpha=0.8)
    ax.set_xlabel("Wallets", fontsize=12)
    ax.set_ylabel("Creation Time (ms)", fontsize=12)
    ax.set_title("Genesis Creation Scaling", fontsize=14, fontweight="bold")
    ax.grid(True, alpha=0.3, axis="y")
    fig.tight_layout()
    fig.savefig(os.path.join(CHART_DIR, "genesis_scaling.png"), dpi=150)
    plt.close(fig)
    print(f"  genesis_scaling.png")


def chart_mining_headroom():
    """Chart: Mining computation time vs block time budget."""
    claim_counts = [5, 10, 25, 50, 75, 100]
    mine_times_ms = []
    for n in claim_counts:
        g = create_genesis(num_wallets=max(n, 10), num_claims=n, seed=42)
        claims_input = g.claim_registry.as_mining_claims()
        start = time.perf_counter()
        for _ in range(50):
            g.mining_engine.compute_block_yields(claims_input)
        elapsed = time.perf_counter() - start
        mine_times_ms.append((elapsed / 50) * 1000)

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar([str(n) for n in claim_counts], mine_times_ms,
           color="#8B5CF6", alpha=0.8, label="Mining time")
    ax.axhline(y=60_000, color="#FF4444", linestyle="--", linewidth=2,
               label="Block time limit (60s)")
    ax.set_xlabel("Active Claims", fontsize=12)
    ax.set_ylabel("Computation Time (ms)", fontsize=12)
    ax.set_title("Mining Computation vs Block Time Budget", fontsize=14, fontweight="bold")
    ax.legend()
    ax.grid(True, alpha=0.3, axis="y")
    fig.tight_layout()
    fig.savefig(os.path.join(CHART_DIR, "mining_headroom.png"), dpi=150)
    plt.close(fig)
    print(f"  mining_headroom.png")


def chart_pool_depletion():
    """Chart: Cumulative mining rewards over blocks.

    # TODO(v2): CommunityPool removed — no depletion chart. Shows cumulative
    # mining rewards instead.
    """
    g = create_genesis(num_wallets=50, num_claims=25, seed=42)
    claims_input = g.claim_registry.as_mining_claims()
    blocks = []
    total_mined = []
    for i in range(500):
        blocks.append(i)
        total_mined.append(g.mining_engine.total_rewards_distributed)
        g.mining_engine.compute_block_yields(claims_input, epoch_tracker=g.epoch_tracker)

    fig, ax = plt.subplots(figsize=(8, 5))

    ax.plot(blocks, [t for t in total_mined], color="#8B5CF6", linewidth=2)
    ax.set_xlabel("Blocks Mined", fontsize=12)
    ax.set_ylabel("Total Mined (AGNTC)", fontsize=12)
    ax.set_title("Cumulative Mining Rewards", fontsize=14, fontweight="bold")
    ax.grid(True, alpha=0.3)

    fig.tight_layout()
    fig.savefig(os.path.join(CHART_DIR, "pool_depletion.png"), dpi=150)
    plt.close(fig)
    print(f"  pool_depletion.png")


def chart_production_projections():
    """Chart: Storage projections at production scale."""
    utilizations = [0.001, 0.01, 0.05, 0.10, 0.25, 0.50, 1.0]
    labels = ["0.1%", "1%", "5%", "10%", "25%", "50%", "100%"]
    total_coords = 42_003_361
    bytes_per_record = 479  # measured average

    storage_gb = [(total_coords * u * bytes_per_record) / (1024**3) for u in utilizations]

    fig, ax = plt.subplots(figsize=(8, 5))
    colors = ["#00D4FF" if s < 10 else "#FFD700" if s < 50 else "#FF4444" for s in storage_gb]
    bars = ax.bar(labels, storage_gb, color=colors, alpha=0.8)
    ax.set_xlabel("Grid Utilization", fontsize=12)
    ax.set_ylabel("Estimated Storage (GB)", fontsize=12)
    ax.set_title("Production Storage Projections (42M coordinates)", fontsize=14, fontweight="bold")
    ax.grid(True, alpha=0.3, axis="y")
    for bar, val in zip(bars, storage_gb):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.2,
                f"{val:.1f}GB", ha="center", fontsize=9)
    fig.tight_layout()
    fig.savefig(os.path.join(CHART_DIR, "production_projections.png"), dpi=150)
    plt.close(fig)
    print(f"  production_projections.png")


def main():
    ensure_dir()
    print("Generating capacity and performance charts...")
    chart_merkle_insert_throughput()
    chart_memory_per_leaf()
    chart_genesis_scaling()
    chart_mining_headroom()
    chart_pool_depletion()
    chart_production_projections()
    print(f"\nAll charts saved to {os.path.abspath(CHART_DIR)}")


if __name__ == "__main__":
    main()
