import pytest
from agentic.lattice.node_subgrid import (
    NodeSubgrid, Cell, CellState, CellType, WARMUP_BLOCKS,
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
