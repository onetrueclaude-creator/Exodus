"""Activity EMA tracker + rank resolver (v1.2)."""
from agentic.economics.activity import ActivityTracker, resolve_ranks


def test_ema_rises_with_work_and_decays_when_idle():
    t = ActivityTracker(half_life_blocks=10)
    for _ in range(50):
        t.record("a", secure_cpu=100.0)
        t.tick()
    busy = t.score("a")
    assert busy > 0
    for _ in range(50):
        t.tick()  # idle
    assert t.score("a") < busy * 0.1  # decayed


def test_cheap_actions_capped():
    t = ActivityTracker(half_life_blocks=10, cheap_cap=0.05)
    t.record("a", secure_cpu=0.0, cheap_units=1_000_000.0)
    t.tick()
    assert t.score("a") <= t.cheap_cap_value()


def test_resolve_ranks_orders_by_score_singularity_zero():
    ranks = resolve_ranks({"hi": 9.0, "lo": 1.0, "mid": 5.0}, singularity_id="core")
    assert ranks["core"] == 0
    assert ranks["hi"] == 1 and ranks["mid"] == 2 and ranks["lo"] == 3


def test_hysteresis_keeps_incumbent_on_narrow_overtake():
    prev = {"a": 1, "b": 2}
    ranks = resolve_ranks({"a": 5.0, "b": 5.01}, prev_ranks=prev, hysteresis=0.05)
    assert ranks["a"] == 1 and ranks["b"] == 2  # incumbent holds
