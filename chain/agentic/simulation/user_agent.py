"""Synthetic user agents for simulation."""
from __future__ import annotations
from dataclasses import dataclass, field
import numpy as np
from agentic.ledger.wallet import Wallet
from agentic.ledger.state import LedgerState


@dataclass
class UserAgent:
    wallet: Wallet
    behavior: str = "normal"
    _spent_records: list = field(default_factory=list)

    def generate_transactions(self, peers: list[UserAgent], state: LedgerState, slot: int, rng: np.random.Generator) -> int:
        """Generate and execute transactions. Returns count of successful TXs."""
        if not peers:
            return 0
        balance = self.wallet.get_balance(state)
        if balance <= 0:
            return 0

        if self.behavior == "normal":
            n_txs = int(rng.integers(0, 4))
        elif self.behavior == "adversarial":
            n_txs = int(rng.integers(1, 4))
        else:
            n_txs = 1

        successful = 0
        for _ in range(n_txs):
            balance = self.wallet.get_balance(state)
            if balance <= 0:
                break
            recipient = peers[int(rng.integers(0, len(peers)))]
            amount = int(rng.integers(1, max(2, balance // 2 + 1)))
            if amount > balance:
                amount = balance
            result = self.wallet.transfer(state, recipient=recipient.wallet, amount=amount, slot=slot)
            if result.valid:
                successful += 1
        return successful
