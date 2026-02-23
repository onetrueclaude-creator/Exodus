"""Block processor: bridges consensus and ledger."""
from __future__ import annotations
from dataclasses import dataclass, field
from agentic.consensus.block import Block
from agentic.ledger.state import LedgerState
from agentic.ledger.transaction import (
    MintTx, TransferTx, StakeTx, UnstakeTx, TxResult,
    validate_mint, validate_transfer, validate_stake, validate_unstake,
)
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agentic.economics.staking import StakeRegistry


@dataclass
class BlockResult:
    slot: int
    accepted: int = 0
    rejected: int = 0
    state_root: bytes = b""
    errors: list[str] = field(default_factory=list)


class BlockProcessor:
    def process_block(
        self,
        block: Block,
        transactions: list,
        state: LedgerState,
        stake_registry: StakeRegistry | None = None,
    ) -> BlockResult:
        result = BlockResult(slot=block.slot)
        for tx in transactions:
            if isinstance(tx, MintTx):
                tx_result = validate_mint(tx, state)
            elif isinstance(tx, TransferTx):
                tx_result = validate_transfer(tx, state)
            elif isinstance(tx, StakeTx):
                if stake_registry is None:
                    tx_result = TxResult(
                        valid=False,
                        error="StakeTx requires a stake_registry",
                        records_created=0,
                        nullifiers_published=0,
                    )
                else:
                    tx_result = validate_stake(tx, state, stake_registry)
            elif isinstance(tx, UnstakeTx):
                if stake_registry is None:
                    tx_result = TxResult(
                        valid=False,
                        error="UnstakeTx requires a stake_registry",
                        records_created=0,
                        nullifiers_published=0,
                    )
                else:
                    tx_result = validate_unstake(tx, state, stake_registry)
            else:
                tx_result = TxResult(valid=False, error=f"Unknown TX type: {type(tx)}", records_created=0, nullifiers_published=0)
            if tx_result.valid:
                result.accepted += 1
            else:
                result.rejected += 1
                result.errors.append(tx_result.error)
        result.state_root = state.get_state_root()
        return result
