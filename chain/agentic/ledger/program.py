"""Smart contract (program) execution framework for Agentic Chain.

Programs are deterministic state transition functions that operate on Records.
Each program defines:
  - allowed transitions (which record types can be created/consumed)
  - validation logic (what constitutes a valid execution)
  - access control (who can invoke)

NOT cryptographically secure -- prototype only.
"""
from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from agentic.ledger.record import Record
from agentic.params import (
    MINT_PROGRAM_ID,
    TRANSFER_PROGRAM_ID,
    STAKE_PROGRAM_ID,
)

if TYPE_CHECKING:
    from agentic.ledger.state import LedgerState


@dataclass
class ProgramInput:
    """Input to a program execution."""
    caller: bytes                        # caller's public key
    input_records: list[Record]          # consumed records (will be nullified)
    input_positions: list[int]           # positions in the PCT
    arguments: dict[str, object]         # program-specific arguments
    slot: int


@dataclass
class ProgramOutput:
    """Output from a program execution."""
    success: bool
    error: str = ""
    output_records: list[Record] = field(default_factory=list)
    nullifiers: list[bytes] = field(default_factory=list)
    state_mutations: dict[str, object] = field(default_factory=dict)
    events: list[dict] = field(default_factory=list)


class Program(ABC):
    """Base class for all on-chain programs (smart contracts)."""

    @property
    @abstractmethod
    def program_id(self) -> bytes:
        """Unique identifier for this program."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable program name."""
        ...

    @abstractmethod
    def execute(self, inp: ProgramInput, state: LedgerState) -> ProgramOutput:
        """Execute the program and return output records + mutations."""
        ...

    def validate_caller(self, caller: bytes, input_records: list[Record]) -> str | None:
        """Verify caller owns all input records. Returns error string or None."""
        for i, record in enumerate(input_records):
            if record.owner != caller:
                return f"Input {i}: caller does not own record"
        return None

    def verify_value_conservation(
        self, inputs: list[Record], outputs: list[Record]
    ) -> str | None:
        """Verify sum of input values == sum of output values. Returns error or None."""
        input_val = sum(r.value for r in inputs)
        output_val = sum(r.value for r in outputs)
        if input_val != output_val:
            return f"Value not conserved: in={input_val} out={output_val}"
        return None


class MintProgram(Program):
    """Native mint program — creates new AGNTC records."""

    @property
    def program_id(self) -> bytes:
        return MINT_PROGRAM_ID

    @property
    def name(self) -> str:
        return "agentic_mint"

    def execute(self, inp: ProgramInput, state: LedgerState) -> ProgramOutput:
        amount = inp.arguments.get("amount", 0)
        recipient = inp.arguments.get("recipient", inp.caller)
        viewing_key = inp.arguments.get("viewing_key", b"")

        if amount <= 0:
            return ProgramOutput(success=False, error="Amount must be positive")

        from agentic.ledger.crypto import hash_tag
        import os

        tag = hash_tag(viewing_key, self.program_id, state.record_count.to_bytes(32, 'big'))
        record = Record(
            owner=recipient,
            data=[amount],
            nonce=os.urandom(32),
            tag=tag,
            program_id=self.program_id,
            birth_slot=inp.slot,
        )

        return ProgramOutput(
            success=True,
            output_records=[record],
            events=[{"type": "mint", "amount": amount, "slot": inp.slot}],
        )


