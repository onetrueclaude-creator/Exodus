# Agentic Chain Testnet API
# Required env vars (set in Railway dashboard, NOT in this file):
#   SUPABASE_URL              — Supabase project URL
#   SUPABASE_SERVICE_ROLE_KEY — Service role JWT (never commit)
#   ADMIN_TOKEN               — Random token for admin-gated endpoints
#   DB_PATH                   — SQLite DB path (default: /app/data/testnet_state.db)
#   ALLOWED_ORIGINS           — Comma-separated CORS origins (has safe defaults)
#   ENVIRONMENT               — "production" disables /docs and /redoc
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agentic/ agentic/

# Create persistent data directory for SQLite DB.
# In Railway: mount a Volume at /app/data so state survives restarts/redeploys.
# Without a volume: DB is ephemeral (wiped on restart) — set DB_PATH to override.
RUN mkdir -p /app/data

EXPOSE 8080

# R7: arm the single-worker runtime guard. The chain keeps module-global state
# and does an unlocked nonce read-modify-write, so it is correct ONLY as a single
# Uvicorn worker. The CMD below runs exactly one uvicorn process (no --workers),
# which acquires an exclusive startup file lock; if anyone later adds --workers
# N>1, the extra workers fail fast with a FATAL R7 message instead of silently
# corrupting the shared SQLite DB + per-account nonce counters. The OS releases
# the flock on process exit, so restarts re-acquire cleanly (no stale-lock).
ENV AGENTIC_SINGLE_WORKER_GUARD=1

# A container must bind 0.0.0.0 to be reachable across the container/network
# boundary (127.0.0.1 here would only be reachable from inside the container).
# This is deliberate for a deployed node -- the host/platform firewall and the
# admin-token gate on mutating endpoints are the access controls, not the bind
# address. Do NOT expose this port publicly without a firewall in front of it.
# (The local dev launcher start.py defaults to 127.0.0.1 for the opposite reason.)
CMD sh -c "uvicorn agentic.testnet.api:app --host 0.0.0.0 --port ${PORT:-8080}"
