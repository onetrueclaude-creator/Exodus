# Layer 3: Network & API

**Question:** *How do clients talk to the chain?*

> The network layer defines how external systems (the frontend, the monitor dashboard, future validators) communicate with the chain process. Currently this is a FastAPI HTTP + WebSocket server.

## Why This Is Layer 3

The API depends on consensus (Layer 2) producing blocks and persistence (Layer 1) storing them. Monitoring (Layer 4) and deployment (Layer 5) depend on the API being accessible.

## Current State

| Component | Status | Details |
|-----------|--------|---------|
| HTTP API | Working | FastAPI at `localhost:8080` (local) / `api.zkagentic.ai` (prod, pending Railway deploy) |
| WebSocket | Working | Real-time block events, cap 50 connections |
| CORS | Restricted | `zkagentic.ai`, `zkagenticnetwork.com`, `localhost:3000` — no wildcard |
| Rate limiting | SlowAPI | `/api/mine` 1/60s, `/api/resources/{w}/assign` 5/10s, `/api/message` rate-limited |
| Authentication | Admin-gated | `/api/reset` + `/api/automine` require `X-Admin-Token` header; missing token → 503, wrong → 403 |
| TLS/HTTPS | Railway | SSL termination handled by Railway in production |

### Endpoint Map

| Method | Endpoint | Purpose | Latency |
|--------|----------|---------|---------|
| GET | `/api/status` | Chain summary (height, supply, epoch) | <10ms |
| GET | `/api/claims` | All active claims | <50ms |
| GET | `/api/agents` | Claims as Agent objects | <50ms |
| GET | `/api/coordinate/{x}/{y}` | Single coordinate info | <5ms |
| GET | `/api/grid/region` | Grid cells (max 10k) | <100ms |
| GET | `/api/epoch` | Epoch state | <5ms |
| GET | `/api/resources/{wallet}` | Subgrid resource projections | <10ms |
| POST | `/api/mine` | Manual mine trigger (rate limited) | <200ms |
| POST | `/api/reset` | Wipe and rebuild from genesis | <500ms |
| POST | `/api/resources/{wallet}/assign` | Assign sub-cells | <50ms |

### WebSocket Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `new_block` | Block summary | After each block is mined |
| `epoch_advance` | New ring, hardness | When epoch ring increments |

### Supabase Sync (Outbound)

The chain pushes state to Supabase after each block via `supabase_sync.py`:
- `sync_agent()` — upserts to `agents` table
- `sync_chain_status()` — updates `chain_status` singleton
- `sync_message()` — upserts to `chain_messages`

This is **fire-and-forget**: failures are silently swallowed. The monitor dashboard (zkagentic.ai) reads from Supabase, not directly from the chain API.

## Key Concerns

### Connection Handling
- WebSocket connections are managed by `ConnectionManager` — stale connections are cleaned on broadcast failure
- No connection limit — could be overwhelmed by many simultaneous dashboard viewers
- No heartbeat/ping — stale connections accumulate until next broadcast attempt

### API Stability
- All responses are JSON via Pydantic models
- Frontend contract defined in `agentic/testnet/frontend_contract.ts`
- Breaking changes to response shapes will break the game UI and monitor

### Security (Testnet Phase)
- No auth is acceptable for public testnet
- `/api/mine` and `/api/reset` are destructive — should be rate-limited or auth-gated before public exposure
- CORS `*` is fine for testnet but must be restricted for mainnet

## Implementation Checklist

- [ ] **Health endpoint** — `GET /health` returning `{"status": "ok", "block_height": N, "uptime_s": N}` (for monitoring, Layer 4)
- [ ] **WebSocket heartbeat** — periodic ping to detect stale connections
- [ ] **Connection limits** — cap WebSocket connections (e.g., 100)
- [ ] **Request logging** — structured JSON logs for each API call (method, path, latency, status)
- [ ] **Reverse proxy config** — nginx/Caddy template for HTTPS termination in production

## Failure Mode

**Zombie API.** The FastAPI process is alive and accepting connections, but the auto-miner has crashed (Layer 2 failure). All GET endpoints return stale data. POST `/api/mine` returns the rate-limit error because the last block was recent (from the perspective of the stale timer). WebSocket clients receive no events. The health endpoint (once added) would expose this: block height frozen, `last_block_age > 2 * BLOCK_TIME_S`.

## Success Criteria

- API responds to all endpoints with <200ms latency under normal load
- WebSocket broadcasts reach all connected clients within 1s of block production
- Supabase sync completes within 5s of each block (or fails silently without blocking the chain)
- Health endpoint accurately reflects chain liveness
