"""NodeSubgrid — per-node 64-cell allocation with WARMUP→ACTIVE lifecycle.

Whitepaper v1.0 §16. Each owned node has its own 8×8 subgrid. Cells reassigned
via commit_diff() enter WARMUP for 100 blocks before producing output.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable

from agentic.params import SUBGRID_SIZE

WARMUP_BLOCKS: int = 100


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
