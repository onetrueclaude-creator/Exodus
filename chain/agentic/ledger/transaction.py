"""Transaction types and validation (simulated ZK proofs).

NOT cryptographically secure -- prototype only.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from agentic.ledger.crypto import hash_tag
from agentic.ledger.record import Record
from agentic.galaxy.coordinate import GridCoordinate
from agentic.params import MINT_PROGRAM_ID, TRANSFER_PROGRAM_ID, STAKE_PROGRAM_ID, BIRTH_PROGRAM_ID, BASE_BIRTH_COST

# Type alias for forward references
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agentic.ledger.state import LedgerState
    from agentic.economics.staking import StakeRegistry
    from agentic.galaxy.claims import ClaimRegistry
    from agentic.galaxy.allocator import CoordinateAllocator


@dataclass
class TxResult:
    """Outcome of a transaction validation."""

    valid: bool
    error: str
    records_created: int
    nullifiers_published: int


@dataclass
class MintTx:
    """Mint new tokens into a recipient's account."""

    recipient: bytes
    recipient_viewing_key: bytes
    amount: int
    slot: int
    program_id: bytes = field(default=MINT_PROGRAM_ID)


@dataclass
class TransferTx:
    """Transfer tokens between accounts."""

    input_commitments: list[bytes]
    input_nullifiers: list[bytes]
    input_positions: list[int]
    input_owner: bytes
    output_records: list[Record]
    slot: int
    program_id: bytes = field(default=TRANSFER_PROGRAM_ID)

    @classmethod
    def build(
        cls,
        sender_keys: dict[str, bytes],
        input_records: list[tuple[Record, int]],
        recipient_pubkey: bytes,
        recipient_viewing_key: bytes,
        amount: int,
        slot: int,
    ) -> TransferTx:
        """Construct a transfer transaction.

        Creates output records: one for the recipient (amount) and one for
        the sender as change (total_input - amount), only if change > 0.
        Output record tags use ``hash_tag`` with random tag_nonces.
        """
        input_commitments = [rec.commitment() for rec, _pos in input_records]
        # Use nullifier_key if available; fall back to spending_key for
        # backward compatibility with callers that haven't been updated yet.
        nk = sender_keys.get("nullifier_key", sender_keys["spending_key"])
        input_nullifiers = [
            rec.nullifier(nk)
            for rec, _pos in input_records
        ]
        input_positions = [pos for _rec, pos in input_records]

        total_input = sum(rec.value for rec, _pos in input_records)
        change = total_input - amount

        output_records: list[Record] = []

        # Recipient record
        recipient_tag_nonce = os.urandom(32)
        recipient_tag = hash_tag(
            recipient_viewing_key, TRANSFER_PROGRAM_ID, recipient_tag_nonce,
        )
        recipient_record = Record(
            owner=recipient_pubkey,
            data=[amount],
            nonce=os.urandom(32),
            tag=recipient_tag,
            program_id=TRANSFER_PROGRAM_ID,
            birth_slot=slot,
        )
        output_records.append(recipient_record)

        # Change record (only if change > 0)
        if change > 0:
            sender_tag_nonce = os.urandom(32)
            sender_tag = hash_tag(
                sender_keys["viewing_key"],
                TRANSFER_PROGRAM_ID,
                sender_tag_nonce,
            )
            change_record = Record(
                owner=sender_keys["public_key"],
                data=[change],
                nonce=os.urandom(32),
                tag=sender_tag,
                program_id=TRANSFER_PROGRAM_ID,
                birth_slot=slot,
            )
            output_records.append(change_record)

        return cls(
            input_commitments=input_commitments,
            input_nullifiers=input_nullifiers,
            input_positions=input_positions,
            input_owner=sender_keys["public_key"],
            output_records=output_records,
            slot=slot,
        )


def validate_mint(tx: MintTx, state: LedgerState) -> TxResult:
    """Validate and apply a mint transaction.

    Creates a Record with tag computed via ``hash_tag`` using the current
    ``state.record_count`` as the tag nonce, then inserts into state.
    """
    tag = hash_tag(tx.recipient_viewing_key, tx.program_id, state.record_count.to_bytes(32, 'big'))
    record = Record(
        owner=tx.recipient,
        data=[tx.amount],
        nonce=os.urandom(32),
        tag=tag,
        program_id=tx.program_id,
        birth_slot=tx.slot,
    )
    state.insert_record(record)
    return TxResult(valid=True, error="", records_created=1, nullifiers_published=0)


