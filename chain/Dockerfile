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

CMD sh -c "uvicorn agentic.testnet.api:app --host 0.0.0.0 --port ${PORT:-8080}"
