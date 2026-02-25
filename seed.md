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

## Navigation Connectors

Read these `seed.md` files when entering each major directory:

| Directory | seed.md | CLAUDE.md | What it contains |
|-----------|---------|-----------|-----------------|
| `src/` | `src/seed.md` | `src/CLAUDE.md` | Next.js app source |
| `src/components/` | `src/components/seed.md` | `src/components/CLAUDE.md` | React UI components |
| `src/store/` | `src/store/seed.md` | `src/store/CLAUDE.md` | Zustand game store |
| `src/services/` | `src/services/seed.md` | `src/services/CLAUDE.md` | Chain service adapters |
| `src/hooks/` | `src/hooks/seed.md` | `src/hooks/CLAUDE.md` | Custom React hooks |
| `src/lib/` | `src/lib/seed.md` | `src/lib/CLAUDE.md` | Utility functions |
| `src/types/` | `src/types/seed.md` | `src/types/CLAUDE.md` | TypeScript types |
| `src/app/` | `src/app/seed.md` | `src/app/CLAUDE.md` | App Router routes |
| `vault/` | `vault/seed.md` | `vault/CLAUDE.md` | Knowledge base |
| `vault/engineering/` | `vault/engineering/seed.md` | `vault/engineering/CLAUDE.md` | Architecture docs |
| `vault/product/` | `vault/product/seed.md` | `vault/product/CLAUDE.md` | Product decisions |
| `vault/research/` | `vault/research/seed.md` | `vault/research/CLAUDE.md` | Research artifacts |
| `vault/skills/` | `vault/skills/seed.md` | `vault/skills/CLAUDE.md` | Claude skills |
| `vault/ideas/` | `vault/ideas/seed.md` | `vault/ideas/CLAUDE.md` | Idea inbox |
| `playwright/` | `playwright/seed.md` | `playwright/CLAUDE.md` | E2E test suite |
| `docs/` | `docs/seed.md` | `docs/CLAUDE.md` | Public documentation |
| `packages/` | `packages/seed.md` | — | Shared packages |

> **Gitignored (local-only seed.md files):** `apps/`, `ZkAgentic/`, `vault/agentic-chain/`
> These directories have local seed.md files but are excluded from the repo as external trees.
