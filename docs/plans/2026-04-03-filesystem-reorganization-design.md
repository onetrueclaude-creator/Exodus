# Filesystem Reorganization Design — Exodus Monorepo

> **Date:** 2026-04-03
> **Status:** Approved
> **Scope:** Full project tree restructuring
> **Research:** Compared against Solana/Agave, go-ethereum, Cosmos SDK, Polkadot SDK repo structures

---

## Problem

The Exodus root has 35+ visible items with:
- Duplicate codebases (2 frontends, 2 chain copies)
- Mixed concerns (source, knowledge, deploy artifacts, dev artifacts)
- Stale/empty directories (packages/, ZkAgentic stubs, screenshots/)
- Non-standard naming (vault/ for specs, playwright/ tool-specific)

## Target Structure

```
Exodus/
├── chain/                    → Protocol core (from vault/agentic-chain/)
│   ├── agentic/              → Python package (consensus, economics, galaxy, etc.)
│   ├── tests/                → 717+ Python tests
│   ├── .claude/              → Child agent governance
│   └── docs/                 → Chain-specific docs (kept minimal)
├── apps/
│   └── game/                 → Game UI (from apps/zkagenticnetwork/)
│       ├── src/              → Next.js 16 + React 19 + PixiJS 8
│       ├── prisma/           → Database schema
│       ├── .claude/          → Child agent governance
│       └── package.json
├── web/
│   ├── marketing/            → zkagentic.com (from ZkAgentic/.../zkagentic-deploy/)
│   └── monitor/              → zkagentic.ai (from ZkAgentic/.../zkagentic-monitor/)
├── spec/                     → Knowledge base (from vault/)
│   ├── whitepaper.md         → v1.3 (authoritative protocol spec)
│   ├── audit-report/         → Phase 1 audit reports + SUMMARY
│   ├── litepaper.md
│   ├── poaiv-formal.md
│   ├── feasibility-report.md
│   ├── product/              → Product specs, features
│   ├── research/             → Competitor analysis, academic refs
│   └── engineering/          → Architecture decisions
├── docs/                     → Plans and references (stays)
│   └── plans/                → Design + implementation plans
├── tests/                    → E2E tests (from playwright/)
├── supabase/                 → Migrations (stays)
├── public/                   → Static assets (stays)
├── .claude/                  → Governance (stays)
├── inbox.md / outbox.md      → Mailbox (stays)
├── seed.md / CLAUDE.md       → Navigation (updated)
└── [root configs]            → package.json, tsconfig, next.config, etc.
```

## Moves

| From | To | Action |
|------|----|--------|
| `vault/agentic-chain/` | `chain/` | `git mv` |
| `apps/zkagenticnetwork/` | `apps/game/` | `git mv` |
| `vault/whitepaper.md` + companions | `spec/` | `git mv` |
| `vault/audit-report/` | `spec/audit-report/` | `git mv` |
| `vault/product/` | `spec/product/` | `git mv` |
| `vault/research/` | `spec/research/` | `git mv` |
| `vault/engineering/` | `spec/engineering/` | `git mv` |
| `ZkAgentic/.../zkagentic-deploy/` | `web/marketing/` | `git mv` |
| `ZkAgentic/.../zkagentic-monitor/` | `web/monitor/` | `git mv` |
| `playwright/` | `tests/` | `git mv` |

## Deletions

| Path | Reason |
|------|--------|
| `src/` | Superseded by `apps/game/` (older Supabase-auth version) |
| `apps/agentic-chain/` | Stale diverged copy (vault version is canonical) |
| `ZkAgentic/projects/web/company-site/` | Empty stub (node_modules only) |
| `ZkAgentic/projects/web/zkagentic-site/` | Empty stub |
| `ZkAgentic/projects/web/zkagenticnetwork-landing/` | Placeholder, superseded |
| `packages/` | Empty directory |
| `stack/` | Duplicates `.claude/layers/` |
| `screenshots/` | Dev artifacts (add to .gitignore) |
| `playwright-report/` | Build artifact (already gitignored) |
| `test-results/` | Build artifact (already gitignored) |

## Updates Required After Moves

1. **seed.md** — Rewrite project tree
2. **CLAUDE.md** — Update all path references
3. **.claude/SEED.md** — Update children paths + domain table
4. **apps/game/.claude/SEED.md** — Update identity paths
5. **chain/.claude/SEED.md** — Update identity paths
6. **.gitignore** — Update `vault/agentic-chain/` → `chain/`, add `screenshots/`
7. **package.json** — Update workspace paths if applicable
8. **Root configs** — next.config.ts, tsconfig.json may need path updates
9. **Remaining vault/ files** — Move or archive `_templates/`, `collaborate/`, `ideas/`, `reviews/`, `skills/`, `prompts/`

## Risks

- **Git history fragmentation** — `git mv` preserves history with `--follow` but some tools lose track. Mitigated by doing all moves in one commit.
- **Broken imports** — Python imports in `chain/` use `agentic.` prefix (relative), should survive the move. TypeScript `@/*` alias in `apps/game/` may need tsconfig update.
- **Child .claude/ paths** — inbox.md/outbox.md paths in SEED.md must be updated.
- **Hooks** — Check if any hook scripts reference old paths.

## Industry Alignment

| Convention | Solana | Ethereum | Cosmos | Polkadot | Ours |
|-----------|--------|----------|--------|----------|------|
| Protocol at root | `core/` | `core/` | `core/` | `substrate/` | `chain/` |
| Specs in docs | external | external | `docs/spec/` | external | `spec/` |
| Tests | scattered | co-located + `tests/` | co-located + `tests/` | per-project | `tests/` + co-located |
| Web apps | none | none | none | none | `apps/game/` (justified: we ship a game) |
| Marketing sites | separate repo | separate repo | separate repo | separate repo | `web/` (pragmatic: solo dev) |
