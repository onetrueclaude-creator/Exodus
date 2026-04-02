---
description: Health check — monitor children pulse, deploys, test suites (parent only, 30m)
allowed-tools: Read, Write, Edit, Bash, Glob
priority: 65
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Watchdog — Health & Responsiveness

Comprehensive health check for all children. Runs every 30 minutes. Parent only.

## Checks

### game (apps/game/)

1. **Pulse:** Read `apps/game/outbox.md` — last message timestamp
   - If >1h ago → flag **SILENT**
2. **Journal:** Read `apps/game/.claude/journal.md` — last entry date
   - If >24h ago → flag **STALE**
3. **Server:** `lsof -i :3000 2>/dev/null | head -1`
4. **Tests:** `cd apps/game && npx vitest run --reporter=verbose 2>&1 | tail -10`

### chain (chain/)

1. **Pulse:** Read `chain/outbox.md` — last message timestamp
   - If >1h ago → flag **SILENT**
2. **Journal:** Read `chain/.claude/journal.md` — last entry date
   - If >24h ago → flag **STALE**
3. **API:** `curl -sf http://localhost:8080/health 2>/dev/null || echo "DOWN"`
4. **Tests:** `cd chain && python3 -m pytest tests/ -x -q 2>&1 | tail -5`

## Report

```
[Watchdog] game: ALIVE/SILENT | tests: PASS/FAIL(N) | server: UP/DOWN | last msg: <age>
[Watchdog] chain: ALIVE/SILENT | tests: PASS/FAIL(N) | API: UP/DOWN | last msg: <age>
```

## Actions

- If **SILENT**: write dispatch to that child's inbox.md — query type, ask for status
- If **FAIL**: write dispatch to that child's inbox.md — dispatch type, investigate failures
- If all healthy: 1-line journal entry
