# Layer 5: Deployment & Operations

**Question:** *Where does the chain live?*

> Deployment governs how the chain process runs in production: what machine hosts it, how it starts, how it restarts after failure, and how upgrades are applied without data loss.

## Why This Is Layer 5

Deployment is the outermost layer. It wraps all the inner layers (persistence, consensus, network, monitoring) into a running system accessible to the outside world.

## Current State: Railway-Ready, Deploy Pending (2026-03-29)

| Component | Status | Details |
|-----------|--------|---------|
| Runtime | Local + Railway | `uvicorn` local; Railway production deploy pending ADMIN_TOKEN setup |
| Container | **Implemented** | `Dockerfile` in `vault/agentic-chain/` — Python 3.11-slim, builds via Railway |
| Cloud hosting | **Ready to deploy** | Railway project; pending env var setup + Volume mount |
| Process manager | Railway | Railway manages restarts automatically |
| Port | `${PORT:-8080}` | Dockerfile CMD uses shell form; Railway injects PORT |
| SQLite Volume | **Required** | Railway Volume at `/app/data/` — without it state is ephemeral |
| Secrets | Railway env vars | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN, DB_PATH, ALLOWED_ORIGINS |
| Custom domain | Pending | `api.zkagentic.ai` CNAME to Railway after deploy |
| Public endpoint | Pending | Will be `https://api.zkagentic.ai` |
| Deploy command | `railway up` | From `vault/agentic-chain/` |
| Runbook | **Written** | `vault/agentic-chain/docs/railway-deploy-runbook.md` |

### Pending Manual Steps (user must complete before Railway is live)
1. `openssl rand -hex 32` → set as `ADMIN_TOKEN` in Railway env vars panel
2. Add `DB_PATH=/app/data/testnet_state.db` in Railway env vars
3. Create Railway Volume mounted at `/app/data/`
4. Run `railway up` from `vault/agentic-chain/`
5. Add `api` CNAME record in Cloudflare pointing to Railway's CNAME

## Target Architecture

```
 ┌─────────────────────────────────────────┐
 │  Hetzner CX33 (2 vCPU, 4GB, 80GB SSD)  │
 │  ~5.49 EUR/mo                            │
 │                                          │
 │  ┌──────────────────────────────────┐   │
 │  │  Docker Compose                   │   │
 │  │                                   │   │
 │  │  ┌──────────────────────────┐    │   │
 │  │  │  agentic-chain            │    │   │
 │  │  │  Python 3.12 + uvicorn    │    │   │
 │  │  │  Port 8080 (internal)     │    │   │
 │  │  │  restart: unless-stopped  │    │   │
 │  │  │  Volume: ./data:/data     │    │   │
 │  │  └──────────────────────────┘    │   │
 │  │                                   │   │
 │  │  ┌──────────────────────────┐    │   │
 │  │  │  caddy (reverse proxy)    │    │   │
 │  │  │  HTTPS termination        │    │   │
 │  │  │  Port 443 (public)        │    │   │
 │  │  │  Auto Let's Encrypt       │    │   │
 │  │  └──────────────────────────┘    │   │
 │  └──────────────────────────────────┘   │
 │                                          │
 │  SQLite DB: /data/chain.db              │
 │  Logs: /data/logs/                       │
 └─────────────────────────────────────────┘
```

### Why Hetzner CX33

- Research finding: cheapest reliable cloud for single-node blockchain testnet
- 2 vCPU, 4GB RAM, 80GB SSD at ~5.49 EUR/mo
- EU datacenter (low latency to Supabase EU region)
- Alternatives: Contabo (cheaper but less reliable), DigitalOcean/Vultr (2-3x cost)

### Why Docker Compose (Not Kubernetes)

- Single-node testnet — K8s is overkill
- `restart: unless-stopped` provides automatic recovery
- Volume mounts for persistent data
- Simple `docker compose pull && docker compose up -d` for upgrades

## Deployment Pipeline

```
Developer pushes to exodus-dev
        │
        ▼
GitHub Actions (future):
  - Run tests (pytest)
  - Build Docker image
  - Push to GHCR
        │
        ▼
Server pulls new image:
  docker compose pull
  docker compose up -d
  (auto-restart with new code, data persists via volume)
```

### Phase 1: Manual Deploy (Current Target)

1. SSH into Hetzner server
2. `git clone` the repo (or `docker compose pull` if using registry)
3. Copy `.env` with Supabase credentials
4. `docker compose up -d`
5. Verify via `curl http://localhost:8080/api/status`

### Phase 2: Semi-Automated

- GitHub Action builds Docker image on push to `exodus-dev`
- Server runs a cron job or webhook to pull and restart
- Or use Watchtower for automatic Docker image updates

### Phase 3: Production-Grade (Future)

- Blue-green deployment (two containers, traffic switch)
- Automated rollback on health check failure
- Secrets via Docker secrets or Vault

## Implementation Checklist

- [x] **Dockerfile** — Python 3.11-slim, `requirements.txt`, `RUN mkdir -p /app/data`, `CMD ${PORT:-8080}`
- [x] **Environment variables** — all set in Railway panel (see runbook Step 3)
- [x] **Volume mount** — Railway Volume at `/app/data/` (runbook Step 3b)
- [x] **Domain routing** — `api.zkagentic.ai` CNAME (runbook Step 5)
- [x] **HTTPS** — Railway handles SSL termination automatically
- [ ] **docker-compose.yml** — not needed; Railway replaced Hetzner+Compose plan
- [ ] **Graceful shutdown handling** — SIGTERM not handled; at most 1 block loss on kill

### Architecture Change: Hetzner → Railway
Original plan was Hetzner CX33 + Docker Compose + Caddy. Switched to Railway because:
- Zero server management
- Built-in HTTPS, Volumes, env vars, restart policy
- Faster time-to-live for testnet phase

## Upgrade Procedure

```bash
# On server:
cd /opt/agentic-chain
docker compose pull          # fetch new image
docker compose up -d         # restart with new code
docker compose logs -f       # verify startup
curl localhost:8080/health   # verify chain is alive
```

Data survives upgrades because SQLite lives on a volume mount, not inside the container.

## Failure Mode

**Unrecoverable outage.** Server goes down (provider maintenance, disk failure). No backup of chain state exists. No runbook for recovery. The testnet is offline for hours while the developer SSHs in, debugs, and manually restarts. All chain state is lost because persistence (Layer 1) was never implemented.

## Success Criteria

- Chain process automatically restarts after crash (< 30s recovery)
- Upgrades deploy in < 5 minutes with zero data loss
- HTTPS accessible from public internet
- Server costs < 10 EUR/month for testnet phase
- Documented runbook for common operations (restart, upgrade, backup, restore)
