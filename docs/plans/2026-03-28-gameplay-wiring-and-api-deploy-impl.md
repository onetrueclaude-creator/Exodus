# Gameplay Wiring + Public API Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the Python testnet API publicly at `api.zkagentic.ai`, wire the game terminal's Secure and Chain Stats commands to the real blockchain, enhance the testnet monitor with missing data fields, and add a Subgrid Simulation tab.

**Architecture:** The Python FastAPI testnet at `vault/agentic-chain/` deploys to Railway with security hardening (CORS, rate limits, admin-gated endpoints). Two new Supabase tables (`subgrid_allocations`, `resource_rewards`) sync per-wallet data after each block. The monitor at `zkagentic-monitor/` gains new stat cards and a simulation tab that writes to the public API and reads via Supabase Realtime.

**Tech Stack:** Python 3.11, FastAPI, SlowAPI, Railway, Supabase Realtime, static HTML/JS (no build system)

**Design doc:** `docs/plans/2026-03-28-gameplay-wiring-and-api-deploy-design.md`

---

## Task 1: Security — CORS + Admin Gate + Rate Limiting

**Files:**
- Modify: `vault/agentic-chain/agentic/testnet/api.py` (lines 345-353, 888-894, 1150-1169)

**Step 1: Install SlowAPI**

```bash
pip3 install slowapi
```

**Step 2: Replace CORS wildcard with explicit origins**

In `api.py` line 345-353, replace the app creation + middleware block:

```python
import os as _os

_ALLOWED_ORIGINS = _os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI(
    title="Agentic Chain Testnet API",
    version="0.1.0",
    docs_url=None if _os.environ.get("ENVIRONMENT") == "production" else "/docs",
    redoc_url=None if _os.environ.get("ENVIRONMENT") == "production" else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

**Step 3: Add rate limiting via SlowAPI**

After the CORS middleware block, add:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Then add decorators to write endpoints:

```python
# On /api/mine:
@app.post("/api/mine", response_model=MineResult)
@limiter.limit("5/10seconds")
def mine_block(request: Request) -> MineResult:

# On /api/claim:
@app.post("/api/claim", response_model=ClaimNodeResult)
@limiter.limit("5/10seconds")
def claim_node(request: Request, req: ClaimNodeRequest) -> ClaimNodeResult:

# On /api/resources/{wallet_index}/assign:
@app.post("/api/resources/{wallet_index}/assign")
@limiter.limit("5/10seconds")
def assign_subgrid(request: Request, wallet_index: int, req: SubgridAssignRequest) -> dict:

# On /api/message:
@app.post("/api/message", response_model=MessageResult)
@limiter.limit("5/10seconds")
def send_message(request: Request, req: MessageRequest) -> MessageResult:
```

Add `from fastapi import Request` to the existing imports (line 15). Every rate-limited function needs `request: Request` as its first parameter.

**Step 4: Admin-gate /api/reset and /api/automine**

Add a dependency function:

```python
_ADMIN_TOKEN = _os.environ.get("ADMIN_TOKEN", "")

def _require_admin(request: Request) -> None:
    """Reject requests without a valid X-Admin-Token header."""
    if not _ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Admin endpoints disabled (no ADMIN_TOKEN set)")
    token = request.headers.get("X-Admin-Token", "")
    if token != _ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
```

Update the endpoints:

```python
@app.post("/api/reset", response_model=ResetResult)
def reset_testnet(
    request: Request,
    wallets: int = Query(default=50, ge=1, le=200),
    claims: int = Query(default=0, ge=0, le=100),
    seed: int = Query(default=42),
) -> ResetResult:
    _require_admin(request)
    ...

@app.post("/api/automine")
async def toggle_automine(request: Request, enabled: bool = True) -> dict:
    _require_admin(request)
    ...
```

**Step 5: Cap WebSocket connections**

In `ConnectionManager.connect()` (line 31), add a cap:

```python
_MAX_WS_CONNECTIONS = 50

async def connect(self, ws: WebSocket) -> None:
    if len(self._connections) >= _MAX_WS_CONNECTIONS:
        await ws.close(code=1013, reason="Max connections reached")
        return
    await ws.accept()
    self._connections.append(ws)
```

**Step 6: Verify locally**

Run:
```bash
cd vault/agentic-chain && uvicorn agentic.testnet.api:app --port 8080
```
Test:
```bash
# CORS should reject unknown origins:
curl -H "Origin: https://evil.com" -I http://localhost:8080/api/status

