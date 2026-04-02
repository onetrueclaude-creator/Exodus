---
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Evaluation — How to Measure

## Health Checks

### 1. Test Suite (primary)
```bash
cd vault/agentic-chain && python3 -m pytest tests/ -v
```
**Pass criteria:** All 387+ tests pass. Zero failures, zero errors.

### 2. Monitor Crosscheck Suite
```bash
cd vault/agentic-chain && python3 -m pytest tests/monitor_crosscheck/ -v
```
**Pass criteria:** All 82 crosscheck tests pass. These verify API output matches what Supabase sync writes.

### 3. API Startup
```bash
cd vault/agentic-chain && uvicorn agentic.testnet.api:app --port 8080
```
**Pass criteria:** Server starts cleanly, no import errors, responds to `GET /api/status`.

### 4. Supabase Sync
After mining a block, `sync_to_supabase()` should complete without errors. Verify by checking Supabase dashboard or running crosscheck tests.

### 5. SQLite Persistence Round-Trip
- Start server, mine blocks, stop server
- Restart server — state should be restored from `testnet_state.db`
- Mine another block — chain should continue from where it left off

## Red Flags

- Test count drops (tests deleted or skipped)
- `params.py` values don't match whitepaper
- Genesis produces different output (determinism broken)
- Supabase sync fails silently (monitor shows stale data)
- API returns 500 errors on standard operations
