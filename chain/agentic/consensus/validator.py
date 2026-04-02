"""Validator model for Agentic Chain consensus simulation."""
from __future__ import annotations
from dataclasses import dataclass, field
import numpy as np
from agentic.params import ALPHA, BETA


@dataclass
class Validator:
    """A network validator with token and CPU stakes."""
    id: int
    token_stake: float
    cpu_vpu: float  # Verification Processing Units per hour
    online: bool = True
    total_rewards: float = 0.0
    blocks_verified: int = 0
    blocks_ordered: int = 0

    def effective_stake(self, total_token: float, total_cpu: float) -> float:
        """Calculate effective stake using dual-staking formula.

        effective = alpha * (token/total_token) + beta * (cpu/total_cpu)
        """
        if not self.online or total_token == 0 or total_cpu == 0:
            return 0.0
        norm_token = self.token_stake / total_token
        norm_cpu = self.cpu_vpu / total_cpu
        return ALPHA * norm_token + BETA * norm_cpu

    def proof_generation_time_s(self, base_time_s: float = 15.0) -> float:
        """Simulated proof generation time based on CPU capacity.

        Faster CPUs (higher VPU) produce proofs faster.
        """
        if self.cpu_vpu <= 0:
            return float('inf')
        return base_time_s * (50.0 / self.cpu_vpu)  # 50 VPU = base time


def create_validator_set(
    n: int,
    token_range: tuple = (100.0, 10000.0),
    cpu_range: tuple = (10.0, 200.0),
    seed: int = 42
) -> list[Validator]:
    """Create a set of validators with power-law distributed stakes."""
    rng = np.random.default_rng(seed)
    # Power-law distribution (realistic: few large, many small)
    token_stakes = rng.pareto(a=1.5, size=n) + 1
    token_stakes = token_stakes / token_stakes.max()
    token_stakes = token_stakes * (token_range[1] - token_range[0]) + token_range[0]

    cpu_vpus = rng.pareto(a=2.0, size=n) + 1
    cpu_vpus = cpu_vpus / cpu_vpus.max()
    cpu_vpus = cpu_vpus * (cpu_range[1] - cpu_range[0]) + cpu_range[0]

    return [
        Validator(id=i, token_stake=float(token_stakes[i]), cpu_vpu=float(cpu_vpus[i]))
        for i in range(n)
    ]