# Reset should require admin token:
curl -X POST http://localhost:8080/api/reset
# Expected: 403 or 503

# With admin token (if set):
curl -X POST -H "X-Admin-Token: test" http://localhost:8080/api/reset
```

**Step 7: Commit**

```bash
git add vault/agentic-chain/agentic/testnet/api.py
git commit -m "feat(api): CORS allowlist, admin-gate reset/automine, rate limiting, WS cap"
```

---

## Task 2: Deployment — Dockerfile + requirements.txt

**Files:**
- Create: `vault/agentic-chain/Dockerfile`
- Create: `vault/agentic-chain/requirements.txt`
- Modify: `vault/agentic-chain/.gitignore` (already exists)

**Step 1: Create requirements.txt**

```txt
fastapi==0.128.8
uvicorn==0.39.0
supabase==2.28.0
python-dotenv==1.2.1
slowapi==0.1.9
pydantic==2.12.5
```

**Step 2: Create Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agentic/ agentic/

EXPOSE 8080

CMD ["uvicorn", "agentic.testnet.api:app", "--host", "0.0.0.0", "--port", "8080"]
```

**Step 3: Add Dockerfile and requirements to .gitignore exclusions**

The `.gitignore` already exists. Ensure `.env` is ignored (already done). No change needed.

**Step 4: Test Docker build locally**

```bash
cd vault/agentic-chain
docker build -t agentic-chain .
docker run --rm -p 8080:8080 \
  -e SUPABASE_URL=https://inqwwaqiptrmpxruyczy.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY="$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d= -f2)" \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  agentic-chain
```

Verify: `curl http://localhost:8080/health` should return `{"status":"ok",...}`.

**Step 5: Commit**

```bash
git add vault/agentic-chain/Dockerfile vault/agentic-chain/requirements.txt
git commit -m "feat(deploy): Dockerfile + requirements.txt for Railway deployment"
```

---

## Task 3: Deploy to Railway + DNS

**This task is manual (Railway dashboard + Cloudflare DNS). No code changes.**

**Step 1: Create Railway project**

1. Go to https://railway.com, sign in
2. New project → Deploy from GitHub repo → select `onetrueclaude-creator/Exodus`
3. Set root directory to `vault/agentic-chain`
4. Railway auto-detects the Dockerfile

**Step 2: Set environment variables in Railway dashboard**

```
SUPABASE_URL=https://inqwwaqiptrmpxruyczy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste from .env>
ADMIN_TOKEN=<generate random 32-char token>
ALLOWED_ORIGINS=https://zkagentic.ai,https://www.zkagentic.ai,https://zkagenticnetwork.com,https://www.zkagenticnetwork.com
ENVIRONMENT=production
PORT=8080
```

**Step 3: Configure custom domain**

1. In Railway project settings → Domains → Add custom domain: `api.zkagentic.ai`
2. Railway shows a CNAME target (e.g., `abc123.up.railway.app`)

**Step 4: Add DNS record in Cloudflare**

1. Go to Cloudflare dashboard → zkagentic.ai zone
2. Add CNAME record: `api` → `<railway-provided-target>`
3. Proxy status: DNS only (grey cloud) — Railway handles SSL

**Step 5: Verify deployment**

```bash
curl https://api.zkagentic.ai/health
# Expected: {"status":"ok","block_height":N,...}

curl https://api.zkagentic.ai/api/status
# Expected: full TestnetStatus JSON
```

---

## Task 4: Supabase — New Tables + Sync Code

**Files:**
- Create: `supabase/migrations/20260328000001_subgrid_allocations.sql`
- Create: `supabase/migrations/20260328000002_resource_rewards.sql`
- Modify: `vault/agentic-chain/agentic/testnet/supabase_sync.py`

**Step 1: Create subgrid_allocations migration**

```sql
-- Per-wallet subgrid cell allocation, synced after each block
CREATE TABLE IF NOT EXISTS subgrid_allocations (
    wallet_index INTEGER PRIMARY KEY,
    secure_cells INTEGER NOT NULL DEFAULT 0,
    develop_cells INTEGER NOT NULL DEFAULT 0,
    research_cells INTEGER NOT NULL DEFAULT 0,
    storage_cells INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subgrid_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_subgrid" ON subgrid_allocations FOR SELECT TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE subgrid_allocations;
```

