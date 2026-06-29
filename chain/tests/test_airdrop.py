"""W5 Slice 2 — M13 airdrop transform + preview API.

Covers the shared pure transform ``agentic/economics/airdrop.py`` and the
``GET /api/airdrop-preview`` endpoint that projects the live score snapshot onto
the fixed 250M participation airdrop.

The M13 invariants asserted here MIRROR the econ-sim gate
(``tests/test_economy_simulation.py``) — which now imports the SAME transform
(DRY) — so the gate and the endpoint can never drift:

  (a) whale-cap: no allocation ever exceeds the per-wallet cap;
  (b) conservation: Σ alloc ≤ pool (+ treasury residual == pool exactly);
  (c) monotonicity: a sub-cap-by-naive contributor is never worse off than its
      naive pro-rata share (redistribution only adds to the small side);
  (d) sybil neutrality: an entity already within the cap gains nothing by
      splitting its aggregate contribution across N wallets — with the
      DOCUMENTED finding (mirrored from the sim's invariant 8) that the whale-cap
      is an anti-*whale* tool, NOT an anti-*sybil* one: the anti-sybil guarantee
      lives upstream in ``score_ledger.py`` (``SCORE_EPOCH_CAP`` bounds an
      entity's aggregate contribution), so a wallet ABOVE the cap *can* evade it
      by splitting — which is exactly why the upstream cap is load-bearing.

``hypothesis`` is not a project dependency, so the properties are exercised over
a broad adversarial parametrized set (whale, all-equal, all-above-cap, zeros,
extreme skew), the same standin the sim uses.
"""
from __future__ import annotations

import pytest

from agentic import params
from agentic.economics.airdrop import (
    airdrop_allocations,
    m13_capped_quadratic,
    prorata_allocations,
)


POOL = params.AIRDROP_POOL
CAP = POOL / params.AIRDROP_WHALE_CAP_DIVISOR


# --------------------------------------------------------------------------- #
# Params (Step 3) — additive, concordant with the whitepaper §10.1 / §22       #
# --------------------------------------------------------------------------- #
def test_airdrop_pool_is_250m_quarter_of_max_supply():
    """AIRDROP_POOL == 250,000,000 == 25% of MAX_SUPPLY (whitepaper §10.1.3)."""
    assert params.AIRDROP_POOL == 250_000_000
    assert params.AIRDROP_POOL == params.MAX_SUPPLY // 4
    assert params.AIRDROP_POOL <= params.MAX_SUPPLY


def test_whale_cap_divisor_is_present_and_yields_5pct_cap():
    """The whale-cap divisor exists; cap = POOL // divisor = 5% of the pool."""
    assert params.AIRDROP_WHALE_CAP_DIVISOR == 20
    assert POOL / params.AIRDROP_WHALE_CAP_DIVISOR == 12_500_000  # 5% of 250M


# --------------------------------------------------------------------------- #
# Adversarial case matrix (mirrors the sim's _M13_CASES)                       #
# --------------------------------------------------------------------------- #
_CASES = [
    # (id, scores, cap)
    ("single_whale", [10**9] + [1] * 99, CAP),
    ("all_equal", [1000.0] * 50, CAP),
    ("all_above_cap_uniform", [1.0] * 30, CAP),
    ("one_contributor", [42.0], CAP),
    ("two_whales", [10**9, 10**9] + [1] * 10, CAP),
    ("with_zeros", [0, 0, 10**6, 0, 5, 0, 3], CAP),
    ("all_zeros", [0, 0, 0, 0], CAP),
    ("descending", list(range(2000, 0, -1)), CAP),
    ("tiny_cap", [10, 20, 30, 40, 50], POOL / 100),
    ("generous_cap", [10**9, 1, 1, 1], POOL / 3),
    ("mixed_magnitudes", [1, 10, 100, 10**6, 10**9], CAP),
    ("huge_user_count", [1.0] * 50_000, CAP),
    ("float_scores", [0.1, 0.2, 0.7, 1e-9, 1e9], CAP),
]


def _as_dict(scores):
    """Synthetic owner keys so the dict-API can be exercised with list vectors."""
    return {f"owner{i}": float(s) for i, s in enumerate(scores)}


