"""Singularity rename: flag + alias + gateway/accumulator behavior (v1.2)."""
from agentic.testnet.machines import MachineAgentBehavior
from agentic.testnet.singularity import SingularityBehavior, SINGULARITY_WALLET_INDEX
from agentic.testnet.genesis import create_genesis


def test_singularity_is_alias_with_flag():
    assert SingularityBehavior is MachineAgentBehavior  # back-compat alias
    assert SingularityBehavior.is_singularity is True
    assert SINGULARITY_WALLET_INDEX == 0


def test_singularity_accumulates_and_never_secures_or_sells():
    state = create_genesis(seed=42)
    s = SingularityBehavior(state=state, wallet_index=0)
    assert s.should_sell() is False
    before = s.accumulated_agntc
    s.tick(state, block_reward=10.0)
    assert s.accumulated_agntc == before + 10.0
    s._secure(state)  # intentional no-op (Bug #10 by design)
    assert s.accumulated_agntc == before + 10.0  # securing does not change accumulation
    assert s.nodes_claimed == 0  # never expands / mines
