"""Longitudinal economy-simulation harness — assertive, CI-gated.

This is NOT a per-action unit test (those live in test_economics.py,
test_tokenomics_v2.py, test_vesting.py, test_fees.py, test_slashing.py).
It runs the REAL chain economy — ``agentic.simulation.engine.SimulationEngine``
— forward over a multi-year horizon under several configs (inflation on/off,
varying participation / adversarial fraction, multiple seeds) and asserts a
set of *longitudinal* economic invariants at **every epoch** and at end-state.

Why these modules:
  - ``SimulationEngine`` (agentic/simulation/engine.py) is the only driver that
    advances the full ledger N epochs. It mints at genesis, mints inflation
    rewards to validators each epoch, and runs synthetic user transfers.
  - All supply lives in ``LedgerState`` as private records; balances are read
    via ``Wallet.get_balance`` and the engine sums them into
    ``EpochSummary.circulating_supply``. Inflation minted per epoch is
    ``EpochSummary.inflation_minted``.
  - In this engine the ONLY supply-increasing op is ``Wallet.receive_mint``
    (genesis + inflation). ``validate_transfer`` strictly conserves value
    (rejects ``input_value != output_value`` and negative outputs) and there
    are NO burns wired into the engine path. So the exact identity is:

        circulating(epoch) == genesis_supply + Σ_{<=epoch} inflation_minted
        issued == circulating  (burned == 0, locked == 0 in this engine)

  - The protocol *ceilings* under test come from ``agentic.params``:
    MAX_SUPPLY = 1e9, ANNUAL_INFLATION_CEILING = 0.05.

CRITICAL: if the real engine violates an invariant, that is a real economic
finding — it is NEVER weakened to make the suite pass. The inflation-ceiling
invariant below WAS one such finding: ``SimulationEngine`` minted against a
hardcoded legacy 10%-annual disinflation curve (``_LEGACY_INITIAL_RATE=0.10``)
and never enforced ``ANNUAL_INFLATION_CEILING=0.05``, so realized annualized
growth ran ~2× the protocol ceiling. That finding has now been FIXED:
``SimulationEngine._inflation_rate_at_year`` (and the sibling projection tool
``simulation/growth.py``) clamp the legacy curve to
``params.ANNUAL_INFLATION_CEILING`` — the SAME 5% hard cap the live chain
minting path already enforces in ``agentic/lattice/mining.py`` (params is the
single source of truth). The inflation-ON invariant below is therefore now a
hard asserting test (previously ``xfail(strict=True)`` documenting the bug); it
must PASS for real. For the inflation-OFF config the ceiling holds trivially
(0 growth).

Performance: the engine's transfer/record-discovery path is ~O(epochs²·wallets),
so horizons are kept modest (≤8 wallets, ≤24 epochs = 2 simulated years at
epochs_per_year=12). Each config's full forward run is materialized ONCE in a
module-scoped fixture (~40-50s) and shared by every invariant test, so the
suite stays well under CI's --timeout=120 per-test budget. The horizon is still
genuinely longitudinal (24 monthly epochs) — the invariants are checked at
every one of them.

``hypothesis`` is not a project dependency, so the airdrop cap-holding property
(master-spec §4.3) is exercised with a broad adversarial parametrized set of
score vectors (whale, all-equal, huge-N, zeros, extreme skew) instead of
property-based generation.
"""
from __future__ import annotations

import pytest

from agentic.params import MAX_SUPPLY, ANNUAL_INFLATION_CEILING
from agentic.simulation.engine import SimulationEngine, SimulationConfig


EPOCHS_PER_YEAR = 12
HORIZON_EPOCHS = 24          # 2 simulated years, monthly epochs

# v2 genesis is 0-balance (all earned via mining). To exercise the inflation
# engine at all we must seed a nonzero per-wallet genesis balance (the same
# trick the existing engine tests use).
INFLATION_GENESIS_BALANCE = 1_000_000

