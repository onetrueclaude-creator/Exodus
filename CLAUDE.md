# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace Structure

**Exodus** is a Turborepo + pnpm monorepo.

```
Exodus/
├── apps/
│   └── zkagenticnetwork/   ← Stellaris-inspired blockchain dApp (Next.js 16, PixiJS 8)
├── packages/               ← Shared libs (empty; grow here as shared logic emerges)
├── vault/                  ← Obsidian knowledge base (authoritative — open in Obsidian)
├── ZkAgentic/              ← Legacy project tree (research stubs, deploy artifacts)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Commands

Run from the Exodus root:

```bash
pnpm install                              # install all workspace deps
pnpm turbo build                          # build all apps
pnpm turbo dev                            # start all dev servers
pnpm turbo test                           # run all tests (watch)
pnpm turbo test:run                       # run all tests once
pnpm turbo typecheck                      # TypeScript check across workspace
pnpm turbo lint                           # lint all packages

# Filter to a single app
pnpm turbo build     --filter=zkagenticnetwork
pnpm turbo test:run  --filter=zkagenticnetwork
pnpm turbo typecheck --filter=zkagenticnetwork
```

Run from `apps/zkagenticnetwork/` directly (still works):

```bash
npm run dev                   # dev server (localhost:3000)
docker compose up -d          # start PostgreSQL 16
npx prisma migrate dev        # apply DB migrations
npx prisma generate           # regenerate Prisma client
```

## Package Boundary Rules

**Rule:** Shared logic lives in `packages/`. App-specific wiring lives in `apps/`.

| Location | Owns |
|----------|------|
| `packages/types` | Zod schemas + inferred TypeScript types _(future)_ |
| `packages/utils` | Pure utility functions, zero framework deps _(future)_ |
| `packages/ui` | React component library _(future)_ |
| `apps/zkagenticnetwork` | ZkAgentic game — depends on packages when created |

**Hard rules:**
- Apps never import from each other
- New shared logic → `packages/` first, never start in `apps/`
- Run `pnpm turbo typecheck` before claiming any task is done

## Primary App — zkagenticnetwork

Stellaris-inspired gamified social media dApp: 2D galaxy grid, AI agents, Agentic Chain testnet blockchain. See `apps/zkagenticnetwork/CLAUDE.md` for the full technical reference (architecture, PixiJS patterns, Zustand conventions, test-mocking rules, subscription tiers, UX spec).

Key facts:
- **ChainService**: `TestnetChainService` → FastAPI at `localhost:8080`; `MockChainService` offline fallback
- **DB**: PostgreSQL (auth cache only) — blockchain is source of truth
- **Path alias**: `@/*` → `./src/*`
- **Test runner**: Vitest 4 + React Testing Library; tests in `src/__tests__/`

## Vault Workflow

The vault (`vault/`) is the authoritative knowledge base. The development loop:

```
1. Capture idea       → vault/ideas/
2. Refine into spec   → vault/product/features/<name>/feature.md
3. Write prompt       → vault/prompts/YYYY-MM-DD-<task>.md
4. Implement          → run Claude Code against the spec
5. Review             → vault/reviews/YYYY-MM-DD-<task>-retro.md
```

Implementation plans (AI-generated) go in `docs/plans/` — not in the vault.

**Vault conventions:**
- Use wikilinks (`[[note-name]]`), not markdown links
- `_index.md` files are Maps of Contents — keep updated
- `vault/collaborate/clarifying-questions/` — fill `Answer:` fields only, never edit questions

## Skills

All 10 expert personas are castable from within Claude Code:

| `/skills:` command | Domain |
|--------------------|--------|
| `frontend-expert` | React 19, Next.js 16, Tailwind CSS 4 |
| `backend-expert` | Prisma 7, NextAuth v5, Hono, PostgreSQL |
| `state-expert` | Zustand 5, slices, DockPanel conventions |
| `pixijs-expert` | PixiJS 8, WebGL, galaxy grid rendering |
| `testing-expert` | Vitest, React Testing Library, TDD |
| `web3-expert` | Solana wallet-adapter, two-tier user model |
| `game-design-expert` | Agent mechanics, ZkAgentic network design |
| `ai-integration-expert` | Claude API, MCP, ChainService, haiku NCPs |
| `ui-design-expert` | shadcn/ui, dark crypto aesthetic, Tailwind 4 |
| `monorepo-expert` | Turborepo, pnpm workspaces, package boundaries |

Deep reference docs for each skill live in `vault/skills/<name>/skill-description.md`.

## Dispatch State

`.claude/dispatch-state.json` tracks multi-session feature work (branch, current phase/step, completed steps, artifact paths). Check it when resuming interrupted work.
