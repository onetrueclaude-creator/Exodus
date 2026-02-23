"""Tests for birth-related protocol parameters."""
import pytest


def test_birth_program_id_exists():
    from agentic.params import BIRTH_PROGRAM_ID
    assert isinstance(BIRTH_PROGRAM_ID, bytes)
    assert len(BIRTH_PROGRAM_ID) > 0


def test_base_birth_cost():
    from agentic.params import BASE_BIRTH_COST
    assert BASE_BIRTH_COST == 100


def test_birth_program_id_distinct():
    from agentic.params import (
        BIRTH_PROGRAM_ID, MINT_PROGRAM_ID,
        TRANSFER_PROGRAM_ID, STAKE_PROGRAM_ID,
        CLAIM_PROGRAM_ID,
    )
    ids = [BIRTH_PROGRAM_ID, MINT_PROGRAM_ID, TRANSFER_PROGRAM_ID,
           STAKE_PROGRAM_ID, CLAIM_PROGRAM_ID]
    assert len(set(ids)) == len(ids), "All program IDs must be unique"