# Airdrop participation pool — master-spec §4.3 (25% of MAX_SUPPLY).
PARTICIPATION_POOL = 250_000_000
assert PARTICIPATION_POOL == MAX_SUPPLY // 4


# ── Config matrix ───────────────────────────────────────────────────────────
# Each tuple: (id, SimulationConfig, inflation_on). Covers inflation ON, OFF,
# high-adversarial + different seed. Kept small for CI wall-time.
_CONFIG_SPECS = [
    (
        "inflation_on_baseline",
        SimulationConfig(
            num_wallets=6, num_validators=5, num_epochs=HORIZON_EPOCHS,
            seed=42, inflation_enabled=True,
            genesis_balance=INFLATION_GENESIS_BALANCE,
            adversarial_rate=0.10, epochs_per_year=EPOCHS_PER_YEAR,
        ),
    ),
    (
        "inflation_off_conservation",
        SimulationConfig(
            num_wallets=6, num_validators=5, num_epochs=HORIZON_EPOCHS,
            seed=42, inflation_enabled=False,
            genesis_balance=INFLATION_GENESIS_BALANCE,
            adversarial_rate=0.10, epochs_per_year=EPOCHS_PER_YEAR,
        ),
    ),
    (
        "high_adversarial_seed7",
        SimulationConfig(
            num_wallets=6, num_validators=5, num_epochs=18,
            seed=7, inflation_enabled=True,
            genesis_balance=INFLATION_GENESIS_BALANCE,
            adversarial_rate=0.50, epochs_per_year=EPOCHS_PER_YEAR,
        ),
    ),
]

_CONFIGS = {cid: cfg for cid, cfg in _CONFIG_SPECS}
_INFLATION_ON = {
    cid: cfg.inflation_enabled for cid, cfg in _CONFIG_SPECS
}

# Materialize each config's full forward run exactly once for the whole module.
# This is the expensive step; all invariant tests read from this cache.
_RUN_CACHE: dict[str, tuple] = {}


def _run(cfg_id: str):
    if cfg_id not in _RUN_CACHE:
        config = _CONFIGS[cfg_id]
        engine = SimulationEngine(config)
        engine.run_genesis()
        summaries = engine.run()
        _RUN_CACHE[cfg_id] = (engine, summaries)
    return _RUN_CACHE[cfg_id]


def _genesis_supply(config: SimulationConfig) -> int:
    return config.genesis_balance * config.num_wallets


_ALL_IDS = [cid for cid, _ in _CONFIG_SPECS]
_ON_IDS = [cid for cid, cfg in _CONFIG_SPECS if cfg.inflation_enabled]
_OFF_IDS = [cid for cid, cfg in _CONFIG_SPECS if not cfg.inflation_enabled]


# ── Invariant 1: Supply cap ─────────────────────────────────────────────────
@pytest.mark.parametrize("cfg_id", _ALL_IDS)
def test_invariant_supply_cap(cfg_id):
    """Circulating/total supply must never exceed MAX_SUPPLY at any epoch.

    Maps to EpochSummary.circulating_supply (== Σ wallet balances). Because
    issued == circulating in this engine (no burns/locks), this also bounds
    total issued supply.
    """
    _engine, summaries = _run(cfg_id)
    assert summaries, f"[{cfg_id}] no epochs ran"
    for s in summaries:
        assert s.circulating_supply <= MAX_SUPPLY, (
            f"[{cfg_id}] epoch {s.epoch}: circulating {s.circulating_supply:,} "
            f"exceeds MAX_SUPPLY {MAX_SUPPLY:,}"
        )
        assert s.circulating_supply >= 0, (
            f"[{cfg_id}] epoch {s.epoch}: negative circulating "
            f"{s.circulating_supply:,}"
        )


