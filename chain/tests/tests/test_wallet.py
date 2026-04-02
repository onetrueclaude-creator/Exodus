"""Tests for wallet with record discovery."""
from __future__ import annotations
import pytest
from agentic.ledger.wallet import Wallet
from agentic.ledger.state import LedgerState


class TestWallet:
    def test_create_wallet(self):
        w = Wallet(name="Alice", seed=1)
        assert w.name == "Alice"
        assert len(w.public_key) == 32
        assert len(w.spending_key) == 32
        assert len(w.viewing_key) == 32

    def test_deterministic_creation(self):
        w1 = Wallet(name="Alice", seed=1)
        w2 = Wallet(name="Alice", seed=1)
        assert w1.public_key == w2.public_key

    def test_balance_after_mint(self):
        state = LedgerState()
        w = Wallet(name="Alice", seed=1)
        w.receive_mint(state, amount=1000, slot=0)
        assert w.get_balance(state) == 1000

    def test_transfer_updates_balances(self):
        state = LedgerState()
        alice = Wallet(name="Alice", seed=1)
        bob = Wallet(name="Bob", seed=2)
        alice.receive_mint(state, amount=1000, slot=0)
        result = alice.transfer(state, recipient=bob, amount=300, slot=1)
        assert result.valid
        assert alice.get_balance(state) == 700
        assert bob.get_balance(state) == 300

    def test_multiple_transfers(self):
        state = LedgerState()
        alice = Wallet(name="Alice", seed=1)
        bob = Wallet(name="Bob", seed=2)
        carol = Wallet(name="Carol", seed=3)
        alice.receive_mint(state, amount=1000, slot=0)
        alice.transfer(state, recipient=bob, amount=300, slot=1)
        alice.transfer(state, recipient=carol, amount=200, slot=2)
        assert alice.get_balance(state) == 500
        assert bob.get_balance(state) == 300
        assert carol.get_balance(state) == 200

    def test_transfer_insufficient_funds(self):
        state = LedgerState()
        alice = Wallet(name="Alice", seed=1)
        bob = Wallet(name="Bob", seed=2)
        alice.receive_mint(state, amount=100, slot=0)
        result = alice.transfer(state, recipient=bob, amount=500, slot=1)
        assert not result.valid

    def test_discover_records(self):
        state = LedgerState()
        alice = Wallet(name="Alice", seed=1)
        alice.receive_mint(state, amount=1000, slot=0)
        records = alice.discover_records(state)
        assert len(records) >= 1
        assert sum(r.value for r in records) == 1000

    def test_chain_transfers(self):
        state = LedgerState()
        alice = Wallet(name="Alice", seed=1)
        bob = Wallet(name="Bob", seed=2)
        carol = Wallet(name="Carol", seed=3)
        alice.receive_mint(state, amount=500, slot=0)
        alice.transfer(state, recipient=bob, amount=500, slot=1)
        bob.transfer(state, recipient=carol, amount=500, slot=2)
        assert alice.get_balance(state) == 0
        assert bob.get_balance(state) == 0
        assert carol.get_balance(state) == 500


class TestWalletNullifierKey:
    def test_wallet_stores_nullifier_key(self):
        """Wallet should store nullifier_key from key generation."""
        w = Wallet(name="Alice", seed=42)
        assert hasattr(w, 'nullifier_key')
        assert len(w.nullifier_key) == 32

    def test_wallet_uses_nullifier_key_for_discovery(self):
        """discover_records should use nullifier_key, not spending_key."""
        w = Wallet(name="Alice", seed=42)
        # nullifier_key should be different from spending_key
        assert w.nullifier_key != w.spending_key

    def test_wallet_nullifier_key_in_transfer_keys(self):
        """transfer() should include nullifier_key in sender_keys."""
        state = LedgerState()
        alice = Wallet(name="Alice", seed=1)
        bob = Wallet(name="Bob", seed=2)
        alice.receive_mint(state, amount=1000, slot=0)
        # After transfer, verify wallet has all 4 keys
        assert hasattr(alice, 'nullifier_key')
        assert hasattr(alice, 'spending_key')
        assert hasattr(alice, 'viewing_key')
        assert hasattr(alice, 'public_key')
        # Transfer should still work with nullifier_key in sender_keys
        result = alice.transfer(state, recipient=bob, amount=300, slot=1)
        assert result.valid
        assert alice.get_balance(state) == 700
        assert bob.get_balance(state) == 300