@pytest.mark.parametrize(
    "case_id,scores,cap",
    [pytest.param(cid, sc, cp, id=cid) for cid, sc, cp in _CASES],
)
def test_airdrop_allocations_holds_m13_invariants(case_id, scores, cap):
    """(a) whale-cap, (b) conservation, (c) monotonicity on the dict API."""
    contributions = _as_dict(scores)
    alloc = airdrop_allocations(contributions, POOL, cap)

    # Keys preserved exactly.
    assert set(alloc.keys()) == set(contributions.keys())

    # (a) Hard cap for every wallet (+ tiny FP slack).
    for owner, a in alloc.items():
        assert a <= cap + 1e-6, f"[{case_id}] {owner} alloc {a:,.2f} > cap {cap:,}"
        assert a >= 0, f"[{case_id}] {owner} negative alloc {a}"

    # (b) Conservation: total never exceeds the fixed pool.
    total = sum(alloc.values())
    assert total <= POOL * (1 + 1e-9), (
        f"[{case_id}] Σ alloc {total:,.2f} exceeds POOL {POOL:,}"
    )

    # (c) Monotonicity toward small contributors vs the naive pro-rata baseline.
    if sum(scores) > 0:
        keys = list(contributions.keys())
        naive_list = prorata_allocations([contributions[k] for k in keys], POOL)
        naive = dict(zip(keys, naive_list))
        small_gained = False
        whale_capped = False
        for k in keys:
            if naive[k] <= cap + 1e-6:  # "small" by naive pro-rata
                assert alloc[k] >= naive[k] - 1e-6, (
                    f"[{case_id}] small {k} got {alloc[k]:,.2f} < naive "
                    f"{naive[k]:,.2f} — redistribution not monotonic"
                )
                if alloc[k] > naive[k] + 1e-6:
                    small_gained = True
            else:
                whale_capped = True
        if whale_capped and any(naive[k] <= cap for k in keys):
            assert small_gained, (
                f"[{case_id}] a whale was capped but no small contributor "
                f"gained — quadratic redistribution did not fire"
            )
    else:
        assert total == 0


@pytest.mark.parametrize(
    "case_id,scores,cap",
    [pytest.param(cid, sc, cp, id=cid) for cid, sc, cp in _CASES],
)
def test_core_conserves_alloc_plus_treasury_equals_pool(case_id, scores, cap):
    """The list-core returns (alloc, treasury) with alloc+treasury == pool —
    no value is minted above the pool and none leaks below it."""
    alloc, treasury = m13_capped_quadratic(scores, POOL, cap)
    assert len(alloc) == len(scores)
    assert all(a <= cap + 1e-6 for a in alloc)
    assert treasury >= 0
    assert sum(alloc) + treasury == pytest.approx(POOL, rel=1e-9), (
        f"[{case_id}] alloc {sum(alloc):,.2f} + treasury {treasury:,.2f} != POOL"
    )


# --------------------------------------------------------------------------- #
# Dict wrapper — key preservation, edge cases, alignment with the list core    #
# --------------------------------------------------------------------------- #
def test_empty_contributions_returns_empty_dict():
    assert airdrop_allocations({}, POOL, CAP) == {}


def test_all_zero_contributions_allocate_nothing():
    out = airdrop_allocations({"a": 0.0, "b": 0.0, "c": 0.0}, POOL, CAP)
    assert out == {"a": 0.0, "b": 0.0, "c": 0.0}
    assert sum(out.values()) == 0


def test_dict_wrapper_aligns_with_list_core_by_insertion_order():
    """The dict API must map each owner to the SAME allocation the list-core
    produces for that owner's position — no key/value misalignment."""
    contributions = {"x": 5.0, "y": 50.0, "z": 500.0, "w": 0.0}
    cap = POOL / 4  # generous, so the field is pure pro-rata (no cap binds)
    out = airdrop_allocations(contributions, POOL, cap)
    alloc_list, _ = m13_capped_quadratic(list(contributions.values()), POOL, cap)
    for (owner, a), expected in zip(out.items(), alloc_list):
        assert a == pytest.approx(expected, rel=1e-12), owner


def test_single_contributor_is_whale_capped():
    """A lone contributor would take the whole pool pro-rata; the whale-cap
    pins it at the cap and the remainder is the (implicit) treasury residual."""
    out = airdrop_allocations({"solo": 123.0}, POOL, CAP)
    assert out["solo"] == pytest.approx(CAP, rel=1e-9)
    assert out["solo"] < POOL  # the cap genuinely bound


# --------------------------------------------------------------------------- #
# Sybil — neutrality within the cap + the documented cap-evasion finding        #
# --------------------------------------------------------------------------- #
def test_sybil_split_within_cap_is_neutral():
    """An entity already within the whale-cap gains NOTHING by splitting its
    aggregate contribution across N wallets.

    With the score scored in aggregate (the score-ledger guarantee: an entity's
    capped_contribution is bounded regardless of how work is split) and no
    per-wallet cap binding, pro-rata is linear, so the entity's total airdrop is
    identical whether it stays whole or splits. This is the airdrop-layer form
    of design §5.8 "an N-wallet split earns ≤ one honest wallet".
    """
    background = {f"bg{i}": 1000.0 for i in range(50)}
    C = 500.0  # entity's aggregate contribution; its pro-rata share << cap

    single = dict(background, entity=C)
    a_single = airdrop_allocations(single, POOL, CAP)

    N = 10
    split = dict(background)
    for i in range(N):
        split[f"entity{i}"] = C / N
    a_split = airdrop_allocations(split, POOL, CAP)

    entity_single = a_single["entity"]
    entity_split = sum(a_split[f"entity{i}"] for i in range(N))

    # No cap binds anywhere in this field → pure pro-rata → exactly neutral.
    assert entity_single <= CAP + 1e-6
    assert entity_split <= entity_single + 1e-6, "splitting must never help"
    assert entity_split == pytest.approx(entity_single, rel=1e-9)