@dataclass
class StakeTx:
    """Stake AGNTC tokens to become/increase stake as a validator."""

    staker: bytes              # staker's public key
    staker_viewing_key: bytes  # for change record tag computation
    input_commitments: list[bytes]
    input_nullifiers: list[bytes]
    input_positions: list[int]
    amount: int                # amount to stake
    validator_id: int          # which validator slot to stake to
    slot: int
    program_id: bytes = field(default=STAKE_PROGRAM_ID)


@dataclass
class UnstakeTx:
    """Unstake AGNTC tokens (subject to cooldown)."""

    staker: bytes
    validator_id: int
    amount: int
    recipient_viewing_key: bytes  # for output record
    slot: int
    program_id: bytes = field(default=STAKE_PROGRAM_ID)


def validate_transfer(tx: TransferTx, state: LedgerState) -> TxResult:
    """Validate and apply a transfer transaction.

    Checks:
    1. Input commitments exist in PCT
    2. Sender owns inputs
    3. Value conservation (sum inputs == sum outputs)
    4. No output has negative value
    5. Nullifiers are fresh (not already spent)

    If all pass, publishes nullifiers and inserts output records.
    """
    # 1. Check input commitments exist in PCT
    for i, (commitment, position) in enumerate(
        zip(tx.input_commitments, tx.input_positions)
    ):
        leaf = state.pct.get_leaf(position)
        if leaf != commitment:
            return TxResult(
                valid=False,
                error=f"Input {i}: commitment mismatch at position {position}",
                records_created=0,
                nullifiers_published=0,
            )

    # 2. Check sender owns all inputs
    for i, position in enumerate(tx.input_positions):
        record = state.get_record(position)
        if record.owner != tx.input_owner:
            return TxResult(
                valid=False,
                error=f"Input {i}: owner mismatch — sender does not own record at position {position}",
                records_created=0,
                nullifiers_published=0,
            )

    # 3. Value conservation
    input_value = sum(
        state.get_record(pos).value for pos in tx.input_positions
    )
    output_value = sum(r.value for r in tx.output_records)
    if input_value != output_value:
        return TxResult(
            valid=False,
            error=f"Value not conserved: inputs={input_value}, outputs={output_value} (insufficient balance)",
            records_created=0,
            nullifiers_published=0,
        )

    # 4. No negative output values
    for i, record in enumerate(tx.output_records):
        if record.value < 0:
            return TxResult(
                valid=False,
                error=f"Output {i}: negative value {record.value}",
                records_created=0,
                nullifiers_published=0,
            )

    # 5. Nullifiers are fresh
    for i, nullifier in enumerate(tx.input_nullifiers):
        if state.ns.contains(nullifier):
            return TxResult(
                valid=False,
                error=f"Input {i}: double-spend detected (nullifier already published)",
                records_created=0,
                nullifiers_published=0,
            )

    # All checks passed — apply the transaction
    for nullifier in tx.input_nullifiers:
        state.add_nullifier(nullifier)

    for record in tx.output_records:
        state.insert_record(record)

    return TxResult(
        valid=True,
        error="",
        records_created=len(tx.output_records),
        nullifiers_published=len(tx.input_nullifiers),
    )


