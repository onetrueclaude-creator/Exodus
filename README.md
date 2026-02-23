# Exodus

Megaproject monorepo for the ZkAgentic ecosystem.

## Structure

```
apps/
  zkagenticnetwork/   — Stellaris-inspired blockchain dApp (Next.js 16, PixiJS 8)
  agentic-chain/      — Agentic Chain blockchain ledger + FastAPI testnet server (Python)
packages/             — Shared libs (types, utils, ui — grow here)
vault/                — Obsidian knowledge base (open in Obsidian)
docs/                 — Workflow reference + AI-generated implementation plans
```

## Quick Start

```bash
# Frontend app
pnpm install
pnpm turbo dev --filter=zkagenticnetwork

# Blockchain API (in a separate terminal)
cd apps/agentic-chain
pip3 install -r requirements.txt
uvicorn agentic.testnet.api:app --port 8080 --reload
```

## Development

```bash
pnpm turbo build        # build all JS/TS packages
pnpm turbo test:run     # run all tests
pnpm turbo typecheck    # TypeScript check
pnpm turbo lint         # lint all packages

# Blockchain tests
cd apps/agentic-chain && python3 -m pytest tests/ -v
```

## Domains

| App | Domain | Dev URL |
|-----|--------|---------|
| zkagenticnetwork | zkagentic.ai | localhost:3000 |
| agentic-chain API | — | localhost:8080 |
| PostgreSQL | — | localhost:5432 |

## Claude Development

Run `/exodus:feature "feature description"` to start a new feature with the full Megaproject workflow.

Skills: `/skills:frontend-expert`, `/skills:pixijs-expert`, `/skills:state-expert`, etc.
