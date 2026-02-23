"""Tests for galaxy coordinate model and star system generation."""
import pytest


class TestGridCoordinate:
    def test_create_coordinate(self):
        from agentic.galaxy.coordinate import GridCoordinate
        coord = GridCoordinate(x=0, y=0)
        assert coord.x == 0
        assert coord.y == 0

    def test_frozen(self):
        from agentic.galaxy.coordinate import GridCoordinate
        coord = GridCoordinate(x=10, y=-20)
        with pytest.raises(AttributeError):
            coord.x = 5

    def test_bounds_validation(self):
        from agentic.galaxy.coordinate import GridCoordinate, GLOBAL_BOUNDS
        # Reset global bounds to defaults for this test
        GLOBAL_BOUNDS.min_val = -3240
        GLOBAL_BOUNDS.max_val = 3240
        with pytest.raises(ValueError):
            GridCoordinate(x=3241, y=0)
        with pytest.raises(ValueError):
            GridCoordinate(x=0, y=-3241)

    def test_origin(self):
        from agentic.galaxy.coordinate import GridCoordinate
        origin = GridCoordinate(x=0, y=0)
        assert origin.x_offset == 3240
        assert origin.y_offset == 3240

    def test_offsets_non_negative(self):
        from agentic.galaxy.coordinate import GridCoordinate
        coord = GridCoordinate(x=-3240, y=-3240)
        assert coord.x_offset == 0
        assert coord.y_offset == 0
        coord2 = GridCoordinate(x=3240, y=3240)
        assert coord2.x_offset == 6480
        assert coord2.y_offset == 6480

    def test_from_offsets(self):
        from agentic.galaxy.coordinate import GridCoordinate
        coord = GridCoordinate.from_offsets(0, 0)
        assert coord.x == -3240
        assert coord.y == -3240
        coord2 = GridCoordinate.from_offsets(3240, 3240)
        assert coord2.x == 0
        assert coord2.y == 0

    def test_equality_and_hash(self):
        from agentic.galaxy.coordinate import GridCoordinate
        a = GridCoordinate(x=10, y=20)
        b = GridCoordinate(x=10, y=20)
        assert a == b
        assert hash(a) == hash(b)
        assert len({a, b}) == 1


class TestStarSystem:
    def test_seed_deterministic(self):
        from agentic.galaxy.coordinate import star_system_seed
        s1 = star_system_seed(0, 0)
        s2 = star_system_seed(0, 0)
        assert s1 == s2

    def test_seed_varies_by_coordinate(self):
        from agentic.galaxy.coordinate import star_system_seed
        s1 = star_system_seed(0, 0)
        s2 = star_system_seed(1, 0)
        s3 = star_system_seed(0, 1)
        assert s1 != s2
        assert s1 != s3

    def test_resource_density_range(self):
        from agentic.galaxy.coordinate import resource_density
        for x in range(-3240, 3241, 500):
            for y in range(-3240, 3241, 500):
                d = resource_density(x, y)
                assert 0.0 <= d <= 1.0

    def test_resource_density_deterministic(self):
        from agentic.galaxy.coordinate import resource_density
        assert resource_density(42, -99) == resource_density(42, -99)

    def test_storage_slots_range(self):
        from agentic.galaxy.coordinate import storage_slots
        for x in range(-3240, 3241, 500):
            for y in range(-3240, 3241, 500):
                s = storage_slots(x, y)
                assert 1 <= s <= 10

    def test_storage_slots_density_correlation(self):
        from agentic.galaxy.coordinate import resource_density, storage_slots
        high_x, high_y, high_d = 0, 0, 0.0
        low_x, low_y, low_d = 0, 0, 1.0
        for x in range(-100, 101, 10):
            for y in range(-100, 101, 10):
                d = resource_density(x, y)
                if d > high_d:
                    high_x, high_y, high_d = x, y, d
                if d < low_d:
                    low_x, low_y, low_d = x, y, d
        assert storage_slots(high_x, high_y) >= storage_slots(low_x, low_y)


class TestGridBounds:
    def test_default_bounds(self):
        from agentic.galaxy.coordinate import GridBounds
        bounds = GridBounds()
        assert bounds.min_val == -3240
        assert bounds.max_val == 3240

    def test_contains(self):
        from agentic.galaxy.coordinate import GridBounds
        bounds = GridBounds()
        assert bounds.contains(0, 0)
        assert bounds.contains(-3240, -3240)
        assert bounds.contains(3240, 3240)
        assert not bounds.contains(3241, 0)
        assert not bounds.contains(0, -3241)

    def test_expand_to_contain(self):
        from agentic.galaxy.coordinate import GridBounds
        bounds = GridBounds()
        bounds.expand_to_contain(3500, 3500)
        assert bounds.max_val == 3500
        assert bounds.contains(3500, 3500)

    def test_expand_negative(self):
        from agentic.galaxy.coordinate import GridBounds
        bounds = GridBounds()
        bounds.expand_to_contain(-4000, -4000)
        assert bounds.min_val == -4000
        assert bounds.contains(-4000, -4000)

    def test_coordinate_with_custom_bounds(self):
        from agentic.galaxy.coordinate import GridCoordinate, GridBounds
        bounds = GridBounds(initial_min=-10, initial_max=10)
        coord = GridCoordinate(x=5, y=5, bounds=bounds)
        assert coord.x == 5

    def test_coordinate_out_of_custom_bounds(self):
        from agentic.galaxy.coordinate import GridCoordinate, GridBounds
        bounds = GridBounds(initial_min=-10, initial_max=10)
        with pytest.raises(ValueError):
            GridCoordinate(x=11, y=0, bounds=bounds)

    def test_global_bounds_singleton(self):
        from agentic.galaxy.coordinate import GLOBAL_BOUNDS
        assert GLOBAL_BOUNDS.contains(0, 0)
