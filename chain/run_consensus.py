#!/usr/bin/env python3
"""Run Agentic Chain consensus simulation."""
import sys
sys.path.insert(0, '.')

from agentic.consensus.validator import create_validator_set
from agentic.consensus.simulator import ConsensusSimulator
from agentic.visualization.dashboard import print_consensus_summary
from agentic.visualization.plots import plot_consensus


def main():
    print("Creating validator set (100 validators, power-law distribution)...")
    validators = create_validator_set(n=100, seed=42)

    print(f"Total token stake: {sum(v.token_stake for v in validators):,.0f}")
    print(f"Total CPU (VPU): {sum(v.cpu_vpu for v in validators):,.0f}")
    print(f"Running 20 epochs ({20 * 100} slots)...\n")

    sim = ConsensusSimulator(validators=validators, seed=42)
    results = sim.run(n_epochs=20)

    print_consensus_summary(results)
    plot_consensus(results, save_path="consensus_results.png")


if __name__ == "__main__":
    main()
