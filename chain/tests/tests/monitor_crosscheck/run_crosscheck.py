#!/usr/bin/env python3
"""Monitor Crosscheck Runner.

Runs the full monitor crosscheck suite and prints a structured pass/fail report.

Usage:
    python3 tests/monitor_crosscheck/run_crosscheck.py
    python3 tests/monitor_crosscheck/run_crosscheck.py --verbose
"""
from __future__ import annotations

import subprocess
import sys
import os

# Ensure we run from the agentic-chain root
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_CHAIN_ROOT = os.path.join(_SCRIPT_DIR, "..", "..")
os.chdir(_CHAIN_ROOT)

SUITE_PATH = "tests/monitor_crosscheck"

BANNER = """
╔══════════════════════════════════════════════════════════════╗
║         ZK Agentic Chain — Monitor Crosscheck Suite          ║
║  Validates zkagentic.ai stats against testnet API + Supabase ║
╚══════════════════════════════════════════════════════════════╝
"""

MODULES = [
    ("Chain Stats (Dashboard)",   "tests/monitor_crosscheck/test_chain_stats.py"),
    ("Subgrid Simulator",         "tests/monitor_crosscheck/test_subgrid.py"),
    ("Supabase Sync Payloads",    "tests/monitor_crosscheck/test_supabase_sync.py"),
    ("WebSocket / Realtime",      "tests/monitor_crosscheck/test_websocket.py"),
]


def run_module(label: str, path: str, verbose: bool) -> tuple[int, int, str]:
    """Run a single test module. Returns (passed, failed, output)."""
    args = [
        sys.executable, "-m", "pytest", path,
        "-v" if verbose else "-q",
        "--tb=short",
        "--no-header",
        "-p", "no:warnings",
    ]
    result = subprocess.run(args, capture_output=True, text=True)
    output = result.stdout + result.stderr

    # Parse counts from pytest summary line
    passed = failed = 0
    for line in output.splitlines():
        if " passed" in line or " failed" in line or " error" in line:
            parts = line.strip().split()
            for i, part in enumerate(parts):
                if part == "passed," or part == "passed":
                    try:
                        passed = int(parts[i - 1])
                    except (ValueError, IndexError):
                        pass
                if part in ("failed,", "failed", "error,", "error"):
                    try:
                        failed += int(parts[i - 1])
                    except (ValueError, IndexError):
                        pass

    return passed, failed, output


def main() -> None:
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    print(BANNER)

    total_passed = 0
    total_failed = 0
    module_results = []

    for label, path in MODULES:
        print(f"  Running: {label} ...", end="", flush=True)
        passed, failed, output = run_module(label, path, verbose)
        total_passed += passed
        total_failed += failed
        status = "PASS" if failed == 0 else "FAIL"
        print(f"  {status}  ({passed} passed, {failed} failed)")
        module_results.append((label, passed, failed, output))

    print()
    print("─" * 64)
    print(f"  TOTAL: {total_passed} passed, {total_failed} failed")
    print("─" * 64)

    if total_failed > 0:
        print("\n  FAILED MODULES — detail:\n")
        for label, passed, failed, output in module_results:
            if failed > 0:
                print(f"  ▸ {label}")
                for line in output.splitlines():
                    if "FAILED" in line or "AssertionError" in line or "assert" in line.lower():
                        print(f"    {line}")
                print()

    overall = "ALL PASS ✓" if total_failed == 0 else f"FAILURES DETECTED ✗ ({total_failed} tests)"
    print(f"\n  Result: {overall}\n")
    sys.exit(0 if total_failed == 0 else 1)


if __name__ == "__main__":
    main()
