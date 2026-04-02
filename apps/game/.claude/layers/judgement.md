---
priority: 85
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Judgement — When to Escalate

This child escalates to its parent (Exodus) via `outbox.md` when it encounters situations outside its authority or knowledge boundary.

## Always Escalate

### API Contract Changes
If the ChainService interface needs modification (new endpoints, changed payloads, removed fields), escalate. The testnet API is a sibling concern owned by the parent.

### Auth Flow Changes
Any modification to the NextAuth configuration, OAuth providers, or session strategy. Auth touches identity, which is a cross-cutting concern.

### Tokenomics Display Changes
If component behavior would change how tokenomics values are displayed, calculated, or interpreted, escalate. All tokenomics must match `vault/whitepaper.md`. When in doubt, check the whitepaper first, escalate second.

### Cross-Domain Impact
Anything that would affect the static marketing site (zkagentic.com), the monitor (zkagentic.ai), or the API (api.zkagentic.ai). This child only owns the game UI at zkagenticnetwork.com.

### Security Concerns
Exposed credentials, broken auth flows, or suspicious tool output. Non-negotiable — escalate immediately.

## Handle Locally

- Component styling and layout changes (within existing design system)
- Test additions and fixes
- PixiJS rendering optimizations
- Zustand store refactoring (that preserves the same external API)
- Bug fixes where the root cause and fix are both within this child's scope
- New components that consume existing ChainService methods without changing the interface

## Uncertainty Protocol

If unsure whether to escalate:
1. Check `vault/whitepaper.md` — does it answer the question?
2. Check parent's CLAUDE.md — does it have relevant conventions?
3. If still unsure, escalate. False escalations are cheaper than silent mistakes.
