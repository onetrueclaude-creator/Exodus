"""Tests for lattice storage content types."""
import pytest


class TestContentType:
    def test_all_types_exist(self):
        from agentic.lattice.content import ContentType
        assert ContentType.JSON == 1
        assert ContentType.TEXT == 2
        assert ContentType.IMAGE == 3
        assert ContentType.VIDEO == 4
        assert ContentType.BINARY == 5

    def test_five_types(self):
        from agentic.lattice.content import ContentType
        assert len(ContentType) == 5

    def test_int_enum(self):
        from agentic.lattice.content import ContentType
        assert int(ContentType.JSON) == 1
        assert ContentType.VIDEO + 0 == 4


class TestStorageMetadata:
    def test_create_metadata(self):
        from agentic.lattice.content import StorageMetadata, ContentType
        meta = StorageMetadata(
            content_type=ContentType.JSON,
            content_hash=b"\x00" * 32,
            size_bytes=1024,
            planet_index=0,
        )
        assert meta.content_type == ContentType.JSON
        assert meta.size_bytes == 1024

    def test_encode_to_data(self):
        from agentic.lattice.content import StorageMetadata, ContentType
        from agentic.lattice.coordinate import GridCoordinate
        coord = GridCoordinate(x=10, y=-20)
        meta = StorageMetadata(
            content_type=ContentType.IMAGE,
            content_hash=b"\xab" * 32,
            size_bytes=2048,
            planet_index=3,
        )
        data = meta.encode_data(coord)
        assert data[0] == coord.x_offset
        assert data[1] == coord.y_offset
        assert data[2] == int(ContentType.IMAGE)
        assert data[3] == 2048
        assert data[4] == 3

    def test_decode_from_data(self):
        from agentic.lattice.content import StorageMetadata, ContentType
        from agentic.lattice.coordinate import GridCoordinate
        coord = GridCoordinate(x=10, y=-20)
        meta = StorageMetadata(
            content_type=ContentType.IMAGE,
            content_hash=b"\xab" * 32,
            size_bytes=2048,
            planet_index=3,
        )
        data = meta.encode_data(coord)
        decoded_coord, decoded_meta_partial = StorageMetadata.decode_data(data)
        assert decoded_coord.x == 10
        assert decoded_coord.y == -20
        assert decoded_meta_partial["content_type"] == ContentType.IMAGE
        assert decoded_meta_partial["size_bytes"] == 2048
        assert decoded_meta_partial["planet_index"] == 3


class TestStorageTx:
    def test_create_storage_tx(self):
        from agentic.lattice.content import StorageTx, ContentType
        from agentic.lattice.coordinate import GridCoordinate
        tx = StorageTx(
            owner=b"alice",
            coordinate=GridCoordinate(x=10, y=-20),
            content_type=ContentType.JSON,
            content_hash=b"\xab" * 32,
            size_bytes=1024,
            planet_index=0,
            slot=42,
        )
        assert tx.owner == b"alice"
        assert tx.content_type == ContentType.JSON

    def test_validate_success(self):
        from agentic.lattice.content import StorageTx, ContentType, validate_storage
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.claims import ClaimRegistry
        reg = ClaimRegistry()
        coord = GridCoordinate(x=10, y=-20)
        reg.register(b"alice", coord, 100, slot=1)
        tx = StorageTx(
            owner=b"alice", coordinate=coord,
            content_type=ContentType.JSON,
            content_hash=b"\xab" * 32,
            size_bytes=512, planet_index=0, slot=5,
        )
        result = validate_storage(tx, reg, occupied_planets={})
        assert result.valid

    def test_validate_no_claim(self):
        from agentic.lattice.content import StorageTx, ContentType, validate_storage
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.claims import ClaimRegistry
        reg = ClaimRegistry()
        tx = StorageTx(
            owner=b"alice", coordinate=GridCoordinate(x=10, y=-20),
            content_type=ContentType.JSON,
            content_hash=b"\xab" * 32,
            size_bytes=512, planet_index=0, slot=5,
        )
        result = validate_storage(tx, reg, occupied_planets={})
        assert not result.valid
        assert "no active claim" in result.error.lower()

    def test_validate_wrong_owner(self):
        from agentic.lattice.content import StorageTx, ContentType, validate_storage
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.claims import ClaimRegistry
        reg = ClaimRegistry()
        coord = GridCoordinate(x=10, y=-20)
        reg.register(b"alice", coord, 100, slot=1)
        tx = StorageTx(
            owner=b"bob", coordinate=coord,
            content_type=ContentType.JSON,
            content_hash=b"\xab" * 32,
            size_bytes=512, planet_index=0, slot=5,
        )
        result = validate_storage(tx, reg, occupied_planets={})
        assert not result.valid

    def test_validate_planet_index_out_of_range(self):
        from agentic.lattice.content import StorageTx, ContentType, validate_storage
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.claims import ClaimRegistry
        reg = ClaimRegistry()
        coord = GridCoordinate(x=10, y=-20)
        reg.register(b"alice", coord, 100, slot=1)
        tx = StorageTx(
            owner=b"alice", coordinate=coord,
            content_type=ContentType.JSON,
            content_hash=b"\xab" * 32,
            size_bytes=512, planet_index=99, slot=5,
        )
        result = validate_storage(tx, reg, occupied_planets={})
        assert not result.valid
        assert "planet" in result.error.lower()

    def test_validate_planet_occupied(self):
        from agentic.lattice.content import StorageTx, ContentType, validate_storage
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.claims import ClaimRegistry
        reg = ClaimRegistry()
        coord = GridCoordinate(x=10, y=-20)
        reg.register(b"alice", coord, 100, slot=1)
        occupied = {coord: {0}}
        tx = StorageTx(
            owner=b"alice", coordinate=coord,
            content_type=ContentType.JSON,
            content_hash=b"\xab" * 32,
            size_bytes=512, planet_index=0, slot=5,
        )
        result = validate_storage(tx, reg, occupied_planets=occupied)
        assert not result.valid
        assert "occupied" in result.error.lower()
