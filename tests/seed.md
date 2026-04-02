# Seed — playwright/

> End-to-end test suite for ZK Agentic Network.
> Read `CLAUDE.md` for what changed and what tests exist.

## What This Directory Serves

Playwright-based E2E test suite that validates the full user journey through the game — from landing page to blockchain interactions. Also used for autonomous beta testing via parallel faction agent scripts.

## Contents

| File/Dir | Description |
|----------|-------------|
| `tests/` | E2E test specs (22+ tests) |
| `fixtures.ts` | Shared test fixtures, mock store state, Zustand helpers |
| `globalSetup.ts` | Test environment setup (Next.js + Python chain health checks) |
| `scripts/` | Autonomous beta tester scripts (4 parallel faction agents) |

## Test Coverage

| Spec | Coverage |
|------|----------|
| `01-onboarding.spec.ts` | Landing → username → subscribe flow |
| `02-terminal.spec.ts` | Agent terminal command tree |
| `03-blockchain.spec.ts` | Secure, mine, stats actions |
| `04-beta-*.spec.ts` | Parallel faction beta testers (Community/Treasury/Founder/Pro) |

## Key Patterns

- `fixtures.ts` injects Zustand store state directly for isolated component testing
- `waitForTimeout(500)` after `store.setState` for React re-render
- CSS locator `.glass-panel-floating` for DockPanel button targeting (not text locators)

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | Exodus monorepo root |
| Components tested | `../src/components/seed.md` | UI components under test |
| App routes tested | `../src/app/seed.md` | Routes navigated in tests |
| Chain backend | `../apps/agentic-chain/seed.md` | Backend hit by e2e tests |
| Test config | `../playwright.config.ts` | Playwright configuration |