**Step 2: Create resource_rewards migration**

```sql
-- Per-wallet cumulative resource yields, synced after each block
CREATE TABLE IF NOT EXISTS resource_rewards (
    wallet_index INTEGER PRIMARY KEY,
    agntc_earned NUMERIC NOT NULL DEFAULT 0,
    dev_points NUMERIC NOT NULL DEFAULT 0,
    research_points NUMERIC NOT NULL DEFAULT 0,
    storage_size NUMERIC NOT NULL DEFAULT 0,
    secured_chains INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resource_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_rewards" ON resource_rewards FOR SELECT TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE resource_rewards;
```

**Step 3: Apply migrations via Supabase Dashboard**

Run the SQL in the Supabase SQL Editor at:
`https://supabase.com/dashboard/project/inqwwaqiptrmpxruyczy/sql`

**Step 4: Add sync functions to supabase_sync.py**

Add these two functions before `_iso_now()`:

```python
def _sync_subgrid_allocations(g: GenesisState) -> None:
    """Upsert subgrid allocation state for all wallets with active subgrids."""
    client = _get_client()
    from agentic.galaxy.subgrid import SubcellType

    rows = []
    for i, wallet in enumerate(g.wallets):
        alloc = g.subgrid_allocators.get(wallet.public_key)
        if alloc is None:
            continue
        rows.append({
            "wallet_index": i,
            "secure_cells": alloc.count(SubcellType.SECURE),
            "develop_cells": alloc.count(SubcellType.DEVELOP),
            "research_cells": alloc.count(SubcellType.RESEARCH),
            "storage_cells": alloc.count(SubcellType.STORAGE),
            "synced_at": _iso_now(),
        })

    if rows:
        client.table("subgrid_allocations").upsert(rows).execute()


def _sync_resource_rewards(g: GenesisState) -> None:
    """Upsert cumulative resource yields for all wallets with claims."""
    client = _get_client()
    claims = g.claim_registry.all_active_claims()
    if not claims:
        return

    # Build owner→wallet_index lookup
    owner_to_index: dict[str, int] = {}
    for i, w in enumerate(g.wallets):
        owner_to_index[w.public_key] = i

    rows = []
    seen_owners: set[str] = set()
    for c in claims:
        if c.owner in seen_owners:
            continue
        seen_owners.add(c.owner)
        idx = owner_to_index.get(c.owner)
        if idx is None:
            continue
        totals = g.resource_totals.get(c.owner, {})
        rows.append({
            "wallet_index": idx,
            "agntc_earned": round(float(g.mining_engine.total_rewards_distributed), 6),
            "dev_points": round(float(totals.get("dev_points", 0.0)), 4),
            "research_points": round(float(totals.get("research_points", 0.0)), 4),
            "storage_size": round(float(totals.get("storage_units", 0.0)), 4),
            "secured_chains": int(totals.get("secured_chains", 0)),
            "synced_at": _iso_now(),
        })

    if rows:
        client.table("resource_rewards").upsert(rows).execute()
```

**Step 5: Wire into sync_to_supabase()**

In the existing `sync_to_supabase()` function, add two more try blocks after the existing agents sync:

```python
def sync_to_supabase(g: GenesisState, next_block_in: float = 60.0) -> None:
    try:
        _sync_chain_status(g, next_block_in)
    except Exception:
        pass

    try:
        _sync_agents(g)
    except Exception:
        pass

    try:
        _sync_subgrid_allocations(g)
    except Exception:
        pass

    try:
        _sync_resource_rewards(g)
    except Exception:
        pass
```

**Step 6: Test sync locally**

```bash
cd vault/agentic-chain
uvicorn agentic.testnet.api:app --port 8080
# Wait for first block (~60s), then check Supabase Dashboard:
# - subgrid_allocations table should have rows
# - resource_rewards table should have rows
```

**Step 7: Commit**

```bash
git add supabase/migrations/20260328000001_subgrid_allocations.sql \
        supabase/migrations/20260328000002_resource_rewards.sql \
        vault/agentic-chain/agentic/testnet/supabase_sync.py
git commit -m "feat(sync): add subgrid_allocations + resource_rewards Supabase tables and sync"
```

---

## Task 5: Enhance Monitor Dashboard (W6)

**Files:**
- Modify: `ZkAgentic/projects/web/zkagentic-monitor/index.html`
- Modify: `ZkAgentic/projects/web/zkagentic-monitor/js/monitor.js`

