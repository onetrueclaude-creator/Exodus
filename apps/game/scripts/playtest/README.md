# Reasoning Playtest (W3 #60)

An automated playtester: drives the game's known flows, reasons over each screen
with a vision model, and writes UX tickets to `playtest-tickets/<runId>/`.

## Run (operator — needs the app up + a model key)

```bash
docker compose up -d              # if the app needs Postgres/chain locally
cd apps/game && npm run dev &     # app at http://localhost:3000
export ANTHROPIC_API_KEY=sk-...   # required
npm run playtest                  # from repo root (uses tsx inside apps/game)
# tickets land in apps/game/playtest-tickets/manual/*.md
```

Env: `BASE_URL` (default http://localhost:3000), `PLAYTEST_MODEL` (default claude-opus-4-8),
`PLAYTEST_RUN_ID` (default "manual").

## Runner location

The live runner is `apps/game/scripts/playtest/run.playtest.ts`. It runs as a
plain `.ts` (CJS) file via `cd apps/game && tsx`, so all imports share the same
module context as the core — no ESM/CJS interop issues. The `@/*` path alias
resolves correctly to `apps/game/src/*` via `apps/game/tsconfig.json`.

## Notes
- NOT a pass/fail test and NOT in the PR CI gate — it's an on-demand UX assessment.
- The core (`apps/game/src/lib/playtest/*`) is fully unit-tested; this runner only
  wires real Playwright + the model (via fetch) + a file sink to the tested core.
- Scripted-journey + reason-per-screen. Autonomous exploration is a future mode.
- `playtest-tickets/` is gitignored — generated tickets never land in the repo.
