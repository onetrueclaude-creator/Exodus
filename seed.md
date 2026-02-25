# Seed — Exodus Monorepo Root

> **Read this first.** This is the top-level navigation descriptor for the Exodus/ZK Agentic Network project.
> After reading this, read `CLAUDE.md` for project-wide conventions, current branch state, and change history.

## What This Root Serves

The Exodus monorepo is the full development environment for **ZK Agentic Network** — a Stellaris-inspired gamified social media dApp built on the Agentic Chain testnet blockchain.

## Project Tree

```
Exodus/
├── apps/               → Deployable applications (Next.js frontend, Python chain simulator)
├── packages/           → Shared libraries and utilities (workspace packages)
├── src/                → Main Next.js application source (zkagenticnetwork frontend lives here)
├── vault/              → Knowledge base: design docs, engineering decisions, product specs
├── ZkAgentic/          → External documentation and project planning workspace
├── docs/               → Public-facing documentation and deployment plans
├── playwright/         → E2E test suite (Playwright, 22+ tests)
├── supabase/           → Supabase config and Edge Functions
├── public/             → Static assets
└── .claude/            → Claude Code hooks, settings, dispatch state
```

## Architectures Contained

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | Next.js 16, React 19, PixiJS 8, Tailwind 4 | `src/` / `apps/zkagenticnetwork/` |
| State | Zustand 5 | `src/store/` |
| Auth | NextAuth v5, Prisma 7, PostgreSQL 16 | `src/` / `apps/zkagenticnetwork/prisma/` |
| Blockchain | Python FastAPI (Agentic Chain testnet) | `apps/agentic-chain/` / `vault/agentic-chain/` |
| E2E Testing | Playwright | `playwright/` |
| Unit Testing | Vitest 4 + React Testing Library | `src/**/__tests__/` |
| Knowledge | Markdown vault (design, product, research) | `vault/` |

## Key Entry Points

- `npm run dev` → Start Next.js at localhost:3000
- `vault/agentic-chain/` → Start Python blockchain at localhost:8080
- `playwright/` → Run E2E tests
- `vault/seed.md` → Canonical game design vision and approved specs