**Step 1: Add new stat cards to index.html**

After the existing `card-grid-2` div (line 116), add a new row:

```html
      <!-- Stat cards row 3: 3 columns — Economics -->
      <div class="card-grid" style="margin-top:1rem;">

        <!-- Circulating Supply -->
        <div class="stat-card">
          <div class="pill-header">Supply</div>
          <div class="stat-value" id="supply-value">&mdash;</div>
          <div class="stat-label">Circulating AGNTC</div>
        </div>

        <!-- Burned Fees -->
        <div class="stat-card">
          <div class="pill-header">Burn</div>
          <div class="stat-value" id="burned-value">&mdash;</div>
          <div class="stat-label">AGNTC Burned</div>
        </div>

        <!-- Epoch Progress -->
        <div class="stat-card">
          <div class="pill-header">Ring Progress</div>
          <div class="stat-value" id="epoch-progress-value">&mdash;</div>
          <div class="stat-label">To Next Ring</div>
          <div style="margin-top:0.5rem;background:rgba(255,255,255,0.1);border-radius:4px;height:8px;overflow:hidden;">
            <div id="epoch-progress-bar" style="height:100%;background:#22d3ee;width:0%;transition:width 0.5s;"></div>
          </div>
        </div>

      </div>
```

**Step 2: Update monitor.js — render new fields**

In `updateChainStatus(row)` function (after the epoch card update at line 89), add:

```javascript
    // Supply card
    setText('supply-value', formatNumber(row.circulating_supply));

    // Burned card
    setText('burned-value', formatNumber(row.burned_fees));

    // Epoch progress — threshold = 4 * ring * (ring + 1)
    var ring = row.epoch_ring || 0;
    var threshold = 4 * (ring + 1) * (ring + 2);  // next ring's threshold
    var prevThreshold = 4 * ring * (ring + 1);     // current ring's threshold
    var mined = row.total_mined || 0;
    var progress = 0;
    if (threshold > prevThreshold) {
      progress = Math.min(100, Math.round(((mined - prevThreshold) / (threshold - prevThreshold)) * 100));
    }
    setText('epoch-progress-value', progress + '%');
    var bar = document.getElementById('epoch-progress-bar');
    if (bar) bar.style.width = progress + '%';

    // Use synced hardness instead of client-side calculation
    setText('epoch-hardness', formatNumber(row.hardness) + 'x');
```

**Step 3: Test locally**

Serve the monitor directory:
```bash
cd ZkAgentic/projects/web/zkagentic-monitor
python3 -m http.server 8888
```
Open `http://localhost:8888` — new cards should render with data from Supabase.

**Step 4: Commit**

```bash
git add ZkAgentic/projects/web/zkagentic-monitor/index.html \
        ZkAgentic/projects/web/zkagentic-monitor/js/monitor.js
git commit -m "feat(monitor): add circulating supply, burned fees, epoch progress cards"
```

---

## Task 6: Subgrid Simulation Tab (W7)

**Files:**
- Modify: `ZkAgentic/projects/web/zkagentic-monitor/index.html`
- Create: `ZkAgentic/projects/web/zkagentic-monitor/js/simulator.js`

**Step 1: Add tab bar and simulator HTML to index.html**

Replace the header subtitle span (inside the `<a>` tag, line 46-47) to include tab navigation. After the header `</header>` tag (line 53), and before `<main>` (line 56), add a tab bar:

```html
  <!-- Tab bar -->
  <nav style="position:fixed;top:64px;left:0;right:0;z-index:40;background:rgba(0,0,0,0.9);border-bottom:1px solid rgba(255,255,255,0.06);">
    <div style="max-width:1200px;margin:0 auto;padding:0 1.5rem;display:flex;gap:1.5rem;">
      <button id="tab-dashboard" onclick="switchTab('dashboard')" class="tab-btn tab-active" style="padding:0.75rem 0;font-size:0.8rem;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:#22d3ee;background:none;border:none;border-bottom:2px solid #22d3ee;cursor:pointer;">Dashboard</button>
      <button id="tab-simulator" onclick="switchTab('simulator')" class="tab-btn" style="padding:0.75rem 0;font-size:0.8rem;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;">Subgrid Simulator</button>
    </div>
  </nav>
```

Update `<main>` padding-top to account for tab bar (add ~40px):

