#!/usr/bin/env python3
"""Agentic Chain — Genesis Ledger Simulation.

Boots the chain from block 0 with 21M AGNTC, ghost-node validators,
free-plan CPU stakers earning from the locked Community Pool, and
epoch-by-epoch staking reward distribution.

Usage:
    python3 run_genesis_sim.py [--epochs N] [--validators N] [--free-stakers N] [--seed N]
"""
from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field

import numpy as np

from agentic.params import (
    GENESIS_SUPPLY,
    DIST_COMMUNITY,
    DIST_MACHINES,
    DIST_FOUNDERS,
    DIST_PROFESSIONAL,
    ALPHA,
    BETA,
    SLOTS_PER_EPOCH,
    FEE_BURN_RATE,
    REWARD_SPLIT_ORDERER,
    REWARD_SPLIT_VERIFIER,
    REWARD_SPLIT_STAKER,
)

# TODO(v2): redesign simulation for organic growth model.
# Legacy constants kept for backward-compat simulation.
TOTAL_SUPPLY = 21_000_000

# Aliases for v2 faction names
DIST_TREASURY = DIST_PROFESSIONAL
DIST_TEAM = DIST_FOUNDERS
DIST_AGENTS = DIST_MACHINES
from agentic.ledger.state import LedgerState
from agentic.ledger.wallet import Wallet
from agentic.consensus.validator import Validator
from agentic.consensus.simulator import ConsensusSimulator
from agentic.consensus.vrf import select_verifiers
from agentic.economics.staking import StakeRegistry
from agentic.economics.epoch import EpochManager

# ═══════════════════════════════════════════════════════════════════
#  Configuration
# ═══════════════════════════════════════════════════════════════════

DISTRIBUTION = {
    "Community Pool (LOCKED)":    DIST_COMMUNITY,   # 40% — locked for free CPU stakers
    "Foundation Reserve":         DIST_TREASURY,     # 30%
    "Team & Advisors":            DIST_TEAM,         # 20%
    "AI Verification Agents":     DIST_AGENTS,       # 10%
}

# Community pool is locked — not circulating, not stakeable
# Only free-plan CPU stakers earn from it after 1 year (12 epochs)
LOCKED_POOLS = {"Community Pool (LOCKED)"}

# Free CPU staking: contribute CPU compute without staking tokens.
# After COMMUNITY_VESTING_EPOCHS of continuous CPU staking, stakers
# become eligible for Community Pool rewards distributed proportional
# to their CPU contribution.
COMMUNITY_VESTING_EPOCHS = 12  # 1 year


@dataclass
class FreeCPUStaker:
    """A free-plan CPU staker — contributes compute, no token stake required."""
    id: int
    name: str
    cpu_vpu: float          # CPU power contributed
    start_epoch: int = 0    # when they started staking
    total_rewards: float = 0.0
    eligible: bool = False  # becomes True after 12 epochs

    def check_eligibility(self, current_epoch: int) -> bool:
        """Check if staker has vested (1 year of continuous CPU staking)."""
        self.eligible = (current_epoch - self.start_epoch) >= COMMUNITY_VESTING_EPOCHS
        return self.eligible


def fmt(n: int | float) -> str:
    """Format a number with commas."""
    if isinstance(n, float):
        return f"{n:,.2f}"
    return f"{n:,}"


def pct(n: float) -> str:
    """Format as percentage."""
    return f"{n * 100:.2f}%"


def short_hex(b: bytes) -> str:
    """Short hex representation of bytes."""
    return f"0x{b[:4].hex()}...{b[-2:].hex()}"


def bar(fraction: float, width: int = 30) -> str:
    """Simple text progress bar."""
    filled = int(fraction * width)
    return "█" * filled + "░" * (width - filled)


# ═══════════════════════════════════════════════════════════════════
#  Genesis
# ═══════════════════════════════════════════════════════════════════

