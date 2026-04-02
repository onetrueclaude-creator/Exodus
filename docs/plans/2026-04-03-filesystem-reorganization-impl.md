# Filesystem Reorganization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the Exodus monorepo from 35+ root items with duplicates into a clean, industry-aligned hierarchy: `chain/`, `apps/game/`, `web/`, `spec/`, `docs/`, `tests/`.

**Architecture:** All moves use `git mv` to preserve history. Deletions use `git rm -r`. One mega-commit for all structural moves (preserves atomic history), then follow-up commits for reference updates. Root transitions from a Next.js app to a pure workspace root.

**Tech Stack:** git, pnpm workspaces, Next.js 16, Python 3, Playwright

---

## Task 1: Create target directories

**Step 1: Create new directories**

```bash
mkdir -p chain web/marketing web/monitor spec tests
```

**Step 2: Verify**

```bash
ls -d chain web spec tests
```

Expected: all 4 exist.

---

## Task 2: Move protocol core (vault/agentic-chain/ → chain/)

**Files:**
- Move: `vault/agentic-chain/*` → `chain/`

**Step 1: Move all chain contents**

```bash
# Move contents, not the directory itself (preserve chain/ we just created)
git mv vault/agentic-chain/agentic chain/agentic
git mv vault/agentic-chain/tests chain/tests
git mv vault/agentic-chain/.claude chain/.claude
git mv vault/agentic-chain/CLAUDE.md chain/CLAUDE.md
git mv vault/agentic-chain/seed.md chain/seed.md
git mv vault/agentic-chain/docs chain/docs
git mv vault/agentic-chain/Dockerfile chain/Dockerfile
git mv vault/agentic-chain/requirements.txt chain/requirements.txt
git mv vault/agentic-chain/.dockerignore chain/.dockerignore
git mv vault/agentic-chain/.gitignore chain/.gitignore
git mv vault/agentic-chain/start.py chain/start.py
git mv vault/agentic-chain/stack chain/stack
git mv vault/agentic-chain/inbox.md chain/inbox.md
git mv vault/agentic-chain/outbox.md chain/outbox.md
```

Also move any remaining tracked files (run_*.py scripts, etc.) — use `git mv` for each.

**Step 2: Verify Python imports still work**

```bash
cd chain && python3 -c "from agentic.params import GENESIS_SUPPLY; print(GENESIS_SUPPLY)"
```

Expected: `900` — imports use package-relative paths, not filesystem-absolute.

**Step 3: Run chain tests**

```bash
cd chain && python3 -m pytest tests/test_whitepaper_audit.py -q
```

Expected: 95 passed

---

## Task 3: Move game UI (apps/zkagenticnetwork/ → apps/game/)

**Step 1: Rename**

```bash
git mv apps/zkagenticnetwork apps/game
```

**Step 2: Verify Next.js app structure**

```bash
ls apps/game/src/app/game/page.tsx
```

Expected: file exists

---

## Task 4: Move knowledge base (vault/ → spec/)

**Files:**
- Move: `vault/whitepaper.md`, `vault/litepaper.md`, `vault/poaiv-formal.md`, `vault/feasibility-report.md`, `vault/whitepaper-v1-0.md`, `vault/audit-report/`, `vault/product/`, `vault/research/`, `vault/engineering/`

**Step 1: Move spec files**

```bash
git mv vault/whitepaper.md spec/whitepaper.md
git mv vault/whitepaper-v1-0.md spec/whitepaper-v1-0.md
git mv vault/litepaper.md spec/litepaper.md
git mv vault/poaiv-formal.md spec/poaiv-formal.md
git mv vault/feasibility-report.md spec/feasibility-report.md
git mv vault/audit-report spec/audit-report
git mv vault/product spec/product
git mv vault/research spec/research
git mv vault/engineering spec/engineering
```