# ── Invariant 2: Inflation ceiling ──────────────────────────────────────────
def _check_inflation_ceiling(cfg_id):
    """Annualized per-epoch supply growth must stay <= ANNUAL_INFLATION_CEILING.

    The engine mints ``circulating * (annual_rate / epochs_per_year)`` each
    epoch. We reconstruct realized annualized growth from the actual supply
    trajectory:

        per_epoch_growth = circ[e] / circ[e-1] - 1
        annualized       = (1 + per_epoch_growth) ** epochs_per_year - 1

    and assert annualized <= ceiling (+ tolerance for integer flooring). This
    is the load-bearing "no runaway issuance" check.
    """
    config = _CONFIGS[cfg_id]
    _engine, summaries = _run(cfg_id)
    TOL = 0.01  # integer-flooring + compounding slack on the annualized figure

    prev = _genesis_supply(config)
    for s in summaries:
        circ = s.circulating_supply
        if prev <= 0:
            prev = circ
            continue
        per_epoch_growth = circ / prev - 1.0
        annualized = (1.0 + max(per_epoch_growth, 0.0)) ** config.epochs_per_year - 1.0
        assert annualized <= ANNUAL_INFLATION_CEILING + TOL, (
            f"[{cfg_id}] epoch {s.epoch}: annualized growth "
            f"{annualized:.4%} exceeds ceiling "
            f"{ANNUAL_INFLATION_CEILING:.2%} (+tol {TOL:.2%}); "
            f"circ {prev:,} -> {circ:,}"
        )
        prev = circ

    # End-state: total realized growth bounded by the ceiling compounded over
    # the simulated years.
    years = config.num_epochs / config.epochs_per_year
    genesis = _genesis_supply(config)
    final = summaries[-1].circulating_supply
    if genesis > 0:
        total_growth = final / genesis - 1.0
        max_allowed = (1.0 + ANNUAL_INFLATION_CEILING) ** years - 1.0 + TOL
        assert total_growth <= max_allowed, (
            f"[{cfg_id}] end-state growth {total_growth:.4%} over {years:.1f}y "
            f"exceeds compounded ceiling {max_allowed:.4%}"
        )


@pytest.mark.parametrize("cfg_id", _OFF_IDS)
def test_invariant_inflation_ceiling_holds_when_off(cfg_id):
    """With inflation disabled the supply does not grow, so the ceiling holds
    trivially and is asserted for real."""
    _check_inflation_ceiling(cfg_id)


@pytest.mark.parametrize("cfg_id", _ON_IDS)
def test_invariant_inflation_ceiling_when_on(cfg_id):
    """Assert the protocol inflation ceiling against the inflation-ON engine.

    Previously ``xfail(strict=True)``: the engine minted against the legacy
    10%-annual disinflation curve and ran ~2× over the protocol ceiling. That
    finding is now FIXED — ``SimulationEngine._inflation_rate_at_year`` clamps
    the curve to ``params.ANNUAL_INFLATION_CEILING`` (5%), the same hard cap
    the live chain enforces in ``agentic/lattice/mining.py``. This is now a
    hard asserting test and MUST PASS for real; the assertion is the same
    protocol-correct check and is NOT relaxed beyond the small integer-flooring
    tolerance inside ``_check_inflation_ceiling``.
    """
    _check_inflation_ceiling(cfg_id)