```html
<main class="flex-1" style="padding-top:7.5rem;">
```

Wrap existing dashboard content in a div:

```html
<div id="view-dashboard">
  <!-- existing dashboard cards here -->
</div>
```

After the dashboard div, add the simulator view:

```html
<div id="view-simulator" style="display:none;">
  <div style="max-width:1200px;margin:0 auto;padding:0 1.5rem 3rem;">

    <section style="padding:2rem 0 1.5rem;">
      <h2 style="color:white;font-size:1.5rem;font-family:'Courier New',monospace;font-weight:700;">Subgrid Simulator</h2>
      <p style="color:#9ca3af;font-size:0.875rem;margin-top:0.5rem;">Allocate your 64 subgrid cells to resource types. Secure cells earn AGNTC every block.</p>
    </section>

    <!-- Wallet selector -->
    <div style="margin-bottom:1.5rem;">
      <label style="color:#9ca3af;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Wallet</label>
      <select id="sim-wallet" style="display:block;margin-top:0.25rem;background:#111;color:white;border:1px solid rgba(255,255,255,0.15);border-radius:0.5rem;padding:0.5rem 1rem;font-family:'Courier New',monospace;font-size:0.875rem;width:200px;">
      </select>
    </div>

    <!-- Cell counters -->
    <div id="sim-counters" style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
      <span class="pill-header" style="border-color:#22c55e;color:#22c55e;">Secure: <span id="sim-count-secure">0</span></span>
      <span class="pill-header" style="border-color:#6366f1;color:#6366f1;">Develop: <span id="sim-count-develop">0</span></span>
      <span class="pill-header" style="border-color:#8b5cf6;color:#8b5cf6;">Research: <span id="sim-count-research">0</span></span>
      <span class="pill-header" style="border-color:#14b8a6;color:#14b8a6;">Storage: <span id="sim-count-storage">0</span></span>
    </div>

    <!-- 8x8 Grid -->
    <div id="sim-grid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;max-width:400px;margin-bottom:1.5rem;">
    </div>

    <!-- Apply button -->
    <button id="sim-apply" onclick="applyAllocation()" style="background:#22d3ee;color:#000;font-weight:700;padding:0.5rem 1.5rem;border:none;border-radius:0.5rem;font-family:'Courier New',monospace;cursor:pointer;font-size:0.875rem;">Apply Allocation</button>
    <span id="sim-status" style="color:#9ca3af;font-size:0.75rem;margin-left:1rem;"></span>

    <!-- Yields display -->
    <div class="card-grid-2" style="margin-top:2rem;">
      <div class="stat-card">
        <div class="pill-header">Per-Block Yields</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.5rem;">
          <div><div class="stat-value" id="sim-yield-agntc">—</div><div class="stat-label">AGNTC</div></div>
          <div><div class="stat-value" id="sim-yield-dev">—</div><div class="stat-label">Dev Points</div></div>
          <div><div class="stat-value" id="sim-yield-research">—</div><div class="stat-label">Research</div></div>
          <div><div class="stat-value" id="sim-yield-storage">—</div><div class="stat-label">Storage</div></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="pill-header">On-Chain State</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.5rem;">
          <div><div class="stat-value" id="sim-chain-secure">—</div><div class="stat-label">Secure Cells</div></div>
          <div><div class="stat-value" id="sim-chain-develop">—</div><div class="stat-label">Develop Cells</div></div>
          <div><div class="stat-value" id="sim-chain-research">—</div><div class="stat-label">Research Cells</div></div>
          <div><div class="stat-value" id="sim-chain-storage">—</div><div class="stat-label">Storage Cells</div></div>
        </div>
      </div>
    </div>

  </div>
</div>
```

Add tab-switch CSS and the global tab function (in `<style>` block):

```css
.tab-btn:hover { color: #22d3ee !important; }
.tab-active { color: #22d3ee !important; border-bottom-color: #22d3ee !important; }
.sim-cell { width:100%; aspect-ratio:1; border-radius:4px; border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:background 0.15s; }
```

Add global tab-switch script before `</body>`:

```html
<script>
function switchTab(tab) {
  document.getElementById('view-dashboard').style.display = tab === 'dashboard' ? '' : 'none';
  document.getElementById('view-simulator').style.display = tab === 'simulator' ? '' : 'none';
  document.getElementById('tab-dashboard').className = 'tab-btn' + (tab === 'dashboard' ? ' tab-active' : '');
  document.getElementById('tab-simulator').className = 'tab-btn' + (tab === 'simulator' ? ' tab-active' : '');
  if (tab === 'simulator' && typeof initSimulator === 'function') initSimulator();
}
</script>
```

