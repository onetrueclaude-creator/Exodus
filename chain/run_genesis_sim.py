#!/usr/bin/env python3
"""Agentic Chain — Genesis Simulation (Tokenomics v2, Organic Growth Model).

Boots from genesis (9 nodes, 0 AGNTC) and mines blocks to show
how supply grows through CPU-staked verifier actions alone.

Usage:
    python3 run_genesis_sim.py [--blocks N] [--seed N]
"""
from __future__ import annotations

import argparse

from agentic.params import (
    GENESIS_ORIGIN,
    GENESIS_FACTION_MASTERS,
    GENESIS_HOMENODES,
    DIST_COMMUNITY,
    DIST_MACHINES,
    DIST_FOUNDERS,
    DIST_PROFESSIONAL,
    HARDNESS_MULTIPLIER,
    BASE_MINING_RATE_PER_BLOCK,
    FEE_BURN_RATE,
    SECURE_REWARD_IMMEDIATE,
    SECURE_REWARD_VEST_DAYS,
    BLOCK_TIME_MS,
    VERIFICATION_THRESHOLD,
    VERIFIERS_PER_BLOCK,
)
from agentic.testnet.genesis import create_genesis
from agentic.lattice.coordinate import GLOBAL_BOUNDS, resource_density

# ── Faction assignments ──────────────────────────────────────────────────────

FACTION_MAP: dict[tuple[int, int], str] = {
    GENESIS_ORIGIN: "System",
    GENESIS_FACTION_MASTERS[0]: "Community",    # N
    GENESIS_FACTION_MASTERS[1]: "Machines",     # E
    GENESIS_FACTION_MASTERS[2]: "Founders",     # S
    GENESIS_FACTION_MASTERS[3]: "Professional", # W
}
for coord in GENESIS_HOMENODES:
    FACTION_MAP[coord] = "Unclaimed"

FACTION_COLORS = {
    "System":       "\033[37m",
    "Community":    "\033[93m",
    "Machines":     "\033[33m",
    "Founders":     "\033[91m",
    "Professional": "\033[96m",
    "Unclaimed":    "\033[90m",
}
RESET = "\033[0m"
BOLD  = "\033[1m"
GREEN = "\033[92m"
DIM   = "\033[2m"


def col(text: str, faction: str) -> str:
    return FACTION_COLORS.get(faction, "") + str(text) + RESET


def header(title: str) -> None:
    print()
    print("─" * 72)
    print(f"  {BOLD}{title}{RESET}")
    print("─" * 72)


# ── Simulation ───────────────────────────────────────────────────────────────

