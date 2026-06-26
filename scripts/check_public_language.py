#!/usr/bin/env python3
"""Value-language linter for PUBLIC docs (W1 / constitution §II legal posture).

Scans tracked, public documents (spec/, and optionally marketing) for
securities-risky / false-claim / ZK-over-claim language, and reports each hit
with file:line and a suggested category.

Context-aware (this is the point — a naive grep produces ~50% false positives):
  * HOWEY value/yield phrases are skipped when the line describes a COMPETITOR
    chain (e.g. "Solana ... 8% APY") rather than AGNTC.
  * "guarantee" is only flagged near OUR-token profit language.
  * "Nx" is only flagged near return/profit language.
  * "faction" is skipped on lines that RETRACT it; flagged when used live.
  * present-tense "zero-knowledge-proven" is skipped near a ladder caveat.
  * RETRACTION-AWARE (W62), with TWO precision levels so honest copy passes
    without ever masking a genuine claim (a false negative in a legal linter is
    worse than a false positive):
      - FALSE-CLAIM terms ("fair launch", "no pre-mine/treasury/private sale")
        skip ONLY on a strong disclaimer marker ("... disclaimer", "we make no
        claim", "removed as inaccurate", "retired") or an explicit term-denial
        ("this is NOT A fair launch"). Bare "no X" never skips — that IS the
        false-claim pattern (so "no pre-mine, no ICO, no private sale" all flag).
      - HOWEY mechanism terms ("price floor", "buy-side", "token value",
        "ultrasound", APY...) additionally skip when a negation sits directly
        before the term ("creates NO price floor", "is NOT a buy-side"), since
        those are scary mechanisms honestly denied. A claim that merely contains
        "not" elsewhere ("token value will rise, do not miss it") still flags.

Usage:
  python3 scripts/check_public_language.py [--strict] [paths...]
  default paths: spec/litepaper.md spec/whitepaper.md
  --strict: exit 1 if any P0 finding (for a blocking CI gate once docs are clean)
  default:  advisory — print findings, exit 0
"""
from __future__ import annotations
import re
import sys
import pathlib
from dataclasses import dataclass

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_TARGETS = ["spec/litepaper.md", "spec/whitepaper.md"]

COMPETITORS = (
    "ethereum", "solana", "bitcoin", "zcash", "cardano", "polkadot",
    "avalanche", "cosmos", "filecoin", "helium", "chia", "sia", "monero",
    "the merge", "pos variant", "proof of history", "aztec", "near protocol",
)
PROFIT_WORDS = (
    "return", "profit", "gain", "appreciat", "investor", "buyer", "moon",
    "income", "roi", "apy", "apr", "token value", "price target", "upside",
)

# Strong, unambiguous disclaimer markers — a line carrying one is a disclaimer
# or a retirement notice, not a claim. Safe to skip line-wide (both tiers).
_DISCLAIMER_LINE = re.compile(
    r"disclaimer|no\s+claim|makes?\s+no\b|no\s+representation|"
    r"not\s+a\s+representation|says?\s+nothing|removed\s+as\s+inaccurate|"
    r"\bretir(ed|es|ing)\b|\bremoved\b",
    re.I,
)
# Term-denial directly before the match ("this is NOT A fair launch") — the
# concept itself is being denied. Used for FALSE-CLAIM terms; bare "no" excluded.
_TERM_DENY_BEFORE = re.compile(
    r"\b(?:not\s+an?|is\s+not|are\s+not|isn'?t|aren'?t|never\s+an?)\b[\w\s,'\"-]{0,14}$",
    re.I,
)
# Any negation directly before the match ("creates NO price floor") — used for
# HOWEY mechanism terms, which are honestly denied with a plain "no".
_NEG_BEFORE = re.compile(
    r"\b(?:not|no|never|isn'?t|aren'?t|without)\b[\w\s,'\"-]{0,14}$",
    re.I,
)


def _competitor_ctx(line, *_):
    low = line.lower()
    return any(c in low for c in COMPETITORS)


def _not_profit_ctx(line, *_):
    low = line.lower()
    return not any(w in low for w in PROFIT_WORDS)


def _faction_retraction(line, *_):
    return bool(re.search(
        r"no\s+(per-)?faction|there\s+are\s+no|not\s+(a\s+)?faction|"
        r"faction-?less|identity\s+class|not\s+territor|no\s+arms",
        line, re.I))


def _zk_caveat_nearby(line, lines=None, idx=0, *_):
    seq = lines or [line]
    window = " ".join(seq[max(0, idx - 3): idx + 4]).lower()
    return any(c in window for c in (
        "not yet zero-knowledge", "phasing in", "simulated", "rung",
        "possession proof", "raw-merkle", "raw merkle", "simulatedzkproof",
    ))