Add simulator script tag:

```html
<script src="/js/simulator.js"></script>
```

**Step 2: Create simulator.js**

```javascript
// Subgrid Simulator — zkagentic.ai
(function () {
  var API_BASE = 'https://api.zkagentic.ai';
  var SUPABASE_URL = 'https://inqwwaqiptrmpxruyczy.supabase.co';
  var SUPABASE_ANON_KEY =
    '***REDACTED_ANON_KEY***';

  var CELL_TYPES = ['secure', 'develop', 'research', 'storage'];
  var CELL_COLORS = { secure: '#22c55e', develop: '#6366f1', research: '#8b5cf6', storage: '#14b8a6' };
  var cells = []; // 64 elements, each a type string
  var currentWallet = 0;
  var initialized = false;
  var sb = null;
  var allocChannel = null;
  var rewardsChannel = null;

  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  // --- Initialize ---
  window.initSimulator = function () {
    if (initialized) return;
    initialized = true;

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Populate wallet dropdown
    var select = document.getElementById('sim-wallet');
    for (var i = 0; i < 50; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Wallet ' + i;
      select.appendChild(opt);
    }
    select.addEventListener('change', function () {
      currentWallet = parseInt(this.value);
      fetchCurrentAllocation();
      subscribeToWallet();
    });

    // Build 8x8 grid
    var grid = document.getElementById('sim-grid');
    cells = [];
    for (var j = 0; j < 64; j++) {
      var div = document.createElement('div');
      div.className = 'sim-cell';
      div.style.background = CELL_COLORS.secure;
      div.dataset.index = j;
      div.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        var current = CELL_TYPES.indexOf(cells[idx]);
        var next = (current + 1) % CELL_TYPES.length;
        cells[idx] = CELL_TYPES[next];
        this.style.background = CELL_COLORS[CELL_TYPES[next]];
        updateCounters();
      });
      grid.appendChild(div);
      cells.push('secure'); // default all to secure
    }
    updateCounters();
    fetchCurrentAllocation();
    subscribeToWallet();
  };

  function updateCounters() {
    var counts = { secure: 0, develop: 0, research: 0, storage: 0 };
    for (var i = 0; i < cells.length; i++) counts[cells[i]]++;
    setText('sim-count-secure', counts.secure);
    setText('sim-count-develop', counts.develop);
    setText('sim-count-research', counts.research);
    setText('sim-count-storage', counts.storage);
  }

  // --- Fetch current on-chain allocation ---
  async function fetchCurrentAllocation() {
    try {
      var res = await fetch(API_BASE + '/api/resources/' + currentWallet);
      if (!res.ok) return;
      var data = await res.json();
      if (data.subgrid) {
        setText('sim-chain-secure', data.subgrid.secure_count || 0);
        setText('sim-chain-develop', data.subgrid.develop_count || 0);
        setText('sim-chain-research', data.subgrid.research_count || 0);
        setText('sim-chain-storage', data.subgrid.storage_count || 0);
      }
      setText('sim-yield-agntc', (data.agntc_per_block || 0).toFixed(4));
      setText('sim-yield-dev', (data.dev_points_per_block || 0).toFixed(2));
      setText('sim-yield-research', (data.research_points_per_block || 0).toFixed(2));
      setText('sim-yield-storage', (data.storage_per_block || 0).toFixed(2));
    } catch (e) {
      console.error('fetch allocation error:', e);
    }
  }

  // --- Apply allocation ---
  window.applyAllocation = async function () {
    var counts = { secure: 0, develop: 0, research: 0, storage: 0 };
    for (var i = 0; i < cells.length; i++) counts[cells[i]]++;

    setText('sim-status', 'Applying...');
    try {
      var res = await fetch(API_BASE + '/api/resources/' + currentWallet + '/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(counts),
      });
      if (!res.ok) {
        var err = await res.json();
        setText('sim-status', 'Error: ' + (err.detail || res.statusText));
        return;
      }
      setText('sim-status', 'Applied! Yields accrue next block (~60s).');
      // Refresh yields display
      setTimeout(fetchCurrentAllocation, 1000);
    } catch (e) {
      setText('sim-status', 'Network error: ' + e.message);
    }
  };

  // --- Realtime subscriptions ---
  function subscribeToWallet() {
    if (allocChannel) sb.removeChannel(allocChannel);
    if (rewardsChannel) sb.removeChannel(rewardsChannel);

    allocChannel = sb.channel('sim-alloc-' + currentWallet)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'subgrid_allocations',
        filter: 'wallet_index=eq.' + currentWallet
      }, function (payload) {
        if (payload.new) {
          setText('sim-chain-secure', payload.new.secure_cells || 0);
          setText('sim-chain-develop', payload.new.develop_cells || 0);
          setText('sim-chain-research', payload.new.research_cells || 0);
          setText('sim-chain-storage', payload.new.storage_cells || 0);
        }
      })
      .subscribe();

    rewardsChannel = sb.channel('sim-rewards-' + currentWallet)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'resource_rewards',
        filter: 'wallet_index=eq.' + currentWallet
      }, function (payload) {
        if (payload.new) {
          setText('sim-yield-agntc', (payload.new.agntc_earned || 0).toFixed(4));
          setText('sim-yield-dev', (payload.new.dev_points || 0).toFixed(2));
          setText('sim-yield-research', (payload.new.research_points || 0).toFixed(2));
          setText('sim-yield-storage', (payload.new.storage_size || 0).toFixed(2));
        }
      })
      .subscribe();
  }
})();
```

