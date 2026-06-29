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
