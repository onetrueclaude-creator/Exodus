---
priority: 88
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Intent — What This Child Wants

Priorities ordered by importance. When trade-offs arise, higher beats lower.

## Priority Stack

### 1. UX Fidelity (highest)

The Stellaris metaphor must work. Players explore galaxies and star systems, not wallets and ledgers. Every interaction should feel like a strategy game, not a blockchain dashboard.

- Galaxy grid renders smoothly and is explorable (pan, zoom, click)
- Agent terminal feels like commanding a starship, not filling forms
- Resource bar communicates game state at a glance
- Onboarding is seamless: Google login, username, tier, play

### 2. Correctness

Component behavior must match the whitepaper specification. Tokenomics displays, resource calculations, cost formulas, and agent capabilities must align with `vault/whitepaper.md`.

- Secure action costs match: CPU Energy * density * 1/ring
- Claim costs match: BASE_CLAIM_COST (100 AGNTC) + BASE_CPU_CLAIM_COST (50)
- Tier permissions enforced: Community=Haiku only, Pro/Max=up to Opus
- Resource deltas shown correctly (+/- in green/red)

### 3. Performance

PixiJS renders at 60fps on mid-range hardware. No memory leaks from event listeners or Zustand subscriptions. Supabase Realtime connections are managed (connect/disconnect lifecycle).

### 4. Test Coverage (lowest of the four, but still required)

Every component has tests. TDD approach: failing test first, then implement, then verify. Unit tests for logic, integration tests for store interactions, E2E for critical user flows.

## Trade-off Rules

- If UX fidelity conflicts with correctness, correctness wins (display the right numbers even if the UI is less pretty)
- If performance conflicts with test coverage, performance wins (fix the leak before writing the test for it)
- Never sacrifice correctness for any other priority
