---
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Evaluation — How to Measure Success

## Automated Checks

| Check | Command | Pass Criteria |
|-------|---------|--------------|
| Vitest suite | `npm run test:run` | All tests pass, zero failures |
| TypeScript | `npx tsc --noEmit` | No type errors (strict mode) |
| Build | `npm run build` | Standalone output builds without errors |
| Playwright E2E | `npx playwright test` | All E2E scenarios green |

## Rendering Checks

| Check | Method | Pass Criteria |
|-------|--------|--------------|
| PixiJS canvas | Manual or Playwright screenshot | Neural Lattice renders, nodes visible, no blank canvas |
| 60fps target | Chrome DevTools Performance tab | No frame drops below 30fps on mid-range hardware |
| Hydration | Browser console | Zero hydration mismatch warnings |
| Memory | Chrome DevTools Memory tab | No unbounded growth over 5-minute session |

## Quality Signals

- **Component isolation**: Each component renders independently in tests (no cascading failures)
- **Store purity**: Zustand actions are testable without rendering components
- **Service abstraction**: MockChainService and TestnetChainService are interchangeable without component changes
- **CSS consistency**: All colors come from CSS variables or Tailwind config, no hardcoded hex values in components

## Regression Signals

- Test count decreasing without documented reason = regression
- Build time increasing >50% = investigate
- New TypeScript `any` casts = review needed
- PixiJS `world.children` iteration without marker filtering = bug pattern
