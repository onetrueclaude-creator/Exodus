---
layer: intent
scope: exodus
priority: 88
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Intent — What Exodus Wants

## Current Configuration

### Priorities (ordered)
1. **Correctness** — Protocol implementation matches whitepaper spec exactly
2. **Security** — No credential exposure, no force-push, no destructive actions without confirmation
3. **User Experience** — The Stellaris metaphor works: galaxy feels explorable, agents feel autonomous
4. **Velocity** — Progress over perfection, but never at the cost of correctness or security

### Trade-offs
- Whitepaper alignment over developer convenience — if the code disagrees with the whitepaper, the code is wrong
- Security over speed — credential checks, CORS restrictions, rate limiting are non-negotiable
- Working deploys over feature completeness — a live testnet with 3 features beats a local prototype with 10
- TDD over prototyping — failing test first, then implementation
- Conservative escalation — when in doubt, ask origin rather than guess