**Step 3: Test locally**

```bash
cd ZkAgentic/projects/web/zkagentic-monitor && python3 -m http.server 8888
```
Open `http://localhost:8888`, click "Subgrid Simulator" tab. Grid should render. Allocation should POST to API. Yields should update on next block.

**Step 4: Commit**

```bash
git add ZkAgentic/projects/web/zkagentic-monitor/index.html \
        ZkAgentic/projects/web/zkagentic-monitor/js/simulator.js
git commit -m "feat(monitor): subgrid simulator tab with 8x8 grid, wallet selector, live yields"
```

---

## Task 7: Deploy Updated Monitor to Cloudflare Pages

**Step 1: Copy updated monitor files to deploy repo**

```bash
cp -r ZkAgentic/projects/web/zkagentic-monitor/* /private/tmp/zkagentic-site-deploy/
```

If the deploy repo doesn't exist yet:
```bash
git clone git@github.com:onetrueclaude-creator/zkagentic-site.git /private/tmp/zkagentic-site-deploy/
cp -r ZkAgentic/projects/web/zkagentic-monitor/* /private/tmp/zkagentic-site-deploy/
```

**Step 2: Deploy to Cloudflare Pages**

```bash
cd /private/tmp/zkagentic-site-deploy
npx wrangler pages deploy . --project-name=zkagentic-site
```

**Step 3: Verify at zkagentic.ai**

- Dashboard tab: new Supply/Burn/Progress cards visible
- Simulator tab: 8x8 grid renders, wallet selector works, Apply button calls API

---

## Task 8: Wire Game Terminal — Secure + Chain Stats (W4 + W5)

