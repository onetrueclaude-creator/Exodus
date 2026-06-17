"""Per-node density (v1.2)."""
from agentic.lattice.coordinate import density_for_node


def test_density_range_and_determinism():
    d = density_for_node("agent-123")
    assert 0.0 <= d <= 1.0
    assert density_for_node("agent-123") == d  # deterministic


def test_singularity_density_clamped():
    assert density_for_node("__singularity__") == 1.0


def test_distinct_ids_vary():
    assert density_for_node("a") != density_for_node("b")