def run_genesis(state: LedgerState, seed: int) -> dict[str, Wallet]:
    """Mint 21M AGNTC across distribution wallets. Returns name→Wallet map."""
    wallets: dict[str, Wallet] = {}
    print()
    print("▸ GENESIS BLOCK ────────────────────────────────────────")
    print()

    total_minted = 0
    for i, (name, share) in enumerate(DISTRIBUTION.items()):
        amount = int(TOTAL_SUPPLY * share)
        w = Wallet(name=name, seed=seed + 1000 + i)
        result = w.receive_mint(state, amount=amount, slot=0)
        wallets[name] = w
        locked = " [LOCKED]" if name in LOCKED_POOLS else ""
        print(f"  {name:<28} {fmt(amount):>14} AGNTC ({pct(share)}){locked}")
        total_minted += amount

    # Handle rounding remainder — give to community pool
    remainder = TOTAL_SUPPLY - total_minted
    if remainder > 0:
        w = wallets["Community Pool (LOCKED)"]
        w.receive_mint(state, amount=remainder, slot=0)
        total_minted += remainder

    print()
    print(f"  Total Minted:              {fmt(total_minted):>14} AGNTC")

    circulating = sum(
        w.get_balance(state) for name, w in wallets.items()
        if name not in LOCKED_POOLS
    )
    locked_total = sum(
        w.get_balance(state) for name, w in wallets.items()
        if name in LOCKED_POOLS
    )
    print(f"  Circulating at Genesis:    {fmt(circulating):>14} AGNTC")
    print(f"  Locked (Community Pool):   {fmt(locked_total):>14} AGNTC")
    print(f"  Merkle Root:               {short_hex(state.get_state_root())}")
    print(f"  Records: {state.record_count} | Nullifiers: {state.ns.size}")
    print()
    return wallets


# ═══════════════════════════════════════════════════════════════════
#  Validator Registration
# ═══════════════════════════════════════════════════════════════════

def register_validators(
    n: int,
    wallets: dict[str, Wallet],
    state: LedgerState,
    stake_registry: StakeRegistry,
    seed: int,
) -> list[Validator]:
    """Create ghost-node validators with power-law stakes + CPU.

    Validators draw their token stake from the non-locked distribution
    wallets (Team, Foundation, Ecosystem, Public, Private).
    """
    rng = np.random.default_rng(seed)

    # Power-law distributed CPU (VPU) — few whales, many small nodes
    cpu_raw = rng.pareto(a=2.0, size=n) + 1
    cpu_raw = cpu_raw / cpu_raw.max()
    cpu_vpus = cpu_raw * 190 + 10  # range: 10–200 VPU

    # Determine how much each validator stakes from the circulating pool
    # Validators collectively stake ~40% of circulating supply
    circulating = sum(
        w.get_balance(state) for name, w in wallets.items()
        if name not in LOCKED_POOLS
    )
    total_stake_target = int(circulating * 0.40)

    # Power-law distributed token stakes
    stake_raw = rng.pareto(a=1.5, size=n) + 1
    stake_raw = stake_raw / stake_raw.sum()
    token_stakes = (stake_raw * total_stake_target).astype(int)
    # Fix rounding
    token_stakes[-1] = total_stake_target - token_stakes[:-1].sum()

    validators = []
    print("▸ VALIDATOR REGISTRATION ───────────────────────────────")
    print()
    print(f"  {'ID':<5} {'Token Stake':>16} {'CPU (VPU)':>11} {'Eff. Stake':>12}")
    print(f"  {'─' * 5} {'─' * 16} {'─' * 11} {'─' * 12}")

    total_token = float(token_stakes.sum())
    total_cpu = float(cpu_vpus.sum())

    for i in range(n):
        v = Validator(
            id=i,
            token_stake=float(token_stakes[i]),
            cpu_vpu=float(cpu_vpus[i]),
            online=True,
        )
        validators.append(v)

        # Register stake in the stake registry (epoch 0)
        stake_registry.register_stake(
            staker=f"validator_{i}".encode(),
            validator_id=i,
            amount=int(token_stakes[i]),
            epoch=0,
        )

    # Print top 10 + summary
    # Sort by effective stake descending for display
    sorted_validators = sorted(
        validators,
        key=lambda v: v.effective_stake(total_token, total_cpu),
        reverse=True,
    )

    for v in sorted_validators[:10]:
        es = v.effective_stake(total_token, total_cpu)
        print(
            f"  V{v.id:02d}  {fmt(int(v.token_stake)):>14} AGNTC"
            f"  {v.cpu_vpu:>7.1f} VPU"
            f"  {pct(es):>10}"
        )

    if n > 10:
        print(f"  ... and {n - 10} more validators")

    print()
    print(f"  Total Staked:    {fmt(int(total_token)):>14} AGNTC ({pct(total_token / circulating)} of circulating)")
    print(f"  Total CPU:       {fmt(total_cpu):>14} VPU")
    print(f"  Avg Stake:       {fmt(int(total_token / n)):>14} AGNTC/validator")
    print(f"  Avg CPU:         {total_cpu / n:>14.1f} VPU/validator")
    print()

    return validators


