"""Tests for SubgridAllocator — 4-type autonomous sub-cell allocation."""
import math
import pytest

from agentic.galaxy.subgrid import SubcellType, SubgridAllocator, SubgridOutput, _level_multiplier
from agentic.params import (
    SUBGRID_SIZE, BASE_SECURE_RATE, BASE_DEVELOP_RATE,
    BASE_RESEARCH_RATE, BASE_STORAGE_RATE, LEVEL_EXPONENT,
)


class TestSubcellType:
    def test_has_secure(self):
        assert SubcellType.SECURE.value == "secure"

    def test_has_develop(self):
        assert SubcellType.DEVELOP.value == "develop"

    def test_has_research(self):
        assert SubcellType.RESEARCH.value == "research"

    def test_has_storage(self):
        assert SubcellType.STORAGE.value == "storage"

    def test_exactly_four_values(self):
        assert len(SubcellType) == 4


class TestSubgridAllocatorInit:
    def test_starts_empty(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        assert alloc.total_cells == 0
        assert alloc.free_cells == SUBGRID_SIZE
        assert alloc.capacity == SUBGRID_SIZE

    def test_count_returns_zero_for_unassigned(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        for ct in SubcellType:
            assert alloc.count(ct) == 0

    def test_default_capacity_is_subgrid_size(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        assert alloc.capacity == 64

    def test_custom_capacity(self):
        alloc = SubgridAllocator(owner=b"test-owner", capacity=32)
        assert alloc.capacity == 32
        assert alloc.free_cells == 32


class TestSubgridAllocatorAssign:
    def test_assign_cells(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        assert alloc.count(SubcellType.SECURE) == 10
        assert alloc.total_cells == 10
        assert alloc.free_cells == 54

    def test_assign_multiple_types(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        alloc.assign(SubcellType.DEVELOP, 20)
        alloc.assign(SubcellType.RESEARCH, 15)
        alloc.assign(SubcellType.STORAGE, 5)
        assert alloc.total_cells == 50
        assert alloc.free_cells == 14

    def test_cannot_exceed_capacity(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        with pytest.raises(ValueError, match="Not enough free cells"):
            alloc.assign(SubcellType.SECURE, 65)

    def test_cannot_exceed_capacity_combined(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 60)
        with pytest.raises(ValueError, match="Not enough free cells"):
            alloc.assign(SubcellType.DEVELOP, 5)

    def test_reassign_frees_old_cells(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 30)
        assert alloc.free_cells == 34
        alloc.assign(SubcellType.SECURE, 10)
        assert alloc.count(SubcellType.SECURE) == 10
        assert alloc.free_cells == 54

    def test_assign_zero_removes_type(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        alloc.assign(SubcellType.SECURE, 0)
        assert alloc.count(SubcellType.SECURE) == 0
        assert alloc.total_cells == 0
        assert alloc.free_cells == 64

    def test_assign_negative_raises(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        with pytest.raises(ValueError, match="count must be >= 0"):
            alloc.assign(SubcellType.SECURE, -1)


class TestSubgridLevels:
    def test_default_level_is_one(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        for ct in SubcellType:
            assert alloc.get_level(ct) == 1

    def test_set_level(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.set_level(SubcellType.SECURE, 3)
        assert alloc.get_level(SubcellType.SECURE) == 3

    def test_level_must_be_at_least_one(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        with pytest.raises(ValueError, match="level must be >= 1"):
            alloc.set_level(SubcellType.SECURE, 0)

    def test_level_zero_raises(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        with pytest.raises(ValueError, match="level must be >= 1"):
            alloc.set_level(SubcellType.DEVELOP, 0)

    def test_assign_sets_default_level(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.RESEARCH, 5)
        assert alloc.get_level(SubcellType.RESEARCH) == 1

    def test_assign_zero_clears_level(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        alloc.set_level(SubcellType.SECURE, 5)
        alloc.assign(SubcellType.SECURE, 0)
        # After removal, level defaults back to 1
        assert alloc.get_level(SubcellType.SECURE) == 1


class TestLevelMultiplier:
    def test_level_1_is_1(self):
        assert _level_multiplier(1) == 1.0

    def test_level_2_follows_exponent(self):
        expected = math.pow(2, LEVEL_EXPONENT)
        assert _level_multiplier(2) == pytest.approx(expected)

    def test_level_below_1_clamps_to_1(self):
        assert _level_multiplier(0) == 1.0
        assert _level_multiplier(-5) == 1.0


class TestSubgridOutput:
    def test_zero_output_with_no_cells(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        out = alloc.compute_output()
        assert out.agntc == 0.0
        assert out.dev_points == 0.0
        assert out.research_points == 0.0
        assert out.storage_units == 0.0

    def test_secure_produces_agntc(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        out = alloc.compute_output()
        assert out.agntc == pytest.approx(BASE_SECURE_RATE * 10)
        assert out.dev_points == 0.0
        assert out.research_points == 0.0
        assert out.storage_units == 0.0

    def test_develop_produces_dev_points(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.DEVELOP, 10)
        out = alloc.compute_output()
        assert out.dev_points == pytest.approx(BASE_DEVELOP_RATE * 10)
        assert out.agntc == 0.0

    def test_research_produces_research_points(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.RESEARCH, 10)
        out = alloc.compute_output()
        assert out.research_points == pytest.approx(BASE_RESEARCH_RATE * 10)
        assert out.agntc == 0.0

    def test_storage_produces_storage_units(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.STORAGE, 10)
        out = alloc.compute_output()
        assert out.storage_units == pytest.approx(BASE_STORAGE_RATE * 10)
        assert out.agntc == 0.0

    def test_level_2_greater_than_level_1(self):
        alloc1 = SubgridAllocator(owner=b"test-owner")
        alloc1.assign(SubcellType.SECURE, 10)

        alloc2 = SubgridAllocator(owner=b"test-owner")
        alloc2.assign(SubcellType.SECURE, 10)
        alloc2.set_level(SubcellType.SECURE, 2)

        out1 = alloc1.compute_output()
        out2 = alloc2.compute_output()
        assert out2.agntc > out1.agntc

    def test_more_cells_greater_output(self):
        alloc1 = SubgridAllocator(owner=b"test-owner")
        alloc1.assign(SubcellType.DEVELOP, 5)

        alloc2 = SubgridAllocator(owner=b"test-owner")
        alloc2.assign(SubcellType.DEVELOP, 20)

        out1 = alloc1.compute_output()
        out2 = alloc2.compute_output()
        assert out2.dev_points > out1.dev_points

    def test_epoch_hardness_reduces_agntc_only(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        alloc.assign(SubcellType.DEVELOP, 10)

        out_h1 = alloc.compute_output(epoch_hardness=1)
        out_h5 = alloc.compute_output(epoch_hardness=5)

        # AGNTC is reduced by hardness
        assert out_h5.agntc < out_h1.agntc
        assert out_h5.agntc == pytest.approx(out_h1.agntc / 5)

        # Dev points are NOT affected by hardness
        assert out_h5.dev_points == pytest.approx(out_h1.dev_points)

    def test_density_scales_agntc_not_dev(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        alloc.assign(SubcellType.DEVELOP, 10)

        out_d1 = alloc.compute_output(density=1.0)
        out_d05 = alloc.compute_output(density=0.5)

        # AGNTC is scaled by density
        assert out_d05.agntc == pytest.approx(out_d1.agntc * 0.5)

        # Dev points are NOT affected by density
        assert out_d05.dev_points == pytest.approx(out_d1.dev_points)

    def test_all_types_produce_simultaneously(self):
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        alloc.assign(SubcellType.DEVELOP, 10)
        alloc.assign(SubcellType.RESEARCH, 10)
        alloc.assign(SubcellType.STORAGE, 10)
        out = alloc.compute_output()
        assert out.agntc > 0
        assert out.dev_points > 0
        assert out.research_points > 0
        assert out.storage_units > 0

    def test_exact_output_values(self):
        """Verify exact output for known parameters."""
        alloc = SubgridAllocator(owner=b"test-owner")
        alloc.assign(SubcellType.SECURE, 10)
        alloc.set_level(SubcellType.SECURE, 2)
        out = alloc.compute_output(density=0.8, epoch_hardness=2)
        expected = BASE_SECURE_RATE * 10 * math.pow(2, LEVEL_EXPONENT) * 0.8 / 2
        assert out.agntc == pytest.approx(expected)
