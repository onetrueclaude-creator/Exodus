#!/usr/bin/env python3
"""Run all benchmarks and generate charts.

Usage:
    python3 run_benchmarks.py
"""
import subprocess
import sys

def main():
    print("=" * 60)
    print("Agentic Chain -- Capacity & Performance Benchmarks")
    print("=" * 60)
    print()

    # Run benchmarks
    print("[1/2] Running benchmarks...")
    bench = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/benchmarks/", "-v", "-s",
         "--tb=short"],
        cwd=".",
    )
    print()

    # Generate charts
    print("[2/2] Generating charts...")
    charts = subprocess.run(
        [sys.executable, "-m", "agentic.visualization.capacity_charts"],
        cwd=".",
    )
    print()

    print("=" * 60)
    if bench.returncode == 0 and charts.returncode == 0:
        print("ALL BENCHMARKS PASSED, CHARTS GENERATED")
    else:
        print(f"ISSUES: benchmarks={'OK' if bench.returncode == 0 else 'FAIL'}"
              f" charts={'OK' if charts.returncode == 0 else 'FAIL'}")
    print("=" * 60)
    return bench.returncode or charts.returncode

if __name__ == "__main__":
    sys.exit(main())
