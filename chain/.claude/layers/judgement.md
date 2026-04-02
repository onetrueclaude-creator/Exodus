---
priority: 85
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Judgement — When to Escalate

## Escalate to Origin (Exodus) When

### Protocol Changes
- Any modification to `params.py` — these constants govern all protocol behavior across the entire network. Even a "small" change can cascade.
- Changes to genesis logic (`genesis.py`) — breaks determinism, invalidates all existing test baselines.

### API Contract Changes
- Adding, removing, or renaming endpoints in `api.py`
- Changing request/response schemas
- Changing status codes or error formats
- These break the game UI and monitor, which are maintained by sibling teams.

### Supabase Schema Changes
- Adding/removing/renaming columns in synced tables
- Changing RLS policies
- These break the monitor at zkagentic.ai, which reads via Realtime.

### Security Concerns
- Credential exposure (API keys, service_role tokens in code)
- CORS policy changes (affects which origins can call the API)
- Admin endpoint access control changes
- Rate limiting changes

## Handle Locally (No Escalation)

- Bug fixes that don't change API contracts or params
- Test additions or improvements
- Documentation updates within `stack/` or `docs/`
- Performance optimizations that don't change behavior
- Logging or monitoring improvements
- SQLite persistence fixes (internal implementation detail)

## Decision Heuristic

> If the change would be noticed by a consumer of this API (monitor, game UI, origin), escalate.
> If the change is invisible to consumers, handle locally.
