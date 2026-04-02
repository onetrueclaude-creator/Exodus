# Railway Deploy Runbook — Agentic Chain Testnet API

> Target: `api.zkagentic.ai`
> Estimated time: 10–15 minutes
> Last verified: 2026-03-29

---

## Pre-conditions Checklist

Before touching Railway, confirm these are ready:

- [ ] Railway CLI installed: `railway --version` (install: `npm i -g @railway/cli`)
- [ ] Railway CLI authenticated: `railway login`
- [ ] Railway project exists (or you'll create it in Step 2)
- [ ] Supabase service role key available (copy from `vault/agentic-chain/.env`)
- [ ] ADMIN_TOKEN generated (do this now — see Step 1)

---

## Step 1 — Generate ADMIN_TOKEN

Run this locally and copy the output:

```bash
openssl rand -hex 32
```

Save it somewhere temporarily (password manager or clipboard). You will paste it into Railway in Step 3.
**Never commit it to the repo.** The `.env` file does not have `ADMIN_TOKEN` by design.

---

## Step 2 — Create / Link Railway Project

### Option A: New project via CLI

```bash
cd ./ vault/agentic-chain
railway init
# Choose: Create new project
# Name it: agentic-chain-testnet (or similar)
```

### Option B: Link to existing project

```bash
cd ./ vault/agentic-chain
railway link
# Select: agentic-chain-testnet
```

Railway auto-detects the `Dockerfile` in this directory.

---

## Step 3 — Set Environment Variables

In the Railway dashboard (https://railway.com → your project → Variables), add all of these:

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `https://inqwwaqiptrmpxruyczy.supabase.co` | Correct project ref |
| `SUPABASE_SERVICE_ROLE_KEY` | `<paste from vault/agentic-chain/.env>` | Service role JWT |
| `ADMIN_TOKEN` | `<output from Step 1>` | **REQUIRED** — admin endpoints disabled without it |
| `DB_PATH` | `/app/data/testnet_state.db` | **REQUIRED** — must match Volume mount path (see Step 3b) |
| `ALLOWED_ORIGINS` | `https://zkagentic.ai,https://www.zkagentic.ai,https://zkagenticnetwork.com,https://www.zkagenticnetwork.com` | CORS whitelist |
| `ENVIRONMENT` | `production` | Disables `/docs` and `/redoc` in prod |

**Do NOT set PORT** — Railway injects it automatically. The Dockerfile CMD hardcodes `--port 8080`; set Railway's internal port to `8080` in the service settings if Railway prompts.

You can also set via CLI:
```bash
railway variables set SUPABASE_URL=https://inqwwaqiptrmpxruyczy.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=<key>
railway variables set ADMIN_TOKEN=<generated-token>
railway variables set DB_PATH=/app/data/testnet_state.db
railway variables set ALLOWED_ORIGINS="https://zkagentic.ai,https://www.zkagentic.ai,https://zkagenticnetwork.com,https://www.zkagenticnetwork.com"
railway variables set ENVIRONMENT=production
```

### Step 3b — Add Railway Volume (REQUIRED for persistence)

Without this, the SQLite DB is wiped on every deploy/restart and all chain state is lost.

In Railway dashboard → your service → **Volumes** → **Add Volume**:
- Mount path: `/app/data`
- Railway will create a persistent volume backed by this directory

The `DB_PATH=/app/data/testnet_state.db` env var tells the API to write the SQLite DB there.

> If you skip this step, the API still works but state is ephemeral — fine for initial smoke-testing, not for a live testnet.

---

## Step 4 — Deploy

```bash
cd ./ vault/agentic-chain
railway up
```

Railway builds the Docker image, pushes it, and starts the container.
Watch the build logs in the Railway dashboard or with `railway logs`.

Expected build output:
```
Collecting fastapi>=0.115 ...
...
Successfully built <image-id>
Deployed to https://<service>.up.railway.app
```

---

## Step 5 — Add Custom Domain

In Railway dashboard → your service → Settings → Networking → Custom Domain:

1. Add domain: `api.zkagentic.ai`
2. Copy the CNAME target Railway provides (e.g. `abc123.up.railway.app`)
3. Go to Cloudflare dashboard → zkagentic.ai zone → DNS
4. Add CNAME record:
   - Name: `api`
   - Target: `<Railway CNAME from above>`
   - Proxy: **DNS only** (grey cloud) — Railway handles SSL
5. Wait 1–2 minutes for DNS propagation

---

## Step 6 — Post-Deploy Verification

### 1. Liveness check
```bash
curl https://api.zkagentic.ai/health
```
Expected:
```json
{"status": "ok", "block_height": 0, "auto_mine": true, "total_claims": 9}
```

### 2. Status check
```bash
curl https://api.zkagentic.ai/api/status
```
Expected: full JSON with `blocks_processed`, `epoch_ring`, `circulating_supply`, etc.

### 3. Admin gate working
```bash
curl -X POST https://api.zkagentic.ai/api/reset
```
Expected: `503` (ADMIN_TOKEN set) or `403` (wrong token) — **not** 200. If you get 200 without the header, the gate is broken.

### 4. Admin gate with token
```bash
curl -X POST https://api.zkagentic.ai/api/reset \
  -H "X-Admin-Token: <your-ADMIN_TOKEN>"
```
Expected: `200` with reset confirmation JSON.

### 5. Run monitor crosscheck suite against live endpoint

Edit `tests/monitor_crosscheck/conftest.py` temporarily to point at the live API, or run the crosscheck with the live base URL:

```bash
cd ./ vault/agentic-chain
# Quick sanity against live API (manual):
curl https://api.zkagentic.ai/api/epoch | python3 -m json.tool
curl https://api.zkagentic.ai/api/agents | python3 -m json.tool
curl https://api.zkagentic.ai/api/resources/0 | python3 -m json.tool
```

The full pytest crosscheck suite runs against in-process TestClient (not live). For live integration checks, compare the output fields manually against the crosscheck tests' expected shapes.

### 6. Supabase sync check
After ~60 seconds (one auto-mine block), check Supabase:
```
https://supabase.com/dashboard/project/inqwwaqiptrmpxruyczy/editor
```
Run:
```sql
SELECT * FROM chain_status WHERE id = 1;
SELECT COUNT(*) FROM agents;
```
`blocks_processed` should be ≥ 1 and `agents` count should be 9.

### 7. Monitor dashboard
Open https://zkagentic.ai — the LIVE indicator should turn green within 90 seconds of deploy.

---

## Ongoing Operations

### View logs
```bash
railway logs --tail
```

### Force a reset (if chain state is corrupt)
```bash
curl -X POST https://api.zkagentic.ai/api/reset \
  -H "X-Admin-Token: <your-ADMIN_TOKEN>"
```

### Pause auto-mining
```bash
curl -X POST "https://api.zkagentic.ai/api/automine?enabled=false" \
  -H "X-Admin-Token: <your-ADMIN_TOKEN>"
```

### Redeploy after code changes
```bash
cd ./ vault/agentic-chain
railway up
```

---

## Known Gaps / TODOs

### 1. SQLite persistence — IMPLEMENTED ✓

`DB_PATH` env var controls the SQLite path. The Dockerfile creates `/app/data/` at build time.

**To activate persistence:** set `DB_PATH=/app/data/testnet_state.db` + add Railway Volume mounted at `/app/data/` (Step 3b). Both must be set — the directory alone is not enough without a Volume backing it.

If Volume is skipped (e.g. smoke-testing), state is still ephemeral — the API works but all blocks/claims reset on restart.

### 2. staked_cpu uses Option A (validator cpu_vpu)

Currently `staked_cpu` = `validator.cpu_vpu` (range 20–120, seeded at genesis). This is a proxy.

**TODO Option B:** Switch to `subgrid_allocator.count(SubcellType.SECURE) × BASE_SECURE_RATE` once subgrid allocation is actively used by players. Both the API (`api.py:get_agents`) and sync (`supabase_sync.py:_sync_agents`) have `# TODO(Option B)` comments marking the switchover point.

### 3. Port hardcoding — IMPLEMENTED ✓

The Dockerfile CMD now uses shell form: `CMD sh -c "uvicorn ... --port ${PORT:-8080}"`.
Railway injects `PORT` automatically; the `:-8080` fallback keeps local `docker run` working without any env var set.

### 4. No database migrations

The Supabase tables (`chain_status`, `agents`, `subgrid_allocations`, `resource_rewards`) must exist before the first sync. SQL migrations are in the Railway + Cloudflare Deploy reference at `~/.claude/projects/-Users-toyg-Exodus/memory/reference_railway_cloudflare_deploy.md`. If the tables are missing, sync fails silently (fire-and-forget).

---

## Rollback

If the deploy breaks the live endpoint:

```bash
# Railway dashboard → Deployments → select previous deployment → Redeploy
# Or via CLI (if you know the deployment ID):
railway redeploy <deployment-id>
```

The in-memory chain state is fresh on every start regardless — no rollback needed for state.
