# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace Structure

**Exodus** is a Turborepo + pnpm monorepo — the canonical development environment for the ZkAgentic ecosystem.

```
Exodus/
├── apps/
│   ├── zkagenticnetwork/   ← Stellaris-inspired blockchain dApp (Next.js 16, PixiJS 8)
│   └── agentic-chain/      ← Agentic Chain ledger + FastAPI testnet server (Python)
├── packages/               ← Shared libs (types, utils, ui — grow here as needed)
├── vault/                  ← Obsidian knowledge base (authoritative — open in Obsidian)
├── docs/
│   ├── WORKFLOW.md         ← Quick-start checklist
│   └── plans/              ← AI-generated implementation plans (auto-populated)
├── ZkAgentic/              ← Legacy project tree (research stubs, deploy artifacts)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Commands

**Monorepo (from Exodus root):**
```bash
pnpm install                              # install all workspace deps
pnpm turbo build                          # build all JS/TS apps
pnpm turbo dev                            # start all dev servers
pnpm turbo test:run                       # run all tests once
pnpm turbo typecheck                      # TypeScript check across workspace
pnpm turbo lint                           # lint all packages

# Filter to a single app
pnpm turbo build     --filter=zkagenticnetwork
pnpm turbo test:run  --filter=zkagenticnetwork
pnpm turbo typecheck --filter=zkagenticnetwork
```

**zkagenticnetwork (`apps/zkagenticnetwork/`):**
```bash
docker compose up -d          # start PostgreSQL 16
npx prisma migrate dev        # apply DB migrations
npx prisma generate           # regenerate Prisma client
```

**agentic-chain (`apps/agentic-chain/`):**
```bash
pip3 install -r requirements.txt
uvicorn agentic.testnet.api:app --port 8080 --reload   # start blockchain API
python3 -m pytest tests/ -v                            # run all 387 tests
python3 -m pytest tests/test_api.py -v                 # single test file
```

## Apps

### apps/zkagenticnetwork
Next.js 16 + React 19 + PixiJS 8 dApp. See `apps/zkagenticnetwork/CLAUDE.md` for full reference (architecture, PixiJS patterns, Zustand conventions, test-mocking rules, subscription tiers, UX spec).

Key facts:
- **ChainService**: `TestnetChainService` → FastAPI `localhost:8080`; `MockChainService` offline fallback
- **DB**: PostgreSQL (auth cache only) — blockchain is source of truth
- **Path alias**: `@/*` → `./src/*`
- **Blockchain domain**: `zkagentic.ai`

### apps/agentic-chain
Python implementation of the Agentic Chain whitepaper. FastAPI server at `localhost:8080`.

Key facts:
- **Source of truth** for all game state — coordinate grid, claims, mining, AGNTC
- `agentic/params.py` — single source of truth for all protocol parameters
- `agentic/ledger/` — Merkle tree, nullifiers, block processor, transactions
- `agentic/galaxy/` — 6481×6481 coordinate grid, claims, mining engine
- `agentic/testnet/api.py` — FastAPI server; `agentic/testnet/frontend_contract.ts` — TypeScript interfaces
- Swagger docs at `http://localhost:8080/docs`
- Genesis is deterministic: `create_genesis(seed=42)` always produces same state

## Package Boundary Rules

**Rule:** Shared logic lives in `packages/`. App-specific wiring lives in `apps/`.

| Location | Owns |
|----------|------|
| `packages/types` | Zod schemas + TypeScript types _(future)_ |
| `packages/utils` | Pure utility functions, zero framework deps _(future)_ |
| `packages/ui` | React component library _(future)_ |
| `apps/zkagenticnetwork` | Frontend game — depends on packages when created |
| `apps/agentic-chain` | Blockchain ledger + FastAPI API |

**Hard rules:**
- Apps never import from each other
- New shared logic → `packages/` first
- `apps/agentic-chain` and `apps/zkagenticnetwork` communicate over HTTP only (no shared code)
- Run `pnpm turbo typecheck` before claiming any JS/TS task done

## Workflow

Start a new feature: `/exodus:feature "describe what to build"`

Resume in-progress feature: `/exodus:feature` (checks `.claude/dispatch-state.json`)

See `docs/WORKFLOW.md` for the phase checklist and emergency exits.

## Skills

All 10 expert personas are castable in a new Claude Code session:

| `/skills:` command | Domain |
|--------------------|--------|
| `frontend-expert` | React 19, Next.js 16, Tailwind CSS 4 |
| `backend-expert` | Prisma 7, NextAuth v5, Hono, PostgreSQL |
| `state-expert` | Zustand 5, DockPanel/focusRequest conventions |
| `pixijs-expert` | PixiJS 8, WebGL, galaxy grid rendering |
| `testing-expert` | Vitest, React Testing Library, strict TDD |
| `web3-expert` | Solana wallet-adapter, two-tier user model |
| `game-design-expert` | Agent mechanics, ZkAgentic network design |
| `ai-integration-expert` | Claude API, MCP, ChainService, haiku NCPs |
| `ui-design-expert` | Dark crypto aesthetic, Tailwind 4, shadcn/ui |
| `monorepo-expert` | Turborepo, pnpm workspaces, package boundaries |

Deep reference docs: `vault/skills/<name>/skill-description.md`

> Note: `/skills:` commands require a new Claude Code session to be indexed.

## Vault Workflow

```
1. Capture idea       → vault/ideas/
2. Refine into spec   → vault/product/features/<name>/feature.md
3. Write prompt       → vault/prompts/YYYY-MM-DD-<task>.md
4. Implement          → /exodus:feature "description"
5. Review             → vault/reviews/YYYY-MM-DD-<task>-retro.md
```

Implementation plans (AI-generated) → `docs/plans/` — never inside vault.

## Dispatch State

`.claude/dispatch-state.json` tracks multi-session feature work (phase, step, branch, completed steps, artifact paths). Check it when resuming interrupted work.
