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


def test_result_is_rounded_to_two_decimals():
    vx, vy = chain_to_visual(100, 200)
    assert vx == round(vx, 2)
    assert vy == round(vy, 2)
