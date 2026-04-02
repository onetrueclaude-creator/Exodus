# Seed — apps/

> Deployable application packages within the Exodus monorepo.
> After reading this, check each app's own `seed.md` then `CLAUDE.md`.

## What This Directory Serves

Contains two deployable applications that together form the ZK Agentic Network platform:

| App | Language | Purpose |
|-----|----------|---------|
| `agentic-chain/` | Python | Testnet blockchain simulator (FastAPI at :8080) |
| `zkagenticnetwork/` | TypeScript/Next.js | Frontend game UI + auth layer |

## Relationship

The Next.js frontend (`zkagenticnetwork`) reads from the Python chain (`agentic-chain`) via `ChainService` interface. The Python chain is source of truth for game state; the Next.js app serves as the UI + auth cache layer.

## Architecture

```
apps/
├── agentic-chain/     → Python FastAPI blockchain simulator
│   ├── agentic/       → Protocol implementation (params, galaxy, consensus, economics, privacy)
│   └── tests/         → 387 pytest tests
└── zkagenticnetwork/  → Next.js 16 application
    ├── src/           → Application source (symlinked / mirrored from root src/)
    └── prisma/        → Database schema
```
