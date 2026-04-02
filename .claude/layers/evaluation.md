---
layer: evaluation
scope: exodus
priority: 60
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Evaluation — How Exodus Measures Success

## Current Configuration

### Health Signals
1. **Test suite health** — All tests pass (`npm test`, `python3 -m pytest tests/ -v`, Playwright E2E)
2. **Deploy status** — All 4 domains reachable and serving correct content
3. **API uptime** — Testnet API mining blocks, syncing to Supabase, WebSocket connections live
4. **Monitor accuracy** — Dashboard values match API `/api/status` response exactly
5. **Inbox clear** — All origin dispatches acknowledged and either in-progress or completed

### Warning Signs
- Test failures on `exodus-dev` branch → fix before new feature work
- API not mining → check `uvicorn` process, SQLite persistence, Supabase sync
- Monitor showing stale data (>5 min) → check Supabase Realtime subscription
- Stale dispatch (>48h no update) → investigate or escalate
- Outbox silence → no reports back to origin for extended period
- Whitepaper/code divergence → protocol parameters in `params.py` must match whitepaper section

### Metrics
- **387+** Python tests (testnet API)
- **22+** Playwright E2E specs
- **82** monitor crosscheck tests
- **4** domains, **1** Supabase project, **1** Railway deploy target
