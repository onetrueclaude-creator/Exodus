"""Tests for block processor."""
from __future__ import annotations
import pytest
from agentic.ledger.block_processor import BlockProcessor, BlockResult
from agentic.ledger.state import LedgerState
from agentic.ledger.wallet import Wallet
from agentic.ledger.transaction import MintTx, TransferTx, validate_mint
from agentic.consensus.block import Block


class TestBlockProcessor:
    def test_process_empty_block(self):
        state = LedgerState()
        processor = BlockProcessor()
        block = Block(slot=0, leader_id=0)
        result = processor.process_block(block, [], state)
        assert result.accepted == 0
        assert result.rejected == 0

    def test_process_block_with_mints(self):
        state = LedgerState()
        processor = BlockProcessor()
        block = Block(slot=0, leader_id=0)
        wallets = [Wallet(name=f"User{i}", seed=i) for i in range(3)]
        txs = []
        for w in wallets:
            txs.append(MintTx(
                recipient=w.public_key,
                recipient_viewing_key=w.viewing_key,
                amount=1000, slot=0,
            ))
        result = processor.process_block(block, txs, state)
        assert result.accepted == 3
        assert result.rejected == 0
        assert state.record_count == 3

    def test_process_block_with_transfers(self):
        state = LedgerState()
        processor = BlockProcessor()
        alice = Wallet(name="Alice", seed=1)
        bob = Wallet(name="Bob", seed=2)
        alice.receive_mint(state, amount=1000, slot=0)
        unspent = alice._discover_records_with_positions(state)
        tx = TransferTx.build(
            sender_keys={
                'spending_key': alice.spending_key,
                'viewing_key': alice.viewing_key,
                'public_key': alice.public_key,
            },
            input_records=unspent,
            recipient_pubkey=bob.public_key,
            recipient_viewing_key=bob.viewing_key,
            amount=300, slot=1,
        )
        for r in tx.output_records:
            if r.owner == bob.public_key:
                bob._known_tags.append(r.tag)
            elif r.owner == alice.public_key:
                alice._known_tags.append(r.tag)
        block = Block(slot=1, leader_id=0)
        result = processor.process_block(block, [tx], state)
        assert result.accepted == 1
        assert result.rejected == 0

    def test_process_block_rejects_double_spend(self):
        state = LedgerState()
        processor = BlockProcessor()
        alice = Wallet(name="Alice", seed=1)
        bob = Wallet(name="Bob", seed=2)
        alice.receive_mint(state, amount=1000, slot=0)
        unspent = alice._discover_records_with_positions(state)
        keys = {
            'spending_key': alice.spending_key,
            'viewing_key': alice.viewing_key,
            'public_key': alice.public_key,
        }
        tx1 = TransferTx.build(sender_keys=keys, input_records=unspent,
            recipient_pubkey=bob.public_key, recipient_viewing_key=bob.viewing_key,
            amount=300, slot=1)
        tx2 = TransferTx.build(sender_keys=keys, input_records=unspent,
            recipient_pubkey=bob.public_key, recipient_viewing_key=bob.viewing_key,
            amount=200, slot=1)
        block = Block(slot=1, leader_id=0)
        result = processor.process_block(block, [tx1, tx2], state)
        assert result.accepted == 1
        assert result.rejected == 1

    def test_block_result_has_state_root(self):
        state = LedgerState()
        processor = BlockProcessor()
        block = Block(slot=0, leader_id=0)
        alice = Wallet(name="Alice", seed=1)
        txs = [MintTx(recipient=alice.public_key, recipient_viewing_key=alice.viewing_key,
            amount=1000, slot=0)]
        result = processor.process_block(block, txs, state)
        assert len(result.state_root) == 32