# ═══════════════════════════════════════════════════════════════════
#  Free CPU Staker Registration
# ═══════════════════════════════════════════════════════════════════

def register_free_cpu_stakers(n: int, seed: int) -> list[FreeCPUStaker]:
    """Create ghost free-plan CPU stakers (no token stake, CPU-only).

    These stakers contribute compute to the network. After 12 epochs
    (1 year) of continuous staking, they become eligible for Community
    Pool rewards distributed proportional to their CPU contribution.
    """
    rng = np.random.default_rng(seed + 5000)

    # CPU follows a more uniform distribution for free stakers
    # (consumer hardware: 5–80 VPU range, lower than validators)
    cpu_raw = rng.pareto(a=3.0, size=n) + 1
    cpu_raw = cpu_raw / cpu_raw.max()
    cpu_vpus = cpu_raw * 75 + 5  # range: 5–80 VPU

    stakers = []
    print("▸ FREE CPU STAKER REGISTRATION ─────────────────────────")
    print()
    print(f"  {n} free-plan CPU stakers joining the network")
    print(f"  These stakers contribute compute power without staking tokens.")
    print(f"  After {COMMUNITY_VESTING_EPOCHS} epochs (1 year), they earn from the Community Pool.")
    print()
    print(f"  {'ID':<6} {'CPU (VPU)':>11} {'Status':>12}")
    print(f"  {'─' * 6} {'─' * 11} {'─' * 12}")

    for i in range(n):
        s = FreeCPUStaker(
            id=i,
            name=f"FreeStaker_{i:03d}",
            cpu_vpu=float(cpu_vpus[i]),
            start_epoch=0,
        )
        stakers.append(s)

    # Print top 10
    sorted_stakers = sorted(stakers, key=lambda s: s.cpu_vpu, reverse=True)
    for s in sorted_stakers[:10]:
        print(f"  F{s.id:03d}  {s.cpu_vpu:>7.1f} VPU   {'vesting':>10}")
    if n > 10:
        print(f"  ... and {n - 10} more free stakers")

    total_cpu = sum(s.cpu_vpu for s in stakers)
    print()
    print(f"  Total Free CPU:  {fmt(total_cpu):>14} VPU")
    print(f"  Avg CPU:         {total_cpu / n:>14.1f} VPU/staker")
    print(f"  Community Pool:  {fmt(int(TOTAL_SUPPLY * DIST_COMMUNITY)):>14} AGNTC (locked until epoch {COMMUNITY_VESTING_EPOCHS})")
    print()

    return stakers


def distribute_community_pool(
    epoch: int,
    free_stakers: list[FreeCPUStaker],
    community_wallet: Wallet,
    state: LedgerState,
) -> tuple[int, int]:
    """Distribute Community Pool rewards to eligible free CPU stakers.

    Each epoch after year 1, a portion of the community pool is released
    proportional to each eligible staker's CPU contribution.

    The pool distributes over 48 months (epochs 12–60), releasing
    1/48th of the remaining pool each epoch.

    Returns (amount_distributed, eligible_count).
    """
    # Check eligibility
    eligible = [s for s in free_stakers if s.check_eligibility(epoch)]
    if not eligible:
        return 0, 0

    pool_balance = community_wallet.get_balance(state)
    if pool_balance <= 0:
        return 0, len(eligible)

    # Release 1/48th of remaining pool per epoch (4-year distribution)
    DISTRIBUTION_EPOCHS = 48
    epoch_release = pool_balance // DISTRIBUTION_EPOCHS
    if epoch_release <= 0:
        return 0, len(eligible)

    # Distribute proportional to CPU contribution
    total_cpu = sum(s.cpu_vpu for s in eligible)
    if total_cpu <= 0:
        return 0, len(eligible)

    total_distributed = 0
    for s in eligible:
        share = s.cpu_vpu / total_cpu
        reward = int(epoch_release * share)
        if reward > 0:
            s.total_rewards += reward
            total_distributed += reward

    return total_distributed, len(eligible)


