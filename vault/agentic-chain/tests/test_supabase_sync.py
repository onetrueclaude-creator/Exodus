"""Tests for supabase_sync coordinate helpers."""
import pytest
from agentic.testnet.supabase_sync import chain_to_visual


def test_origin_maps_to_zero():
    vx, vy = chain_to_visual(0, 0)
    assert vx == 0.0
    assert vy == 0.0


def test_min_corner_maps_to_negative_half():
    vx, vy = chain_to_visual(-3240, -3240)
    assert vx == pytest.approx(-4000.0, abs=0.1)
    assert vy == pytest.approx(-4000.0, abs=0.1)


def test_max_corner_maps_to_positive_half():
    vx, vy = chain_to_visual(3240, 3240)
    assert vx == pytest.approx(4000.0, abs=0.1)
    assert vy == pytest.approx(4000.0, abs=0.1)


def test_known_midpoint_value():
    """chain_to_visual(1620, -1620) should give (2000.0, -2000.0)."""
    vx, vy = chain_to_visual(1620, -1620)
    assert vx == pytest.approx(2000.0, abs=0.01)
    assert vy == pytest.approx(-2000.0, abs=0.01)
