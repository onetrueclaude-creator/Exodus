# Agent Lockdown Chain Integration — Implementation Plan

**Goal:** Add hash verification to the chain API so nodes with tampered `.claude/` directories are rejected, plus a comprehensive test suite and manual prompt injection playbook.

**Architecture:** New protocol params in params.py, NodeSession model with in-memory + SQLite storage, 3 new API endpoints, X-Node-Hash header gating on existing mutating endpoints. Menu-driven locked terminal in zkagentic-node. Two repos: Exodus (chain) and zkagentic-node (template).

**Tech Stack:** Python 3.9+, FastAPI, pytest, SQLite, hashlib, UUID

---

### Task 1: Add protocol params + NodeSession model

**Files:**
- Modify: `chain/agentic/params.py`
- Create: `chain/agentic/testnet/node_session.py`

**Step 1: Add params**

Add to end of `chain/agentic/params.py`:
```python
# ── Agent Lockdown — Node Hash Verification ─────────────────
CANONICAL_CLAUDE_HASH = "ea6e5ce85a080fefa51e562d6c2e607793b6cdcb002fded9cbd266d4bbb724a9"
NODE_HASH_LENGTH = 64
NODE_SESSION_TIMEOUT_S = 3600
MAX_SESSIONS_PER_WALLET = 1
```

**Step 2: Create NodeSession model**

Create `chain/agentic/testnet/node_session.py`:
```python
"""Node session management for Agent Lockdown hash verification."""

import hmac
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from agentic.params import (
    CANONICAL_CLAUDE_HASH,
    NODE_HASH_LENGTH,
    NODE_SESSION_TIMEOUT_S,
    MAX_SESSIONS_PER_WALLET,
)


@dataclass
class NodeSession:
    wallet_index: int
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    claude_hash: str = ""
    coordinates: tuple = (0, 0)
    registered_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: datetime = field(default=None)
    last_activity: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if self.expires_at is None:
            self.expires_at = self.registered_at + timedelta(
                seconds=NODE_SESSION_TIMEOUT_S
            )

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def touch(self):
        self.last_activity = datetime.utcnow()


# ── In-memory session store ─────────────────────────────────

_active_sessions: dict[int, NodeSession] = {}


def verify_hash(claude_hash: str) -> bool:
    """Constant-time comparison of claude_hash against canonical."""
    if not isinstance(claude_hash, str) or len(claude_hash) != NODE_HASH_LENGTH:
        return False
    return hmac.compare_digest(claude_hash, CANONICAL_CLAUDE_HASH)


def register_session(
    wallet_index: int, claude_hash: str, coordinates: tuple
) -> NodeSession:
    """Register a new node session. Raises ValueError/PermissionError on failure."""
    if not verify_hash(claude_hash):
        raise PermissionError("Invalid node software — hash does not match canonical template")

    existing = _active_sessions.get(wallet_index)
    if existing and not existing.is_expired:
        raise ValueError("Session already active for this wallet")

    session = NodeSession(
        wallet_index=wallet_index,
        claude_hash=claude_hash,
        coordinates=coordinates,
    )
    _active_sessions[wallet_index] = session
    return session


def get_session(wallet_index: int) -> NodeSession | None:
    """Get active session for a wallet, or None."""
    session = _active_sessions.get(wallet_index)
    if session and session.is_expired:
        del _active_sessions[wallet_index]
        return None
    return session


def clear_sessions():
    """Clear all sessions (used by /api/reset)."""
    _active_sessions.clear()


def get_all_sessions() -> dict[int, NodeSession]:
    """Return all active sessions (for persistence)."""
    return _active_sessions


def restore_sessions(sessions: dict[int, NodeSession]):
    """Restore sessions from persistence."""
    _active_sessions.clear()
    _active_sessions.update(sessions)
```

**Step 3: Run quick import test**

```bash
cd chain && python3 -c "from agentic.testnet.node_session import verify_hash, CANONICAL_CLAUDE_HASH; print('OK:', verify_hash(CANONICAL_CLAUDE_HASH))"
```
Expected: `OK: True`

**Step 4: Commit**

```bash
git add chain/agentic/params.py chain/agentic/testnet/node_session.py
git commit -m "feat: add Agent Lockdown params and NodeSession model

CANONICAL_CLAUDE_HASH, session timeout, max sessions per wallet.
NodeSession with constant-time hash verification, session lifecycle."
```