def validate_stake(tx: StakeTx, state: LedgerState, stake_registry: StakeRegistry) -> TxResult:
    """Validate staking: verify inputs, consume them, register stake.

    1. Verify input commitments exist in PCT
    2. Check sender owns inputs
    3. Verify input value >= amount
    4. Nullify inputs
    5. Create change record if input > amount
    6. Register stake in stake_registry
    """
    from agentic.params import SLOTS_PER_EPOCH

    # 1. Check input commitments exist in PCT
    for i, (commitment, position) in enumerate(
        zip(tx.input_commitments, tx.input_positions)
    ):
        leaf = state.pct.get_leaf(position)
        if leaf != commitment:
            return TxResult(
                valid=False,
                error=f"Input {i}: commitment mismatch at position {position}",
                records_created=0,
                nullifiers_published=0,
            )

    # 2. Check sender owns all inputs
    for i, position in enumerate(tx.input_positions):
        record = state.get_record(position)
        if record.owner != tx.staker:
            return TxResult(
                valid=False,
                error=f"Input {i}: owner mismatch — staker does not own record at position {position}",
                records_created=0,
                nullifiers_published=0,
            )

    # 3. Verify input value >= amount
    input_value = sum(
        state.get_record(pos).value for pos in tx.input_positions
    )
    if input_value < tx.amount:
        return TxResult(
            valid=False,
            error=f"Insufficient input value: inputs={input_value}, stake_amount={tx.amount}",
            records_created=0,
            nullifiers_published=0,
        )

    # 4. Check nullifiers are fresh, then nullify inputs
    for i, nullifier in enumerate(tx.input_nullifiers):
        if state.ns.contains(nullifier):
            return TxResult(
                valid=False,
                error=f"Input {i}: double-spend detected (nullifier already published)",
                records_created=0,
                nullifiers_published=0,
            )

    for nullifier in tx.input_nullifiers:
        state.add_nullifier(nullifier)

    # 5. Create change record if input > amount
    records_created = 0
    change = input_value - tx.amount
    if change > 0:
        change_tag_nonce = os.urandom(32)
        change_tag = hash_tag(tx.staker_viewing_key, STAKE_PROGRAM_ID, change_tag_nonce)
        change_record = Record(
            owner=tx.staker,
            data=[change],
            nonce=os.urandom(32),
            tag=change_tag,
            program_id=STAKE_PROGRAM_ID,
            birth_slot=tx.slot,
        )
        state.insert_record(change_record)
        records_created = 1

    # 6. Register stake in stake_registry
    current_epoch = tx.slot // SLOTS_PER_EPOCH
    stake_registry.register_stake(
        staker=tx.staker,
        validator_id=tx.validator_id,
        amount=tx.amount,
        epoch=current_epoch,
    )

    return TxResult(
        valid=True,
        error="",
        records_created=records_created,
        nullifiers_published=len(tx.input_nullifiers),
    )


def validate_unstake(tx: UnstakeTx, state: LedgerState, stake_registry: StakeRegistry) -> TxResult:
    """Validate unstaking: check stake exists, create output record, mark cooldown.

    1. Verify staker has sufficient active stake
    2. Begin cooldown in stake_registry
    3. Create output record for unstaked amount
    """
    from agentic.params import SLOTS_PER_EPOCH

    current_epoch = tx.slot // SLOTS_PER_EPOCH

    # 1. Verify staker has sufficient active stake for this validator
    positions = stake_registry.get_staker_positions(tx.staker)
    active_for_validator = sum(
        e.amount for e in positions
        if e.validator_id == tx.validator_id and e.status == "active"
    )
    if active_for_validator < tx.amount:
        return TxResult(
            valid=False,
            error=f"Insufficient active stake: have={active_for_validator}, requested={tx.amount}",
            records_created=0,
            nullifiers_published=0,
        )

    # 2. Begin cooldown
    entry = stake_registry.begin_unstake(
        staker=tx.staker,
        validator_id=tx.validator_id,
        amount=tx.amount,
        epoch=current_epoch,
    )
    if entry is None:
        return TxResult(
            valid=False,
            error="Failed to begin unstake: no matching active stake entry found",
            records_created=0,
            nullifiers_published=0,
        )

    # 3. Create output record for unstaked amount
    tag_nonce = os.urandom(32)
    tag = hash_tag(tx.recipient_viewing_key, STAKE_PROGRAM_ID, tag_nonce)
    output_record = Record(
        owner=tx.staker,
        data=[tx.amount],
        nonce=os.urandom(32),
        tag=tag,
        program_id=STAKE_PROGRAM_ID,
        birth_slot=tx.slot,
    )
    state.insert_record(output_record)

    return TxResult(
        valid=True,
        error="",
        records_created=1,
        nullifiers_published=0,
    )


