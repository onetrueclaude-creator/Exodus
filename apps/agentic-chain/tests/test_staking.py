"""Tests for staking registry and lifecycle."""
from __future__ import annotations
import pytest
from agentic.economics.staking import StakeRegistry, StakeEntry, StakeStatus, WARMUP_EPOCHS, COOLDOWN_EPOCHS


class TestStakeRegistry:
    def test_register_stake(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        entry = registry.register_stake(staker=staker, validator_id=0, amount=1000, epoch=0)
        assert entry.staker == staker
        assert entry.validator_id == 0
        assert entry.amount == 1000
        assert entry.status == StakeStatus.WARMUP
        assert entry.start_epoch == 0

    def test_warmup_to_active_transition(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=1000, epoch=0)
        # Before warmup completes
        assert registry.get_active_stake(0) == 0
        # Advance past warmup
        registry.advance_epoch(WARMUP_EPOCHS)
        assert registry.get_active_stake(0) == 1000

    def test_begin_unstake_full(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=1000, epoch=0)
        registry.advance_epoch(WARMUP_EPOCHS)  # activate
        entry = registry.begin_unstake(staker=staker, validator_id=0, amount=1000, epoch=2)
        assert entry is not None
        assert entry.status == StakeStatus.COOLDOWN
        assert entry.cooldown_start_epoch == 2
        # Active stake should be 0 now
        assert registry.get_active_stake(0) == 0

    def test_begin_unstake_insufficient_returns_none(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=500, epoch=0)
        registry.advance_epoch(WARMUP_EPOCHS)
        result = registry.begin_unstake(staker=staker, validator_id=0, amount=1000, epoch=2)
        assert result is None

    def test_cooldown_to_released(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=1000, epoch=0)
        registry.advance_epoch(WARMUP_EPOCHS)  # warmup -> active
        registry.begin_unstake(staker=staker, validator_id=0, amount=1000, epoch=WARMUP_EPOCHS)
        # Advance past cooldown
        released = registry.advance_epoch(WARMUP_EPOCHS + COOLDOWN_EPOCHS)
        assert len(released) == 1
        assert released[0].amount == 1000
        assert released[0].status == StakeStatus.RELEASED
        # Entry should be removed from registry
        assert len(registry.entries) == 0

    def test_partial_unstake(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=1000, epoch=0)
        registry.advance_epoch(WARMUP_EPOCHS)  # activate
        entry = registry.begin_unstake(staker=staker, validator_id=0, amount=400, epoch=2)
        assert entry is not None
        assert entry.amount == 400
        assert entry.status == StakeStatus.COOLDOWN
        # Remaining active stake should be 600
        assert registry.get_active_stake(0) == 600

    def test_get_total_staked(self):
        registry = StakeRegistry()
        staker_a = b"staker_a"
        staker_b = b"staker_b"
        registry.register_stake(staker=staker_a, validator_id=0, amount=1000, epoch=0)
        registry.register_stake(staker=staker_b, validator_id=1, amount=2000, epoch=0)
        # Both in warmup, should count
        assert registry.get_total_staked() == 3000
        # Advance to active
        registry.advance_epoch(WARMUP_EPOCHS)
        assert registry.get_total_staked() == 3000

    def test_get_active_stake(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=500, epoch=0)
        registry.register_stake(staker=staker, validator_id=0, amount=300, epoch=0)
        # In warmup: no active stake
        assert registry.get_active_stake(0) == 0
        registry.advance_epoch(WARMUP_EPOCHS)
        assert registry.get_active_stake(0) == 800

    def test_get_staker_positions(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=500, epoch=0)
        registry.register_stake(staker=staker, validator_id=1, amount=300, epoch=0)
        registry.register_stake(staker=b"other", validator_id=0, amount=200, epoch=0)
        positions = registry.get_staker_positions(staker)
        assert len(positions) == 2

    def test_multiple_validators(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=1000, epoch=0)
        registry.register_stake(staker=staker, validator_id=1, amount=2000, epoch=0)
        registry.advance_epoch(WARMUP_EPOCHS)
        assert registry.get_active_stake(0) == 1000
        assert registry.get_active_stake(1) == 2000

    def test_entries_property_returns_copy(self):
        registry = StakeRegistry()
        staker = b"staker_pub_key_001"
        registry.register_stake(staker=staker, validator_id=0, amount=1000, epoch=0)
        entries = registry.entries
        assert len(entries) == 1
        # Modifying the returned list should not affect internal state
        entries.clear()
        assert len(registry.entries) == 1