# ── Invariant 3: No death-spiral — bounded, solvent, no Ponzi ───────────────
@pytest.mark.parametrize("cfg_id", _ALL_IDS)
def test_invariant_no_death_spiral_and_solvent(cfg_id):
    """Supply neither collapses toward 0 nor diverges; no negative balances.

    - Lower bound: circulating never drops below genesis supply. In this engine
      nothing burns, so supply can only grow (or hold flat when inflation off);
      a drop would mean tokens vanished (caught here AND by conservation).
    - Upper bound: covered by invariant 1; re-checked relatively here so a
      runaway-issuance regression trips even if it stays under MAX_SUPPLY.
    - Solvency / no-Ponzi: inflation rewards are funded by issuance (mint),
      NOT by routing new-entrant transfers. We assert NO wallet ever ends with
      a negative balance — i.e. no reward pool was paid out of money that did
      not exist. (Conservation in invariant 4 proves growth == minted, never
      financed by transfers.)
    """
    engine, summaries = _run(cfg_id)
    config = _CONFIGS[cfg_id]
    genesis = _genesis_supply(config)

    for s in summaries:
        assert s.circulating_supply >= genesis, (
            f"[{cfg_id}] epoch {s.epoch}: supply {s.circulating_supply:,} "
            f"collapsed below genesis {genesis:,} — tokens vanished / "
            f"death-spiral"
        )
        # No divergence: 5% ceiling over <=2y => at most ~1.1x. (Before the
        # ceiling fix the engine's over-ceiling ~10% curve also stayed under 2x
        # at this horizon, so this bound never depended on the bug.)
        # Anything beyond 2x genesis is runaway issuance.
        assert s.circulating_supply <= max(genesis * 2, genesis + 1), (
            f"[{cfg_id}] epoch {s.epoch}: supply {s.circulating_supply:,} "
            f"diverged beyond 2x genesis {genesis:,}"
        )

    # Per-wallet solvency at end-state: no negative balances anywhere.
    for w in engine.wallets:
        bal = w.get_balance(engine.state)
        assert bal >= 0, (
            f"[{cfg_id}] wallet {w.name} ended with negative balance {bal:,} "
            f"— reward pool paid out money that did not exist (insolvent)"
        )

    # Reward pools stay payable: inflation-on configs must actually mint
    # something (the engine is producing rewards, not stalling).
    if config.inflation_enabled:
        total_minted = sum(s.inflation_minted for s in summaries)
        assert total_minted > 0, (
            f"[{cfg_id}] inflation enabled but nothing was ever minted — "
            f"reward engine stalled"
        )


# ── Invariant 4: Conservation ───────────────────────────────────────────────
@pytest.mark.parametrize("cfg_id", _ALL_IDS)
def test_invariant_conservation(cfg_id):
    """issued == circulating + burned + locked, reconciled against counters.

    The engine exposes exactly two supply-changing channels: genesis mint and
    inflation mint (EpochSummary.inflation_minted). Transfers conserve value
    (validate_transfer rejects non-conserving txs) and there are no burns or
    locks wired in. So the engine's conservation identity is:

        circulating(epoch) == genesis_supply + Σ_{<=epoch} inflation_minted
        burned == 0, locked == 0  =>  issued == circulating

    We reconcile the engine's circulating counter against the independent
    cumulative-mint counter at EVERY epoch. Any mismatch means tokens appeared
    or vanished outside the mint/burn channels. (This is also the no-Ponzi
    proof: growth is entirely accounted for by issuance, never by transfers.)
    """
    _engine, summaries = _run(cfg_id)
    config = _CONFIGS[cfg_id]
    genesis = _genesis_supply(config)

    cumulative_minted = 0
    for s in summaries:
        cumulative_minted += s.inflation_minted
        issued = genesis + cumulative_minted          # everything ever created
        burned = 0                                    # engine has no burn path
        locked = 0                                    # engine has no lock path
        expected_circulating = issued - burned - locked
        assert s.circulating_supply == expected_circulating, (
            f"[{cfg_id}] epoch {s.epoch}: conservation broken — "
            f"circulating {s.circulating_supply:,} != "
            f"issued({genesis:,}+{cumulative_minted:,}) - burned({burned}) "
            f"- locked({locked}) = {expected_circulating:,}. "
            f"Tokens appeared/vanished outside mint/burn."
        )

    final = summaries[-1].circulating_supply
    assert final == genesis + sum(s.inflation_minted for s in summaries), (
        f"[{cfg_id}] end-state conservation mismatch"
    )


# ── Invariant 5: Airdrop cap-holding (master-spec §4.3) ─────────────────────
def _prorata_airdrop(scores, pool):
    """Reference pro-rata airdrop: allocation_i = (score_i / Σscores) * POOL.

    No such function exists in the chain code (grep for airdrop/pro-rata is
    empty), so the master-spec §4.3 property is implemented here as the
    specified formula and asserted. The pool is a FIXED constant; the spec's
    load-bearing claim is that the total airdrop cannot exceed it regardless of
    user count or score distribution.
    """
    total = sum(scores)
    if total <= 0:
        return [0.0 for _ in scores]
    return [(sc / total) * pool for sc in scores]


