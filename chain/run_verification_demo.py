#!/usr/bin/env python3
"""PoAIV Verification Pipeline Demo.

Demonstrates the full block lifecycle:
1. Genesis: create validators + verification agents
2. Normal epochs: blocks flow through BFT ordering -> PoAIV verification -> finalization
3. Adversarial epoch: bad proposer submits invalid block -> dispute resolution
4. Network stress: 25% validators go offline -> safe mode
5. Final report: verification stats

Usage:
    python run_verification_demo.py [--epochs N] [--validators N] [--seed N]
"""
from __future__ import annotations

import argparse
import hashlib
import math
import sys

import numpy as np

from agentic.consensus.block import Block, BlockStatus
from agentic.consensus.validator import create_validator_set
from agentic.params import (
    VERIFIERS_PER_BLOCK, VERIFICATION_THRESHOLD, SLOTS_PER_EPOCH,
)
from agentic.verification.agent import VerificationAgent, AgentState
from agentic.verification.dispute import DisputeOutcome
from agentic.verification.pipeline import VerificationPipeline


def print_header(text: str, char: str = "=") -> None:
    width = 70
    print(f"\n{char * width}")
    print(f"  {text}")
    print(f"{char * width}")


def print_subheader(text: str) -> None:
    print(f"\n--- {text} ---")


def setup_network(n_validators: int, seed: int):
    """Create validators and their corresponding verification agents."""
    validators = create_validator_set(n_validators, seed=seed)
    agents = []
    for v in validators:
        agent = VerificationAgent(
            agent_id=f"agent_{v.id}",
            validator_id=v.id,
            vpu_capacity=v.cpu_vpu,
            registered_epoch=0,
        )
        agent.begin_warmup()
        agents.append(agent)
    return validators, agents


def warmup_agents(agents: list[VerificationAgent], epoch: int) -> None:
    """Advance all agents through the warmup period."""
    for agent in agents:
        agent.advance_epoch(epoch)


def run_epoch_blocks(
    pipeline: VerificationPipeline,
    validators,
    agents: list[VerificationAgent],
    epoch: int,
    blocks_per_epoch: int,
    state_root: bytes,
) -> list:
    """Run verification pipeline for all blocks in an epoch."""
    results = []
    rng = np.random.default_rng(epoch * 1000)
    for slot_offset in range(blocks_per_epoch):
        slot = epoch * blocks_per_epoch + slot_offset
        leader_idx = rng.choice(len(validators))
        block = Block(slot=slot, leader_id=validators[leader_idx].id,
                      status=BlockStatus.ORDERED)

        result = pipeline.verify_block(
            block=block, agents=agents, validators=validators,
            state_root=state_root,
        )
        results.append(result)

        if result.outcome == DisputeOutcome.FINALIZED:
            state_root = hashlib.sha256(
                state_root + f"block:{slot}".encode(),
            ).digest()

    return results


def print_epoch_summary(epoch: int, results: list) -> None:
    """Print a one-line summary of epoch outcomes."""
    finalized = sum(1 for r in results if r.outcome == DisputeOutcome.FINALIZED)
    rejected = sum(1 for r in results if r.outcome == DisputeOutcome.REJECTED)
    disputed = sum(1 for r in results if r.outcome == DisputeOutcome.DISPUTED)
    insufficient = sum(1 for r in results if r.outcome == DisputeOutcome.INSUFFICIENT)
    avg_time = np.mean([r.total_time_s for r in results]) if results else 0

    print(f"  Epoch {epoch:>3}: "
          f"Finalized={finalized:>3}  "
          f"Rejected={rejected:>2}  "
          f"Disputed={disputed:>2}  "
          f"Insufficient={insufficient:>2}  "
          f"Avg verify={avg_time:.1f}s")