@dataclass
class BirthTx:
    """Birth a new star system at an auto-assigned coordinate.

    Consumes AGNTC value Records and creates a coordinate-bound
    Star System Record. Cost = BASE_BIRTH_COST * ring_number.
    """

    staker: bytes
    staker_viewing_key: bytes
    input_commitments: list[bytes]
    input_nullifiers: list[bytes]
    input_positions: list[int]
    home_star: GridCoordinate
    slot: int
    program_id: bytes = field(default=BIRTH_PROGRAM_ID)


def validate_birth(
    tx: BirthTx,
    state: LedgerState,
    claim_registry: ClaimRegistry,
    allocator: CoordinateAllocator,
) -> TxResult:
    """Validate and apply a birth transaction.

    1. Find next available coordinate via allocator
    2. Calculate birth cost (BASE_BIRTH_COST * ring_number)
    3. Verify input commitments exist in PCT
    4. Check sender owns inputs
    5. Verify input value >= birth_cost
    6. Check nullifiers are fresh, then nullify
    7. Create Star System Record with coordinate data
    8. Create change record if overpaid
    9. Register claim in ClaimRegistry
    """
    from agentic.galaxy.coordinate import resource_density, storage_slots

    # 1. Find next coordinate
    coord, ring_number = allocator.next_coordinate(tx.home_star, claim_registry)

    # 2. Calculate cost
    birth_cost = BASE_BIRTH_COST * ring_number

    # 3. Check input commitments exist in PCT
    for i, (commitment, position) in enumerate(
        zip(tx.input_commitments, tx.input_positions)
    ):
        leaf = state.pct.get_leaf(position)
        if leaf != commitment:
            return TxResult(
                valid=False,
                error=f"Input {i}: commitment mismatch at position {position}",
                records_created=0,
                nullifiers_published=0,
            )

    # 4. Check sender owns all inputs
    for i, position in enumerate(tx.input_positions):
        record = state.get_record(position)
        if record.owner != tx.staker:
            return TxResult(
                valid=False,
                error=f"Input {i}: owner mismatch",
                records_created=0,
                nullifiers_published=0,
            )

    # 5. Verify input value >= birth_cost
    input_value = sum(
        state.get_record(pos).value for pos in tx.input_positions
    )
    if input_value < birth_cost:
        return TxResult(
            valid=False,
            error=f"Insufficient balance: inputs={input_value}, birth_cost={birth_cost} (ring {ring_number})",
            records_created=0,
            nullifiers_published=0,
        )

    # 6. Check nullifiers are fresh, then nullify inputs
    for i, nullifier in enumerate(tx.input_nullifiers):
        if state.ns.contains(nullifier):
            return TxResult(
                valid=False,
                error=f"Input {i}: double-spend detected (nullifier already published)",
                records_created=0,
                nullifiers_published=0,
            )

    for nullifier in tx.input_nullifiers:
        state.add_nullifier(nullifier)

    records_created = 0

    # 7. Create Star System Record
    density = resource_density(coord.x, coord.y)
    slots = storage_slots(coord.x, coord.y)
    density_scaled = int(density * 1_000_000)

    star_tag = hash_tag(tx.staker_viewing_key, BIRTH_PROGRAM_ID, state.record_count.to_bytes(32, 'big'))
    star_record = Record(
        owner=tx.staker,
        data=[birth_cost, coord.x_offset, coord.y_offset, density_scaled, slots],
        nonce=os.urandom(32),
        tag=star_tag,
        program_id=BIRTH_PROGRAM_ID,
        birth_slot=tx.slot,
    )
    state.insert_record(star_record)
    records_created += 1

    # 8. Create change record if overpaid
    change = input_value - birth_cost
    if change > 0:
        change_tag_nonce = os.urandom(32)
        change_tag = hash_tag(tx.staker_viewing_key, MINT_PROGRAM_ID, change_tag_nonce)
        change_record = Record(
            owner=tx.staker,
            data=[change],
            nonce=os.urandom(32),
            tag=change_tag,
            program_id=MINT_PROGRAM_ID,
            birth_slot=tx.slot,
        )
        state.insert_record(change_record)
        records_created += 1

    # 9. Register claim
    claim_registry.register(
        owner=tx.staker,
        coordinate=coord,
        stake=birth_cost,
        slot=tx.slot,
    )

    return TxResult(
        valid=True,
        error="",
        records_created=records_created,
        nullifiers_published=len(tx.input_nullifiers),
    )
