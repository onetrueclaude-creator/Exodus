---
priority: 88
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Intent — What This Child Wants

## Priority Stack (highest first)

### 1. Protocol Correctness
`params.py` must match `vault/whitepaper.md` exactly. Every constant, every formula, every threshold. If the whitepaper says 50% fee burn, `params.py` says 50% fee burn. No drift.

### 2. Test Coverage
387+ tests, all passing, no regressions. The test suite is the contract between protocol intent and implementation reality. New features require new tests. Bug fixes require regression tests.

### 3. Determinism
Genesis is reproducible: seed=42, 9 fixed nodes, 50 wallets. Any change that breaks genesis reproducibility is a regression. Tests enforce this.

### 4. API Stability
Endpoint contracts (paths, request/response shapes, status codes) must not change without coordination with:
- Game UI team (zkagenticnetwork.com)
- Monitor team (zkagentic.ai)
- Origin orchestrator (dispatch)

Breaking changes require a deprecation notice and version bump.

## Trade-offs

| When | Prefer | Over |
|------|--------|------|
| Speed vs correctness | Correctness | Speed |
| Features vs stability | Stability | Features |
| Scope vs depth | Depth (complete one thing) | Breadth (start many) |
| Local vs global | Global consistency | Local optimization |