# Broad, adversarial score-vector set standing in for property-based fuzzing
# (hypothesis is not an available dependency).
_AIRDROP_CASES = [
    ("all_equal_small", [1] * 10),
    ("all_equal_large", [1000] * 1000),
    ("single_whale", [10**9] + [1] * 99),
    ("one_user", [42]),
    ("two_users_skew", [1, 10**12]),
    ("descending", list(range(1000, 0, -1))),
    ("huge_user_count", [1] * 200_000),          # 200k recipients
    ("mixed_magnitudes", [1, 10, 100, 1000, 10**6, 10**9]),
    ("tiny_scores", [1, 1, 2, 3, 5, 8, 13]),
    ("with_zeros", [0, 0, 100, 0, 50, 0]),
    ("all_zeros", [0, 0, 0, 0]),
    ("float_scores", [0.1, 0.2, 0.7, 1e-9, 1e9]),
]


@pytest.mark.parametrize(
    "case_id,scores", [pytest.param(cid, sc, id=cid) for cid, sc in _AIRDROP_CASES]
)
def test_invariant_airdrop_cap_holding(case_id, scores):
    """Σ_i (score_i / Σscores) * POOL <= POOL for arbitrary score vectors.

    Master-spec §4.3: the participation pool (250M = 25% of MAX_SUPPLY) is a
    fixed constant and the total airdrop CANNOT exceed it regardless of user
    count or distribution. This is the property the marketing/Howey story
    leans on, so it is asserted hard.
    """
    pool = PARTICIPATION_POOL
    allocations = _prorata_airdrop(scores, pool)

    assert all(a >= 0 for a in allocations), (
        f"[{case_id}] negative airdrop allocation produced"
    )

    total_allocated = sum(allocations)

    # Cap-holding: total never exceeds the pool (tiny FP slack for huge sums).
    assert total_allocated <= pool * (1 + 1e-9), (
        f"[{case_id}] total airdrop {total_allocated:,.2f} exceeds "
        f"POOL {pool:,} — cap-holding violated"
    )

    # Tightness: with any positive score mass, pro-rata distributes the WHOLE
    # pool (== POOL up to FP), never silently mints extra above it. With all
    # zeros it distributes nothing.
    if sum(scores) > 0:
        assert total_allocated == pytest.approx(pool, rel=1e-9), (
            f"[{case_id}] pro-rata of a positive score mass should sum to the "
            f"full pool {pool:,}, got {total_allocated:,.4f}"
        )
    else:
        assert total_allocated == 0, (
            f"[{case_id}] all-zero scores should allocate nothing, got "
            f"{total_allocated}"
        )

    assert pool == MAX_SUPPLY // 4


def test_airdrop_pool_never_exceeds_max_supply():
    """The participation pool is a fixed 250M constant <= MAX_SUPPLY (sanity)."""
    assert PARTICIPATION_POOL == 250_000_000
    assert PARTICIPATION_POOL <= MAX_SUPPLY
    assert PARTICIPATION_POOL == MAX_SUPPLY // 4


# ── End-state smoke: the whole horizon actually advanced ────────────────────
@pytest.mark.parametrize("cfg_id", _ALL_IDS)
def test_horizon_actually_ran(cfg_id):
    """Guard against a vacuously-passing harness: the engine really advanced
    the full horizon and produced economic activity."""
    engine, summaries = _run(cfg_id)
    config = _CONFIGS[cfg_id]
    assert len(summaries) == config.num_epochs
    # Records strictly grew (transfers + mints created state) — the economy
    # was live, not frozen.
    assert engine.state.record_count > config.num_wallets, (
        f"[{cfg_id}] record store did not grow beyond genesis — economy frozen"
    )