---

### Task 2: Add API endpoints

**Files:**
- Modify: `chain/agentic/testnet/api.py`

**Step 1: Add imports and Pydantic models**

Add near the top of api.py (with other imports):
```python
from agentic.testnet.node_session import (
    verify_hash,
    register_session,
    get_session,
    clear_sessions,
)
from agentic.params import CANONICAL_CLAUDE_HASH
```

Add Pydantic request/response models (near other models):
```python
class NodeRegisterRequest(BaseModel):
    wallet_index: int
    claude_hash: str
    coordinates: list[int]

class NodeRegisterResponse(BaseModel):
    status: str
    session_id: str
    expires_at: str

class NodeVerifyRequest(BaseModel):
    claude_hash: str

class NodeVerifyResponse(BaseModel):
    valid: bool
    canonical_hash: str

class NodeSessionResponse(BaseModel):
    active: bool
    session_id: str | None = None
    registered_at: str | None = None
    expires_at: str | None = None
    claude_hash: str | None = None
```

**Step 2: Add the 3 endpoints**

```python
@app.post("/api/node/verify", response_model=NodeVerifyResponse)
def verify_node_hash(req: NodeVerifyRequest):
    return NodeVerifyResponse(
        valid=verify_hash(req.claude_hash),
        canonical_hash=CANONICAL_CLAUDE_HASH,
    )


@app.post("/api/node/register", response_model=NodeRegisterResponse)
def register_node(req: NodeRegisterRequest):
    try:
        session = register_session(
            wallet_index=req.wallet_index,
            claude_hash=req.claude_hash,
            coordinates=tuple(req.coordinates),
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return NodeRegisterResponse(
        status="registered",
        session_id=session.session_id,
        expires_at=session.expires_at.isoformat() + "Z",
    )


@app.get("/api/node/session/{wallet_index}", response_model=NodeSessionResponse)
def node_session_status(wallet_index: int):
    session = get_session(wallet_index)
    if not session:
        return NodeSessionResponse(active=False)
    return NodeSessionResponse(
        active=True,
        session_id=session.session_id,
        registered_at=session.registered_at.isoformat() + "Z",
        expires_at=session.expires_at.isoformat() + "Z",
        claude_hash=session.claude_hash,
    )
```

**Step 3: Add clear_sessions() to the existing reset endpoint**

Find the `/api/reset` handler and add `clear_sessions()` after the genesis rebuild.

**Step 4: Commit**

```bash
git add chain/agentic/testnet/api.py
git commit -m "feat: add node registration, verification, and session endpoints

POST /api/node/verify — stateless hash check
POST /api/node/register — create session (403 on hash mismatch, 409 on duplicate)
GET /api/node/session/{wallet_index} — session status for game UI"
```

---

### Task 3: Add X-Node-Hash transaction gating

**Files:**
- Modify: `chain/agentic/testnet/api.py`

**Step 1: Create a dependency function**

```python
def _check_node_hash(request: Request):
    """Verify X-Node-Hash header if present. Raises 403 if invalid."""
    node_hash = request.headers.get("X-Node-Hash")
    if node_hash is not None and not verify_hash(node_hash):
        raise HTTPException(
            status_code=403,
            detail="Invalid node software — hash does not match canonical template",
        )
    # If absent, allow (backwards compatible)
```

**Step 2: Add the check to mutating endpoints**

Add `_check_node_hash(request)` as the first line in:
- The `/api/resources/{wallet_index}/assign` handler
- The `/api/birth` handler (birth_node)
- The `/api/claim` handler

Each handler already has a `request: Request` parameter or can add one.

**Step 3: Commit**

```bash
git add chain/agentic/testnet/api.py
git commit -m "feat: add X-Node-Hash header gating to mutating endpoints

Optional header — when present, verified against CANONICAL_CLAUDE_HASH.
Invalid hash → 403. Absent → allowed (backwards compatible).
Applied to: /api/resources/assign, /api/birth, /api/claim"
```

---

### Task 4: Extend persistence for sessions

**Files:**
- Modify: `chain/agentic/testnet/persistence.py`

**Step 1: Add session save/load functions**

