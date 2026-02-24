"""Run the full Agentic Chain ledger simulation."""
from __future__ import annotations
import argparse
from agentic.simulation.engine import SimulationEngine, SimulationConfig


def print_header(config: SimulationConfig):
    print("=" * 60)
    print("  AGENTIC CHAIN — Ledger Simulation")
    print("=" * 60)
    print(f"  Wallets:      {config.num_wallets}")
    print(f"  Validators:   {config.num_validators}")
    print(f"  Epochs:       {config.num_epochs}")
    print(f"  Genesis AGNTC: {config.genesis_balance} per wallet")
    print(f"  Adversarial:  {config.adversarial_rate:.0%}")
    print(f"  Inflation:    {'ON' if config.inflation_enabled else 'OFF'}")
    print(f"  Seed:         {config.seed}")
    print("=" * 60)
    print()


def print_epoch(summary):
    print(f"--- Epoch {summary.epoch + 1} ---")
    print(f"  Blocks finalized:  {summary.blocks_finalized}")
    print(f"  TXs successful:    {summary.txs_successful}")
    print(f"  Records in tree:   {summary.record_count}")
    print(f"  Nullifiers:        {summary.nullifier_count}")
    print(f"  State root:        {summary.state_root[:8].hex()}...")
    if summary.inflation_minted > 0:
        print(f"  Inflation rate:    {summary.inflation_rate*100:.2f}%")
        print(f"  AGNTC minted:      {summary.inflation_minted:,}")
    balances = summary.wallet_balances
    if balances:
        print(f"  Balance range:     {min(balances)} - {max(balances)} AGNTC")
        print(f"  Circulating:       {summary.circulating_supply:,} AGNTC")
    print()


def print_final_summary(summaries, engine):
    print("=" * 60)
    print("  SIMULATION COMPLETE")
    print("=" * 60)
    print(f"  Epochs run:        {len(summaries)}")
    print(f"  Final records:     {engine.state.record_count}")
    print(f"  Nullifiers:        {engine.state.ns.size}")
    print(f"  Final state root:  {engine.state.get_state_root().hex()[:16]}...")
    print()

    balances = [w.get_balance(engine.state) for w in engine.wallets]
    total = sum(balances)
    genesis_supply = engine.config.genesis_balance * engine.config.num_wallets
    total_minted = sum(s.inflation_minted for s in summaries)

    print(f"  Circulating:       {total:,} AGNTC")
    print(f"  Avg balance:       {total // len(balances):,} AGNTC")
    print(f"  Min balance:       {min(balances):,} AGNTC")
    print(f"  Max balance:       {max(balances):,} AGNTC")

    if total_minted > 0:
        print(f"  Genesis supply:    {genesis_supply:,} AGNTC")
        print(f"  Inflation minted:  {total_minted:,} AGNTC")
        growth = (total - genesis_supply) / genesis_supply * 100
        print(f"  Supply growth:     {growth:.1f}%")
    else:
        if total == genesis_supply:
            print(f"  Supply conserved:  YES ({genesis_supply:,} AGNTC)")
        else:
            print(f"  Supply conserved:  NO (expected {genesis_supply:,}, got {total:,})")

    print()
    n_adversarial = int(engine.config.num_wallets * engine.config.adversarial_rate)
    print(f"  Adversarial users: {n_adversarial}")
    n_zero = sum(1 for b in balances if b == 0)
    print(f"  Zero-balance:      {n_zero} wallets")
    total_txs = sum(s.txs_successful for s in summaries)
    print(f"  Total TXs:         {total_txs}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Agentic Chain Ledger Simulation")
    parser.add_argument("--wallets", type=int, default=50)
    parser.add_argument("--validators", type=int, default=30)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--adversarial", type=float, default=0.10)
    parser.add_argument("--genesis", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    config = SimulationConfig(
        num_wallets=args.wallets,
        num_validators=args.validators,
        num_epochs=args.epochs,
        genesis_balance=args.genesis,
        adversarial_rate=args.adversarial,
        seed=args.seed,
    )

    print_header(config)
    engine = SimulationEngine(config)
    print("Running genesis mints...")
    engine.run_genesis()
    print(f"  Minted {config.genesis_balance * config.num_wallets:,} AGNTC across {config.num_wallets} wallets")
    print()

    summaries = engine.run()
    for s in summaries:
        print_epoch(s)

    print_final_summary(summaries, engine)


if __name__ == "__main__":
    main()
