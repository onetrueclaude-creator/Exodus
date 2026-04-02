"""Verification verdicts for PoAIV proofs."""
from __future__ import annotations
from enum import Enum


class Verdict(Enum):
    """Result of a verification task."""
    VALID = "valid"
    INVALID = "invalid"
    INCONCLUSIVE = "inconclusive"

    def is_definitive(self) -> bool:
        """Whether this verdict provides a clear answer."""
        return self in (Verdict.VALID, Verdict.INVALID)