def run(blocks: int = 60, seed: int = 42) -> None:
    gs = create_genesis(seed=seed)
    claims = gs.claim_registry.all_active_claims()
    engine = gs.mining_engine
    epoch_tracker = gs.epoch_tracker

    print(f"\n{BOLD}⛓  AGENTIC CHAIN  —  Genesis Simulation  (Tokenomics v2){RESET}")
    print(f"{DIM}   Organic growth model: minting IS inflation — no pre-allocated pools{RESET}")

    # ── Genesis topology ──────────────────────────────────────────────────────
    header("GENESIS TOPOLOGY — Block 0")
    print(f"  {'Node':16s} {'Coords':12s} {'Stake':>6}  {'Density':>7}  Faction")
    print(f"  {'─'*16} {'─'*12} {'─'*6}  {'─'*7}  {'─'*12}")

    sorted_claims = sorted(claims, key=lambda c: (-c.stake_amount, c.coordinate.x))
    for c in sorted_claims:
        coord = (c.coordinate.x, c.coordinate.y)
        faction = FACTION_MAP.get(coord, "?")
        density = resource_density(c.coordinate.x, c.coordinate.y)
        if c.stake_amount == 500:
            node_type = "Origin"
        elif c.stake_amount == 400:
            node_type = "Faction Master"
        else:
            node_type = "Unclaimed"
        print(f"  {col(node_type, faction):26s} ({c.coordinate.x:+3d},{c.coordinate.y:+3d})"
              f"   {c.stake_amount:5d}   {density:6.3f}   {col(faction, faction)}")

    print(f"\n  Total nodes:  {BOLD}{len(claims)}{RESET}")
    print(f"  Grid bounds:  [{GLOBAL_BOUNDS.min_val}, {GLOBAL_BOUNDS.max_val}]")
    hardness0 = epoch_tracker.hardness(epoch_tracker.current_ring)
    print(f"  Epoch ring:   {epoch_tracker.current_ring}  →  "
          f"hardness = {HARDNESS_MULTIPLIER} × {epoch_tracker.current_ring} = {BOLD}{hardness0:.0f}{RESET}")
    print(f"  Block time:   {BLOCK_TIME_MS // 1000}s  |  "
          f"Consensus: {VERIFICATION_THRESHOLD}/{VERIFIERS_PER_BLOCK} verifiers")
    print(f"  Reward split: {SECURE_REWARD_IMMEDIATE:.0%} immediate + "
          f"{1-SECURE_REWARD_IMMEDIATE:.0%} vest ({SECURE_REWARD_VEST_DAYS}d)")
    print(f"  Fee burn:     {FEE_BURN_RATE:.0%} of all on-chain utility fees")

    # Build claim dicts for engine
    claim_dicts = [
        {
            "owner": gs.wallets[i].public_key,
            "coordinate": c.coordinate,
            "stake": c.stake_amount,
        }
        for i, c in enumerate(sorted_claims)
    ]
    owner_to_faction = {
        gs.wallets[i].public_key: FACTION_MAP.get((c.coordinate.x, c.coordinate.y), "Unclaimed")
        for i, c in enumerate(sorted_claims)
    }

    # ── Block mining loop ─────────────────────────────────────────────────────
    mins = blocks * BLOCK_TIME_MS // 1000 // 60
    header(f"BLOCK MINING — {blocks} blocks (~{mins} minutes)")

    cumulative_supply = 0.0
    faction_supply: dict[str, float] = {}
    current_ring = epoch_tracker.current_ring
    ring_expanded_at: list[int] = []
    block_yield = 0.0

    print(f"\n  {'Block':>6}  {'Yield':>9}  {'Supply':>10}  {'Ring':>5}  "
          f"{'Hardness':>8}  {'To next ring':>13}")
    print(f"  {'─'*6}  {'─'*9}  {'─'*10}  {'─'*5}  {'─'*8}  {'─'*13}")

    for blk in range(1, blocks + 1):
        yields = engine.compute_block_yields(claim_dicts, epoch_tracker=epoch_tracker)
        block_yield = sum(yields.values())
        cumulative_supply += block_yield

        for owner, reward in yields.items():
            faction = owner_to_faction.get(owner, "Unclaimed")
            faction_supply[faction] = faction_supply.get(faction, 0.0) + reward

        new_ring = epoch_tracker.current_ring
        if new_ring != current_ring:
            ring_expanded_at.append(blk)
            current_ring = new_ring

        hardness = epoch_tracker.hardness(current_ring)
        next_thr = epoch_tracker.next_epoch_threshold()
        to_next = max(0.0, next_thr - epoch_tracker.total_mined)

        if blk % 5 == 0 or blk in ring_expanded_at or blk == 1:
            ring_str = (f"{GREEN}▲ ring {current_ring}{RESET}"
                        if blk in ring_expanded_at else f"{current_ring:5d}")
            print(f"  {blk:>6}  {block_yield:>9.5f}  {cumulative_supply:>10.4f}"
                  f"  {ring_str}  {hardness:>8.0f}  {to_next:>13.4f}")

    # ── Summary ───────────────────────────────────────────────────────────────
    header("SUPPLY SUMMARY")
    print(f"\n  Total mined:     {BOLD}{cumulative_supply:.4f} AGNTC{RESET}  ({blocks} blocks)")
    print(f"  Final ring:      {epoch_tracker.current_ring}")
    print(f"  Final hardness:  {epoch_tracker.hardness(epoch_tracker.current_ring):.0f}")
    print(f"  Grid bounds:     [{GLOBAL_BOUNDS.min_val}, {GLOBAL_BOUNDS.max_val}]")

    if ring_expanded_at:
        print(f"\n  Ring expansions at blocks: {ring_expanded_at}")
    else:
        thr = epoch_tracker.next_epoch_threshold()
        needed = thr - epoch_tracker.total_mined
        blks_needed = int(needed / block_yield) if block_yield > 0 else "∞"
        print(f"\n  Ring 2 unlocks at {thr:.4f} AGNTC mined — need {needed:.4f} more "
              f"(~{blks_needed} more blocks)")

    header("FACTION DISTRIBUTION")
    target_shares = {
        "Community": DIST_COMMUNITY,
        "Machines":  DIST_MACHINES,
        "Founders":  DIST_FOUNDERS,
        "Professional": DIST_PROFESSIONAL,
    }
    print(f"\n  {'Faction':14s} {'Mined':>10}  {'Actual':>7}  {'Target':>7}")
    print(f"  {'─'*14} {'─'*10}  {'─'*7}  {'─'*7}")
    for faction, target in target_shares.items():
        mined = faction_supply.get(faction, 0.0)
        actual = mined / cumulative_supply if cumulative_supply > 0 else 0.0
        print(f"  {col(faction, faction):24s} {mined:>10.4f}   {actual:>6.1%}   {target:>6.1%}")
    mixed = faction_supply.get("Unclaimed", 0.0)
    if mixed > 0:
        print(f"  {col('Unclaimed (homenodes)', 'Unclaimed'):24s} {mixed:>10.4f}   "
              f"{mixed/cumulative_supply:>6.1%}   {'N/A':>6s}")
    print(f"\n  {DIM}Unclaimed nodes (diagonal homenodes) — available for players to claim.{RESET}")

    header("PROJECTION")
    avg_yield = cumulative_supply / blocks
    bph = 3600 * 1000 // BLOCK_TIME_MS
    print(f"\n  Avg yield/block:  {avg_yield:.6f} AGNTC")
    print(f"  Blocks/hour:      {bph}")
    print(f"  Supply/hour:      ~{avg_yield * bph:.4f} AGNTC")
    print(f"  Supply/day:       ~{avg_yield * bph * 24:.2f} AGNTC")
    print()


def main() -> None:
    parser = argparse.ArgumentParser(description="Agentic Chain genesis simulation (v2)")
    parser.add_argument("--blocks", type=int, default=60,
                        help="Blocks to simulate (default: 60 ≈ 1 hour)")
    parser.add_argument("--seed",   type=int, default=42,
                        help="RNG seed (default: 42)")
    args = parser.parse_args()
    run(blocks=args.blocks, seed=args.seed)


if __name__ == "__main__":
    main()
