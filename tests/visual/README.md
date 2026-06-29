# Visual-Regression Baselines (W3 #61)

Deterministic screenshot baselines for the PixiJS canvas + key screens, via the
dev-only `/visual/*` harness routes. Built-in Playwright `toHaveScreenshot` —
baselines are committed PNGs under `tests/visual/__screenshots__/`.

## First-time capture (operator — needs the app running)

```bash
# 1. start Postgres + the chain if your environment needs them for the dev server
docker compose up -d
# 2. capture baselines (starts apps/game dev server via the config's webServer)
npm run test:visual:update
# 3. review the generated PNGs under tests/visual/__screenshots__/, then commit
git add tests/visual/__screenshots__ && git commit -m "chore(w3): capture visual baselines"
```

## On every PR
`npm run test:visual` (CI runs it) diffs against the committed baselines and fails on regression.

## Intentional UI change
Re-run `npm run test:visual:update`, review the new PNGs (the diff is the review surface), commit them in the same PR.

## Make it blocking
Once baselines exist on `main`, set `continue-on-error: false` in
`.github/workflows/visual-regression.yml`.

## Determinism notes
- Canvas: `/visual/canvas` uses `?visualTest`-mode (fixed `VISUAL_FIXTURE`, manual-ticker
  freeze, `window.__visualReady`). Software WebGL (`--use-gl=swiftshader`) + fixed
  `1280×720 @ DPR 1` make it machine-independent.
- `/visual/*` routes return 404 in production.