class TransferProgram(Program):
    """Native transfer program — moves AGNTC between accounts."""

    @property
    def program_id(self) -> bytes:
        return TRANSFER_PROGRAM_ID

    @property
    def name(self) -> str:
        return "agentic_transfer"

    def execute(self, inp: ProgramInput, state: LedgerState) -> ProgramOutput:
        # Validate caller owns inputs
        err = self.validate_caller(inp.caller, inp.input_records)
        if err:
            return ProgramOutput(success=False, error=err)

        amount = inp.arguments.get("amount", 0)
        recipient = inp.arguments.get("recipient")
        recipient_viewing_key = inp.arguments.get("recipient_viewing_key", b"")

        if amount <= 0:
            return ProgramOutput(success=False, error="Amount must be positive")
        if recipient is None:
            return ProgramOutput(success=False, error="No recipient specified")

        total_input = sum(r.value for r in inp.input_records)
        if total_input < amount:
            return ProgramOutput(
                success=False,
                error=f"Insufficient input: have {total_input}, need {amount}",
            )

        from agentic.ledger.crypto import hash_tag, hash_nullifier
        import os

        # Create output records
        outputs = []
        tag_counter = state.record_count

        # Recipient record
        tag = hash_tag(recipient_viewing_key, self.program_id, tag_counter.to_bytes(32, 'big'))
        outputs.append(Record(
            owner=recipient,
            data=[amount],
            nonce=os.urandom(32),
            tag=tag,
            program_id=self.program_id,
            birth_slot=inp.slot,
        ))

        # Change record
        change = total_input - amount
        if change > 0:
            sender_viewing_key = inp.arguments.get("sender_viewing_key", b"")
            tag = hash_tag(sender_viewing_key, self.program_id, (tag_counter + 1).to_bytes(32, 'big'))
            outputs.append(Record(
                owner=inp.caller,
                data=[change],
                nonce=os.urandom(32),
                tag=tag,
                program_id=self.program_id,
                birth_slot=inp.slot,
            ))

        # Compute nullifiers
        spending_key = inp.arguments.get("spending_key", b"")
        nullifiers = [
            hash_nullifier(spending_key, r.commitment(), r.nonce)
            for r in inp.input_records
        ]

        return ProgramOutput(
            success=True,
            output_records=outputs,
            nullifiers=nullifiers,
            events=[{"type": "transfer", "amount": amount, "slot": inp.slot}],
        )


class StakeProgram(Program):
    """Native staking program — locks AGNTC for validator staking."""

    @property
    def program_id(self) -> bytes:
        return STAKE_PROGRAM_ID

    @property
    def name(self) -> str:
        return "agentic_stake"

    def execute(self, inp: ProgramInput, state: LedgerState) -> ProgramOutput:
        err = self.validate_caller(inp.caller, inp.input_records)
        if err:
            return ProgramOutput(success=False, error=err)

        amount = inp.arguments.get("amount", 0)
        validator_id = inp.arguments.get("validator_id")

        if amount <= 0:
            return ProgramOutput(success=False, error="Stake amount must be positive")
        if validator_id is None:
            return ProgramOutput(success=False, error="No validator_id specified")

        total_input = sum(r.value for r in inp.input_records)
        if total_input < amount:
            return ProgramOutput(
                success=False,
                error=f"Insufficient input: have {total_input}, need {amount}",
            )

        from agentic.ledger.crypto import hash_tag, hash_nullifier
        import os

        outputs = []

        # Staked record (locked — owned by the staking program)
        tag = hash_tag(inp.caller, self.program_id, state.record_count.to_bytes(32, 'big'))
        staked_record = Record(
            owner=inp.caller,  # staker retains conceptual ownership
            data=[amount, validator_id],  # data[0]=amount, data[1]=validator_id
            nonce=os.urandom(32),
            tag=tag,
            program_id=self.program_id,
            birth_slot=inp.slot,
        )
        outputs.append(staked_record)

        # Change record
        change = total_input - amount
        if change > 0:
            sender_viewing_key = inp.arguments.get("sender_viewing_key", b"")
            change_tag = hash_tag(sender_viewing_key, TRANSFER_PROGRAM_ID, (state.record_count + 1).to_bytes(32, 'big'))
            outputs.append(Record(
                owner=inp.caller,
                data=[change],
                nonce=os.urandom(32),
                tag=change_tag,
                program_id=TRANSFER_PROGRAM_ID,
                birth_slot=inp.slot,
            ))

        # Nullify inputs
        spending_key = inp.arguments.get("spending_key", b"")
        nullifiers = [
            hash_nullifier(spending_key, r.commitment(), r.nonce)
            for r in inp.input_records
        ]

        return ProgramOutput(
            success=True,
            output_records=outputs,
            nullifiers=nullifiers,
            events=[{
                "type": "stake",
                "amount": amount,
                "validator_id": validator_id,
                "slot": inp.slot,
            }],
        )


class ProgramRegistry:
    """Registry of deployed programs. Maps program_id → Program instance."""

    def __init__(self):
        self._programs: dict[bytes, Program] = {}
        # Register native programs
        for prog in [MintProgram(), TransferProgram(), StakeProgram()]:
            self.register(prog)

    def register(self, program: Program) -> None:
        self._programs[program.program_id] = program

    def get(self, program_id: bytes) -> Program | None:
        return self._programs.get(program_id)

    def execute(
        self, program_id: bytes, inp: ProgramInput, state: LedgerState
    ) -> ProgramOutput:
        program = self.get(program_id)
        if program is None:
            return ProgramOutput(
                success=False,
                error=f"Unknown program: {program_id!r}",
            )
        return program.execute(inp, state)

    @property
    def programs(self) -> dict[bytes, Program]:
        return dict(self._programs)
