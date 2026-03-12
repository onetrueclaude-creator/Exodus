"""Tests for the grid expansion EpochTracker."""
from __future__ import annotations
import math
import pytest
from agentic.galaxy.epoch import EpochTracker


class TestThreshold:
    def test_ring_2_threshold(self):
        t = EpochTracker()
        assert t.threshold(2) == 24.0  # 4*2*3

    def test_ring_3_threshold(self):
        t = EpochTracker()
        assert t.threshold(3) == 48.0  # 4*3*4

    def test_ring_10_threshold(self):
        t = EpochTracker()
        assert t.threshold(10) == 440.0  # 4*10*11

    def test_formula(self):
        t = EpochTracker()
        for n in range(1, 20):
            assert t.threshold(n) == 4.0 * n * (n + 1)


class TestHardness:
    def test_ring_1_hardness_is_16(self):
        t = EpochTracker()
        assert t.hardness(1) == 16

    def test_ring_n_hardness_is_16n(self):
        t = EpochTracker()
        for n in range(1, 50):
            assert t.hardness(n) == 16 * n

    def test_hardness_uncapped_v3(self):
        """Hardness = 16 * ring, uncapped (no MAX_EPOCH_HARDNESS)."""
        t = EpochTracker()
        assert t.hardness(1) == 16
        assert t.hardness(10) == 160
        assert t.hardness(100) == 1600
        assert t.hardness(500) == 8000


class TestRecordMined:
    def test_no_expansion_below_threshold(self):
        t = EpochTracker()  # starts at ring 1
        newly = t.record_mined(10.0)  # threshold(2) = 24, not reached
        assert newly == []
        assert t.current_ring == 1

    def test_ring_2_opens_at_24(self):
        t = EpochTracker()
        newly = t.record_mined(24.0)
        assert newly == [2]
        assert t.current_ring == 2

    def test_ring_2_opens_just_above_threshold(self):
        t = EpochTracker()
        t.record_mined(23.9)
        assert t.current_ring == 1
        newly = t.record_mined(0.2)  # crosses 24.0
        assert newly == [2]
        assert t.current_ring == 2

    def test_multiple_rings_open_in_one_block(self):
        t = EpochTracker()
        newly = t.record_mined(1000.0)  # blows past many thresholds
        assert len(newly) > 1
        assert t.current_ring > 2

    def test_ring_3_opens_at_48_cumulative(self):
        t = EpochTracker()
        t.record_mined(24.0)  # opens ring 2
        newly = t.record_mined(24.0)  # cumulative = 48, opens ring 3
        assert newly == [3]
        assert t.current_ring == 3

    def test_total_mined_accumulates(self):
        t = EpochTracker()
        t.record_mined(5.0)
        t.record_mined(3.0)
        assert abs(t.total_mined - 8.0) < 1e-9


class TestNextEpoch:
    def test_next_threshold_is_ring_2_at_start(self):
        t = EpochTracker()
        assert t.next_epoch_threshold() == 24.0

    def test_progress_zero_at_start(self):
        t = EpochTracker()
        assert t.progress_to_next() == 0.0

    def test_progress_half(self):
        t = EpochTracker()
        t.record_mined(12.0)  # half of 24
        assert abs(t.progress_to_next() - 0.5) < 0.01

    def test_progress_one_after_epoch(self):
        t = EpochTracker()
        t.record_mined(24.0)  # ring 2 opens
        p = t.progress_to_next()
        assert 0.0 <= p <= 1.0


class TestHomenodeCoordinate:
    def test_returns_tuple_of_ints(self):
        t = EpochTracker()
        coord = t.homenode_coordinate('community', 1)
        assert isinstance(coord, tuple)
        assert len(coord) == 2
        assert isinstance(coord[0], int)
        assert isinstance(coord[1], int)

    def test_ring_1_is_near_origin(self):
        t = EpochTracker()
        x, y = t.homenode_coordinate('community', 1)
        # Chebyshev distance from origin should be 1
        assert max(abs(x), abs(y)) == 1

    def test_different_factions_different_coords(self):
        t = EpochTracker()
        c = t.homenode_coordinate('community', 3)
        p = t.homenode_coordinate('professional', 3)
        assert c != p

    def test_same_faction_ring_prime_twist(self):
        t = EpochTracker()
        r2 = t.homenode_coordinate('community', 2)
        r3 = t.homenode_coordinate('community', 3)
        # Different rings = different coordinates
        assert r2 != r3

    def test_coords_scale_with_ring(self):
        """Grid is dynamic — no GRID_MIN/MAX clamping. Coords grow with ring."""
        t = EpochTracker()
        for ring in [1, 2, 5, 10, 50]:
            x, y = t.homenode_coordinate('community', ring)
            chebyshev = max(abs(x), abs(y))
            # Chebyshev distance should be close to ring (rounding may shift ±1)
            assert chebyshev >= ring - 1
            assert chebyshev <= ring + 1
