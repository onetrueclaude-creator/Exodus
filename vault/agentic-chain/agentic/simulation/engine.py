"""Full chain simulation engine for Agentic Chain."""
from __future__ import annotations
from dataclasses import dataclass, field
import numpy as np
from agentic.ledger.state import LedgerState
from agentic.ledger.wallet import Wallet
from agentic.simulation.user_agent import UserAgent
from agentic.consensus.validator import create_validator_set
from agentic.consensus.simulator import ConsensusSimulator
from agentic.params import (
    GENESIS_BALANCE, SLOTS_PER_EPOCH,
    ALPHA, BETA,
)

# TODO(v2): redesign for organic growth model — no scheduled inflation.
# Legacy inflation constants kept for backward-compat simulation.
_LEGACY_INITIAL_RATE = 0.10
_LEGACY_DISINFLATION = 0.10
_LEGACY_FLOOR = 0.01


@dataclass
class SimulationConfig:
    num_wallets: int = 50
    num_validators: int = 30
    num_epochs: int = 20
    genesis_balance: int = GENESIS_BALANCE
    adversarial_rate: float = 0.10
    seed: int = 42
    # Inflation: each epoch = 1 month; 12 epochs = 1 year
    inflation_enabled: bool = True
    epochs_per_year: int = 12


@dataclass
class EpochSummary:
    epoch: int
    txs_attempted: int = 0
    txs_successful: int = 0
    blocks_finalized: int = 0
    record_count: int = 0
    nullifier_count: int = 0
    state_root: bytes = b""
    wallet_balances: list[int] = field(default_factory=list)
    # Inflation / staking fields
    inflation_rate: float = 0.0
    inflation_minted: int = 0
    circulating_supply: int = 0
    staking_rewards: list[int] = field(default_factory=list)


class SimulationEngine:
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.state = LedgerState()
        self.rng = np.random.default_rng(config.seed)

        self.wallets = [
            Wallet(name=f"User_{i:03d}", seed=config.seed + i)
            for i in range(config.num_wallets)
        ]

        n_adversarial = int(config.num_wallets * config.adversarial_rate)
        self.agents = []
        for i, w in enumerate(self.wallets):
            behavior = "adversarial" if i < n_adversarial else "normal"
            self.agents.append(UserAgent(wallet=w, behavior=behavior))

        self.validators = create_validator_set(n=config.num_validators, seed=config.seed)
        self.consensus = ConsensusSimulator(validators=self.validators, seed=config.seed)

        # Map validators to wallets: validator i → wallet i (first N wallets)
        # These wallets receive staking rewards from inflation
        self.validator_wallets = {
            v.id: self.wallets[i]
            for i, v in enumerate(self.validators)
            if i < len(self.wallets)
        }

    def _inflation_rate_at_year(self, year: float) -> float:
        """Get annual inflation rate at a given year (disinflation curve)."""
        rate = _LEGACY_INITIAL_RATE * ((1 - _LEGACY_DISINFLATION) ** year)
        return max(rate, _LEGACY_FLOOR)

    def _distribute_staking_rewards(self, epoch: int, slot: int) -> tuple[int, list[int]]:
        """Mint inflation rewards to validators proportional to effective stake.

        Returns (total_minted, per_validator_rewards).
        CPU-heavy validators earn more due to BETA > ALPHA weighting.
        """
        circulating = sum(w.get_balance(self.state) for w in self.wallets)
        if circulating == 0:
            return 0, [0] * len(self.validators)

        year = epoch / self.config.epochs_per_year
        annual_rate = self._inflation_rate_at_year(year)
        epoch_rate = annual_rate / self.config.epochs_per_year
        inflation_amount = int(circulating * epoch_rate)

        if inflation_amount <= 0:
            return 0, [0] * len(self.validators)

        # Calculate effective stakes for online validators
        online = [v for v in self.validators if v.online]
        if not online:
            return 0, [0] * len(self.validators)

        total_token = sum(v.token_stake for v in online)
        total_cpu = sum(v.cpu_vpu for v in online)

        stakes = {
            v.id: v.effective_stake(total_token, total_cpu)
            for v in online
        }
        total_stake = sum(stakes.values())
        if total_stake == 0:
            return 0, [0] * len(self.validators)

        # Distribute proportionally to effective stake
        total_minted = 0
        per_validator = [0] * len(self.validators)
        for v in online:
            share = stakes[v.id] / total_stake
            reward = int(inflation_amount * share)
            if reward > 0 and v.id in self.validator_wallets:
                wallet = self.validator_wallets[v.id]
                result = wallet.receive_mint(self.state, amount=reward, slot=slot)
                if result.valid:
                    total_minted += reward
                    per_validator[v.id] = reward

        return total_minted, per_validator

    def run_genesis(self) -> None:
        for wallet in self.wallets:
            wallet.receive_mint(self.state, amount=self.config.genesis_balance, slot=0)

    def run(self) -> list[EpochSummary]:
        summaries = []
        for epoch in range(self.config.num_epochs):
            summary = self._run_epoch(epoch)
            summaries.append(summary)
        return summaries

    def _run_epoch(self, epoch: int) -> EpochSummary:
        summary = EpochSummary(epoch=epoch)

        consensus_result = self.consensus.run_epoch()
        summary.blocks_finalized = consensus_result.blocks_finalized

        base_slot = (epoch + 1) * SLOTS_PER_EPOCH

        # Phase 1: Inflation — mint staking rewards to validators
        if self.config.inflation_enabled:
            year = epoch / self.config.epochs_per_year
            summary.inflation_rate = self._inflation_rate_at_year(year)
            reward_slot = base_slot
            minted, per_validator = self._distribute_staking_rewards(epoch, reward_slot)
            summary.inflation_minted = minted
            summary.staking_rewards = per_validator

        # Phase 2: User transactions
        total_attempted = 0
        total_successful = 0

        for agent in self.agents:
            peers = [a for a in self.agents if a is not agent]
            slot = base_slot + int(self.rng.integers(0, SLOTS_PER_EPOCH))
            successful = agent.generate_transactions(peers=peers, state=self.state, slot=slot, rng=self.rng)
            total_attempted += 1
            total_successful += successful

        summary.txs_attempted = total_attempted
        summary.txs_successful = total_successful
        summary.record_count = self.state.record_count
        summary.nullifier_count = self.state.ns.size
        summary.state_root = self.state.get_state_root()
        summary.wallet_balances = [w.get_balance(self.state) for w in self.wallets]
        summary.circulating_supply = sum(summary.wallet_balances)

        return summary