# ═══════════════════════════════════════════════════════════════════
#  Epoch Simulation
# ═══════════════════════════════════════════════════════════════════

def simulate_user_transactions(
    wallets: dict[str, Wallet],
    state: LedgerState,
    epoch: int,
    rng: np.random.Generator,
) -> tuple[int, int, int]:
    """Simulate user transactions for one epoch.

    Returns (attempted, successful, fees_collected).
    """
    # Only non-locked wallets transact
    active_wallets = [
        (name, w) for name, w in wallets.items()
        if name not in LOCKED_POOLS
    ]

    attempted = 0
    successful = 0
    fees_collected = 0
    base_slot = (epoch + 1) * SLOTS_PER_EPOCH

    # Each wallet has a chance to send a transaction
    for name, sender in active_wallets:
        if rng.random() < 0.3:  # 30% chance per wallet per epoch
            # Pick a random recipient (different from sender)
            candidates = [(n, w) for n, w in active_wallets if n != name]
            if not candidates:
                continue

            recipient_name, recipient = candidates[rng.integers(0, len(candidates))]
            balance = sender.get_balance(state)

            if balance < 10:  # need at least 10 to cover amount + fee
                continue

            # Transfer 1-10% of balance
            amount = max(1, int(balance * rng.uniform(0.01, 0.10)))
            fee = max(1, int(amount * 0.001))  # 0.1% fee

            slot = base_slot + int(rng.integers(0, SLOTS_PER_EPOCH))
            result = sender.transfer(state, recipient, amount, slot)
            attempted += 1

            if result.valid:
                successful += 1
                fees_collected += fee

    return attempted, successful, fees_collected


