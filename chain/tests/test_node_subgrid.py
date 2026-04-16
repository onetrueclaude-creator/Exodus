import pytest
from agentic.lattice.node_subgrid import (
    NodeSubgrid, Cell, CellState, CellType, WARMUP_BLOCKS,
    compute_node_output,
)


def test_new_node_subgrid_is_64_unassigned_active_cells():
    ns = NodeSubgrid.new(node_id="claim-1", owner=b"wallet", created_at_block=0)
    assert len(ns.cells) == 64
    assert all(c.type is None and c.state is CellState.ACTIVE for c in ns.cells)
    assert ns.type_levels == {ct: 1 for ct in CellType}


def test_commit_diff_sets_cells_to_warmup_with_pending_type():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=10)
    ns.commit_diff([(0, CellType.SECURE), (5, CellType.DEVELOP)], current_block=20)
    assert ns.cells[0].state is CellState.WARMUP
    assert ns.cells[0].pending_type is CellType.SECURE
    assert ns.cells[0].since_block == 20
    assert ns.cells[5].pending_type is CellType.DEVELOP


def test_tick_transitions_warmup_to_active_after_100_blocks():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    ns.commit_diff([(0, CellType.SECURE)], current_block=50)
    ns.tick(current_block=50 + WARMUP_BLOCKS - 1)
    assert ns.cells[0].state is CellState.WARMUP
    ns.tick(current_block=50 + WARMUP_BLOCKS)
    assert ns.cells[0].state is CellState.ACTIVE
    assert ns.cells[0].type is CellType.SECURE
    assert ns.cells[0].pending_type is None


def test_active_counts_per_type():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    ns.commit_diff([(i, CellType.SECURE) for i in range(16)], current_block=0)
    # Warmup cells do not count as active
    assert ns.count_active(CellType.SECURE) == 0
    ns.tick(current_block=WARMUP_BLOCKS)
    assert ns.count_active(CellType.SECURE) == 16
    assert ns.count_active(CellType.DEVELOP) == 0


def test_commit_diff_rejects_out_of_range_index():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    with pytest.raises(ValueError, match="cell index"):
        ns.commit_diff([(64, CellType.SECURE)], current_block=0)


def test_commit_diff_rejects_duplicate_indices():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    with pytest.raises(ValueError, match="duplicate"):
        ns.commit_diff([(0, CellType.SECURE), (0, CellType.DEVELOP)], current_block=0)


def test_set_type_level_updates_type_levels():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    ns.set_type_level(CellType.SECURE, 3)
    assert ns.type_levels[CellType.SECURE] == 3
    # Other types unchanged
    assert ns.type_levels[CellType.DEVELOP] == 1


def test_set_type_level_rejects_level_below_one():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    with pytest.raises(ValueError, match="level must be >= 1"):
        ns.set_type_level(CellType.SECURE, 0)
    with pytest.raises(ValueError, match="level must be >= 1"):
        ns.set_type_level(CellType.SECURE, -5)


def test_commit_diff_rejects_negative_index():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    with pytest.raises(ValueError, match="cell index"):
        ns.commit_diff([(-1, CellType.SECURE)], current_block=0)


def test_commit_diff_reassigning_warmup_cell_resets_clock_and_pending_type():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    # First commit: cell 0 -> SECURE at block 10
    ns.commit_diff([(0, CellType.SECURE)], current_block=10)
    assert ns.cells[0].state is CellState.WARMUP
    assert ns.cells[0].since_block == 10
    assert ns.cells[0].pending_type is CellType.SECURE
    # Re-commit before warmup completes: cell 0 -> DEVELOP at block 50
    ns.commit_diff([(0, CellType.DEVELOP)], current_block=50)
    assert ns.cells[0].state is CellState.WARMUP
    assert ns.cells[0].since_block == 50
    assert ns.cells[0].pending_type is CellType.DEVELOP
    # Warmup now counts from block 50, so tick at block 140 (50+90) is still WARMUP
    ns.tick(current_block=140)
    assert ns.cells[0].state is CellState.WARMUP
    # Tick at block 150 (50 + WARMUP_BLOCKS) promotes to ACTIVE with DEVELOP type
    ns.tick(current_block=150)
    assert ns.cells[0].state is CellState.ACTIVE
    assert ns.cells[0].type is CellType.DEVELOP
    assert ns.cells[0].pending_type is None


def test_whitepaper_example_1_balanced_ring_1():
    # §17.2 Example 1: ring 1, density 0.6, 16 of each at level 1
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    diffs = []
    for i in range(16):
        diffs.append((i, CellType.SECURE))
    for i in range(16, 32):
        diffs.append((i, CellType.DEVELOP))
    for i in range(32, 48):
        diffs.append((i, CellType.RESEARCH))
    for i in range(48, 64):
        diffs.append((i, CellType.STORAGE))
    ns.commit_diff(diffs, current_block=0)
    ns.tick(current_block=WARMUP_BLOCKS)

    out = compute_node_output(ns, density=0.6, ring=1)
    assert out.agntc == pytest.approx(0.300, abs=1e-4)
    assert out.dev_points == pytest.approx(16.000, abs=1e-4)
    assert out.research_points == pytest.approx(8.000, abs=1e-4)
    assert out.storage_units == pytest.approx(16.000, abs=1e-4)


def test_whitepaper_example_2_max_secure_ring_10():
    # §17.2 Example 2: ring 10, density 0.5, 64 Secure level 5
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    diffs = [(i, CellType.SECURE) for i in range(64)]
    ns.commit_diff(diffs, current_block=0)
    ns.tick(current_block=WARMUP_BLOCKS)
    ns.set_type_level(CellType.SECURE, 5)

    out = compute_node_output(ns, density=0.5, ring=10)
    # 0.5 × 64 × 5^0.8 × 0.5 / 160
    assert out.agntc == pytest.approx(0.362, abs=1e-3)


def test_warmup_cells_do_not_yield():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    ns.commit_diff([(i, CellType.SECURE) for i in range(16)], current_block=0)
    # Still in warmup — no yield
    out = compute_node_output(ns, density=1.0, ring=1)
    assert out.agntc == 0.0


def test_zero_allocations_returns_zero_output():
    ns = NodeSubgrid.new(node_id="c", owner=b"w", created_at_block=0)
    # Never assign any cells — all 64 remain ACTIVE but untyped.
    out = compute_node_output(ns, density=1.0, ring=1)
    assert out.agntc == 0.0
    assert out.dev_points == 0.0
    assert out.research_points == 0.0
    assert out.storage_units == 0.0
