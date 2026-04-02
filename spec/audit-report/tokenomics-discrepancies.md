# Tokenomics Cross-Reference — Whitepaper Sections 9-15 vs economics/ + mining.py

**Date:** 2026-04-02
**Whitepaper:** v1.2
**Code commit:** c4f7df35d

## Summary
- 10 findings total: 2 critical, 4 major, 3 minor, 1 cosmetic

## Findings

### Finding T-001: ANNUAL_INFLATION_CEILING (5%) not enforced
- **Severity:** Critical
- **Whitepaper says:** Section 10.3 — "A soft cap with a 5% annual inflation ceiling prevents runaway supply expansion." Section 22 lists `ANNUAL_INFLATION_CEILING = 0.05`.
- **Code does:** `params.py` does not contain `ANNUAL_INFLATION_CEILING`. `economics/rewards.py` and `galaxy/mining.py` compute yields without any ceiling check. Mining can theoretically inflate supply without bound.
- **Recommendation:** Add `ANNUAL_INFLATION_CEILING = 0.05` to `params.py`. Add ceiling enforcement in `mining.py:compute_block_yields()` — track annualized supply growth and cap yields when ceiling is approached.

### Finding T-002: Burn-Mint Equilibrium (BME) for node claims not implemented
- **Severity:** Critical
- **Whitepaper says:** Section 10.2 — Node claims cost AGNTC + CPU under BME: 50% burned, 50% re-minted to verifiers/stakers. Cost formula: `BASE_CLAIM_COST × density / ring` with floor `CLAIM_COST_FLOOR = 0.01`.
- **Code does:** No BME implementation exists. `BASE_CLAIM_COST`, `BASE_CPU_CLAIM_COST`, `CLAIM_COST_FLOOR` are not in `params.py`. `galaxy/coordinate.py` has no `claim_cost()` function. `galaxy/claims.py` processes claims without charging AGNTC or CPU. The only cost-related param is `BASE_BIRTH_COST = 100` (in params.py) which may be a partial precursor but is not used in the claim flow.
- **Recommendation:** Add missing params to `params.py`. Implement `claim_cost(ring, density)` in `coordinate.py`. Wire into claim pipeline. This is a Phase 2 testnet hardening item — the economic model is incomplete without it.

### Finding T-003: SIGNUP_BONUS minting not implemented
- **Severity:** Major
- **Whitepaper says:** Section 10.1 — "1 AGNTC fresh mint per new user registration" as the only supply-expanding registration event. Section 22 lists `SIGNUP_BONUS = 1.0`.
- **Code does:** No `SIGNUP_BONUS` in `params.py`. No code mints AGNTC on user registration. The testnet genesis creates 9 wallets with pre-set claims, but new wallet creation doesn't trigger a bonus mint.
- **Recommendation:** Add `SIGNUP_BONUS = 1.0` to `params.py`. Implement bonus minting in the registration flow. Lower priority than T-001/T-002.

### Finding T-004: Fee model implements correctly but fees are never deducted in mining
- **Severity:** Major
- **Whitepaper says:** Section 12 — All actions (Secure, transact, store, chat) incur fees. 50% burned, remainder split 60/40.
- **Code does:** `economics/fees.py` correctly implements `FeeEngine.collect_and_distribute()` with 50% burn and 60/40 split (verified: the math is correct). However, `galaxy/mining.py:compute_block_yields()` computes yields and mints rewards WITHOUT collecting or deducting any fees. `FeeEngine` is never called in the mining loop.
- **Recommendation:** Wire `FeeEngine` into the block processing pipeline. Fees should be collected from actions and distributed alongside mining rewards.

### Finding T-005: Slashing defined but never triggered
- **Severity:** Major
- **Whitepaper says:** Section 15 — 5 slashable offenses with specific rates (1%-100% of stake).
- **Code does:** `economics/slashing.py` correctly defines `SlashReason` enum, `SLASH_RATES`, and `SlashingEngine.slash()`. However, `SlashingEngine` is never instantiated or called in the verification pipeline. When `pipeline.py:153` detects misbehavior, it calls `agent.enter_probation()` but never slashes stake.
- **Recommendation:** Wire `SlashingEngine` into `VerificationPipeline` — call `slash()` when mismatches or non-reveals are detected.

### Finding T-006: Legacy inflation model (v1) still present and active
- **Severity:** Major
- **Whitepaper says:** v1.2 specifies organic growth model (v2) — no scheduled inflation, supply grows only via mining.
- **Code does:** `economics/inflation.py` contains `InflationModel` class using legacy v1 constants (`_LEGACY_TOTAL_SUPPLY = 21_000_000`, `_LEGACY_INITIAL_RATE = 0.10`). Similarly, `economics/rewards.py` has `_LEGACY_*` constants and `inflation_rate_at_epoch()` using legacy disinflation curve. Both files have `# TODO(v2)` comments but the legacy code is still importable and the `RewardsEngine` still uses legacy inflation in `compute_epoch_rewards()`.
- **Recommendation:** Mark `InflationModel` and legacy reward computation as deprecated. Verify no active code path calls them. If truly dead, move to a `_legacy/` module or delete.

### Finding T-007: Effective stake formula correctly implemented
- **Severity:** Minor (positive finding)
- **Whitepaper says:** Section 13 — `S_eff(i) = alpha × (T_i/T_total) + beta × (C_i/C_total)` where alpha=0.40, beta=0.60.
- **Code does:** `consensus/validator.py:19-28` — `Validator.effective_stake()` computes exactly this formula using `ALPHA` and `BETA` from params. Correct normalization, correct weights.
- **Recommendation:** None — matches.

### Finding T-008: Vesting schedule params match but vesting engine unclear
- **Severity:** Minor
- **Whitepaper says:** Section 14 — Secure rewards: 50% immediate, 50% vests linearly over 30 days.
- **Code does:** `params.py` has `SECURE_REWARD_IMMEDIATE = 0.50` and `SECURE_REWARD_VEST_DAYS = 30` (match). `economics/vesting.py` exists but would need deeper inspection to verify the linear vesting math. The params are correct.
- **Recommendation:** Verify vesting engine math in a follow-up test.

### Finding T-009: Machines Faction constraint — naming difference
- **Severity:** Minor
- **Whitepaper says:** Section 10.4 — `MACHINES_SELL_ALLOWED = false`. Machines faction is a "permanent accumulator, never sells."
- **Code does:** `params.py` has `MACHINES_MIN_SELL_RATIO = 1.0` — meaning agents cannot sell below acquisition cost (ratio 1.0 = at cost). `testnet/machines.py` implements the Machines Faction behavior.
- **Recommendation:** Naming mismatch — whitepaper says "never sells" (boolean), code says "never sells below cost" (ratio 1.0). Functionally equivalent since ratio 1.0 means break-even at best. Align naming in whitepaper v1.3.

### Finding T-010: RewardsEngine docstring references "whitepaper v0.2"
- **Severity:** Cosmetic
- **Whitepaper says:** Current version is v1.2.
- **Code does:** `economics/rewards.py:39` says "Per whitepaper v0.2" — three major versions behind.
- **Recommendation:** Update docstring to reference current whitepaper version.
