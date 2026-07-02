"""Epoch beacon — public randomness for PDP challenge seeds (spec §3.3).

Ladder: drand (public randomness network) → Solana latest blockhash →
previous beacon flagged ``stale``. Real sources are OPT-IN via
``AGENTIC_BEACON=1``; the default is a deterministic local hash-chain so
genesis determinism, tests, and CI never touch the network. The beacon makes
challenge seeds grind-proof even against the coordinator — a Stage-1 trust
improvement that survives every later decentralization stage.
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.request
from dataclasses import dataclass

from agentic.params import BEACON_HTTP_TIMEOUT_S

_DRAND_URL = "https://api.drand.sh/public/latest"
_SOLANA_RPC = "https://api.mainnet-beta.solana.com"


@dataclass(frozen=True)
class EpochBeacon:
    value: bytes          # 32 bytes of public randomness
    source: str           # "drand" | "solana" | "local" | "stale"
    round_id: int | None  # drand round when source == "drand"
    stale: bool           # True when both real sources failed (prev reused)


def _fetch_drand() -> tuple[int, bytes] | None:
    """Latest drand round → (round, 32-byte randomness), or None on any error."""
    try:
        with urllib.request.urlopen(_DRAND_URL, timeout=BEACON_HTTP_TIMEOUT_S) as r:  # nosec B310 — fixed https constant, never user input
            data = json.loads(r.read())
        return int(data["round"]), bytes.fromhex(data["randomness"])[:32]
    except Exception:
        return None


def _fetch_solana_blockhash() -> bytes | None:
    """Latest Solana blockhash hashed to 32 bytes, or None on any error."""
    try:
        req = urllib.request.Request(
            _SOLANA_RPC,
            data=json.dumps({
                "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": [],
            }).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=BEACON_HTTP_TIMEOUT_S) as r:  # nosec B310 — fixed https constant, never user input
            data = json.loads(r.read())
        blockhash = data["result"]["value"]["blockhash"]
        return hashlib.sha256(blockhash.encode()).digest()
    except Exception:
        return None


def _local_beacon(prev: EpochBeacon | None) -> EpochBeacon:
    seed = prev.value if prev is not None else b"genesis"
    value = hashlib.sha256(b"agentic-local-beacon:" + seed).digest()
    return EpochBeacon(value=value, source="local", round_id=None, stale=False)


def get_epoch_beacon(prev: EpochBeacon | None) -> EpochBeacon:
    """Next epoch beacon via the ladder. Never raises; never blocks > ~2×timeout."""
    if os.environ.get("AGENTIC_BEACON") != "1":
        return _local_beacon(prev)
    drand = _fetch_drand()
    if drand is not None:
        round_id, value = drand
        return EpochBeacon(value=value, source="drand", round_id=round_id, stale=False)
    sol = _fetch_solana_blockhash()
    if sol is not None:
        return EpochBeacon(value=sol, source="solana", round_id=None, stale=False)
    if prev is not None:
        return EpochBeacon(value=prev.value, source="stale", round_id=None, stale=True)
    # no real source AND no history: fall back to local, but flag it
    local = _local_beacon(None)
    return EpochBeacon(value=local.value, source="stale", round_id=None, stale=True)