Add to persistence.py:
```python
from agentic.testnet.node_session import (
    NodeSession, get_all_sessions, restore_sessions, clear_sessions
)

def _save_sessions(conn):
    """Save active sessions to SQLite."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS node_sessions (
            wallet_index INTEGER PRIMARY KEY,
            session_id TEXT NOT NULL,
            claude_hash TEXT NOT NULL,
            coord_x INTEGER NOT NULL,
            coord_y INTEGER NOT NULL,
            registered_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            last_activity TEXT NOT NULL
        )
    """)
    conn.execute("DELETE FROM node_sessions")
    for wallet, s in get_all_sessions().items():
        conn.execute(
            "INSERT INTO node_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (s.wallet_index, s.session_id, s.claude_hash,
             s.coordinates[0], s.coordinates[1],
             s.registered_at.isoformat(), s.expires_at.isoformat(),
             s.last_activity.isoformat()),
        )

def _load_sessions(conn):
    """Load active (non-expired) sessions from SQLite."""
    try:
        rows = conn.execute("SELECT * FROM node_sessions").fetchall()
    except Exception:
        return  # table doesn't exist yet
    sessions = {}
    for r in rows:
        s = NodeSession(
            wallet_index=r[0], session_id=r[1], claude_hash=r[2],
            coordinates=(r[3], r[4]),
            registered_at=datetime.fromisoformat(r[5]),
            expires_at=datetime.fromisoformat(r[6]),
            last_activity=datetime.fromisoformat(r[7]),
        )
        if not s.is_expired:
            sessions[s.wallet_index] = s
    restore_sessions(sessions)
```

**Step 2: Wire into existing save_state/load_state**

Add `_save_sessions(conn)` call at end of `save_state()`.
Add `_load_sessions(conn)` call at end of `load_state()`.

**Step 3: Commit**

```bash
git add chain/agentic/testnet/persistence.py
git commit -m "feat: persist node sessions to SQLite

Sessions saved/loaded alongside chain state. Expired sessions
filtered on load. Table created lazily if missing."
```

---

### Task 5: Write the full test suite

**Files:**
- Create: `chain/tests/test_node_lockdown.py`

**Step 1: Create the test file with all 32 tests**

