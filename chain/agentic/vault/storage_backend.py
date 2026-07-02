"""StorageBackend — the swappable seam under the vault's bytes (spec §3.4).

Stage 0/1 implementations: MemoryBackend (tests/dev) and BackboneBackend (the
coordinator's restart-durable file-per-CID replica — the DISCLOSED single custodian
until Stage-2 erasure across desktop nodes) (plain writes, no fsync — power-loss durability arrives with Stage-2 erasure). Stage-2 erasure/federated
backends implement the same protocol; CID addressing keeps every stage
portable. Filenames are the SHA-256 hex of the CID string (CIDs stay
path-safe regardless of their format)."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class BackendStats:
    count: int
    total_bytes: int


@runtime_checkable
class StorageBackend(Protocol):
    def put_shard(self, cid: str, data: bytes) -> None: ...
    def get_shard(self, cid: str) -> bytes | None: ...
    def has_shard(self, cid: str) -> bool: ...
    def delete_shard(self, cid: str) -> None: ...
    def stats(self) -> BackendStats: ...


class MemoryBackend:
    """Dict-backed backend for tests and dev."""

    def __init__(self) -> None:
        self._blobs: dict[str, bytes] = {}

    def put_shard(self, cid: str, data: bytes) -> None:
        self._blobs[cid] = bytes(data)

    def get_shard(self, cid: str) -> bytes | None:
        return self._blobs.get(cid)

    def has_shard(self, cid: str) -> bool:
        return cid in self._blobs

    def delete_shard(self, cid: str) -> None:
        self._blobs.pop(cid, None)

    def stats(self) -> BackendStats:
        return BackendStats(count=len(self._blobs),
                            total_bytes=sum(len(b) for b in self._blobs.values()))


class BackboneBackend:
    """File-per-CID durable replica store (volume-mounted in production)."""

    def __init__(self, root_dir: Path) -> None:
        self._root = Path(root_dir)
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, cid: str) -> Path:
        return self._root / hashlib.sha256(cid.encode()).hexdigest()

    def put_shard(self, cid: str, data: bytes) -> None:
        self._path(cid).write_bytes(bytes(data))

    def get_shard(self, cid: str) -> bytes | None:
        p = self._path(cid)
        return p.read_bytes() if p.exists() else None

    def has_shard(self, cid: str) -> bool:
        return self._path(cid).exists()

    def delete_shard(self, cid: str) -> None:
        self._path(cid).unlink(missing_ok=True)

    def stats(self) -> BackendStats:
        files = [p for p in self._root.iterdir() if p.is_file()]
        return BackendStats(count=len(files),
                            total_bytes=sum(p.stat().st_size for p in files))
