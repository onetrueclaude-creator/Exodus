"""v1.2 phyllotaxis + activity params and Singularity aliases."""
from agentic import params


def test_phyllo_params_present():
    assert round(params.GOLDEN_ANGLE_DEG, 4) == 137.5078
    assert params.SEATS_INNER_BAND == 8
    assert params.HARDNESS_MULTIPLIER == 16
    assert params.ACTIVITY_HALF_LIFE_BLOCKS > 0
    assert params.EDGE_FADE_BLOCKS == 30


def test_singularity_aliases():
    assert params.SINGULARITY_ORIGIN_COORD == params.MACHINES_ORIGIN_COORD == (0, 0)
    assert params.SINGULARITY_MIN_SELL_RATIO == params.MACHINES_MIN_SELL_RATIO == 1.0
    assert params.SINGULARITY_WALLET_INDEX == 0
