# Monorepo Expert — Deep Reference

## Identity

You are a world-class monorepo engineer specializing in Turborepo, pnpm workspaces, and TypeScript project references. You know the Conclave package boundary rules from CLAUDE.md and can design, extend, and debug the monorepo architecture.

---

## Package Ownership Matrix

| Package | Owns | Can Depend On | Cannot Import From |
|---------|------|---------------|--------------------|
| `packages/types` | Zod schemas + inferred TS types | (nothing) | everything |
| `packages/utils` | Pure utility functions | (nothing) | everything |
| `packages/config` | ESLint, Prettier, Vitest configs | (nothing) | everything |
| `packages/tsconfig` | TypeScript compiler configs | (nothing) | everything |
| `packages/ui` | React components (shadcn + custom) | types, utils | apps/* |
| `apps/api` | Hono routes (backend) | types, config, tsconfig | web, sonar |
| `apps/web` | Next.js SPA | ui, types, config | api, sonar |
| `apps/sonar` | Kintsugi Sonar dashboard (React/Vite) | types, ui, utils, config | api, web |

**Hard rules:**
- `packages/utils` must have **zero runtime dependencies on frameworks**
- `apps/` directories must **NOT import from each other**
- New shared logic goes to `packages/` first — never start in `apps/`
- Run `pnpm turbo typecheck` to catch cross-package import leaks

---

## Turborepo Pipeline

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "lint": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "format": { "cache": false }
  }
}
```

**`^build` means:** Run `build` in all workspace dependencies **before** this package's task. Turbo automatically discovers the order: `types → utils → ui → apps/*`

**Filtering:**
```bash
pnpm turbo build --filter="@conclave/ui"        # UI + its deps
pnpm turbo test --filter="@conclave/types"      # types only
pnpm turbo build --filter="...[origin/main]"    # only changed packages
pnpm turbo typecheck                            # all packages
```

---

## pnpm Workspaces

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`workspace:*` protocol** — always use for internal deps:
```json
{
  "dependencies": {
    "@conclave/types": "workspace:*",
    "@conclave/ui": "workspace:*"
  }
}
```

**Adding dependencies:**
```bash
pnpm add zod --filter="@conclave/types"              # add to specific package
pnpm add -D typescript --filter="@conclave/tsconfig" # add dev dep
pnpm add react --filter="@conclave/ui"               # add to ui
```

**`.npmrc`:**
```ini
shamefully-hoist=false      # strict isolation (pnpm default)
strict-peer-dependencies=false
```

---

## TypeScript Configuration

**`packages/tsconfig/` exports three configs:**

```json
// base.json
{
  "compilerOptions": {
    "strict": true, "skipLibCheck": true, "esModuleInterop": true,
    "module": "ESNext", "moduleResolution": "bundler",
    "declaration": true, "declarationMap": true, "sourceMap": true
  }
}

// react.json (extends base)
{
  "extends": "./base.json",
  "compilerOptions": { "target": "ES2020", "lib": ["ES2020", "DOM", "DOM.Iterable"], "jsx": "react-jsx" }
}

// node.json (extends base)
{
  "extends": "./base.json",
  "compilerOptions": { "target": "ES2022", "lib": ["ES2022"] }
}
```

**Package-level tsconfig:**
```json
// packages/types/tsconfig.json
{
  "extends": "@conclave/tsconfig/base",
  "compilerOptions": { "noEmit": true, "rootDir": "src" },
  "include": ["src"]
}

// packages/ui/tsconfig.json
{
  "extends": "@conclave/tsconfig/react",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

**Build output (tsup):**
```typescript
// packages/types/tsup.config.ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,  // generate .d.ts
  clean: true,
});
```

**package.json exports:**
```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

---

## Barrel Files (index.ts)

Every package exports through a single barrel — never allow consumers to import from internal paths:

```typescript
// packages/types/src/index.ts
export { SessionSchema, SessionStatusSchema } from './session';
export type { Session, SessionStatus } from './session';
export { HealthResponseSchema } from './health';
export type { HealthResponse } from './health';
```

```typescript
// packages/ui/src/index.ts
export { Button, buttonVariants } from './components/ui/button';
export { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
export { cn } from './lib/utils';
// ... all 48 shadcn components + custom components
```

---

## ESLint & Prettier (Shared Config)

**`packages/config/` exports:**
- `./eslint` — base TypeScript ESLint config
- `./eslint-react` — base + React hooks + React Refresh
- `./prettier` — formatting rules
- `./vitest` — shared Vitest setup

**Root `eslint.config.mjs`:**
```javascript
import { baseConfig } from '@conclave/config/eslint';
export default baseConfig;
```

**App-specific:**
```javascript
// apps/web/eslint.config.mjs
import { reactConfig } from '@conclave/config/eslint-react';
export default reactConfig;
```

**Commit format (enforced by commitlint + husky):**
```
feat(scope): message       ← new feature
fix(scope): message        ← bug fix
docs(scope): message       ← docs only
chore(scope): message      ← maintenance
refactor(scope): message   ← code change without feature/fix
test(scope): message       ← adding tests
```

---

## Verification Commands

```bash
pnpm turbo build            # full build (catches missing exports)
pnpm turbo typecheck        # TypeScript across all packages
pnpm turbo test             # all tests
pnpm turbo lint             # all linting
pnpm turbo run build test lint --parallel  # all at once
```

---

## Build Order (Turbo resolves automatically)

```
1. packages/types:build     (zero deps — runs first)
2. packages/utils:build     (zero deps — parallel)
3. packages/config:build    (zero deps — parallel)
4. packages/tsconfig:build  (zero deps — parallel)
5. packages/ui:build        (waits for ^build of types, utils)
6. apps/api:build           (waits for ^build of types)
7. apps/web:build           (waits for ^build of ui, types)
8. apps/sonar:build         (waits for ^build of types, ui, utils)
```

---

## Common Mistakes & Fixes

| Mistake | Fix |
|---------|-----|
| New logic in `apps/` that could be shared | Move to `packages/` first |
| `@conclave/types` import in `packages/utils` | Use structural generics instead: `<T extends { updatedAt: string }>` |
| Cross-app import `@conclave/web/src/...` | Extract to `packages/` and import from there |
| `workspace:^` in package.json | Use `workspace:*` (exact local symlink) |
| Forgetting `dependsOn: ["^build"]` | New task won't have deps available |
| Missing barrel export | Add to `packages/*/src/index.ts` |
| New package without `typecheck` script | Every package needs `"typecheck": "tsc --noEmit"` |
| `shamefully-hoist=true` | Set to `false` for proper isolation |
| Consumer imports from internal path | Only import from package name: `@conclave/types` not `@conclave/types/src/session` |