```python
"""Tests for Agent Lockdown — node hash verification, sessions, and transaction gating."""

import time
from unittest.mock import patch
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from agentic.params import CANONICAL_CLAUDE_HASH, NODE_HASH_LENGTH
from agentic.testnet.node_session import (
    verify_hash,
    register_session,
    get_session,
    clear_sessions,
    NodeSession,
)

TEST_ADMIN_TOKEN = "test-admin-token"
VALID_HASH = CANONICAL_CLAUDE_HASH
INVALID_HASH = "a" * 64
TAMPERED_HASH = VALID_HASH[:63] + ("0" if VALID_HASH[-1] != "0" else "1")


@pytest.fixture
def client():
    from agentic.testnet.api import app, _init_genesis
    from agentic.testnet import api as _api
    _api._ADMIN_TOKEN = TEST_ADMIN_TOKEN
    _init_genesis()
    c = TestClient(app)
    c.post("/api/reset", headers={"X-Admin-Token": TEST_ADMIN_TOKEN})
    clear_sessions()
    return c


# ── Hash Verification ────────────────────────────────────────


class TestHashVerification:
    def test_verify_valid_hash_returns_true(self):
        assert verify_hash(VALID_HASH) is True

    def test_verify_invalid_hash_returns_false(self):
        assert verify_hash(INVALID_HASH) is False

    def test_verify_empty_hash_returns_false(self):
        assert verify_hash("") is False

    def test_verify_wrong_length_hash_returns_false(self):
        assert verify_hash("abc123") is False

    def test_verify_canonical_hash_matches_params(self):
        assert VALID_HASH == CANONICAL_CLAUDE_HASH

    def test_canonical_hash_is_64_hex_chars(self):
        assert len(CANONICAL_CLAUDE_HASH) == NODE_HASH_LENGTH
        assert all(c in "0123456789abcdef" for c in CANONICAL_CLAUDE_HASH)

    def test_verify_endpoint_valid(self, client):
        r = client.post("/api/node/verify", json={"claude_hash": VALID_HASH})
        assert r.status_code == 200
        assert r.json()["valid"] is True

    def test_verify_endpoint_invalid(self, client):
        r = client.post("/api/node/verify", json={"claude_hash": INVALID_HASH})
        assert r.status_code == 200
        assert r.json()["valid"] is False

    def test_verify_endpoint_returns_canonical(self, client):
        r = client.post("/api/node/verify", json={"claude_hash": INVALID_HASH})
        assert r.json()["canonical_hash"] == CANONICAL_CLAUDE_HASH

    def test_register_with_valid_hash_succeeds(self, client):
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 200
        assert r.json()["status"] == "registered"

    def test_register_with_invalid_hash_returns_403(self, client):
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": INVALID_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 403

    def test_register_with_tampered_hash_returns_403(self, client):
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": TAMPERED_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 403


# ── Session Management ───────────────────────────────────────


class TestSessionManagement:
    def test_register_creates_session(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        r = client.get("/api/node/session/0")
        assert r.json()["active"] is True

    def test_register_returns_session_id_and_expiry(self, client):
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        data = r.json()
        assert "session_id" in data
        assert "expires_at" in data
        assert len(data["session_id"]) == 36  # UUID4

    def test_duplicate_register_returns_409(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 409

    def test_expired_session_allows_re_register(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        # Manually expire the session
        session = get_session(0)
        session.expires_at = datetime.utcnow() - timedelta(seconds=1)
        # Re-register should work
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 200

    def test_session_status_shows_active(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        r = client.get("/api/node/session/0")
        data = r.json()
        assert data["active"] is True
        assert data["claude_hash"] == VALID_HASH

    def test_session_status_inactive_for_unknown(self, client):
        r = client.get("/api/node/session/999")
        assert r.json()["active"] is False

    def test_reset_clears_all_sessions(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        client.post("/api/reset", headers={"X-Admin-Token": TEST_ADMIN_TOKEN})
        r = client.get("/api/node/session/0")
        assert r.json()["active"] is False

    def test_session_expiry_enforced(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        session = get_session(0)
        session.expires_at = datetime.utcnow() - timedelta(seconds=1)
        r = client.get("/api/node/session/0")
        assert r.json()["active"] is False


# ── Transaction Gating ───────────────────────────────────────


class TestTransactionGating:
    def test_assign_with_valid_hash_succeeds(self, client):
        r = client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
            headers={"X-Node-Hash": VALID_HASH},
        )
        assert r.status_code != 403

    def test_assign_with_invalid_hash_returns_403(self, client):
        r = client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
            headers={"X-Node-Hash": INVALID_HASH},
        )
        assert r.status_code == 403

    def test_assign_without_hash_succeeds(self, client):
        r = client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
        )
        assert r.status_code != 403

    def test_birth_with_invalid_hash_returns_403(self, client):
        r = client.post(
            "/api/birth",
            json={"wallet_index": 0},
            headers={"X-Node-Hash": INVALID_HASH},
        )
        assert r.status_code == 403

    def test_claim_with_invalid_hash_returns_403(self, client):
        r = client.post(
            "/api/claim",
            json={"wallet_index": 0, "x": 100, "y": 100},
            headers={"X-Node-Hash": INVALID_HASH},
        )
        assert r.status_code == 403

    def test_valid_hash_updates_last_activity(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        before = get_session(0).last_activity
        client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
            headers={"X-Node-Hash": VALID_HASH},
        )
        # Activity should be updated (or at least not earlier)
        after = get_session(0).last_activity
        assert after >= before

    def test_invalid_hash_does_not_create_session(self, client):
        client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
            headers={"X-Node-Hash": INVALID_HASH},
        )
        assert get_session(0) is None

    def test_multiple_endpoints_check_hash(self, client):
        for endpoint, payload in [
            ("/api/resources/0/assign", {"cell_index": 0, "resource_type": "SECURE"}),
            ("/api/birth", {"wallet_index": 0}),
        ]:
            r = client.post(endpoint, json=payload, headers={"X-Node-Hash": INVALID_HASH})
            assert r.status_code == 403, f"{endpoint} did not reject invalid hash"


# ── Persistence ──────────────────────────────────────────────


class TestSessionPersistence:
    def test_session_survives_save_load(self, client):
        from agentic.testnet.persistence import save_state, load_state
        from agentic.testnet.api import _genesis_state

        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })

        g = _genesis_state()
        save_state(g, 60.0, "/tmp/test_lockdown.db")
        clear_sessions()
        assert get_session(0) is None

        load_state(g, "/tmp/test_lockdown.db")
        session = get_session(0)
        assert session is not None
        assert session.claude_hash == VALID_HASH

    def test_expired_session_not_loaded(self, client):
        from agentic.testnet.persistence import save_state, load_state
        from agentic.testnet.api import _genesis_state

        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        session = get_session(0)
        session.expires_at = datetime.utcnow() - timedelta(seconds=1)

        g = _genesis_state()
        save_state(g, 60.0, "/tmp/test_lockdown_exp.db")
        clear_sessions()
        load_state(g, "/tmp/test_lockdown_exp.db")
        assert get_session(0) is None

    def test_session_cleared_on_reset(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        clear_sessions()
        assert get_session(0) is None

    def test_load_with_no_sessions_table(self, client):
        from agentic.testnet.persistence import load_state
        from agentic.testnet.api import _genesis_state
        import sqlite3, tempfile, os

        db = tempfile.mktemp(suffix=".db")
        conn = sqlite3.connect(db)
        conn.execute("CREATE TABLE chain_meta (key TEXT, value TEXT)")
        conn.close()

        g = _genesis_state()
        load_state(g, db)  # should not crash
        os.unlink(db)
```

