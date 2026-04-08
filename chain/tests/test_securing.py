"""Tests for the Securing module — active CPU Energy commitments.

Securing is DISTINCT from mining:
- Mining = block production → block subsidy (new coins)
- Securing = chain protection → fee rewards (existing coins)

Like Bitcoin: miners earn block rewards, securers earn from fees.
"""
import pytest
from agentic.economics.securing import SecuringRegistry, SecuringPosition, SecuringStatus
from agentic.params import BASE_CPU_PER_SECURE_BLOCK, SECURE_REWARD_IMMEDIATE


@pytest.fixture
def registry():
    return SecuringRegistry()


@pytest.fixture
def owner():
    return b"wallet_owner_001"


class TestSecuringPosition:
    """Test creating and managing securing positions."""

    def test_create_position(self, registry, owner):
        pos = registry.create_position(
            wallet_index=0, owner=owner,
            duration_blocks=10, current_block=5,
            node_x=0, node_y=0,
        )
        assert pos.wallet_index == 0
        assert pos.owner == owner
        assert pos.start_block == 6  # starts next block
        assert pos.end_block == 16   # 6 + 10
        assert pos.status == SecuringStatus.ACTIVE
        assert pos.secured_blocks == 0
        assert pos.total_reward == 0.0
        assert pos.cpu_committed > 0

    def test_cpu_cost_scales_with_duration(self, registry):
        cost_5, _ = registry.compute_cpu_cost(5, 0, 0)
        cost_10, _ = registry.compute_cpu_cost(10, 0, 0)
        assert cost_10 == pytest.approx(cost_5 * 2, rel=0.01)

    def test_cpu_cost_scales_with_density(self, registry):
        # Different coordinates have different densities
        cost_a, density_a = registry.compute_cpu_cost(10, 0, 0)
        cost_b, density_b = registry.compute_cpu_cost(10, 10, 10)
        # Costs should differ if densities differ
        if density_a != density_b:
            assert cost_a != cost_b

    def test_cpu_cost_has_floor(self, registry):
        """Even at very low density, cost never goes to zero."""
        cost, density = registry.compute_cpu_cost(10, 9999, 9999)
        assert cost > 0

    def test_position_id_unique(self, registry, owner):
        pos1 = registry.create_position(0, owner, 10, 0, 0, 0)
        pos2 = registry.create_position(0, owner, 10, 0, 0, 0)
        assert pos1.id != pos2.id


class TestSecuringProcessBlock:
    """Test per-block reward processing."""

    def test_no_reward_before_start_block(self, registry, owner):
        registry.create_position(0, owner, 10, 5, 0, 0)
        # Position starts at block 6, process block 5
        rewards = registry.process_block(5, fee_pool_for_stakers=1.0, hardness=16)
        assert len(rewards) == 0

    def test_reward_during_active_period(self, registry, owner):
        registry.create_position(0, owner, 10, 5, 0, 0)
        # Position starts at block 6
        rewards = registry.process_block(6, fee_pool_for_stakers=1.0, hardness=16)
        assert owner in rewards
        assert rewards[owner] > 0

    def test_secured_blocks_increment(self, registry, owner):
        pos = registry.create_position(0, owner, 10, 5, 0, 0)
        registry.process_block(6, fee_pool_for_stakers=1.0, hardness=16)
        assert pos.secured_blocks == 1
        registry.process_block(7, fee_pool_for_stakers=1.0, hardness=16)
        assert pos.secured_blocks == 2

    def test_position_completes_at_end_block(self, registry, owner):
        pos = registry.create_position(0, owner, 3, 5, 0, 0)
        # Blocks 6, 7, 8 should be active; block 9 should complete
        registry.process_block(6, fee_pool_for_stakers=1.0, hardness=16)
        registry.process_block(7, fee_pool_for_stakers=1.0, hardness=16)
        registry.process_block(8, fee_pool_for_stakers=1.0, hardness=16)
        assert pos.status == SecuringStatus.ACTIVE
        assert pos.secured_blocks == 3
        # Block 9 = end_block, should complete
        rewards = registry.process_block(9, fee_pool_for_stakers=1.0, hardness=16)
        assert pos.status == SecuringStatus.COMPLETED
        assert owner not in rewards  # no reward on completion block

    def test_reward_split_immediate_and_vesting(self, registry, owner):
        pos = registry.create_position(0, owner, 10, 0, 0, 0)
        registry.process_block(1, fee_pool_for_stakers=2.0, hardness=16)
        # Reward should be split: 50% immediate, 50% vesting
        assert pos.immediate_reward > 0
        assert pos.vesting_reward > 0
        assert pos.immediate_reward == pytest.approx(
            pos.total_reward * SECURE_REWARD_IMMEDIATE, rel=0.01
        )

    def test_multiple_positions_share_fee_pool(self, registry):
        owner_a = b"wallet_a"
        owner_b = b"wallet_b"
        pos_a = registry.create_position(0, owner_a, 10, 0, 0, 0)
        pos_b = registry.create_position(1, owner_b, 10, 0, 10, 10)
        rewards = registry.process_block(1, fee_pool_for_stakers=2.0, hardness=16)
        # Both should get rewards proportional to CPU committed
        assert owner_a in rewards
        assert owner_b in rewards
        total = rewards[owner_a] + rewards[owner_b]
        # Total distributed should be <= fee pool × SECURE_REWARD_IMMEDIATE
        assert total <= 2.0 * SECURE_REWARD_IMMEDIATE + 0.001

    def test_no_reward_with_zero_fee_pool(self, registry, owner):
        registry.create_position(0, owner, 10, 0, 0, 0)
        rewards = registry.process_block(1, fee_pool_for_stakers=0.0, hardness=16)
        assert rewards.get(owner, 0.0) == 0.0


class TestSecuringRegistry:
    """Test registry querying methods."""

    def test_get_positions(self, registry, owner):
        registry.create_position(0, owner, 5, 0, 0, 0)
        registry.create_position(0, owner, 10, 0, 0, 0)
        positions = registry.get_positions(0)
        assert len(positions) == 2

    def test_get_positions_different_wallets(self, registry):
        registry.create_position(0, b"a", 5, 0, 0, 0)
        registry.create_position(1, b"b", 5, 0, 0, 0)
        assert len(registry.get_positions(0)) == 1
        assert len(registry.get_positions(1)) == 1

    def test_get_secured_chains(self, registry, owner):
        registry.create_position(0, owner, 5, 0, 0, 0)
        registry.process_block(1, fee_pool_for_stakers=1.0, hardness=16)
        registry.process_block(2, fee_pool_for_stakers=1.0, hardness=16)
        assert registry.get_secured_chains(0) == 2

    def test_total_active_cpu(self, registry):
        registry.create_position(0, b"a", 10, 0, 0, 0)
        registry.create_position(1, b"b", 10, 0, 10, 10)
        total = registry.total_active_cpu(1)
        assert total > 0

    def test_get_cpu_for_owner(self, registry, owner):
        registry.create_position(0, owner, 10, 0, 0, 0)
        cpu = registry.get_cpu_for_owner(owner, 1)
        assert cpu > 0
        # Different owner should have 0
        assert registry.get_cpu_for_owner(b"other", 1) == 0.0
