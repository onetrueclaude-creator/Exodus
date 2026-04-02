---
name: debugger
description: Use when debugging failures in the Agentic Chain testnet or related Python/JS code. Documents symptoms, root causes, and fixes for known bug patterns.
priority: 55
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Debugger Skill — Agentic Chain Known Bugs

> Every significant bug documented here: symptoms → root cause → fix → insight.
> Goal: never repeat the same debugging cycle twice.

---

## Bug 001 — GridCoordinate out-of-bounds when restoring user claims

**Symptom**
```
ValueError: x=30 out of range [-20, 20]
```
Raised during `load_state()` startup, after `create_genesis()`. Chain fails to boot with persisted state.

**Root cause**
`GLOBAL_BOUNDS` starts at `GridBounds(min_val=-20, max_val=20)` (genesis ± fog). When `load_state()` restores user claims at coordinates outside ±20 (e.g., a claim at x=30 placed after ring expansion), calling `GridCoordinate(x=30, y=30)` raises `ValueError` because the coordinate validator checks against current bounds.

Genesis always runs first, so bounds are only ±20 at the time persistence tries to restore. The bounds only expand when claims are registered — but claims can't be registered without valid coordinates.

**Fix**
Call `GLOBAL_BOUNDS.expand_to_contain(row["x"], row["y"])` **before** constructing `GridCoordinate(x=row["x"], y=row["y"])` in `persistence.py:load_state()`.

```python
# persistence.py load_state — user claims restoration
for row in cursor.fetchall():
    x, y = row["x"], row["y"]
    GLOBAL_BOUNDS.expand_to_contain(x, y)   # ← must come first
    coord = GridCoordinate(x=x, y=y)
    # ... register claim
```

**Insight**
`GridCoordinate` validates against a global mutable singleton (`GLOBAL_BOUNDS`). Any code that creates coordinates from stored data must expand bounds first. This applies in tests too: if a test fixture uses out-of-genesis coordinates, call `GLOBAL_BOUNDS.expand_to_contain()` in the test setup or use coordinates within ±20.

---

## Bug 002 — Edit tool fails with "string not found" on first attempt

**Symptom**
Edit tool returns `"old_string not found in file"` even though the string appears to be present in the file.

**Root cause**
Whitespace or encoding differences between what was recalled from memory/summary vs what's actually in the file on disk. Common causes:
- Trailing spaces trimmed in one version but not the other
- Different line ending (CRLF vs LF)
- Content from a summary/context block was paraphrased, not exact

**Fix**
Always **Read the file first** before attempting an Edit. Use the exact bytes from the Read tool output as the `old_string`. Never construct `old_string` from memory or from a previous summary.

```
# Correct pattern:
1. Read(file_path) → note exact content
2. Edit(file_path, old_string=<exact from Read output>, new_string=<replacement>)
```

**Insight**
The Read tool shows content with line numbers prepended (`NNN\t`). The actual `old_string` starts after the tab on each line. Never include the line number prefix in the `old_string`. If the file is minified (one long line), pay extra attention to surrounding context to make the match unique.

---

## Bug 003 — SlowAPI rate limiter fires in test suite, causing 429 flakes

**Symptom**
Tests like `test_message_appears_in_history` or mine-dependent tests fail with HTTP 429 when run after other test modules. Pass in isolation.

**Root cause**
`TestClient(app)` shares the same in-process FastAPI app instance across test modules. SlowAPI's rate limiter uses wall-clock time, not request count per test. When many test modules run sequentially in the same pytest session, early modules consume the rate limit budget for later ones.

**Fix options**
1. Run the affected test in isolation: `pytest tests/test_api.py::TestMessages::test_message_appears_in_history -v`
2. Add `pytest.skip("Rate limited")` guard at the top of rate-sensitive tests when run in a full suite
3. Accept it as a pre-existing flake — it's not a code regression, it's a test isolation issue

**Do NOT**: Disable rate limiting in the app for tests. That would mask production rate limit bugs.

**Insight**
SlowAPI uses the app instance's in-memory store for rate counts. The `TestClient` startup event fires `create_genesis()`, but rate limit counters are not reset between test modules. The root fix would be to use `app.state` reset between modules or use separate app instances per module — but this is overkill for a testnet.

---

## Bug 004 — Supabase sync silently fails with wrong project ref

**Symptom**
Monitor dashboard shows OFFLINE. Supabase tables not updating. No error visible in app logs (sync is fire-and-forget).

**Root cause**
Supabase client initialized with wrong project ref. The correct ref is `inqwwaqiptrmpxruyczy` — a previous version had `inqwwaqiptrmpruxczyy` (transposed letters in the middle). The JWT also contains the project ref in its payload, so a wrong URL will cause all Supabase calls to 401/404.

**Fix**
Verify: correct URL is `https://inqwwaqiptrmpxruyczy.supabase.co`. Check it matches in:
- `vault/agentic-chain/.env` (SUPABASE_URL)
- `ZkAgentic/projects/web/zkagentic-monitor/js/monitor.js`
- `ZkAgentic/projects/web/zkagentic-monitor/js/simulator.js`

The anon key JWT encodes the project ref in its payload. If the URL is wrong but the key is for the correct project, all requests will fail with auth errors.

**Insight**
Supabase sync is deliberately fire-and-forget (never crashes the miner). This means sync failures are invisible in normal operation. If the monitor goes OFFLINE, check the project ref before debugging the sync code itself.

---

## Pattern — Debugging Supabase sync in tests

When you need to test Supabase sync without a live connection, mock `_get_client`:

```python
from unittest.mock import MagicMock, patch
import agentic.testnet.supabase_sync as supabase_sync

captured = {}
mock_table = MagicMock()
mock_table.upsert.return_value.execute.return_value = MagicMock(data=[{}], error=None)
mock_client = MagicMock()
mock_client.table.return_value = mock_table

with patch.object(supabase_sync, "_get_client", return_value=mock_client):
    supabase_sync.sync_to_supabase(g, next_block_in=60.0)

# Capture what was upserted
calls = mock_table.upsert.call_args_list
for call in calls:
    data = call[0][0]
    if "blocks_processed" in data:
        captured["chain_status"] = data
    elif "staked_cpu" in data:
        captured["agents"] = captured.get("agents", []) + [data]
```

This pattern is used throughout `tests/monitor_crosscheck/test_supabase_sync.py`.
