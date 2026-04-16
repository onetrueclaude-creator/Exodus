"""NodeSubgrid — per-node 64-cell allocation with WARMUP→ACTIVE lifecycle.

Whitepaper v1.0 §16. Each owned node has its own 8×8 subgrid. Cells reassigned
via commit_diff() enter WARMUP for 100 blocks before producing output.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import Iterable

from agentic.params import (
    SUBGRID_SIZE,
    BASE_SECURE_RATE, BASE_DEVELOP_RATE, BASE_RESEARCH_RATE, BASE_STORAGE_RATE,
    LEVEL_EXPONENT, HARDNESS_MULTIPLIER,
)

WARMUP_BLOCKS: int = 100


def node_id_from_coord(x: int, y: int) -> str:
    """Canonical node_id format for per-node subgrids: 'x,y' (comma-separated)."""
    return f"{x},{y}"


def coord_from_node_id(node_id: str) -> tuple[int, int]:
    """Parse a canonical node_id 'x,y' back into (x, y) integer coordinates."""
    x_str, y_str = node_id.split(",")
    return int(x_str), int(y_str)


# NOTE: CellType and CellState are deliberately distinct from the legacy
# SubcellType in chain/agentic/lattice/subgrid.py. The per-node model here
# coexists with the per-wallet SubgridAllocator until PR C removes the legacy
# file entirely.
class CellType(Enum):
    SECURE = "secure"
    DEVELOP = "develop"
    RESEARCH = "research"
    STORAGE = "storage"


class CellState(Enum):
    ACTIVE = "active"
    WARMUP = "warmup"


@dataclass
class Cell:
    type: CellType | None = None
    state: CellState = CellState.ACTIVE
    since_block: int = 0
    pending_type: CellType | None = None


@dataclass
class NodeSubgrid:
    node_id: str
    owner: bytes
    cells: list[Cell]
    type_levels: dict[CellType, int]
    updated_at_block: int

    @classmethod
    def new(cls, *, node_id: str, owner: bytes, created_at_block: int) -> "NodeSubgrid":
        return cls(
            node_id=node_id,
            owner=owner,
            cells=[Cell() for _ in range(SUBGRID_SIZE)],
            type_levels={ct: 1 for ct in CellType},
            updated_at_block=created_at_block,
        )

    def commit_diff(
        self, diffs: Iterable[tuple[int, CellType | None]], *, current_block: int
    ) -> None:
        seen: set[int] = set()
        diffs = list(diffs)
        for idx, _ in diffs:
            if idx < 0 or idx >= SUBGRID_SIZE:
                raise ValueError(f"cell index {idx} out of range [0,{SUBGRID_SIZE})")
            if idx in seen:
                raise ValueError(f"duplicate cell index {idx} in diff")
            seen.add(idx)
        for idx, new_type in diffs:
            cell = self.cells[idx]
            cell.state = CellState.WARMUP
            cell.pending_type = new_type
            cell.since_block = current_block
        self.updated_at_block = current_block

    def tick(self, *, current_block: int) -> None:
        for cell in self.cells:
            if (
                cell.state is CellState.WARMUP
                and cell.since_block + WARMUP_BLOCKS <= current_block
            ):
                cell.type = cell.pending_type
                cell.state = CellState.ACTIVE
                cell.pending_type = None

    def count_active(self, cell_type: CellType) -> int:
        return sum(
            1 for c in self.cells
            if c.state is CellState.ACTIVE and c.type is cell_type
        )

    def set_type_level(self, cell_type: CellType, level: int) -> None:
        if level < 1:
            raise ValueError(f"level must be >= 1, got {level}")
        self.type_levels[cell_type] = level


@dataclass
class NodeOutput:
    """Per-block resource output for a single node."""
    agntc: float = 0.0
    dev_points: float = 0.0
    research_points: float = 0.0
    storage_units: float = 0.0


def _mult(level: int) -> float:
    return math.pow(max(1, level), LEVEL_EXPONENT)


def compute_node_output(ns: NodeSubgrid, *, density: float, ring: int) -> NodeOutput:
    """Per-block yield for a single node. Only ACTIVE cells produce output."""
    hardness = max(1, HARDNESS_MULTIPLIER * max(1, ring))
    n_sec = ns.count_active(CellType.SECURE)
    n_dev = ns.count_active(CellType.DEVELOP)
    n_res = ns.count_active(CellType.RESEARCH)
    n_sto = ns.count_active(CellType.STORAGE)
    return NodeOutput(
        agntc=BASE_SECURE_RATE * n_sec * _mult(ns.type_levels[CellType.SECURE])
              * density / hardness,
        dev_points=BASE_DEVELOP_RATE * n_dev * _mult(ns.type_levels[CellType.DEVELOP]),
        research_points=BASE_RESEARCH_RATE * n_res * _mult(ns.type_levels[CellType.RESEARCH]),
        storage_units=BASE_STORAGE_RATE * n_sto * _mult(ns.type_levels[CellType.STORAGE]),
    )
