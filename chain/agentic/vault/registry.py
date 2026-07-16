"""VaultRegistry — stateful Proof-of-Vault coordinator bookkeeping.

The Singularity (testnet trusted coordinator) tracks per-owner shard
responsibilities, issues freshness-bound sampled-PDP challenges, verifies
returned proofs, rate-limits one accepted proof per (owner, shard) per window,
and exposes drainable per-block buffers: passes -> CPU credit (reward/activity
input) and misses -> slash list. It performs NO consensus and NO API-key spend
(report §3). Mainnet anti-sybil is DEFERRED (report §6/§8).
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass

from agentic.params import (
    VAULT_CHALLENGE_WINDOW_BLOCKS,
    VAULT_PROOF_CPU_CREDIT,
    VAULT_SHARD_COUNT,
)
from agentic.vault.dag import VaultDag
from agentic.vault.pdp import (
    build_shard_tree,
    derive_challenge,
    sub_units_for_shard,
    verify_proof,
)
from agentic.vault.shard import assign_shards, replicas_for_shard


@dataclass(frozen=True)
class Challenge:
    shard_id: int
    indices: list[int]
    issued_block: int
    expires_block: int
    block_seed_hex: str


@dataclass
class _OpenChallenge:
    owner_id: str
    shard_id: int
    issued_block: int
    expires_block: int
    indices: list[int]          # server-issued sampled indices (authoritative at verify)
    answered: bool = False


class VaultRegistry:
    def __init__(self, dag: VaultDag) -> None:
        self._dag = dag
        self._owners: list[str] = []
        self._shard_owners: dict[int, list[str]] = {}     # shard_id -> responsible owners
        self._owner_shards: dict[str, list[int]] = {}     # owner -> shards
        self._open: list[_OpenChallenge] = []             # outstanding challenges
        self._accepted_window: dict[tuple[str, int], int] = {}  # (owner,shard) -> last accept block
        self._pass_buffer: dict[str, float] = {}          # owner -> credit (drained per block)
        self._last_pass: dict[str, int] = {}              # owner -> last accepted block

    # -- assignment -------------------------------------------------------- #

    def set_owners(self, owner_ids: list[str]) -> None:
        self._owners = list(owner_ids)
        shard_to_cids = assign_shards(self._dag.cids(), shard_count=VAULT_SHARD_COUNT)
        self._shard_owners = {}
        self._owner_shards = {o: [] for o in owner_ids}
        for shard_id in range(VAULT_SHARD_COUNT):
            replicas = replicas_for_shard(shard_id, owner_ids)
            # only assign shards that actually hold data
            if not shard_to_cids.get(shard_id):
                continue
            self._shard_owners[shard_id] = replicas
            for o in replicas:
                self._owner_shards.setdefault(o, []).append(shard_id)

    def shards_for_owner(self, owner_id: str) -> list[int]:
        return list(self._owner_shards.get(owner_id, []))

    # -- challenge --------------------------------------------------------- #

    def block_seed(self, block_slot: int, beacon: bytes | None = None) -> bytes:
        """Challenge seed: vault-root + slot, mixed with the epoch beacon when
        provided (spec §3.3) — grind-proof even against the coordinator.
        ``beacon=None`` preserves the pre-S1 seed exactly (compat + tests)."""
        base = self._dag.root_cid().encode() + b":" + str(block_slot).encode()
        if beacon is not None:
            base = beacon + b":" + base
        return hashlib.sha256(base).digest()

    def shard_sub_units(self, shard_id: int) -> list[bytes]:
        shard_to_cids = assign_shards(self._dag.cids(), shard_count=VAULT_SHARD_COUNT)
        payloads = [self._dag.get_payload(c) for c in shard_to_cids.get(shard_id, [])]
        return sub_units_for_shard(payloads)

    def issue_challenge(self, owner_id: str, shard_id: int, block_slot: int) -> Challenge | None:
        if shard_id not in self.shards_for_owner(owner_id):
            return None
        seed = self.block_seed(block_slot, beacon=getattr(self, "epoch_beacon_value", None))
        n = len(self.shard_sub_units(shard_id))
        indices = derive_challenge(seed, shard_id, n)
        expires = block_slot + VAULT_CHALLENGE_WINDOW_BLOCKS
        self._open.append(_OpenChallenge(owner_id, shard_id, block_slot, expires, indices))
        return Challenge(
            shard_id=shard_id,
            indices=indices,
            issued_block=block_slot,
            expires_block=expires,
            block_seed_hex=seed.hex(),
        )

    # -- proof submission -------------------------------------------------- #

    def submit_proof(self, owner_id: str, challenge: Challenge, proof: dict, block_slot: int) -> bool:
        # A possession proof is accepted only when it proves possession of the
        # coordinator's OWN shard bytes against a challenge the coordinator
        # itself issued. Everything on ``challenge`` except the (shard_id,
        # issued_block) selector is client-supplied and must NOT be trusted —
        # see verify-possession-proof-soundness.md. Three server-authoritative
        # gates, cheapest first:
        #
        #   (fix #3) responsibility — the submitter must be assigned this shard.
        #   (fix #2) server challenge — a matching *open* (unanswered) challenge
        #            this coordinator issued must exist; its stored indices and
        #            expiry are authoritative (client indices/expiry ignored).
        #   (fix #1) canonical root — verify against the server's own per-shard
        #            Merkle root, never the client's submitted root.
        if challenge.shard_id not in self.shards_for_owner(owner_id):
            return False
        key = (owner_id, challenge.shard_id)
        last = self._accepted_window.get(key)
        if last is not None and block_slot - last < VAULT_CHALLENGE_WINDOW_BLOCKS:
            return False  # rate-limit: one accepted proof per (owner, shard) per window
        oc = next(
            (c for c in self._open
             if c.owner_id == owner_id and c.shard_id == challenge.shard_id
             and c.issued_block == challenge.issued_block and not c.answered),
            None,
        )
        if oc is None:
            return False  # no server-issued open challenge to answer
        if block_slot > oc.expires_block:
            return False  # expired per the server-issued window (left unanswered -> miss)
        canonical_root, _ = build_shard_tree(self.shard_sub_units(challenge.shard_id))
        if not verify_proof(oc.indices, canonical_root, proof):
            return False
        oc.answered = True
        self._accepted_window[key] = block_slot
        self._pass_buffer[owner_id] = self._pass_buffer.get(owner_id, 0.0) + VAULT_PROOF_CPU_CREDIT
        self._last_pass[owner_id] = block_slot
        return True

    # -- drainable per-block buffers --------------------------------------- #

    def take_passes(self, block_slot: int) -> dict[str, float]:
        out = dict(self._pass_buffer)
        self._pass_buffer.clear()
        return out

    def take_misses(self, block_slot: int) -> list[str]:
        missed: list[str] = []
        remaining: list[_OpenChallenge] = []
        for oc in self._open:
            if not oc.answered and block_slot >= oc.expires_block:
                missed.append(oc.owner_id)
            elif oc.answered and block_slot >= oc.expires_block:
                pass  # answered + expired -> drop
            else:
                remaining.append(oc)
        self._open = remaining
        return missed

    def last_pass_block(self, owner_id: str) -> int | None:
        return self._last_pass.get(owner_id)