def main():
    parser = argparse.ArgumentParser(description="PoAIV Verification Pipeline Demo")
    parser.add_argument("--epochs", type=int, default=6, help="Number of epochs")
    parser.add_argument("--validators", type=int, default=30, help="Number of validators")
    parser.add_argument("--blocks-per-epoch", type=int, default=10, help="Blocks per epoch")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    print_header("AGENTIC CHAIN -- PoAIV VERIFICATION PIPELINE DEMO")

    # Phase 1: Genesis
    print_subheader("Phase 1: Network Setup")
    validators, agents = setup_network(args.validators, args.seed)
    print(f"  Validators: {len(validators)}")
    print(f"  Agents:     {len(agents)}")
    print(f"  Verifiers per block: {VERIFIERS_PER_BLOCK}")
    print(f"  Verification threshold: {VERIFICATION_THRESHOLD}")
    total_token = sum(v.token_stake for v in validators)
    total_cpu = sum(v.cpu_vpu for v in validators)
    print(f"  Total token stake: {total_token:,.0f} AGNTC")
    print(f"  Total CPU: {total_cpu:,.0f} VPU")

    # Phase 2: Warmup
    print_subheader("Phase 2: Agent Warmup (1 epoch)")
    warmup_agents(agents, epoch=1)
    active = sum(1 for a in agents if a.can_verify())
    print(f"  Active agents after warmup: {active}/{len(agents)}")

    state_root = hashlib.sha256(b"genesis").digest()
    all_results = []

    # Phase 3: Normal epochs
    print_subheader("Phase 3: Normal Operation")
    pipeline = VerificationPipeline(seed=args.seed, adversarial_rate=0.0)
    for epoch in range(1, args.epochs - 1):
        results = run_epoch_blocks(
            pipeline, validators, agents, epoch,
            args.blocks_per_epoch, state_root,
        )
        print_epoch_summary(epoch, results)
        all_results.extend(results)

    # Phase 4: Adversarial epoch
    print_subheader("Phase 4: Adversarial Epoch (20% adversarial agents)")
    adversarial_pipeline = VerificationPipeline(seed=args.seed + 100, adversarial_rate=0.20)
    adv_epoch = args.epochs - 1
    results = run_epoch_blocks(
        adversarial_pipeline, validators, agents, adv_epoch,
        args.blocks_per_epoch, state_root,
    )
    print_epoch_summary(adv_epoch, results)
    all_results.extend(results)

    # Phase 5: Network stress (take 30% offline)
    print_subheader("Phase 5: Network Stress (30% validators offline)")
    rng = np.random.default_rng(args.seed + 200)
    offline_count = int(len(validators) * 0.30)
    offline_indices = rng.choice(len(validators), size=offline_count, replace=False)
    for idx in offline_indices:
        validators[idx].online = False
        agents[idx].begin_cooldown()

    online = sum(1 for v in validators if v.online)
    print(f"  Online validators: {online}/{len(validators)}")

    pipeline.safe_mode.update(len(validators), offline_count)
    print(f"  Safe mode: {'ACTIVE' if pipeline.safe_mode.active else 'inactive'}")

    stress_epoch = args.epochs
    results = run_epoch_blocks(
        pipeline, validators, agents, stress_epoch,
        args.blocks_per_epoch, state_root,
    )
    print_epoch_summary(stress_epoch, results)
    all_results.extend(results)

    # Restore validators
    for idx in offline_indices:
        validators[idx].online = True
        # Agents in COOLDOWN cannot be directly set to ACTIVE via public API,
        # so we restore by directly updating state (simulating network recovery).
        agents[idx].state = AgentState.ACTIVE

    # Final Report
    print_header("FINAL REPORT", "=")
    total = len(all_results)
    finalized = sum(1 for r in all_results if r.outcome == DisputeOutcome.FINALIZED)
    rejected = sum(1 for r in all_results if r.outcome == DisputeOutcome.REJECTED)
    disputed = sum(1 for r in all_results if r.outcome == DisputeOutcome.DISPUTED)
    insufficient = sum(1 for r in all_results if r.outcome == DisputeOutcome.INSUFFICIENT)

    print(f"  Total blocks processed:   {total}")
    print(f"  Finalized (ZK verified):  {finalized} ({100*finalized/max(total,1):.1f}%)")
    print(f"  Rejected (invalid):       {rejected}")
    print(f"  Disputed (split verdict): {disputed}")
    print(f"  Low confidence:           {insufficient}")

    times = [r.total_time_s for r in all_results if r.total_time_s > 0]
    if times:
        print(f"\n  Avg verification time:    {np.mean(times):.1f}s")
        print(f"  Median verification time: {np.median(times):.1f}s")
        print(f"  P99 verification time:    {np.percentile(times, 99):.1f}s")

    proofs_total = sum(r.valid_proof_count + r.invalid_proof_count for r in all_results)
    mismatches = sum(len(r.mismatched_agents) for r in all_results)
    print(f"\n  Total proofs generated:   {proofs_total}")
    print(f"  Commitment mismatches:    {mismatches}")

    print(f"\n{'=' * 70}")
    print("  PoAIV pipeline demo complete.")
    print(f"{'=' * 70}\n")


if __name__ == "__main__":
    main()