**Step 2: Move remaining vault contents to spec/**

```bash
git mv vault/collaborate spec/collaborate
git mv vault/ideas spec/ideas
git mv vault/reviews spec/reviews
git mv vault/skills spec/skills
git mv vault/prompts spec/prompts
git mv vault/_templates spec/_templates
git mv vault/CLAUDE.md spec/CLAUDE.md
git mv vault/README.md spec/README.md
git mv vault/seed.md spec/seed.md
git mv vault/ZKAGENTIC.md spec/ZKAGENTIC.md
git mv vault/user-voice.md spec/user-voice.md
```

**Step 3: Handle local-only vault files (not tracked)**

```bash
# These are gitignored compaction files — just move locally
mv vault/compacted-summary.md spec/compacted-summary.md 2>/dev/null
mv vault/user-prompts.md spec/user-prompts.md 2>/dev/null
```

**Step 4: Remove empty vault/**

```bash
rmdir vault 2>/dev/null || rm -rf vault
```

---

## Task 5: Move web deploy sources (ZkAgentic/ → web/)

**Step 1: Move marketing site**

```bash
git mv ZkAgentic/projects/web/zkagentic-deploy/* web/marketing/ 2>/dev/null
# Handle .git inside deploy dir separately — this is a nested repo
rm -rf web/marketing/.git  # Don't track nested .git
```

**Step 2: Move monitor**

```bash
git mv ZkAgentic/projects/web/zkagentic-monitor/* web/monitor/
```

**Step 3: Delete stale ZkAgentic stubs**

```bash
git rm -r ZkAgentic/projects/web/company-site 2>/dev/null
git rm -r ZkAgentic/projects/web/zkagentic-site 2>/dev/null
git rm -r ZkAgentic/projects/web/zkagenticnetwork-landing 2>/dev/null
```

**Step 4: Move any remaining useful ZkAgentic files, then remove**

```bash
# Check what's left
ls ZkAgentic/
# Move docs/research if useful, otherwise delete the whole tree
git rm -r ZkAgentic
```

---

## Task 6: Move E2E tests (playwright/ → tests/)

**Step 1: Move**

```bash
git mv playwright/* tests/
```

**Step 2: Move playwright.config.ts to reference new path**

Update `playwright.config.ts` at root:
- Change `testDir: './playwright'` → `testDir: './tests'`
- Update any script paths

**Step 3: Update package.json scripts**

In root `package.json`, update:
- `"e2e:seed": "... playwright/scripts/..."` → `"... tests/scripts/..."`
- `"e2e:gaps": "... playwright/scripts/..."` → `"... tests/scripts/..."`

---

## Task 7: Delete superseded/stale directories

**Step 1: Remove old root src/ (superseded by apps/game/)**

```bash
git rm -r src/
```

**Step 2: Remove stale apps/agentic-chain/ (diverged copy)**

```bash
git rm -r apps/agentic-chain/
```

**Step 3: Remove empty/redundant directories**

```bash
rm -rf packages/          # Empty
rm -rf stack/             # Duplicates .claude/layers/
rm -rf screenshots/       # Dev artifacts
rm -rf playwright-report/ # Build artifact
rm -rf test-results/      # Build artifact
rm -rf .playwright-mcp/   # Temp data
```

---

## Task 8: Update .gitignore

**Modify:** `.gitignore`

Replace stale entries:

```
# OLD
vault/agentic-chain/
apps/

# NEW
chain/testnet_state.db
chain/testnet_state.db-*
chain/.chain_auth
chain/.env
apps/game/node_modules/
screenshots/
```

Keep all existing general entries (node_modules, .next, .env, etc.)

---

## Task 9: Update root configs for workspace-only root

**Step 1: Update root package.json**

The root `package.json` currently runs Next.js directly (`next dev`). After removing `src/`, it should become a workspace root:

- Remove `next`, `react`, `react-dom`, `pixi.js`, `zustand`, `@solana/*`, `@supabase/*` from root dependencies (they live in `apps/game/package.json`)
- Keep devDependencies for workspace-wide tools: `@playwright/test`, `typescript`, `eslint`, `vitest`
- Update scripts to delegate: `"dev": "cd apps/game && npm run dev"`
- Add `"workspaces": ["apps/*"]` if using npm, or update `pnpm-workspace.yaml`

**Step 2: Update pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
```

**Step 3: Root next.config.ts, tsconfig.json, postcss.config.mjs, eslint.config.mjs, vitest.config.ts, prisma.config.ts**

These can either be deleted (apps/game has its own) or kept as workspace-level overrides. Recommend: delete if apps/game/ has equivalent, keep if shared.

---

## Task 10: Update all path references

**Step 1: Update seed.md** — Rewrite project tree diagram

**Step 2: Update CLAUDE.md** — Replace all `vault/agentic-chain/` → `chain/`, `vault/whitepaper.md` → `spec/whitepaper.md`, `apps/zkagenticnetwork/` → `apps/game/`

**Step 3: Update .claude/SEED.md** — Children table paths:
- `apps/zkagenticnetwork/` → `apps/game/`
- `vault/agentic-chain/` → `chain/`
- Inbox/outbox paths updated

**Step 4: Update .claude/layers/context.md** — Domain table source paths

**Step 5: Update chain/.claude/SEED.md** — Update self-referencing paths

**Step 6: Update apps/game/.claude/SEED.md** — Update self-referencing paths

**Step 7: Update MEMORY.md** — All file path references

**Step 8: Grep for stale paths**

```bash
grep -rn "vault/agentic-chain\|apps/zkagenticnetwork\|vault/whitepaper\|playwright/" \
  --include="*.md" --include="*.json" --include="*.ts" --include="*.py" \
  . | grep -v node_modules | grep -v .git
```

Fix any remaining references.

---

## Task 11: Verify everything works

**Step 1: Chain tests**

```bash
cd chain && python3 -m pytest tests/ --ignore=tests/benchmarks --ignore=tests/monitor_crosscheck -q
```

Expected: 717+ passed

**Step 2: Game UI type check**

```bash
cd apps/game && npx tsc --noEmit
```

Expected: 0 errors

**Step 3: Playwright config valid**

```bash
npx playwright test --list
```

Expected: lists test files from `tests/` directory

---

## Task 12: Commit

**Step 1: Stage all changes**

```bash
git add -A
git status
```

Review: should see moves (renamed), deletions, and new files. No unintended changes.

**Step 2: Commit**

```bash
git commit -m "refactor: reorganize monorepo — chain/, apps/game/, web/, spec/, tests/

Structural moves (git mv, preserves history):
- vault/agentic-chain/ → chain/ (protocol core)
- apps/zkagenticnetwork/ → apps/game/ (game UI)
- vault/{whitepaper,research,product,...} → spec/ (knowledge base)
- ZkAgentic/.../zkagentic-deploy/ → web/marketing/
- ZkAgentic/.../zkagentic-monitor/ → web/monitor/
- playwright/ → tests/ (tool-agnostic naming)

Deleted (superseded/stale):
- src/ (older frontend, replaced by apps/game/)
- apps/agentic-chain/ (diverged chain copy)
- ZkAgentic/ stubs (company-site, zkagentic-site, landing)
- packages/ (empty), stack/ (duplicate of .claude/layers)

Updated: seed.md, CLAUDE.md, .claude/SEED.md, .gitignore, all child SEED files"
```

---

## Task Dependency Graph

```
Task 1 (mkdir) → Task 2 (chain) ─┐
                 Task 3 (game)  ─┤
                 Task 4 (spec)  ─┼→ Task 7 (delete) → Task 8 (.gitignore) → Task 9 (configs) → Task 10 (refs) → Task 11 (verify) → Task 12 (commit)
                 Task 5 (web)   ─┤
                 Task 6 (tests) ─┘
```

Tasks 2-6 can run in parallel after Task 1. Tasks 7-12 are sequential.
