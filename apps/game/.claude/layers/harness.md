---
priority: 70
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Harness — Where This Child Runs

## Development

| Service | URL | Command |
|---------|-----|---------|
| Game client | `http://localhost:3000` | `npm run dev` |
| PostgreSQL | `localhost:5432` | `docker compose up -d` |
| Testnet API | `http://localhost:8080` | `uvicorn agentic.testnet.api:app --port 8080` (from `vault/agentic-chain/`) |

### Dev Setup

```bash
cd apps/zkagenticnetwork
docker compose up -d         # Start PostgreSQL
npx prisma migrate dev       # Apply migrations
npx prisma generate          # Regenerate Prisma client
npm run dev                  # Start Next.js dev server
```

## Production

| Service | URL | Platform |
|---------|-----|----------|
| Game client | `https://zkagenticnetwork.com` | Cloudflare Pages |
| Testnet API | `https://api.zkagentic.ai` | Railway |
| Database | Supabase PostgreSQL | Supabase |

### Build

```bash
npm run build    # Produces standalone output in .next/standalone/
```

## Communication

This child communicates with its parent (Exodus) via file-based mailbox:

| File | Path | Direction |
|------|------|-----------|
| Inbox | `apps/zkagenticnetwork/inbox.md` | Parent writes, child reads |
| Outbox | `apps/zkagenticnetwork/outbox.md` | Child writes, parent reads |

The cursor state tracking what messages have been processed lives at:
`.claude/internals/comms-cursor.md`

## Dependencies

| Dependency | Required For | Failure Mode |
|-----------|-------------|-------------|
| PostgreSQL | Auth, user identity | App won't start (Prisma connection fails) |
| Testnet API | Chain state, game actions | Falls back to MockChainService |
| Supabase Realtime | Live updates | Data goes stale, manual refresh needed |
| Google OAuth | Authentication | Login button non-functional |