def run_epoch(
    epoch: int,
    wallets: dict[str, Wallet],
    validators: list[Validator],
    free_stakers: list[FreeCPUStaker],
    state: LedgerState,
    stake_registry: StakeRegistry,
    epoch_manager: EpochManager,
    consensus_sim: ConsensusSimulator,
    rng: np.random.Generator,
) -> dict:
    """Run one full epoch and print the report."""

    # 1. Advance staking lifecycle
    released = stake_registry.advance_epoch(epoch)

    # 2. Run consensus
    consensus_result = consensus_sim.run_epoch()

    # 3. Simulate user transactions
    tx_attempted, tx_successful, fees = simulate_user_transactions(
        wallets, state, epoch, rng,
    )

    # 4. Calculate circulating supply (exclude locked pools)
    circulating = sum(
        w.get_balance(state) for name, w in wallets.items()
        if name not in LOCKED_POOLS
    )
    total_staked = stake_registry.get_total_staked()

    # 5. Pick epoch orderer (highest effective stake validator)
    online = [v for v in validators if v.online]
    total_token = sum(v.token_stake for v in online)
    total_cpu = sum(v.cpu_vpu for v in online)
    orderer = max(online, key=lambda v: v.effective_stake(total_token, total_cpu))

    # 6. Process epoch economics
    acct = epoch_manager.process_epoch(
        circulating_supply=circulating,
        fee_revenue=fees,
        validators=validators,
        orderer_id=orderer.id,
        total_staked=total_staked,
    )

    # 7. Mint inflation rewards to validator wallets (credit to their staked positions)
    for v in online:
        reward = acct.validator_rewards.get(v.id, 0)
        v.total_rewards += reward

    # 8. Distribute Community Pool to eligible free CPU stakers
    community_wallet = wallets.get("Community Pool (LOCKED)")
    community_distributed = 0
    community_eligible = 0
    if community_wallet and free_stakers:
        community_distributed, community_eligible = distribute_community_pool(
            epoch, free_stakers, community_wallet, state,
        )

    # ── Print epoch report ──────────────────────────────────
    year_label = f"Y{int(acct.year) + 1}" if acct.year < 1 else f"Y{int(acct.year) + 1}"
    print(f"▸ EPOCH {epoch:<3} ({year_label}, Month {epoch + 1}) ──────────────────────────────")

    # Consensus line
    print(f"  Consensus:  {consensus_result.blocks_finalized} blocks finalized"
          f"  | avg finality {consensus_result.avg_finality_s:.1f}s"
          f"  | Gini {consensus_result.reward_gini:.3f}")

    # Transactions
    print(f"  Txns:       {tx_attempted} attempted, {tx_successful} successful")

    # Economics
    print(f"  Inflation:  {pct(acct.inflation_rate)} annual → {fmt(acct.inflation_minted)} AGNTC minted this epoch")
    print(f"  Fees:       {fmt(acct.fee_revenue)} collected → {fmt(acct.fees_burned)} burned, {fmt(acct.fee_revenue - acct.fees_burned)} to pool")
    print(f"  Rewards:    Orderer {fmt(acct.orderer_total)}"
          f" | Verifiers {fmt(acct.verifier_total)}"
          f" | Stakers {fmt(acct.staker_total)}")

    # Supply
    print(f"  Supply:     {fmt(acct.circulating_start)} → {fmt(acct.circulating_end)}"
          f" ({'+' if acct.circulating_end >= acct.circulating_start else ''}"
          f"{fmt(acct.circulating_end - acct.circulating_start)})")

    # Staking
    participation = total_staked / circulating if circulating > 0 else 0
    apy = epoch_manager.get_annualized_yield(epoch, circulating, total_staked)
    print(f"  Staking:    {fmt(total_staked)} staked ({pct(participation)})"
          f"  | est. APY {pct(apy)}")

    # Community Pool / Free CPU stakers
    if free_stakers:
        vesting_remaining = max(0, COMMUNITY_VESTING_EPOCHS - epoch)
        pool_balance = community_wallet.get_balance(state) if community_wallet else 0
        if community_eligible > 0:
            print(f"  Community:  {fmt(community_distributed)} AGNTC distributed to {community_eligible} eligible free stakers"
                  f"  | pool remaining: {fmt(pool_balance)}")
        else:
            print(f"  Community:  LOCKED — {vesting_remaining} epochs until free CPU stakers vest"
                  f"  | pool: {fmt(pool_balance)} AGNTC")

    # Top 3 earners this epoch
    top_earners = sorted(
        [(v.id, acct.validator_rewards.get(v.id, 0)) for v in validators],
        key=lambda x: x[1],
        reverse=True,
    )[:3]
    top_str = "  |  ".join(
        f"V{vid:02d}: {fmt(r)} AGNTC" for vid, r in top_earners
    )
    print(f"  Top 3:      {top_str}")

    # Merkle state
    print(f"  State:      records={state.record_count}  nullifiers={state.ns.size}"
          f"  root={short_hex(state.get_state_root())}")
    print()

    return {
        "epoch": epoch,
        "circulating_start": acct.circulating_start,
        "circulating_end": acct.circulating_end,
        "inflation_minted": acct.inflation_minted,
        "fees_burned": acct.fees_burned,
        "total_distributed": acct.total_distributed,
        "total_staked": total_staked,
        "participation": participation,
        "apy": apy,
        "tx_attempted": tx_attempted,
        "tx_successful": tx_successful,
        "community_distributed": community_distributed,
        "community_eligible": community_eligible,
    }


# ═══════════════════════════════════════════════════════════════════
#  Final Report
# ═══════════════════════════════════════════════════════════════════