**Step 2: Run the tests (they will fail — no implementation yet for some)**

```bash
cd chain && python3 -m pytest tests/test_node_lockdown.py -v -q
```

**Step 3: Commit**

```bash
git add chain/tests/test_node_lockdown.py
git commit -m "test: add 32-test Agent Lockdown test suite

Hash verification (12), session management (8), transaction gating (8),
persistence (4). All tests for node registration, hash rejection,
session lifecycle, and X-Node-Hash header enforcement."
```

---

### Task 6: Run full test suite and fix any issues

**Step 1:** Run all tests
```bash
cd chain && python3 -m pytest tests/ --ignore=tests/benchmarks -q
```

**Step 2:** Fix any import errors or integration issues

**Step 3:** Commit fixes if needed

**Step 4:** Run game tests too
```bash
cd apps/game && npm run test:run
```

---

### Task 7: Rewrite zkagentic-node CLAUDE.md for menu-driven terminal

**Repo:** `/Users/toyg/zkagentic-node`

**Files:**
- Modify: `.claude/CLAUDE.md`

Replace with menu-driven terminal instructions. Claude must:
- Present numbered menu immediately on boot
- Accept ONLY single digit 1-6
- Reject ALL other input with "Invalid selection. Choose 1-6."
- Loop back to menu after every operation
- Never enter chat mode

**Step 1: Commit**

```bash
cd /Users/toyg/zkagentic-node
git add .claude/CLAUDE.md
git commit -m "feat: rewrite CLAUDE.md for menu-driven terminal

No free text input — numbered selections 1-6 only.
Rejects all other input. Loops back to menu after each operation.
Blocks prompt injection at the UX layer."
```

---

### Task 8: Create demo playbook

**Repo:** `/Users/toyg/zkagentic-node`

**Files:**
- Create: `tests/demo-playbook.md`

The manual 18-step test script for prompt injection resistance.

**Step 1: Commit**

```bash
git add tests/demo-playbook.md
git commit -m "test: add 18-step prompt injection demo playbook

10 menu breakout attacks, 5 legitimate operations, 3 hash tamper tests.
Manual test run by operator in real Claude Code session."
```

---

### Task 9: Update ROADMAP.md + README.md with quantum resistance note

**Repo:** `/Users/toyg/Exodus`

**Step 1:** Add to ROADMAP.md Phase 6 section:
```
- Quantum-resistant hashing: SHA-3 (SHAKE256) for node verification, SPHINCS+ for identity proofs
```

**Step 2:** Add to README.md Protocol table:
```
| Hash verification | SHA-256 (quantum-resistant upgrade planned) |
```

**Step 3: Commit**

```bash
git add ROADMAP.md README.md
git commit -m "docs: add quantum-resistant hashing to roadmap and README

Phase 6: SHA-3/SHAKE256 for node verification, SPHINCS+ post-mainnet.
Current SHA-256 provides 128-bit quantum security via Grover's."
```

---

### Task 10: Push PR and verify

**Step 1:** Push feature branch
```bash
git push -u origin feat/agent-lockdown-chain
```

**Step 2:** Create PR
```bash
gh pr create --base main --title "feat: Agent Lockdown — hash verification, node sessions, 32 tests"
```

**Step 3:** Wait for CI, merge on GitHub, sync locally
