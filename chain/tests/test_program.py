"""Tests for the smart contract (program) framework."""
from __future__ import annotations

import os
import pytest

from agentic.ledger.program import (
    MintProgram,
    TransferProgram,
    StakeProgram,
    ProgramRegistry,
    ProgramInput,
    ProgramOutput,
)
from agentic.ledger.record import Record
from agentic.ledger.state import LedgerState
from agentic.ledger.crypto import generate_key_pair, hash_tag
from agentic.params import MINT_PROGRAM_ID, TRANSFER_PROGRAM_ID, STAKE_PROGRAM_ID


@pytest.fixture
def state():
    return LedgerState()


@pytest.fixture
def keys():
    return generate_key_pair(42)


@pytest.fixture
def registry():
    return ProgramRegistry()


class TestMintProgram:
    def test_mint_creates_record(self, state, keys):
        prog = MintProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[],
            input_positions=[],
            arguments={
                "amount": 1000,
                "recipient": keys["public_key"],
                "viewing_key": keys["viewing_key"],
            },
            slot=0,
        )
        out = prog.execute(inp, state)
        assert out.success
        assert len(out.output_records) == 1
        assert out.output_records[0].value == 1000
        assert out.output_records[0].owner == keys["public_key"]

    def test_mint_rejects_zero_amount(self, state, keys):
        prog = MintProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[],
            input_positions=[],
            arguments={"amount": 0, "viewing_key": keys["viewing_key"]},
            slot=0,
        )
        out = prog.execute(inp, state)
        assert not out.success
        assert "positive" in out.error.lower()

    def test_mint_emits_event(self, state, keys):
        prog = MintProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[],
            input_positions=[],
            arguments={
                "amount": 500,
                "recipient": keys["public_key"],
                "viewing_key": keys["viewing_key"],
            },
            slot=5,
        )
        out = prog.execute(inp, state)
        assert len(out.events) == 1
        assert out.events[0]["type"] == "mint"
        assert out.events[0]["amount"] == 500
        assert out.events[0]["slot"] == 5


class TestTransferProgram:
    def _mint_record(self, state, keys, amount, slot=0):
        """Helper: mint a record and insert into state."""
        tag = hash_tag(keys["viewing_key"], MINT_PROGRAM_ID, state.record_count.to_bytes(32, 'big'))
        record = Record(
            owner=keys["public_key"],
            data=[amount],
            nonce=os.urandom(32),
            tag=tag,
            program_id=MINT_PROGRAM_ID,
            birth_slot=slot,
        )
        pos = state.insert_record(record)
        return record, pos

    def test_transfer_basic(self, state, keys):
        record, pos = self._mint_record(state, keys, 1000)
        recipient_keys = generate_key_pair(99)
        prog = TransferProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[record],
            input_positions=[pos],
            arguments={
                "amount": 400,
                "recipient": recipient_keys["public_key"],
                "recipient_viewing_key": recipient_keys["viewing_key"],
                "sender_viewing_key": keys["viewing_key"],
                "spending_key": keys["spending_key"],
            },
            slot=1,
        )
        out = prog.execute(inp, state)
        assert out.success
        assert len(out.output_records) == 2  # recipient + change
        assert out.output_records[0].value == 400
        assert out.output_records[1].value == 600
        assert len(out.nullifiers) == 1

    def test_transfer_insufficient_funds(self, state, keys):
        record, pos = self._mint_record(state, keys, 100)
        recipient_keys = generate_key_pair(99)
        prog = TransferProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[record],
            input_positions=[pos],
            arguments={
                "amount": 200,
                "recipient": recipient_keys["public_key"],
                "spending_key": keys["spending_key"],
            },
            slot=1,
        )
        out = prog.execute(inp, state)
        assert not out.success
        assert "insufficient" in out.error.lower()

    def test_transfer_exact_amount_no_change(self, state, keys):
        record, pos = self._mint_record(state, keys, 500)
        recipient_keys = generate_key_pair(99)
        prog = TransferProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[record],
            input_positions=[pos],
            arguments={
                "amount": 500,
                "recipient": recipient_keys["public_key"],
                "recipient_viewing_key": recipient_keys["viewing_key"],
                "spending_key": keys["spending_key"],
            },
            slot=1,
        )
        out = prog.execute(inp, state)
        assert out.success
        assert len(out.output_records) == 1  # no change record


class TestStakeProgram:
    def _mint_record(self, state, keys, amount, slot=0):
        tag = hash_tag(keys["viewing_key"], MINT_PROGRAM_ID, state.record_count.to_bytes(32, 'big'))
        record = Record(
            owner=keys["public_key"],
            data=[amount],
            nonce=os.urandom(32),
            tag=tag,
            program_id=MINT_PROGRAM_ID,
            birth_slot=slot,
        )
        pos = state.insert_record(record)
        return record, pos

    def test_stake_creates_staked_record(self, state, keys):
        record, pos = self._mint_record(state, keys, 1000)
        prog = StakeProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[record],
            input_positions=[pos],
            arguments={
                "amount": 800,
                "validator_id": 5,
                "spending_key": keys["spending_key"],
                "sender_viewing_key": keys["viewing_key"],
            },
            slot=1,
        )
        out = prog.execute(inp, state)
        assert out.success
        assert len(out.output_records) == 2  # staked record + change
        staked = out.output_records[0]
        assert staked.value == 800
        assert staked.data[1] == 5  # validator_id
        assert staked.program_id == STAKE_PROGRAM_ID
        change = out.output_records[1]
        assert change.value == 200

    def test_stake_rejects_no_validator(self, state, keys):
        record, pos = self._mint_record(state, keys, 1000)
        prog = StakeProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[record],
            input_positions=[pos],
            arguments={"amount": 500, "spending_key": keys["spending_key"]},
            slot=1,
        )
        out = prog.execute(inp, state)
        assert not out.success
        assert "validator" in out.error.lower()

    def test_stake_emits_event(self, state, keys):
        record, pos = self._mint_record(state, keys, 1000)
        prog = StakeProgram()
        inp = ProgramInput(
            caller=keys["public_key"],
            input_records=[record],
            input_positions=[pos],
            arguments={
                "amount": 1000,
                "validator_id": 3,
                "spending_key": keys["spending_key"],
            },
            slot=10,
        )
        out = prog.execute(inp, state)
        assert out.success
        assert out.events[0]["type"] == "stake"
        assert out.events[0]["validator_id"] == 3


class TestProgramRegistry:
    def test_native_programs_registered(self, registry):
        assert registry.get(MINT_PROGRAM_ID) is not None
        assert registry.get(TRANSFER_PROGRAM_ID) is not None
        assert registry.get(STAKE_PROGRAM_ID) is not None

    def test_unknown_program_fails(self, state, keys, registry):
        out = registry.execute(
            b"unknown_program",
            ProgramInput(caller=keys["public_key"], input_records=[], input_positions=[], arguments={}, slot=0),
            state,
        )
        assert not out.success
        assert "unknown" in out.error.lower()

    def test_execute_via_registry(self, state, keys, registry):
        out = registry.execute(
            MINT_PROGRAM_ID,
            ProgramInput(
                caller=keys["public_key"],
                input_records=[],
                input_positions=[],
                arguments={
                    "amount": 100,
                    "recipient": keys["public_key"],
                    "viewing_key": keys["viewing_key"],
                },
                slot=0,
            ),
            state,
        )
        assert out.success
        assert out.output_records[0].value == 100
