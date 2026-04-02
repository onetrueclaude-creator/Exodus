---
priority: 70
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Harness — Where This Child Runs

## Environments

### Development (localhost)
- **Command:** `uvicorn agentic.testnet.api:app --port 8080 --reload`
- **URL:** `http://localhost:8080`
- **Database:** SQLite at `vault/agentic-chain/testnet_state.db` (gitignored)
- **Supabase:** Dev project `inqwwaqiptrmpxruyczy.supabase.co`

### Production (Railway)
- **Image:** Docker (`vault/agentic-chain/Dockerfile`)
- **Port:** `${PORT:-8080}` (Railway injects PORT env var)
- **Database:** SQLite at `/app/data/testnet_state.db` (Railway Volume required)
- **URL:** `api.zkagentic.ai` (CNAME to Railway)
- **Env vars required:** `ADMIN_TOKEN`, `DB_PATH`, `SUPABASE_URL`, `SUPABASE_KEY`

## Communication

### Mailbox (file-based)
- **Inbox:** `vault/agentic-chain/inbox.md` — messages from parent (Exodus)
- **Outbox:** `vault/agentic-chain/outbox.md` — messages to parent (Exodus)
- **Cursor:** `.claude/internals/comms-cursor.md` — tracks last seen message IDs

### External Services
- **Supabase:** `https://inqwwaqiptrmpxruyczy.supabase.co`
  - Tables: `chain_status` (singleton), `agents`, `subgrid_allocations`, `resource_rewards`
  - All tables in Realtime publication with anon SELECT policies
- **Railway:** Docker deploy with Volume mount

## Coexisting Documentation

The `stack/` folder at project root contains operational layer docs:
- `persistence.md` — SQLite implementation details
- `consensus.md` — PoAIV consensus logic
- `network.md` — API networking, CORS, rate limiting
- `monitoring.md` — Monitor integration, Supabase sync
- `deployment.md` — Railway deploy runbook

These are operational references. The `.claude/layers/` files are identity layers (purpose, not operations). They complement each other.