**Files:**
- Modify: `apps/zkagenticnetwork/src/components/AgentChat.tsx`
- Modify: `apps/zkagenticnetwork/src/services/testnetApi.ts` (or create if doesn't exist)

**Note:** This task modifies the Next.js game frontend. The public API must be deployed first (Tasks 1-3). This task can be done in parallel with Tasks 5-7.

**Step 1: Add API helper functions to testnetApi.ts**

If `testnetApi.ts` doesn't exist, add to existing `src/services/` directory. Add:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_TESTNET_API || 'https://api.zkagentic.ai';

export async function assignSubgrid(walletIndex: number, allocation: {
  secure: number; develop: number; research: number; storage: number;
}): Promise<{ status: string; free_cells: number }> {
  const res = await fetch(`${API_BASE}/api/resources/${walletIndex}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(allocation),
  });
  if (!res.ok) throw new Error(`Assign failed: ${res.statusText}`);
  return res.json();
}

export async function fetchChainStats(): Promise<{
  blocks_processed: number; total_mined: number; circulating_supply: number;
  burned_fees: number; hardness: number; epoch_ring: number; state_root: string;
}> {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchStaking(walletIndex: number): Promise<{
  token_staked: number; cpu_staked: number; effective_stake: number;
}> {
  const res = await fetch(`${API_BASE}/api/staking/${walletIndex}`);
  if (!res.ok) throw new Error(`Staking fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchRewards(walletIndex: number): Promise<{
  agntc_earned: number; dev_points: number; research_points: number; secured_chains: number;
}> {
  const res = await fetch(`${API_BASE}/api/rewards/${walletIndex}`);
  if (!res.ok) throw new Error(`Rewards fetch failed: ${res.statusText}`);
  return res.json();
}
```

**Step 2: Update AgentChat Secure sub-menu**

In `AgentChat.tsx`, find the Secure sub-choices (currently generation-based: 1/5/10/20). Replace with cell allocation choices:

```typescript
// Replace the existing secure sub-choices with:
{ id: 'secure-8', label: '8 cells → Secure', cost: 0 },
{ id: 'secure-16', label: '16 cells → Secure', cost: 0 },
{ id: 'secure-32', label: '32 cells → Secure', cost: 0 },
{ id: 'secure-48', label: '48 cells → Secure', cost: 0 },
{ id: 'secure-64', label: 'All 64 cells → Secure', cost: 0 },
{ id: 'secure-0', label: 'Cancel Securing (0 cells)', cost: 0 },
```

**Step 3: Update Secure handler**

In `selectSubChoice()` (currently calls `spendEnergy()` + `addSecuredChain()`), replace with API call:

```typescript
if (choice.id.startsWith('secure-')) {
  const secureCells = parseInt(choice.id.split('-')[1]);
  const remaining = 64 - secureCells;
  try {
    await assignSubgrid(0, {  // wallet 0 for now
      secure: secureCells,
      develop: 0,
      research: 0,
      storage: remaining,
    });
    addAgentMessage(agent.id, `Securing with ${secureCells} cells. Yields accrue every block (~60s).`);
  } catch (err) {
    addAgentMessage(agent.id, `Allocation failed: ${err.message}`);
  }
  return;
}
```

**Step 4: Update Chain Stats handler**

In the Chain Stats action handler (currently reads from Zustand store), replace with API call:

```typescript
if (action === 'chain-stats') {
  try {
    const stats = await fetchChainStats();
    const msg = [
      `═══ CHAIN STATUS ═══`,
      `Blocks: ${stats.blocks_processed}`,
      `Epoch Ring: ${stats.epoch_ring}`,
      `Hardness: ${stats.hardness}x`,
      `AGNTC Mined: ${stats.total_mined.toFixed(4)}`,
      `Circulating: ${stats.circulating_supply.toFixed(4)}`,
      `Burned: ${stats.burned_fees}`,
      `State Root: ${stats.state_root.slice(0, 16)}...`,
    ].join('\n');
    addAgentMessage(agent.id, msg);
  } catch (err) {
    addAgentMessage(agent.id, `Stats unavailable: ${err.message}`);
  }
  return;
}
```

**Step 5: Update .env.local**

Ensure `NEXT_PUBLIC_TESTNET_API` points to the public API:

```
NEXT_PUBLIC_TESTNET_API=https://api.zkagentic.ai
```

**Step 6: Test locally**

```bash
npm run dev
```
Open `http://localhost:3000/game`, open an agent terminal:
- Click Secure → pick cell count → should show "Securing with N cells..."
- Click Chain Stats → should show live blockchain data

**Step 7: Commit**

```bash
git add apps/zkagenticnetwork/src/services/testnetApi.ts \
        apps/zkagenticnetwork/src/components/AgentChat.tsx \
        .env.local
git commit -m "feat(terminal): wire Secure (cell allocation) and Chain Stats to public API"
```

---

## Summary

| Task | Workstream | Description | Dependencies |
|------|-----------|-------------|--------------|
| 1 | W1 | CORS + admin gate + rate limiting + WS cap | None |
| 2 | W2 | Dockerfile + requirements.txt | Task 1 |
| 3 | W2 | Deploy to Railway + DNS setup | Task 2 |
| 4 | W3 | Supabase tables + sync code | Task 3 |
| 5 | W6 | Enhance monitor dashboard cards | Task 4 |
| 6 | W7 | Subgrid simulation tab | Tasks 4 + 3 |
| 7 | — | Deploy monitor to Cloudflare Pages | Tasks 5 + 6 |
| 8 | W4+W5 | Wire terminal Secure + Chain Stats | Task 3 |

**Critical path:** Task 1 → 2 → 3 → 4 → (5+6+8 parallel) → 7
