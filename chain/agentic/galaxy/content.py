"""Content types and storage metadata for planet data storage."""
from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class ContentType(IntEnum):
    """Types of data storable on planet storage slots."""

    JSON = 1
    TEXT = 2
    IMAGE = 3
    VIDEO = 4
    BINARY = 5


@dataclass
class StorageMetadata:
    """Metadata for a storage record on a planet."""

    content_type: ContentType
    content_hash: bytes       # SHA-256 of off-chain content
    size_bytes: int
    planet_index: int

    def encode_data(self, coord) -> list[int]:
        """Encode to Record.data format: [x_offset, y_offset, content_type, size, planet_index]."""
        return [
            coord.x_offset,
            coord.y_offset,
            int(self.content_type),
            self.size_bytes,
            self.planet_index,
        ]

    @staticmethod
    def decode_data(data: list[int]) -> tuple:
        """Decode Record.data back to (GridCoordinate, dict of metadata fields)."""
        from agentic.galaxy.coordinate import GridCoordinate

        coord = GridCoordinate.from_offsets(data[0], data[1])
        meta = {
            "content_type": ContentType(data[2]),
            "size_bytes": data[3],
            "planet_index": data[4],
        }
        return coord, meta


from agentic.galaxy.coordinate import GridCoordinate, storage_slots


@dataclass
class StorageTx:
    """Transaction to store content on a planet."""

    owner: bytes
    coordinate: GridCoordinate
    content_type: ContentType
    content_hash: bytes
    size_bytes: int
    planet_index: int
    slot: int


@dataclass
class StorageResult:
    """Outcome of a storage transaction validation."""

    valid: bool
    error: str


def validate_storage(
    tx: StorageTx,
    claim_registry,
    occupied_planets: dict[GridCoordinate, set[int]],
) -> StorageResult:
    """Validate a storage transaction."""
    claim = claim_registry.get_claim_at(tx.coordinate)
    if claim is None:
        return StorageResult(valid=False, error="No active claim at this coordinate")
    if claim.owner != tx.owner:
        return StorageResult(valid=False, error="Owner does not control claim at this coordinate")

    max_slots = storage_slots(tx.coordinate.x, tx.coordinate.y)
    if tx.planet_index < 0 or tx.planet_index >= max_slots:
        return StorageResult(
            valid=False,
            error=f"Planet index {tx.planet_index} out of range (max {max_slots - 1})",
        )

    occupied = occupied_planets.get(tx.coordinate, set())
    if tx.planet_index in occupied:
        return StorageResult(valid=False, error=f"Planet {tx.planet_index} is already occupied")

    return StorageResult(valid=True, error="")
