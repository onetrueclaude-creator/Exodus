"""Singularity core behavior (v1.2) — renamed from MachineAgentBehavior.

The Singularity is the protocol agent bound to the origin: a gateway +
accumulator that NEVER secures or mines (the chain is 100% human-run —
``_secure`` is an intentional no-op, Bug #10 by design). It accumulates the
origin's yield and never sells (``MIN_SELL_RATIO = 1.0``).

This module re-exports the implementation from ``machines.py`` during the
one-release deprecation window. New code should import from here.
"""
from __future__ import annotations

from agentic.testnet.machines import (  # noqa: F401
    MACHINE_ORIGIN as SINGULARITY_ORIGIN,
    MACHINE_WALLET_INDEX as SINGULARITY_WALLET_INDEX,
    MachineAgentBehavior,
    SingularityBehavior,
)

__all__ = [
    "SingularityBehavior",
    "MachineAgentBehavior",
    "SINGULARITY_ORIGIN",
    "SINGULARITY_WALLET_INDEX",
]
