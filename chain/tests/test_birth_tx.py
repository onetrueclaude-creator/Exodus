"""Tests for BirthTx — star system creation transaction."""
import pytest
from agentic.ledger.state import LedgerState
from agentic.ledger.transaction import validate_mint, MintTx
from agentic.ledger.crypto import generate_key_pair, hash_tag
from agentic.lattice.coordinate import GridCoordinate
from agentic.lattice.claims import ClaimRegistry
from agentic.params import MINT_PROGRAM_ID, BASE_BIRTH_COST


def _fund_wallet(state, keys, amount, slot=0):
    """Mint AGNTC into a wallet, return (record, position)."""
    tx = MintTx(
        recipient=keys["public_key"],
        recipient_viewing_key=keys["viewing_key"],
        amount=amount, slot=slot,
    )
    tag = hash_tag(keys["viewing_key"], MINT_PROGRAM_ID, state.record_count.to_bytes(32, 'big'))
    validate_mint(tx, state)
    positions = state.tag_index.get(tag, [])
    record = state.get_record(positions[0])
    return record, positions[0]


class TestBirthTx:
    def test_import(self):
        from agentic.ledger.transaction import BirthTx, validate_birth
        assert BirthTx is not None
        assert validate_birth is not None

    def test_valid_birth(self):
        from agentic.ledger.transaction import BirthTx, validate_birth
        from agentic.lattice.allocator import CoordinateAllocator
        state = LedgerState()
        keys = generate_key_pair(1)
        registry = ClaimRegistry()
        allocator = CoordinateAllocator()

        record, pos = _fund_wallet(state, keys, BASE_BIRTH_COST + 50)
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=keys["public_key"], coordinate=home, stake=0, slot=0)

        tx = BirthTx(
            staker=keys["public_key"],
            staker_viewing_key=keys["viewing_key"],
            input_commitments=[record.commitment()],
            input_nullifiers=[record.nullifier(keys["spending_key"])],
            input_positions=[pos],
            home_star=home,
            slot=1,
        )
        result = validate_birth(tx, state, registry, allocator)
        assert result.valid
        assert result.records_created >= 1

    def test_birth_creates_star_system_record(self):
        from agentic.ledger.transaction import BirthTx, validate_birth
        from agentic.lattice.allocator import CoordinateAllocator
        from agentic.params import BIRTH_PROGRAM_ID
        state = LedgerState()
        keys = generate_key_pair(1)
        registry = ClaimRegistry()
        allocator = CoordinateAllocator()

        record, pos = _fund_wallet(state, keys, BASE_BIRTH_COST)
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=keys["public_key"], coordinate=home, stake=0, slot=0)

        initial_count = state.record_count
        tx = BirthTx(
            staker=keys["public_key"],
            staker_viewing_key=keys["viewing_key"],
            input_commitments=[record.commitment()],
            input_nullifiers=[record.nullifier(keys["spending_key"])],
            input_positions=[pos],
            home_star=home,
            slot=1,
        )
        validate_birth(tx, state, registry, allocator)

        found_birth = False
        for i in range(initial_count, state.record_count):
            r = state.get_record(i)
            if r.program_id == BIRTH_PROGRAM_ID:
                found_birth = True
                assert r.owner == keys["public_key"]
                assert len(r.data) == 5
                assert r.data[0] == BASE_BIRTH_COST
        assert found_birth

    def test_birth_registers_claim(self):
        from agentic.ledger.transaction import BirthTx, validate_birth
        from agentic.lattice.allocator import CoordinateAllocator
        state = LedgerState()
        keys = generate_key_pair(1)
        registry = ClaimRegistry()
        allocator = CoordinateAllocator()

        record, pos = _fund_wallet(state, keys, BASE_BIRTH_COST)
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=keys["public_key"], coordinate=home, stake=0, slot=0)

        initial_claims = len(registry.all_active_claims())
        tx = BirthTx(
            staker=keys["public_key"],
            staker_viewing_key=keys["viewing_key"],
            input_commitments=[record.commitment()],
            input_nullifiers=[record.nullifier(keys["spending_key"])],
            input_positions=[pos],
            home_star=home,
            slot=1,
        )
        validate_birth(tx, state, registry, allocator)
        assert len(registry.all_active_claims()) == initial_claims + 1

    def test_birth_nullifies_inputs(self):
        from agentic.ledger.transaction import BirthTx, validate_birth
        from agentic.lattice.allocator import CoordinateAllocator
        state = LedgerState()
        keys = generate_key_pair(1)
        registry = ClaimRegistry()
        allocator = CoordinateAllocator()

        record, pos = _fund_wallet(state, keys, BASE_BIRTH_COST)
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=keys["public_key"], coordinate=home, stake=0, slot=0)

        nullifier = record.nullifier(keys["spending_key"])
        tx = BirthTx(
            staker=keys["public_key"],
            staker_viewing_key=keys["viewing_key"],
            input_commitments=[record.commitment()],
            input_nullifiers=[nullifier],
            input_positions=[pos],
            home_star=home,
            slot=1,
        )
        validate_birth(tx, state, registry, allocator)
        assert state.ns.contains(nullifier)

    def test_birth_returns_change(self):
        from agentic.ledger.transaction import BirthTx, validate_birth
        from agentic.lattice.allocator import CoordinateAllocator
        state = LedgerState()
        keys = generate_key_pair(1)
        registry = ClaimRegistry()
        allocator = CoordinateAllocator()

        overpay = 250
        record, pos = _fund_wallet(state, keys, overpay)
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=keys["public_key"], coordinate=home, stake=0, slot=0)

        initial_count = state.record_count
        tx = BirthTx(
            staker=keys["public_key"],
            staker_viewing_key=keys["viewing_key"],
            input_commitments=[record.commitment()],
            input_nullifiers=[record.nullifier(keys["spending_key"])],
            input_positions=[pos],
            home_star=home,
            slot=1,
        )
        result = validate_birth(tx, state, registry, allocator)
        assert result.records_created == 2  # star system + change

        change_found = False
        for i in range(initial_count, state.record_count):
            r = state.get_record(i)
            if r.program_id != b"agentic_birth" and r.value == 150:
                change_found = True
        assert change_found

    def test_insufficient_balance_rejected(self):
        from agentic.ledger.transaction import BirthTx, validate_birth
        from agentic.lattice.allocator import CoordinateAllocator
        state = LedgerState()
        keys = generate_key_pair(1)
        registry = ClaimRegistry()
        allocator = CoordinateAllocator()

        record, pos = _fund_wallet(state, keys, 50)
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=keys["public_key"], coordinate=home, stake=0, slot=0)

        tx = BirthTx(
            staker=keys["public_key"],
            staker_viewing_key=keys["viewing_key"],
            input_commitments=[record.commitment()],
            input_nullifiers=[record.nullifier(keys["spending_key"])],
            input_positions=[pos],
            home_star=home,
            slot=1,
        )
        result = validate_birth(tx, state, registry, allocator)
        assert not result.valid
        assert "insufficient" in result.error.lower()

    def test_double_spend_rejected(self):
        from agentic.ledger.transaction import BirthTx, validate_birth
        from agentic.lattice.allocator import CoordinateAllocator
        state = LedgerState()
        keys = generate_key_pair(1)
        registry = ClaimRegistry()
        allocator = CoordinateAllocator()

        record, pos = _fund_wallet(state, keys, BASE_BIRTH_COST * 2)
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=keys["public_key"], coordinate=home, stake=0, slot=0)

        tx1 = BirthTx(
            staker=keys["public_key"],
            staker_viewing_key=keys["viewing_key"],
            input_commitments=[record.commitment()],
            input_nullifiers=[record.nullifier(keys["spending_key"])],
            input_positions=[pos],
            home_star=home,
            slot=1,
        )
        result1 = validate_birth(tx1, state, registry, allocator)
        assert result1.valid

        tx2 = BirthTx(
            staker=keys["public_key"],
            staker_viewing_key=keys["viewing_key"],
            input_commitments=[record.commitment()],
            input_nullifiers=[record.nullifier(keys["spending_key"])],
            input_positions=[pos],
            home_star=home,
            slot=2,
        )
        result2 = validate_birth(tx2, state, registry, allocator)
        assert not result2.valid
        assert "double-spend" in result2.error.lower()
