"""Phyllotaxis seating: bands, hardness, seat cost."""
from agentic.lattice.seating import band_of, hardness_of, seat_cost


def test_band_and_hardness():
    assert band_of(1) == 1 and band_of(8) == 1
    assert band_of(9) == 2 and band_of(32) == 2 and band_of(33) == 3
    assert hardness_of(1) == 16 and hardness_of(9) == 32
    assert band_of(0) == 0  # the core / Singularity


def test_band_capacity_2b_minus_1():
    counts: dict[int, int] = {}
    for k in range(1, 201):
        b = band_of(k)
        counts[b] = counts.get(b, 0) + 1
    assert counts[1] == 8  # (2·1−1)·8
    assert counts[2] == 24  # (2·2−1)·8
    assert counts[3] == 40  # (2·3−1)·8


def test_seat_cost_inner_expensive():
    a1, c1 = seat_cost(1, 1.0)
    a2, c2 = seat_cost(2, 1.0)
    assert a1 == 100 and c1 == 50
    assert a2 < a1 and c2 < c1
    # floor holds at extreme outer bands / low density
    a_far, c_far = seat_cost(9999, 0.0001)
    assert a_far >= 0.01 and c_far >= 0.01
