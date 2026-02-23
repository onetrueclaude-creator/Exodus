"""Dispute resolution and safe mode (Whitepaper Section 5.6, 7.8)."""
from __future__ import annotations

import math
from enum import Enum

from agentic.params import SAFE_MODE_THRESHOLD, SAFE_MODE_RECOVERY
from agentic.verification.verdict import Verdict


class DisputeOutcome(Enum):
    FINALIZED = "finalized"
    REJECTED = "rejected"
    DISPUTED = "disputed"
    INSUFFICIENT = "insufficient"


class DisputeResolver:
    @staticmethod
    def classify(verdicts: list[Verdict], threshold: int) -> DisputeOutcome:
        if not verdicts:
            return DisputeOutcome.INSUFFICIENT

        valid_count = sum(1 for v in verdicts if v == Verdict.VALID)
        invalid_count = sum(1 for v in verdicts if v == Verdict.INVALID)

        if valid_count >= threshold:
            return DisputeOutcome.FINALIZED
        if invalid_count >= threshold:
            return DisputeOutcome.REJECTED
        if valid_count > 0 or invalid_count > 0:
            return DisputeOutcome.DISPUTED
        return DisputeOutcome.INSUFFICIENT


class SafeMode:
    def __init__(self):
        self.active = False

    def update(self, total_validators: int, offline_count: int) -> None:
        if total_validators == 0:
            return
        if offline_count < 0 or offline_count > total_validators:
            raise ValueError(
                f"offline_count ({offline_count}) must be in "
                f"[0, total_validators ({total_validators})]"
            )
        online_ratio = 1.0 - (offline_count / total_validators)
        offline_ratio = offline_count / total_validators

        if not self.active and offline_ratio > SAFE_MODE_THRESHOLD:
            self.active = True
        elif self.active and online_ratio >= SAFE_MODE_RECOVERY:
            self.active = False

    def effective_threshold(self, normal_threshold: int, available_agents: int) -> int:
        if not self.active:
            return normal_threshold
        # Minimum of 3 prevents single-agent finalization
        return max(3, math.ceil(available_agents * 0.67))
