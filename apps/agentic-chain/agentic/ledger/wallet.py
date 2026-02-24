"""Wallet for Agentic Chain ledger."""
from __future__ import annotations

from agentic.ledger.crypto import generate_key_pair, hash_tag
from agentic.ledger.record import Record
from agentic.ledger.state import LedgerState
from agentic.ledger.transaction import (
    MintTx, TransferTx, TxResult, validate_mint, validate_transfer,
)
from agentic.params import MINT_PROGRAM_ID, TRANSFER_PROGRAM_ID


class Wallet:
    """A user wallet that tracks keys, known tags, and discovers records."""

    def __init__(self, name: str, seed: int):
        self.name = name
        keys = generate_key_pair(seed)
        self.spending_key = keys["spending_key"]
        self.viewing_key = keys["viewing_key"]
        self.public_key = keys["public_key"]
        self._known_tags: list[bytes] = []
        self._tag_counter: int = 0

    # ------------------------------------------------------------------ #
    #  Tag management
    # ------------------------------------------------------------------ #

    def _next_tag(self, program_id: bytes) -> bytes:
        """Generate the next deterministic tag and remember it."""
        tag = hash_tag(self.viewing_key, program_id, self._tag_counter)
        self._tag_counter += 1
        self._known_tags.append(tag)
        return tag

    # ------------------------------------------------------------------ #
    #  Minting
    # ------------------------------------------------------------------ #

    def receive_mint(self, state: LedgerState, amount: int, slot: int) -> TxResult:
        """Create and validate a mint transaction for this wallet."""
        tx = MintTx(
            recipient=self.public_key,
            recipient_viewing_key=self.viewing_key,
            amount=amount,
            slot=slot,
        )
        # Pre-compute the tag that validate_mint will generate so we can
        # discover the record later.  validate_mint uses
        # hash_tag(viewing_key, program_id, state.record_count) as the tag.
        expected_tag = hash_tag(self.viewing_key, MINT_PROGRAM_ID, state.record_count)
        self._known_tags.append(expected_tag)
        return validate_mint(tx, state)

    # ------------------------------------------------------------------ #
    #  Record discovery
    # ------------------------------------------------------------------ #

    def discover_records(self, state: LedgerState) -> list[Record]:
        """Return all unspent records whose tag we know about."""
        records: list[Record] = []
        for tag in self._known_tags:
            positions = state.tag_index.get(tag, [])
            for pos in positions:
                record = state.get_record(pos)
                nf = record.nullifier(self.spending_key)
                if not state.ns.contains(nf):
                    records.append(record)
        return records

    def _discover_records_with_positions(
        self, state: LedgerState,
    ) -> list[tuple[Record, int]]:
        """Return unspent (record, position) pairs whose tag we know about."""
        results: list[tuple[Record, int]] = []
        for tag in self._known_tags:
            positions = state.tag_index.get(tag, [])
            for pos in positions:
                record = state.get_record(pos)
                nf = record.nullifier(self.spending_key)
                if not state.ns.contains(nf):
                    results.append((record, pos))
        return results

    # ------------------------------------------------------------------ #
    #  Balance
    # ------------------------------------------------------------------ #

    def get_balance(self, state: LedgerState) -> int:
        """Sum of all unspent record values owned by this wallet."""
        return sum(r.value for r in self.discover_records(state))

    # ------------------------------------------------------------------ #
    #  Transfers
    # ------------------------------------------------------------------ #

    def transfer(
        self,
        state: LedgerState,
        recipient: Wallet,
        amount: int,
        slot: int,
    ) -> TxResult:
        """Build, validate, and apply a transfer to *recipient*."""
        unspent = self._discover_records_with_positions(state)

        # Greedy coin selection
        selected: list[tuple[Record, int]] = []
        total = 0
        for record, pos in unspent:
            selected.append((record, pos))
            total += record.value
            if total >= amount:
                break

        if total < amount:
            return TxResult(
                valid=False,
                error="Insufficient balance",
                records_created=0,
                nullifiers_published=0,
            )

        sender_keys = {
            "spending_key": self.spending_key,
            "viewing_key": self.viewing_key,
            "public_key": self.public_key,
        }

        tx = TransferTx.build(
            sender_keys=sender_keys,
            input_records=selected,
            recipient_pubkey=recipient.public_key,
            recipient_viewing_key=recipient.viewing_key,
            amount=amount,
            slot=slot,
        )

        # Track output tags so both sender and recipient can discover
        # the newly created records.
        for record in tx.output_records:
            if record.owner == self.public_key:
                self._known_tags.append(record.tag)
            elif record.owner == recipient.public_key:
                recipient._known_tags.append(record.tag)

        return validate_transfer(tx, state)
