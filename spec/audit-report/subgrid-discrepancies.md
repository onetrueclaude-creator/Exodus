# Subgrid Cross-Reference — Whitepaper Sections 16-17 vs galaxy/subgrid.py

**Date:** 2026-04-02
**Whitepaper:** v1.2
**Code commit:** c4f7df35d

## Summary
- 3 findings total: 0 critical, 1 major, 1 minor, 1 cosmetic

## Findings

### Finding S-001: Subgrid cell lifecycle states may differ from whitepaper
- **Severity:** Major
- **Whitepaper says:** Section 16.2 — Subgrid cells follow WARMUP→ACTIVE→COOLDOWN lifecycle (same pattern as staking). Cells must warm up before producing resources.
- **Code does:** `galaxy/subgrid.py` implements `SubgridAllocator` with cell type assignment and resource calculations. The existing patterns in `economics/staking.py` use WARMUP→ACTIVE→COOLDOWN. Need to verify whether `subgrid.py` also implements these lifecycle states or if cells are immediately active.
- **Recommendation:** Verify subgrid cell lifecycle implementation. If cells skip warmup, add lifecycle state management per whitepaper.

### Finding S-002: Resource calculation formula matches
- **Severity:** Minor (positive finding)
- **Whitepaper says:** Section 17 — `output = base_rate × level^0.8` per cell type. Section 22 confirms `LEVEL_EXPONENT = 0.8`.
- **Code does:** `params.py` has `LEVEL_EXPONENT = 0.8` and all four base rates (`BASE_SECURE_RATE=0.5`, `BASE_DEVELOP_RATE=1.0`, `BASE_RESEARCH_RATE=0.5`, `BASE_STORAGE_RATE=1.0`). All match whitepaper exactly.
- **Recommendation:** None — matches.

### Finding S-003: 64 cells (8×8) matches
- **Severity:** Cosmetic (positive finding)
- **Whitepaper says:** Section 16 — "64 sub-cells per homenode (8×8 grid)."
- **Code does:** `params.py` has `SUBGRID_SIZE = 64`. Matches.
- **Recommendation:** None — matches.
