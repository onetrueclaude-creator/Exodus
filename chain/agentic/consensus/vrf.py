"""VRF-based verifier selection for Agentic Chain consensus."""
from __future__ import annotations
import hashlib
import numpy as np
from agentic.consensus.validator import Validator


def select_verifiers(
    validators: list[Validator],
    n: int,
    slot: int,
    seed: int = 0,
    total_token: float | None = None,
    total_cpu: float | None = None,
    exclude_ids: set[int] | None = None,
) -> list[Validator]:
    """Select n verifiers weighted by effective stake using VRF-style selection.

    Uses a deterministic hash-based selection (simulating VRF output).
    ``exclude_ids`` removes validators from the candidate pool (e.g. the
    block leader should not verify their own block).
    """
    online = [v for v in validators if v.online
              and (exclude_ids is None or v.id not in exclude_ids)]
    if len(online) < n:
        raise ValueError(
            f"Need {n} verifiers but only {len(online)} validators online"
        )

    if total_token is None:
        total_token = sum(v.token_stake for v in online)
    if total_cpu is None:
        total_cpu = sum(v.cpu_vpu for v in online)

    # Calculate weights from effective stake
    weights = np.array([
        v.effective_stake(total_token, total_cpu) for v in online
    ])
    if weights.sum() == 0:
        weights = np.ones(len(online))
    weights = weights / weights.sum()

    # Deterministic seed from slot + global seed (simulates VRF)
    # Use full 128-bit seed (32 hex chars) for adequate entropy
    vrf_seed = int(hashlib.sha256(f"{seed}:{slot}".encode()).hexdigest()[:32], 16)
    rng = np.random.default_rng(vrf_seed)

    # Weighted sampling without replacement
    indices = rng.choice(len(online), size=n, replace=False, p=weights)
    return [online[i] for i in indices]
