#!/usr/bin/env python3
"""Value-language linter for PUBLIC docs (W1 / constitution §II legal posture).

Scans tracked, public documents (spec/, and optionally marketing) for
securities-risky / false-claim / ZK-over-claim language, and reports each hit
with file:line and a suggested category.

Context-aware (this is the point — a naive grep produces ~50% false positives):
  * HOWEY value/yield phrases are skipped when the line describes a COMPETITOR
    chain (e.g. "Solana ... 8% APY") rather than AGNTC.
  * "guarantee" is only flagged near OUR-token profit language — not for
    protocol "liveness guarantees" or "guaranteed to exist".
  * "Nx" is only flagged near return/profit language — not "reduce cost 10-100x".
  * "faction" is skipped on lines that RETRACT it ("there are no factions",
    "identity classes, not territory") and flagged when used as a live mechanic.
  * present-tense "zero-knowledge-proven" is skipped when a ladder caveat
    ("not yet zero-knowledge", "simulated", "possession proof", "phasing in")
    is within a few lines.

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


def _competitor_ctx(line: str, *_):
    low = line.lower()
    return any(c in low for c in COMPETITORS)


def _not_profit_ctx(line: str, *_):
    low = line.lower()
    return not any(w in low for w in PROFIT_WORDS)


def _faction_retraction(line: str, *_):
    return bool(re.search(
        r"no\s+(per-)?faction|there\s+are\s+no|not\s+(a\s+)?faction|"
        r"faction-?less|identity\s+class|not\s+territor|no\s+arms",
        line, re.I))


def _zk_caveat_nearby(line, lines, idx):
    window = " ".join(lines[max(0, idx - 3): idx + 4]).lower()
    return any(c in window for c in (
        "not yet zero-knowledge", "phasing in", "simulated", "rung",
        "possession proof", "raw-merkle", "raw merkle", "simulatedzkproof",
    ))


# (label, regex, severity, skip_predicate-or-None)
RULES = [
    ("FALSE-CLAIM: fair launch",      r"fair[\s-]*launch",            "P0", None),
    ("FALSE-CLAIM: no pre-mine",      r"no\s+pre[\s-]*mine",          "P0", None),
    ("FALSE-CLAIM: no treasury",      r"no\s+treasury",               "P0", None),
    ("FALSE-CLAIM: no private sale",  r"no\s+private\s+sale",         "P0", None),
    ("HOWEY: token value",           r"token\s+value",               "P0", _competitor_ctx),
    ("HOWEY: increasing value",       r"increas\w*[^.\n]{0,40}\bvalue\b", "P0", _competitor_ctx),
    ("HOWEY: ultrasound money",       r"ultrasound",                  "P0", None),
    ("HOWEY: deflationary anchor",    r"deflationary\s+anchor",       "P0", _competitor_ctx),
    ("HOWEY: buy-side support",       r"buy[\s-]*side",               "P0", _competitor_ctx),
    ("HOWEY: price floor",            r"price\s+floor",               "P0", _competitor_ctx),
    ("HOWEY: APY",                    r"\bAPY\b",                     "P0", _competitor_ctx),
    ("HOWEY: ROI",                    r"\bROI\b",                     "P0", _competitor_ctx),
    ("HOWEY: passive income",         r"passive\s+income",            "P0", _competitor_ctx),
    ("HOWEY: guaranteed returns",     r"\bguarantee",                 "P1", _not_profit_ctx),
    ("HYPE: to the moon",             r"to\s+the\s+moon",             "P1", None),
    ("HYPE: Nx returns",              r"\b\d{2,}x\b",                 "P1", _not_profit_ctx),
    ("STALE: faction",                r"\bfaction",                   "P1", _faction_retraction),
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
            if rx.search(line) and not (skip and skip(line, lines, i)):
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