def test_whale_cap_is_antiwhale_not_antisybil_documented():
    """DOCUMENTED FINDING (reported, not faked) — mirrors the sim's invariant 8.

    The airdrop whale-cap breaks whale *concentration*; it is NOT a sybil
    defense. A contributor ABOVE the cap CAN increase its take by splitting into
    enough sub-wallets that each lands below the cap (cap evasion). The
    anti-sybil guarantee therefore lives UPSTREAM in ``score_ledger.py`` —
    ``SCORE_EPOCH_CAP`` bounds an entity's aggregate contribution so the split
    can't manufacture more contribution to feed in here. Asserting the
    anti-pattern protects against a future change that mistakes the whale-cap
    for a sybil defense and drops the upstream cap.
    """
    single = {"whale": 1e9, "small": 1.0}
    a_single = airdrop_allocations(single, POOL, CAP)
    assert a_single["whale"] == pytest.approx(CAP, rel=1e-9)  # capped to 5%

    # Split the whale into 100 wallets each well below the cap pro-rata.
    split = {"small": 1.0}
    for i in range(100):
        split[f"whale{i}"] = 1e9 / 100
    a_split = airdrop_allocations(split, POOL, CAP)
    whale_split_total = sum(a_split[f"whale{i}"] for i in range(100))

    # The split evades the cap and collects far more than the single capped take
    # — the documented reason the UPSTREAM contribution cap is load-bearing.
    assert whale_split_total > a_single["whale"] + 1e-6
    # (And it's bounded by the pool — the conservation invariant still holds.)
    assert whale_split_total <= POOL * (1 + 1e-9)


# --------------------------------------------------------------------------- #
# Endpoint — GET /api/airdrop-preview (read-only/public, like /api/scores)      #
# --------------------------------------------------------------------------- #
def test_airdrop_preview_endpoint(admin_headers):
    from fastapi.testclient import TestClient
    from agentic.testnet import api as api_module

    c = TestClient(api_module.app)
    c.post("/api/reset", headers=admin_headers)
    g = api_module._g()

    # Empty ledger right after reset: a well-formed, empty projection that still
    # reports the fixed pool + cap.
    r0 = c.get("/api/airdrop-preview")
    assert r0.status_code == 200
    b0 = r0.json()
    assert b0["allocations"] == {}
    assert b0["total_allocated"] == 0
    assert b0["pool"] == params.AIRDROP_POOL
    assert b0["cap"] == pytest.approx(POOL / params.AIRDROP_WHALE_CAP_DIVISOR)

    # Drive real verifiable work for several owners: the Singularity (wallet 0)
    # mines each block; credit PoAW proofs to wallets 1 and 2 so the snapshot has
    # multiple contributors of differing magnitude.
    for _ in range(3):
        g.securing_registry.credit_proof_secured(1)
        g.securing_registry.credit_proof_secured(2)
        g.securing_registry.credit_proof_secured(2)
        api_module._do_mine(g)

    r = c.get("/api/airdrop-preview")
    assert r.status_code == 200
    body = r.json()

    pool = body["pool"]
    cap = body["cap"]
    allocations = body["allocations"]
    assert pool == params.AIRDROP_POOL
    assert cap == pytest.approx(POOL / params.AIRDROP_WHALE_CAP_DIVISOR)
    assert len(allocations) >= 2, "expected multiple scored contributors"

    # Cross-check against /api/scores: every scored owner appears in the preview
    # and the preview's `contribution` equals that owner's capped_contribution.
    scores = c.get("/api/scores").json()
    assert set(allocations.keys()) == set(scores.keys())
    for owner, row in allocations.items():
        assert "contribution" in row and "projected_allocation" in row
        assert row["contribution"] == pytest.approx(
            scores[owner]["capped_contribution"]
        )

    # M13 invariants hold on the real snapshot.
    projected = [row["projected_allocation"] for row in allocations.values()]
    assert all(0 <= p <= cap + 1e-6 for p in projected), "whale-cap violated"
    total = sum(projected)
    assert total <= pool * (1 + 1e-9), "Σ projected exceeds pool"
    assert body["total_allocated"] == pytest.approx(total)


def test_airdrop_preview_is_public_no_admin_required(admin_headers):
    """Read-only/public like /api/scores — no admin token needed to read it."""
    from fastapi.testclient import TestClient
    from agentic.testnet import api as api_module

    c = TestClient(api_module.app)
    c.post("/api/reset", headers=admin_headers)
    # No admin header on the GET.
    assert c.get("/api/airdrop-preview").status_code == 200