def _disclaimed_falseclaim(line, lines=None, idx=0, m=None, *_):
    """FALSE-CLAIM tier: strong disclaimer marker, or explicit term-denial
    directly before the match. Bare 'no X' does NOT skip."""
    if _DISCLAIMER_LINE.search(line):
        return True
    return bool(m is not None and _TERM_DENY_BEFORE.search(line[:m.start()]))


def _disclaimed_howey(line, lines=None, idx=0, m=None, *_):
    """HOWEY-mechanism tier: strong disclaimer marker, or ANY negation directly
    before the match (a scary mechanism honestly denied)."""
    if _DISCLAIMER_LINE.search(line):
        return True
    return bool(m is not None and _NEG_BEFORE.search(line[:m.start()]))


def _or(*preds):
    """Compose skip predicates: skip if ANY fires (None preds ignored)."""
    return lambda *a: any(p(*a) for p in preds if p)


# (label, regex, severity, skip_predicate-or-None)
# skip(line, lines, idx, match) -> True means NOT a violation.
RULES = [
    ("FALSE-CLAIM: fair launch",      r"fair[\s-]*launch",            "P0", _disclaimed_falseclaim),
    ("FALSE-CLAIM: no pre-mine",      r"no\s+pre[\s-]*mine",          "P0", _disclaimed_falseclaim),
    ("FALSE-CLAIM: no treasury",      r"no\s+treasury",               "P0", _disclaimed_falseclaim),
    ("FALSE-CLAIM: no private sale",  r"no\s+private\s+sale",         "P0", _disclaimed_falseclaim),
    ("HOWEY: token value",           r"token\s+value",               "P0", _or(_competitor_ctx, _disclaimed_howey)),
    ("HOWEY: increasing value",       r"increas\w*[^.\n]{0,40}\bvalue\b", "P0", _or(_competitor_ctx, _disclaimed_howey)),
    ("HOWEY: ultrasound money",       r"ultrasound",                  "P0", _disclaimed_howey),
    ("HOWEY: deflationary anchor",    r"deflationary\s+anchor",       "P0", _or(_competitor_ctx, _disclaimed_howey)),
    ("HOWEY: buy-side support",       r"buy[\s-]*side",               "P0", _or(_competitor_ctx, _disclaimed_howey)),
    ("HOWEY: price floor",            r"price\s+floor",               "P0", _or(_competitor_ctx, _disclaimed_howey)),
    ("HOWEY: APY",                    r"\bAPY\b",                     "P0", _or(_competitor_ctx, _disclaimed_howey)),
    ("HOWEY: ROI",                    r"\bROI\b",                     "P0", _or(_competitor_ctx, _disclaimed_howey)),
    ("HOWEY: passive income",         r"passive\s+income",            "P0", _or(_competitor_ctx, _disclaimed_howey)),
    ("HOWEY: guaranteed returns",     r"\bguarantee",                 "P1", _not_profit_ctx),
    ("HYPE: to the moon",             r"to\s+the\s+moon",             "P1", None),
    ("HYPE: Nx returns",              r"\b\d{2,}x\b",                 "P1", _not_profit_ctx),
    ("STALE: faction",                r"\bfaction",                   "P1", _or(_faction_retraction, _disclaimed_howey)),
    ("ZK-LADDER: present-tense ZK",   r"zero[\s-]*knowledge[\s-]*proven", "P1", _zk_caveat_nearby),
]
_COMPILED = [(lbl, re.compile(pat, re.I), sev, skip) for lbl, pat, sev, skip in RULES]


@dataclass
class Finding:
    severity: str
    line: int
    label: str
    snippet: str


def scan_text(text: str, filename: str = "") -> list[Finding]:
    lines = text.splitlines()
    out: list[Finding] = []
    for i, line in enumerate(lines):
        for label, rx, sev, skip in _COMPILED:
            m = rx.search(line)
            if m and not (skip and skip(line, lines, i, m)):
                out.append(Finding(sev, i + 1, label, line.strip()[:120]))
    return out


def main(argv: list[str]) -> int:
    strict = "--strict" in argv
    paths = [a for a in argv if not a.startswith("-")] or DEFAULT_TARGETS
    total = p0 = 0
    for rel in paths:
        p = (REPO_ROOT / rel) if not pathlib.Path(rel).is_absolute() else pathlib.Path(rel)
        if not p.exists():
            print(f"  (missing: {rel})")
            continue
        hits = scan_text(p.read_text(encoding="utf-8"), rel)
        print(f"\n=== {rel} — {len(hits)} finding(s) ===")
        for f in sorted(hits, key=lambda f: (f.severity, f.line)):
            print(f"  [{f.severity}] L{f.line:<5} {f.label}\n         | {f.snippet}")
            total += 1
            p0 += f.severity == "P0"
    print(f"\n--- TOTAL: {total} findings (P0={p0}) ---")
    if strict and p0:
        print("STRICT: P0 findings present — failing.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
