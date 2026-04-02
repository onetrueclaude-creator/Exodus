"""Tests for ledger state (combined PCT + NS + PST + tag index)."""
from __future__ import annotations
import os
import pytest
from agentic.ledger.state import LedgerState
from agentic.ledger.record import Record
from agentic.ledger.crypto import hash_tag, generate_key_pair
from agentic.ledger.nullifier import CapacityError


class TestLedgerState:
    def test_initial_state(self):
        state = LedgerState()
        root = state.get_state_root()
        assert len(root) == 32
        assert state.record_count == 0

    def test_insert_record(self):
        state = LedgerState()
        record = Record(
            owner=b"a" * 32, data=[100], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"transfer", birth_slot=0,
        )
        position = state.insert_record(record)
        assert position == 0
        assert state.record_count == 1

    def test_commitment_in_tree_after_insert(self):
        state = LedgerState()
        record = Record(
            owner=b"a" * 32, data=[100], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"transfer", birth_slot=0,
        )
        pos = state.insert_record(record)
        leaf = state.pct.get_leaf(pos)
        assert leaf == record.commitment()

    def test_tag_index_updated(self):
        state = LedgerState()
        tag = b"t" * 32
        record = Record(
            owner=b"a" * 32, data=[100], nonce=b"n" * 32,
            tag=tag, program_id=b"transfer", birth_slot=0,
        )
        pos = state.insert_record(record)
        assert state.tag_index[tag] == [pos]

    def test_multiple_records_same_tag(self):
        state = LedgerState()
        tag = b"t" * 32
        for i in range(3):
            r = Record(
                owner=b"a" * 32, data=[100 + i], nonce=os.urandom(32),
                tag=tag, program_id=b"transfer", birth_slot=i,
            )
            state.insert_record(r)
        assert len(state.tag_index[tag]) == 3

    def test_add_nullifier(self):
        state = LedgerState()
        nf = b"nf" + b"\x00" * 30
        state.add_nullifier(nf)
        assert state.ns.contains(nf)

    def test_double_nullifier_raises(self):
        state = LedgerState()
        nf = b"nf" + b"\x00" * 30
        state.add_nullifier(nf)
        with pytest.raises(ValueError):
            state.add_nullifier(nf)

    def test_state_root_changes_on_insert(self):
        state = LedgerState()
        root1 = state.get_state_root()
        record = Record(
            owner=b"a" * 32, data=[100], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"transfer", birth_slot=0,
        )
        state.insert_record(record)
        root2 = state.get_state_root()
        assert root1 != root2

    def test_get_record(self):
        state = LedgerState()
        record = Record(
            owner=b"a" * 32, data=[100], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"transfer", birth_slot=0,
        )
        pos = state.insert_record(record)
        retrieved = state.get_record(pos)
        assert retrieved.owner == record.owner
        assert retrieved.data == record.data

    def test_get_inclusion_proof(self):
        state = LedgerState()
        record = Record(
            owner=b"a" * 32, data=[100], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"transfer", birth_slot=0,
        )
        pos = state.insert_record(record)
        proof = state.get_inclusion_proof(pos)
        assert state.verify_inclusion(record.commitment(), pos, proof)


class TestStateRootCompleteness:
    def test_different_tags_different_roots(self):
        """Two states with same records but different tags must differ."""
        s1 = LedgerState(tree_depth=8)
        s2 = LedgerState(tree_depth=8)
        r1 = Record(
            owner=b"a" * 32, data=[100], nonce=b"n" * 32,
            tag=b"t1" + b"\x00" * 30, program_id=b"transfer", birth_slot=0,
        )
        r2 = Record(
            owner=b"a" * 32, data=[100], nonce=b"n" * 32,
            tag=b"t2" + b"\x00" * 30, program_id=b"transfer", birth_slot=0,
        )
        s1.insert_record(r1)
        s2.insert_record(r2)
        assert s1.get_state_root() != s2.get_state_root()


class TestCapacityOverflow:
    def test_pct_overflow_raises(self):
        """Exceeding PCT capacity raises CapacityError."""
        state = LedgerState(tree_depth=2)  # capacity = 4
        for i in range(4):
            r = Record(
                owner=b"a" * 32, data=[i], nonce=bytes([i]) * 32,
                tag=b"t" * 32, program_id=b"p", birth_slot=i,
            )
            state.insert_record(r)
        with pytest.raises(CapacityError, match="full"):
            r = Record(
                owner=b"a" * 32, data=[99], nonce=b"x" * 32,
                tag=b"t" * 32, program_id=b"p", birth_slot=99,
            )
            state.insert_record(r)


class TestFullSpendCycle:
    def test_create_insert_nullify_no_respend(self):
        """Full lifecycle: create record, insert, generate nullifier,
        add nullifier, verify double-spend is prevented."""
        state = LedgerState(tree_depth=8)
        keys = generate_key_pair(seed=1)

        # Create and insert a record
        record = Record(
            owner=keys["public_key"],
            data=[500],
            nonce=b"unique_nonce" + b"\x00" * 20,
            tag=b"t" * 32,
            program_id=b"transfer",
            birth_slot=0,
        )
        pos = state.insert_record(record)

        # Verify it exists in the tree
        proof = state.get_inclusion_proof(pos)
        assert state.verify_inclusion(record.commitment(), pos, proof)

        # Spend it: generate and add nullifier
        nf = record.nullifier(keys["spending_key"])
        state.add_nullifier(nf)

        # Double-spend must be rejected
        with pytest.raises(ValueError, match="already exists"):
            state.add_nullifier(nf)

        # Record is still in tree (append-only), but nullifier prevents re-use
        assert state.ns.contains(nf)
        assert state.verify_inclusion(record.commitment(), pos, proof)
