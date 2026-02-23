"""Tests for transaction types and validation."""
from __future__ import annotations
import os
import pytest
from agentic.ledger.transaction import (
    MintTx, TransferTx, TxResult, validate_mint, validate_transfer,
)
from agentic.ledger.state import LedgerState
from agentic.ledger.record import Record
from agentic.ledger.crypto import generate_key_pair, hash_tag
from agentic.params import MINT_PROGRAM_ID, TRANSFER_PROGRAM_ID


def _make_wallet(seed: int):
    return generate_key_pair(seed)


class TestMintTx:
    def test_valid_mint(self):
        state = LedgerState()
        keys = _make_wallet(1)
        tx = MintTx(
            recipient=keys['public_key'],
            recipient_viewing_key=keys['viewing_key'],
            amount=1000, slot=0,
        )
        result = validate_mint(tx, state)
        assert result.valid
        assert result.records_created == 1

    def test_mint_updates_state(self):
        state = LedgerState()
        keys = _make_wallet(1)
        tx = MintTx(
            recipient=keys['public_key'],
            recipient_viewing_key=keys['viewing_key'],
            amount=500, slot=0,
        )
        result = validate_mint(tx, state)
        assert state.record_count == 1


class TestTransferTx:
    def _setup_funded_wallet(self, state, seed=1, amount=1000):
        keys = _make_wallet(seed)
        mint = MintTx(
            recipient=keys['public_key'],
            recipient_viewing_key=keys['viewing_key'],
            amount=amount, slot=0,
        )
        result = validate_mint(mint, state)
        tag = hash_tag(keys['viewing_key'], MINT_PROGRAM_ID, 0)
        positions = state.tag_index.get(tag, [])
        record = state.get_record(positions[0])
        return keys, record, positions[0]

    def test_valid_transfer(self):
        state = LedgerState()
        sender_keys, sender_record, sender_pos = self._setup_funded_wallet(state, seed=1, amount=1000)
        recipient_keys = _make_wallet(2)
        tx = TransferTx.build(
            sender_keys=sender_keys,
            input_records=[(sender_record, sender_pos)],
            recipient_pubkey=recipient_keys['public_key'],
            recipient_viewing_key=recipient_keys['viewing_key'],
            amount=300, slot=1,
        )
        result = validate_transfer(tx, state)
        assert result.valid
        assert result.records_created == 2  # recipient + change

    def test_transfer_conserves_value(self):
        state = LedgerState()
        sender_keys, sender_record, sender_pos = self._setup_funded_wallet(state, seed=1, amount=1000)
        recipient_keys = _make_wallet(2)
        tx = TransferTx.build(
            sender_keys=sender_keys,
            input_records=[(sender_record, sender_pos)],
            recipient_pubkey=recipient_keys['public_key'],
            recipient_viewing_key=recipient_keys['viewing_key'],
            amount=300, slot=1,
        )
        result = validate_transfer(tx, state)
        total_out = sum(r.value for r in tx.output_records)
        assert total_out == 1000

    def test_double_spend_rejected(self):
        state = LedgerState()
        sender_keys, sender_record, sender_pos = self._setup_funded_wallet(state, seed=1, amount=1000)
        recipient_keys = _make_wallet(2)
        tx1 = TransferTx.build(
            sender_keys=sender_keys,
            input_records=[(sender_record, sender_pos)],
            recipient_pubkey=recipient_keys['public_key'],
            recipient_viewing_key=recipient_keys['viewing_key'],
            amount=300, slot=1,
        )
        result1 = validate_transfer(tx1, state)
        assert result1.valid
        tx2 = TransferTx.build(
            sender_keys=sender_keys,
            input_records=[(sender_record, sender_pos)],
            recipient_pubkey=recipient_keys['public_key'],
            recipient_viewing_key=recipient_keys['viewing_key'],
            amount=200, slot=2,
        )
        result2 = validate_transfer(tx2, state)
        assert not result2.valid
        assert "double-spend" in result2.error.lower()

    def test_insufficient_balance_rejected(self):
        state = LedgerState()
        sender_keys, sender_record, sender_pos = self._setup_funded_wallet(state, seed=1, amount=100)
        recipient_keys = _make_wallet(2)
        tx = TransferTx.build(
            sender_keys=sender_keys,
            input_records=[(sender_record, sender_pos)],
            recipient_pubkey=recipient_keys['public_key'],
            recipient_viewing_key=recipient_keys['viewing_key'],
            amount=500, slot=1,
        )
        result = validate_transfer(tx, state)
        assert not result.valid
        assert "insufficient" in result.error.lower() or "conserved" in result.error.lower()

    def test_wrong_spending_key_rejected(self):
        state = LedgerState()
        sender_keys, sender_record, sender_pos = self._setup_funded_wallet(state, seed=1, amount=1000)
        recipient_keys = _make_wallet(2)
        fake_keys = _make_wallet(99)
        tx = TransferTx.build(
            sender_keys=fake_keys,
            input_records=[(sender_record, sender_pos)],
            recipient_pubkey=recipient_keys['public_key'],
            recipient_viewing_key=recipient_keys['viewing_key'],
            amount=300, slot=1,
        )
        result = validate_transfer(tx, state)
        assert not result.valid
        assert "owner" in result.error.lower() or "key" in result.error.lower() or "mismatch" in result.error.lower()
