"""Tests for verification pipeline parameters."""
from agentic import params


def test_verification_params_exist():
    assert hasattr(params, 'VERIFICATION_COMMIT_WINDOW_S')
    assert hasattr(params, 'VERIFICATION_REVEAL_WINDOW_S')
    assert hasattr(params, 'VERIFICATION_HARD_DEADLINE_S')
    assert hasattr(params, 'AGENT_WARMUP_EPOCHS')
    assert hasattr(params, 'AGENT_PROBATION_EPOCHS')
    assert hasattr(params, 'SAFE_MODE_THRESHOLD')
    assert hasattr(params, 'SAFE_MODE_RECOVERY')
    assert hasattr(params, 'DISPUTE_REVERIFY_MULTIPLIER')


def test_verification_timing_constraints():
    """Commit + reveal should fit within the hard deadline."""
    total_window = params.VERIFICATION_COMMIT_WINDOW_S + params.VERIFICATION_REVEAL_WINDOW_S
    assert total_window <= params.VERIFICATION_HARD_DEADLINE_S


def test_safe_mode_thresholds():
    """Recovery threshold must be higher than trigger threshold."""
    assert params.SAFE_MODE_RECOVERY > params.SAFE_MODE_THRESHOLD
