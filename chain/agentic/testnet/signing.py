"""B3 signature gate — ed25519 verification + per-account nonce anti-replay.

Production REQUIRES a valid ed25519 signature (against the account's bound
signing pubkey) and the exact next nonce on every state-mutating request. In
dev (``ALLOW_DEV_CUSTODIAL_SIGN=1``) the check is bypassed — the Next.js gateway
already authenticates the request (B2) and no Phantom exists in dev (that's B4).
No chain-held signing secrets are ever stored. See design spec sec 6, sec 10.
"""
from __future__ import annotations

import json
import os

from agentic.ledger.crypto import verify_ed25519

DOMAIN = b"Agentic:Tx:v1"
CHAIN_ID = "testnet"


class SignatureError(Exception):
    """Raised when a write fails signature/nonce verification (-> HTTP 401)."""


def _dev_bypass() -> bool:
    return os.environ.get("ALLOW_DEV_CUSTODIAL_SIGN") == "1"


def canonical_message(
    action_type: str, params: dict, owner_hex: str, nonce: int, chain_id: str = CHAIN_ID
) -> bytes:
    """Deterministic, domain-separated bytes the client signs. Sorted-key JSON so
    the TS signer and this verifier serialize identically."""
    payload = json.dumps(
        {
            "action": action_type,
            "owner": owner_hex,
            "nonce": nonce,
            "chain_id": chain_id,
            "params": params,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return DOMAIN + b"\x00" + payload


def verify_write(
    g,
    owner: bytes,
    action_type: str,
    params: dict,
    signature_hex: str | None,
    nonce: int | None,
) -> None:
    """Enforce the signature gate for a write. Raises SignatureError on failure.

    Dev bypass accepts unconditionally. Prod: the account must have a bound
    signing key; the signature must verify over the canonical message; nonce must
    equal the expected next value; on success the account nonce is incremented.
    """
    if _dev_bypass():
        return
    signing_pub = g.account_signing_keys.get(owner)
    if signing_pub is None:
        raise SignatureError("account has no bound signing key")
    if not signature_hex or nonce is None:
        raise SignatureError("missing signature or nonce")
    expected = g.account_nonces.get(owner, 0)
    if nonce != expected:
        raise SignatureError(f"bad nonce: expected {expected}, got {nonce}")
    msg = canonical_message(action_type, params, owner.hex(), nonce)
    try:
        sig = bytes.fromhex(signature_hex)
    except ValueError as e:
        raise SignatureError("malformed signature hex") from e
    if not verify_ed25519(signing_pub, msg, sig):
        raise SignatureError("signature verification failed")
    g.account_nonces[owner] = expected + 1
