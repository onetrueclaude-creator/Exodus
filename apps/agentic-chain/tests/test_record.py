"""Tests for programmable record model."""
from __future__ import annotations
import pytest
from agentic.ledger.record import Record
from agentic.ledger.crypto import generate_key_pair


class TestRecord:
    def test_create_record(self):
        r = Record(
            owner=b"owner_pk" + b"\x00" * 24,
            data=[1000],
            nonce=b"n" * 32,
            tag=b"t" * 32,
            program_id=b"transfer",
            birth_slot=0,
        )
        assert r.owner == b"owner_pk" + b"\x00" * 24
        assert r.data == [1000]
        assert r.value == 1000

    def test_commitment_is_deterministic(self):
        r = Record(
            owner=b"a" * 32, data=[500], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"prog", birth_slot=0,
        )
        assert r.commitment() == r.commitment()
        assert len(r.commitment()) == 32

    def test_different_records_different_commitments(self):
        r1 = Record(
            owner=b"a" * 32, data=[500], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"prog", birth_slot=0,
        )
        r2 = Record(
            owner=b"a" * 32, data=[600], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"prog", birth_slot=0,
        )
        assert r1.commitment() != r2.commitment()

    def test_nullifier_requires_spending_key(self):
        r = Record(
            owner=b"a" * 32, data=[500], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"prog", birth_slot=0,
        )
        nf = r.nullifier(spending_key=b"sk" + b"\x00" * 30)
        assert len(nf) == 32
        nf2 = r.nullifier(spending_key=b"sk2" + b"\x00" * 29)
        assert nf != nf2

    def test_serialize_deserialize(self):
        r = Record(
            owner=b"a" * 32, data=[100, 200, 300], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"transfer", birth_slot=42,
        )
        blob = r.serialize()
        r2 = Record.deserialize(blob)
        assert r2.owner == r.owner
        assert r2.data == r.data
        assert r2.nonce == r.nonce
        assert r2.tag == r.tag
        assert r2.program_id == r.program_id
        assert r2.birth_slot == r.birth_slot

    def test_value_is_first_data_field(self):
        r = Record(
            owner=b"a" * 32, data=[750, 1, 2], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"prog", birth_slot=0,
        )
        assert r.value == 750

    def test_empty_data_value_is_zero(self):
        r = Record(
            owner=b"a" * 32, data=[], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"prog", birth_slot=0,
        )
        assert r.value == 0

    def test_commitment_survives_serialization(self):
        """serialize -> deserialize -> commitment() equals original."""
        r = Record(
            owner=b"a" * 32, data=[100, 200], nonce=b"n" * 32,
            tag=b"t" * 32, program_id=b"transfer", birth_slot=7,
        )
        original_commitment = r.commitment()
        blob = r.serialize()
        r2 = Record.deserialize(blob)
        assert r2.commitment() == original_commitment
