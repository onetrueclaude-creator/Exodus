"""Tests for v3 city real estate claim cost model."""
import pytest
from agentic.galaxy.coordinate import claim_cost, resource_density


def test_claim_cost_inner_ring_high_density():
    from agentic.params import BASE_CLAIM_COST, BASE_CLAIM_CPU, MIN_CLAIM_COST, MIN_CLAIM_CPU
    cost = claim_cost(x=0, y=0, ring=1)
    density = resource_density(0, 0)
    expected_agntc = max(BASE_CLAIM_COST * density * 1.0, MIN_CLAIM_COST)
    expected_cpu = max(BASE_CLAIM_CPU * density * 1.0, MIN_CLAIM_CPU)
    assert cost["agntc"] == pytest.approx(expected_agntc, rel=1e-4)
    assert cost["cpu"] == pytest.approx(expected_cpu, rel=1e-4)


def test_claim_cost_city_model_inner_more_expensive():
    cost_inner = claim_cost(x=0, y=10, ring=1)
    cost_outer = claim_cost(x=0, y=10, ring=10)
    assert cost_inner["agntc"] > cost_outer["agntc"]
    assert cost_inner["cpu"] > cost_outer["cpu"]


def test_claim_cost_floor_applied():
    cost = claim_cost(x=500, y=500, ring=100)
    from agentic.params import MIN_CLAIM_COST, MIN_CLAIM_CPU
    assert cost["agntc"] >= MIN_CLAIM_COST
    assert cost["cpu"] >= MIN_CLAIM_CPU


def test_claim_cost_returns_dict_with_keys():
    cost = claim_cost(x=0, y=0, ring=1)
    assert "agntc" in cost
    assert "cpu" in cost


def test_claim_cost_ring_zero_safe():
    """ring=0 should not cause division by zero."""
    cost = claim_cost(x=0, y=0, ring=0)
    assert cost["agntc"] > 0
