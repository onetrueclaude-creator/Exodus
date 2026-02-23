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


def test_sync_message_signature_exists():
    """sync_message must exist and accept the expected arguments."""
    from agentic.testnet.supabase_sync import sync_message
    import inspect
    sig = inspect.signature(sync_message)
    params = list(sig.parameters.keys())
    assert "msg_id" in params
    assert "sx" in params
    assert "sy" in params
    assert "tx" in params
    assert "ty" in params
    assert "text" in params
    assert "timestamp" in params
