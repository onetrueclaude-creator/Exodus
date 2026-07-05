"""TDD for the value-language linter (W1 / constitution §II legal posture).

The linter scans PUBLIC docs (spec/) for securities-risky / false-claim /
ZK-over-claim language. The hard part is context-awareness: it must flag real
violations about OUR token while NOT tripping on competitor descriptions,
protocol-property "guarantees", or sentences that *retract* a retired term.
"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from check_public_language import scan_text, REPO_ROOT  # noqa: E402


def labels(text):
    return {f.label.lower() for f in scan_text(text)}


def p0(text):
    return [(f.line, f.label) for f in scan_text(text) if f.severity == "P0"]


def has_label(text, label):
    return any(f.label == label for f in scan_text(text))


def test_flags_real_p0_violations():
    bad = (
        "### Fair Launch\n"
        "Half of every fee is burned, which makes it ultrasound money.\n"
        "There is no pre-mine, no ICO, no private sale, and no treasury.\n"
        "Circulating supply contracts, increasing scarcity and token value.\n"
        "Verifier APY is approximately 40%.\n"
    )
    ls = labels(bad)
    assert any("fair launch" in l for l in ls)
    assert any("ultrasound" in l for l in ls)
    assert any("pre-mine" in l or "premine" in l for l in ls)
    assert any("treasury" in l for l in ls)
    assert any("token value" in l for l in ls)
    assert any("apy" in l for l in ls)


def test_skips_competitor_apy():
    # describing a competitor's yield is NOT a Howey claim about AGNTC
    ok = "Solana employs a PoS variant; starting with approximately 8% APY, issuance declines over time."
    assert scan_text(ok) == []


def test_skips_protocol_guarantee():
    ok = (
        "Since t = 2f + 1, the protocol provides liveness guarantees, "
        "and the core is guaranteed to exist at genesis."
    )
    assert scan_text(ok) == []


def test_skips_faction_retraction():
    ok = "The lattice has no faction arms; there is no per-faction split; factions are identity classes, not territory."
    assert scan_text(ok) == []


def test_flags_faction_as_current_mechanic():
    bad = "The Neural Lattice is organized into four factions, each controlling one arm of the spiral."
    assert any("faction" in l for l in labels(bad))


def test_skips_nx_cost_reduction_but_flags_nx_returns():
    assert scan_text("Smaller models can reduce verification cost 10-100x.") == []
    assert any("nx" in l or "x returns" in l or "returns" in l for l in labels("Early buyers saw 100x returns."))


def test_clean_text_has_no_findings():
    assert scan_text("The agent secures a node by submitting a possession proof each epoch.") == []


def test_skips_retraction_and_disclaimer_lines():
    # A term that is DISCLAIMED, or directly DENIED, is not a violation.
    for ok in [
        "## 1. Testnet-token value disclaimer",
        "This is not a fair launch; there is a treasury (14%).",
        "The Singularity is not a buy-side mechanism and creates no price floor.",
        "We make no claim about the token value or any future value.",
        "The four-faction model is retired.",
    ]:
        assert scan_text(ok) == [], ok


def test_false_claim_list_still_flags_each_item():
    # The genuine litepaper false claim: every 'no X' asserts absence as a
    # selling point — each must flag, even though each is preceded by another
    # 'no' (the bug a naive negation-skip would introduce).
    bad = "There is no pre-mine, no ICO, no private sale, and no treasury."
    ls = [f.label.lower() for f in scan_text(bad)]
    assert any("pre-mine" in l or "premine" in l for l in ls)
    assert any("private sale" in l for l in ls)   # preceded by 'no ICO' — must NOT be masked
    assert any("treasury" in l for l in ls)


def test_real_claims_with_stray_negation_still_flag():
    # FN-guard: a negation elsewhere on the line must not mask a real claim.
    hot = "The token value will rise over time; do not miss it."
    assert any("token value" in f.label.lower() for f in scan_text(hot))
    fair = "This is a fair launch with zero allocation to the team."
    assert any("fair launch" in f.label.lower() for f in scan_text(fair))


# --- W1 recall hardening: targeted families exposed by the RED baseline ---

def test_flags_guaranteed_profit_as_p0():
    # 'reward'-worded guarantee: the bare \bguarantee P1 rule misses this
    # because 'reward' is deliberately NOT a PROFIT_WORD (so honest "earn
    # AGNTC by working" copy passes). This rule must catch it as P0.
    assert has_label("AGNTC airdrop is live. Guaranteed rewards. Claim now.",
                     "HOWEY: guaranteed profit")
    assert any(f.severity == "P0" and "guaranteed profit" in f.label.lower()
               for f in scan_text("Guaranteed rewards for every securer."))
    for noun in ("returns", "payouts", "yield", "income", "profit", "gains"):
        assert has_label(f"Stake to earn guaranteed {noun} each epoch.",
                         "HOWEY: guaranteed profit"), noun


def test_guaranteed_profit_does_not_flag_honest_denials():
    # The spec phrase "earned through work, not purchased" and honest denials
    # must NEVER produce a P0 (the disclaimer/negation gate covers them).
    for ok in (
        "There is no guarantee; participation is earned through work.",
        "The protocol makes no guarantee of value.",
        "We do not guarantee any return on participation.",
        "Participation is earned through work, not purchased.",
    ):
        assert p0(ok) == [], (ok, p0(ok))


def test_flags_fomo_urgency():
    for phrase in (
        "own a piece of the grid before it's gone",
        "free AGNTC only while allocation lasts",
        "claim while supplies last",
        "get in now while it lasts",
        "don't miss the next token",
        "this is your shot to get in early",
        "get in before everyone else",
        "act now or regret it",
        "for a limited time only",
        "last chance to join",
        "the token everyone will wish they'd bought",
    ):
        assert has_label(phrase, "FOMO: urgency/scarcity"), phrase


def test_flags_free_token_but_not_free_to_play():
    for phrase in (
        "Free AGNTC for early adopters",
        "claim your free tokens today",
        "the biggest giveaway in crypto",
        "claim your free node bonus",
    ):
        assert has_label(phrase, "FREE-TOKEN: giveaway framing"), phrase
    for ok in (
        "The game is free to play.",
        "Feel free to explore the Neural Lattice.",
        "Deploy agents in free play sessions.",
    ):
        assert not has_label(ok, "FREE-TOKEN: giveaway framing"), ok


def test_flags_exchange_listing_and_price_movement():
    for phrase in (
        "once mainnet hits and AGNTC lists on exchanges",
        "AGNTC lists on Raydium next quarter",
        "it will list on Jupiter soon",
        "get in before the price moves",
        "before the price moons",
        "today's pioneers sit on the ground floor",
        "the next breakout token",
        "our price target is ambitious",
    ):
        assert has_label(phrase, "HOWEY: exchange/price movement"), phrase
    # a rival's listing/price in the comparison table is NOT an AGNTC claim
    assert not has_label(
        "Bittensor lists on exchanges and has an aggressive price target.",
        "HOWEY: exchange/price movement")


def test_expanded_competitors_skip_their_own_economics():
    # naming a rival → the line describes its economics, not AGNTC → skipped
    for comp in (
        "Bittensor (TAO) targets roughly 18% APY for stakers.",
        "Akash, Mina, and Aleo each report their own ROI.",
        "Render (RNDR) markets its own token value growth.",
        "Celestia, Arweave, and io.net are DePIN/DA networks.",
    ):
        assert scan_text(comp) == [], (comp, scan_text(comp))


def test_word_boundary_competitor_match_does_not_mask_real_claims():
    # The substring bug this fixes: 'mina' ⊂ "terminal", 'near' ⊂ "linear".
    # A real AGNTC claim on a line that merely contains those ordinary words
    # MUST still flag P0 — word boundaries prevent the false negative.
    assert any(f.severity == "P0"
               for f in scan_text("Open the terminal: AGNTC APY is ~40%."))
    assert any(f.severity == "P0"
               for f in scan_text("Rewards scale linearly and token value rises."))


def test_honest_public_docs_have_zero_p0():
    # The blocking CI invariant, as a regression test: the litepaper and the
    # canonical disclosure snippets must carry ZERO P0 findings.
    for rel in ("spec/disclosure-snippets.md", "spec/litepaper.md"):
        text = (REPO_ROOT / rel).read_text(encoding="utf-8")
        hits = [(f.line, f.label) for f in scan_text(text, rel)
                if f.severity == "P0"]
        assert hits == [], f"{rel} unexpected P0: {hits}"


def test_disclosure_snippet_phrases_have_zero_p0():
    # Verbatim load-bearing phrases from spec/disclosure-snippets.md.
    for ok in (
        "AGNTC on the testnet is a valueless token with no market price.",
        "Participation in the network is earned through work, not purchased "
        "— there is no pre-mainnet sale.",
        "says nothing about the token's price, worth, returns, or investment "
        "merit.",
        "The game is free to play.",
    ):
        assert p0(ok) == [], (ok, p0(ok))


# --- W2 firewall/selection honesty guard (whitepaper wave-2 truth-up) ---
#
# Regression class: a future edit re-asserts that the consensus "finality
# firewall" (committee/leader SELECTION weighted by AGNTC token stake only)
# is LIVE behaviour. In truth it is specified and test-guarded in the
# consensus module (chain/tests/test_consensus_firewall.py) but NOT yet
# wired into the live coordinator path — live selection still runs on
# effective stake `S_eff`. Honest copy says so with a staged-honesty
# qualifier ("specified", "live-path staged", "Honest status", "pending the
# trustless-verifier stage", "not yet wired", "takes live effect with")
# nearby; a regression drops the qualifier and asserts the mechanic as live.
#
# RED = the ORIGINAL un-remediated claims (verbatim, from the pre-truth-up
# whitepaper / the independent-review worklist items 1, 3, 4, 13, 14, 19).
# GREEN = the HONEST rewrites actually shipped in the truth-up (verbatim,
# from the truth-up commits). Paired by key so every RED has a GREEN twin.

FIREWALL_RED_GREEN_PAIRS = {
    # Item 1 — Abstract (CRITICAL).
    "item1_abstract": (
        "the **finality weight** — committee (verifier) selection *and* "
        "leader selection — is **AGNTC token-stake only** (the *finality "
        "firewall*, Section 13.5), so cheaply corrupting the storage layer "
        "cannot buy consensus influence; CPU-weighted committee selection "
        "is a PoRep-gated mainnet goal, not current behaviour.",
        "the **finality weight** — committee (verifier) selection *and* "
        "leader selection — is *specified as* **AGNTC token-stake only** "
        "(the *finality firewall*, Section 13.5); live committee/leader "
        "selection today still runs on the effective stake `S_eff` under "
        "the trusted coordinator, pending the trustless-verifier stage.",
    ),
    # Item 3 — §5B.2 (CRITICAL).
    "item3_5b2": (
        "As of 2026-06-22 the finality weight — committee and leader "
        "selection — is **AGNTC token stake only** (`W_fin`, Section "
        "13.5), because the CPU / Proof-of-Vault leg is Sybil-weak. "
        "CPU-weighted committee selection (the original §13 "
        "dual-staking-in-finality vision) is therefore stated only as a "
        "**PoRep-gated mainnet goal**, never as current behaviour.",
        "The finality weight — committee and leader selection — is "
        "*specified* as **AGNTC token stake only** (`W_fin`, Section "
        "13.5) — implemented and test-guarded, but not yet wired into the "
        "live coordinator path (Section 13.5 Honest status). "
        "CPU-weighted committee selection (the original §13 "
        "dual-staking-in-finality vision) is therefore specified only as "
        "a **PoRep-gated mainnet goal**, not as a claim that the firewall "
        "itself is already live.",
    ),
    # Item 4 — post-E1 paragraph, heading (the self-contradiction beside the
    # fix): "Architectural keystone" callout right above L1585/1587/1589.
    "item4_heading": (
        "**Architectural keystone — the finality firewall (now shipped).** "
        "This is the most important security property of the staking "
        "model, and v1.5 states it as **current behaviour**: the "
        "**finality weight is AGNTC token stake only.**",
        "**Architectural keystone — the finality firewall, as specified.** "
        "This is the most important security property of the staking "
        "model; the **finality weight is *specified* as AGNTC token "
        "stake only**, not yet wired into the live coordinator path "
        "(Honest status, Section 13.5).",
    ),
    # Item 4 — L1585 (first post-E1 paragraph).
    "item4a_selection_weighted": (
        "Committee (verifier) selection (Section 5.5) and leader "
        "selection (Section 7.1) are both weighted by `W_fin`. The CPU / "
        "Proof-of-Vault leg of effective stake (Section 13.1, β = 0.60) "
        "is **deliberately excluded from finality** and contributes only "
        "to **earnings** (reward share, Section 14) and to "
        "liveness/admission.",
        "Committee (verifier) selection (Section 5.5) and leader "
        "selection (Section 7.1) are *specified to be* weighted by "
        "`W_fin`; live selection today still runs on `S_eff` per the "
        "Honest status above. The CPU / Proof-of-Vault leg of effective "
        "stake (Section 13.1, β = 0.60) is specified to be **deliberately "
        "excluded from finality** once that wiring lands, and contributes "
        "today — via `S_eff` — to committee/leader selection as well as "
        "to **earnings** (reward share, Section 14) and to "
        "liveness/admission.",
    ),
    # Item 4 — L1587 (second post-E1 paragraph).
    "item4b_closes_that_path": (
        "so a metering-inflation or PoV-corruption attack was a path to "
        "bias *committee selection* — a ledger-relevant influence. v1.5 "
        "closes that path **in code**: by sourcing finality from token "
        "stake alone, **corrupting Proof-of-Vault can no longer buy "
        "committee influence.** A compromised or biased storage layer "
        "now degrades only state-measurement and *earnings* fairness — "
        "never finality selection.",
        "so a metering-inflation or PoV-corruption attack was a path to "
        "bias *committee selection* — a ledger-relevant influence. v1.5 "
        "specifies the closure (implemented in the consensus module); it "
        "takes live effect with the trustless-verifier stage — until "
        "then the coordinator's trust scope includes selection, so a "
        "compromised or biased storage layer can still degrade live "
        "finality selection (via `S_eff`) in addition to "
        "state-measurement and earnings fairness — never finality "
        "selection once the firewall is live.",
    ),
    # Item 4 — L1589 (third post-E1 paragraph, the honest un-rounded line).
    "item4c_honest_statement": (
        "The original §13 vision — CPU contribution *also* weighting "
        "committee selection — is deferred, not abandoned. Until then, "
        "the honest, un-rounded statement is: **finality is "
        "token-weighted (Sybil cost = token cost); CPU-weighted finality "
        "is a PoRep-gated mainnet target.** The residual testnet trust in "
        "the Singularity coordinator therefore bounds *state-measurement "
        "and earnings* fairness only — it no longer touches finality "
        "selection.",
        "The original §13 vision — CPU contribution *also* weighting "
        "committee selection — is deferred, not abandoned. Until then, "
        "the honest, un-rounded statement is: **finality is "
        "*specified* to be token-weighted, and the live testnet has not "
        "yet switched to that path (Honest status above); CPU-weighted "
        "finality is a PoRep-gated mainnet target for after that.** The "
        "residual testnet trust in the Singularity coordinator therefore "
        "bounds *state-measurement and earnings* fairness — and, until "
        "the trustless-verifier stage, finality selection itself.",
    ),
    # Item 13 — quantified Sybil cost, "Scope (read first)" lead.
    "item13_scope": (
        "**Scope (read first — finality firewall).** The following "
        "derivation analyzes the cost of dominating selection *when CPU "
        "stake weights it*. Under the current finality firewall (Section "
        "13.5), CPU stake does **not** weight finality, so the *present* "
        "finality Sybil cost is simply the token cost (the pure-PoS line "
        "below, `X`).",
        "**Scope (read first — finality firewall).** The following "
        "derivation analyzes the cost of dominating selection *when CPU "
        "stake weights it*. Under the finality firewall as specified "
        "(Section 13.5), CPU stake does **not** weight finality, so the "
        "finality Sybil cost becomes simply the token cost (live with "
        "the trustless-verifier stage; today's cost model runs on "
        "`S_eff`) (the pure-PoS line below, `X`).",
    ),
    # Item 14 — trust matrix row.
    "item14_trust_matrix": (
        "| Singularity coordinator (testnet trust assumption) | VER-INT, "
        "VER-PRIV, COM-UNBIAS (ledger safety intact) — **the finality "
        "firewall (Section 13.5) makes this clean: finality selection is "
        "token-only, so a biased CPU/storage metering cannot move "
        "committee composition** | State-layer measurement reliability |",
        "| Singularity coordinator (testnet trust assumption) | VER-INT, "
        "VER-PRIV, COM-UNBIAS (ledger safety intact) — **the finality "
        "firewall *as specified* makes this clean once live (§13.5 "
        "Honest status); on the current testnet the coordinator's trust "
        "scope includes selection** | State-layer measurement "
        "reliability |",
    ),
    # Item 19 — §22 BETA parameter note.
    "item19_beta_note": (
        "| BETA ‡ | 0.60 | CPU weight in effective stake formula "
        "(economic / reward-share only). **Note (v1.5 finality "
        "firewall):** `S_eff` governs *earnings*; consensus *finality* "
        "selection is weighted by token stake alone (`W_fin = "
        "T/T_total`), so β does **not** weight committee/leader "
        "selection — Section 13.5. |",
        "| BETA ‡ | 0.60 | CPU weight in effective stake formula "
        "(economic / reward-share only). **Note (v1.5 finality "
        "firewall):** `S_eff` governs *earnings*; consensus *finality* "
        "selection is *specified* to be token-stake-only (`W_fin = "
        "T/T_total`, live-path staged — §13.5), under which β does "
        "**not** weight committee/leader selection; on the current "
        "coordinator testnet, selection still runs on the β-weighted "
        "`S_eff`. |",
    ),
}


def test_firewall_rule_flags_each_red_item_as_p0():
    # Each ORIGINAL (un-remediated) claim must be caught as a P0 finding
    # under our new label. If the rule is deleted, every one of these
    # fails (nothing is flagged at all).
    for key, (red, _green) in FIREWALL_RED_GREEN_PAIRS.items():
        findings = p0(red)
        assert any("firewall" in lbl.lower() for _, lbl in findings), \
            (key, red, findings)


def test_firewall_rule_spares_each_green_item():
    # Each HONEST rewrite (verbatim from the truth-up) must produce ZERO
    # findings of ANY kind. If the skip predicate is deleted, every one of
    # these fails (the honest text starts getting flagged, since it
    # legitimately contains the same trigger words as the RED text).
    for key, (_red, green) in FIREWALL_RED_GREEN_PAIRS.items():
        assert scan_text(green) == [], (key, green, scan_text(green))


def test_firewall_rule_spares_earnings_current_behaviour_label():
    # The one legitimately-honest exception called out in the worklist:
    # "Earnings (current behaviour — both dimensions)" is TRUE live today
    # (earnings really are dual-weighted) — the rule keys on SELECTION
    # mechanic terms, so this must not trip it, unfixed or not.
    earnings_line = (
        "**Earnings (current behaviour — both dimensions).** *Reward "
        "share* remains governed by the dual-staking effective stake "
        "`S_eff = α·token + β·cpu` (β = 0.60). But inflating *measured* "
        "CPU buys earnings, not finality."
    )
    assert scan_text(earnings_line) == [], scan_text(earnings_line)


def test_firewall_rule_flags_finality_current_behaviour_label():
    # Its neighbour, "Finality (current behaviour — token dimension
    # only)", is the actual regression (selection is NOT token-only live)
    # and must flag; the same label pattern once fixed to "specified" must
    # not.
    finality_red = (
        "**Finality (current behaviour — token dimension only).** "
        "Committee and leader selection are weighted by **AGNTC token "
        "stake alone**. The token weight for *finality* is therefore "
        "effectively 1.0, not α = 0.40."
    )
    finality_green = (
        "**Finality (specified — token dimension only; live-path "
        "staged, §13.5).** Committee and leader selection are weighted "
        "by **AGNTC token stake alone**. The token weight for *finality* "
        "is therefore effectively 1.0, not α = 0.40."
    )
    assert any("firewall" in lbl.lower() for _, lbl in p0(finality_red)), \
        p0(finality_red)
    assert scan_text(finality_green) == [], scan_text(finality_green)
