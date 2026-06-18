"""Content-addressed Merkle-DAG for the knowledge vault (Proof-of-Vault).

Atoms (payloads) and links (edges) are addressed by SHA-256 CIDs; the root CID
over all node CIDs + links is the vault state. SHA-256 (not the Poseidon ledger
SMT) is deliberate: vault possession proofs are cheap SHA-2 Merkle paths
(report §5, Filecoin PDP), kept separate from the ZK ledger tree.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass


def compute_cid(payload: bytes, links: tuple[str, ...] = ()) -> str:
    """64-hex SHA-256 content identifier over payload + sorted link CIDs."""
    h = hashlib.sha256()
    h.update(b"atom\x00")
    h.update(payload)
    for link in sorted(links):
        h.update(b"\x00link\x00")
        h.update(link.encode())
    return h.hexdigest()


@dataclass(frozen=True)
class Atom:
    payload: bytes

    @property
    def cid(self) -> str:
        return compute_cid(self.payload)


@dataclass(frozen=True)
class Link:
    src_cid: str
    dst_cid: str


class VaultDag:
    """In-memory content-addressed DAG. Deterministic CID enumeration."""

    def __init__(self) -> None:
        self._atoms: dict[str, bytes] = {}
        self._links: list[Link] = []

    def add_atom(self, payload: bytes) -> str:
        cid = compute_cid(payload)
        self._atoms[cid] = payload
        return cid

    def add_link(self, src_cid: str, dst_cid: str) -> None:
        if src_cid not in self._atoms:
            raise KeyError(f"unknown src CID {src_cid}")
        if dst_cid not in self._atoms:
            raise KeyError(f"unknown dst CID {dst_cid}")
        self._links.append(Link(src_cid=src_cid, dst_cid=dst_cid))

    def get_payload(self, cid: str) -> bytes:
        if cid not in self._atoms:
            raise KeyError(f"unknown CID {cid}")
        return self._atoms[cid]

    def cids(self) -> list[str]:
        return sorted(self._atoms)

    def root_cid(self) -> str:
        h = hashlib.sha256()
        h.update(b"vault-root\x00")
        for cid in self.cids():
            h.update(cid.encode())
            h.update(b"\x00")
        for link in sorted(self._links, key=lambda link_: (link_.src_cid, link_.dst_cid)):
            h.update(link.src_cid.encode())
            h.update(b"->")
            h.update(link.dst_cid.encode())
            h.update(b"\x00")
        return h.hexdigest()
