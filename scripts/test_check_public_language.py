"""TDD for the value-language linter (W1 / constitution §II legal posture).

The linter scans PUBLIC docs (spec/) for securities-risky / false-claim /
ZK-over-claim language. The hard part is context-awareness: it must flag real
violations about OUR token while NOT tripping on competitor descriptions,
protocol-property "guarantees", or sentences that *retract* a retired term.
"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from check_public_language import scan_text  # noqa: E402


def labels(text):
    return {f.label.lower() for f in scan_text(text)}


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