def print_final_report(
    epoch_data: list[dict],
    validators: list[Validator],
    free_stakers: list[FreeCPUStaker],
    epoch_manager: EpochManager,
    state: LedgerState,
    community_wallet: Wallet | None,
):
    """Print the comprehensive final summary."""
    stats = epoch_manager.get_cumulative_stats()
    total_epochs = len(epoch_data)

    print("═" * 60)
    print("  FINAL REPORT")
    print("═" * 60)
    print()

    # Supply
    print("  ┌─ SUPPLY ─────────────────────────────────────────┐")
    print(f"  │ Genesis Supply:        {fmt(TOTAL_SUPPLY):>16} AGNTC │")
    print(f"  │ Total Minted:          {fmt(stats['cumulative_minted']):>16} AGNTC │")
    print(f"  │ Total Burned:          {fmt(stats['cumulative_burned']):>16} AGNTC │")
    print(f"  │ Net Issuance:          {fmt(stats['net_issuance']):>16} AGNTC │")
    final_supply = TOTAL_SUPPLY + stats['net_issuance']
    print(f"  │ Final Total Supply:    {fmt(final_supply):>16} AGNTC │")
    print(f"  │ Final Circulating:     {fmt(epoch_data[-1]['circulating_end']):>16} AGNTC │")
    print(f"  │ Supply Growth:         {pct((final_supply - TOTAL_SUPPLY) / TOTAL_SUPPLY):>16}       │")
    print(f"  └─────────────────────────────────────────────────┘")
    print()

    # Staking trend
    print("  ┌─ STAKING TREND ──────────────────────────────────┐")
    print(f"  │ {'Epoch':>5} │ {'Participation':>13} │ {'Est. APY':>10} │ {'Bar':>14} │")
    print(f"  │ {'─' * 5} │ {'─' * 13} │ {'─' * 10} │ {'─' * 14} │")
    # Show every 3rd epoch
    for d in epoch_data[::max(1, total_epochs // 8)]:
        print(f"  │ {d['epoch']:>5} │ {pct(d['participation']):>13} │ {pct(d['apy']):>10} │ {bar(d['participation'], 14)} │")
    print(f"  └─────────────────────────────────────────────────┘")
    print()

    # Top validators by total rewards
    sorted_v = sorted(validators, key=lambda v: v.total_rewards, reverse=True)
    print("  ┌─ TOP 10 VALIDATORS (by total rewards) ──────────┐")
    print(f"  │ {'ID':>4} │ {'Rewards':>16} │ {'Stake':>14} │ {'CPU':>8} │")
    print(f"  │ {'─' * 4} │ {'─' * 16} │ {'─' * 14} │ {'─' * 8} │")
    for v in sorted_v[:10]:
        print(f"  │ V{v.id:02d} │ {fmt(int(v.total_rewards)):>14} Σ │ {fmt(int(v.token_stake)):>12} Σ │ {v.cpu_vpu:>6.1f}  │")
    print(f"  └─────────────────────────────────────────────────┘")
    print()

    # Transaction stats
    total_tx = sum(d['tx_attempted'] for d in epoch_data)
    total_success = sum(d['tx_successful'] for d in epoch_data)
    print("  ┌─ TRANSACTIONS ───────────────────────────────────┐")
    print(f"  │ Total Attempted:       {fmt(total_tx):>16}       │")
    print(f"  │ Total Successful:      {fmt(total_success):>16}       │")
    success_rate = total_success / total_tx if total_tx > 0 else 0
    print(f"  │ Success Rate:          {pct(success_rate):>16}       │")
    print(f"  │ Total Fees Collected:  {fmt(stats['cumulative_fees']):>16} AGNTC │")
    print(f"  │ Total Fees Burned:     {fmt(stats['cumulative_burned']):>16} AGNTC │")
    print(f"  └─────────────────────────────────────────────────┘")
    print()

    # Community Pool / Free CPU Stakers
    if free_stakers:
        total_community_distributed = sum(d.get('community_distributed', 0) for d in epoch_data)
        pool_remaining = community_wallet.get_balance(state) if community_wallet else 0
        eligible_stakers = [s for s in free_stakers if s.eligible]
        top_free = sorted(free_stakers, key=lambda s: s.total_rewards, reverse=True)

        initial_pool = int(TOTAL_SUPPLY * DIST_COMMUNITY)
        effective_remaining = initial_pool - total_community_distributed

        print("  ┌─ COMMUNITY POOL (Free CPU Staking) ──────────────┐")
        print(f"  │ Initial Pool:          {fmt(initial_pool):>16} AGNTC │")
        print(f"  │ Total Distributed:     {fmt(total_community_distributed):>16} AGNTC │")
        print(f"  │ Pool Remaining:        {fmt(effective_remaining):>16} AGNTC │")
        print(f"  │ Eligible Stakers:      {len(eligible_stakers):>16} / {len(free_stakers):<4}│")
        print(f"  │ Vesting Period:        {COMMUNITY_VESTING_EPOCHS:>12} epochs       │")
        print(f"  │                                                   │")
        if top_free and top_free[0].total_rewards > 0:
            print(f"  │ Top Free CPU Stakers:                              │")
            print(f"  │ {'ID':>5} │ {'Rewards':>16} │ {'CPU':>8} │              │")
            print(f"  │ {'─' * 5} │ {'─' * 16} │ {'─' * 8} │              │")
            for s in top_free[:5]:
                if s.total_rewards > 0:
                    print(f"  │ F{s.id:03d} │ {fmt(int(s.total_rewards)):>14} Σ │ {s.cpu_vpu:>6.1f}  │              │")
        print(f"  └─────────────────────────────────────────────────┘")
        print()

    # Ledger state
    print("  ┌─ LEDGER STATE ───────────────────────────────────┐")
    print(f"  │ Records in Merkle Tree: {state.record_count:>15}       │")
    print(f"  │ Nullifiers Published:   {state.ns.size:>15}       │")
    print(f"  │ Final State Root:       {short_hex(state.get_state_root()):>15}       │")
    print(f"  │ Epochs Processed:       {total_epochs:>15}       │")
    print(f"  └─────────────────────────────────────────────────┘")
    print()


# ═══════════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Agentic Chain — Genesis Simulation")
    parser.add_argument("--epochs", type=int, default=24, help="Number of epochs to simulate (default: 24 = 2 years)")
    parser.add_argument("--validators", type=int, default=30, help="Number of ghost-node validators (default: 30)")
    parser.add_argument("--free-stakers", type=int, default=100, help="Number of free-plan CPU stakers (default: 100)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    n_free = getattr(args, 'free_stakers', 100)

    print()
    print("═" * 60)
    print("  AGENTIC CHAIN — GENESIS SIMULATION")
    print(f"  Supply: {fmt(TOTAL_SUPPLY)} AGNTC | Validators: {args.validators}")
    print(f"  Free CPU Stakers: {n_free} | Epochs: {args.epochs} ({args.epochs / 12:.1f} years)")
    print(f"  Seed: {args.seed}")
    print("═" * 60)

    # ── Initialize state ──
    state = LedgerState()
    stake_registry = StakeRegistry()
    epoch_manager = EpochManager(epochs_per_year=12)
    consensus_sim = None  # initialized after validators

    # ── Genesis ──
    wallets = run_genesis(state, seed=args.seed)

    # ── Validator registration ──
    validators = register_validators(
        n=args.validators,
        wallets=wallets,
        state=state,
        stake_registry=stake_registry,
        seed=args.seed,
    )

    # ── Free CPU staker registration ──
    free_stakers = register_free_cpu_stakers(n=n_free, seed=args.seed)

    # Advance staking to activate (warmup → active for epoch 1)
    stake_registry.advance_epoch(1)

    # Initialize consensus simulator
    consensus_sim = ConsensusSimulator(validators=validators, seed=args.seed)

    # ── Epoch loop ──
    print("▸ EPOCH SIMULATION ─────────────────────────────────────")
    print()

    epoch_data = []
    for epoch in range(args.epochs):
        data = run_epoch(
            epoch=epoch,
            wallets=wallets,
            validators=validators,
            free_stakers=free_stakers,
            state=state,
            stake_registry=stake_registry,
            epoch_manager=epoch_manager,
            consensus_sim=consensus_sim,
            rng=rng,
        )
        epoch_data.append(data)

    # ── Final report ──
    community_wallet = wallets.get("Community Pool (LOCKED)")
    print_final_report(
        epoch_data, validators, free_stakers,
        epoch_manager, state, community_wallet,
    )

    print("  Simulation complete.")
    print()


if __name__ == "__main__":
    main()
