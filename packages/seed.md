# Seed — packages/

> Shared workspace packages for the Exodus monorepo (pnpm workspaces + Turborepo).
> Read `CLAUDE.md` (when present) for change history.

## What This Directory Serves

Reserved for shared TypeScript libraries, utilities, and design system packages that are consumed across multiple apps in the monorepo. Currently empty — packages will be extracted here as shared logic grows.

## Planned Contents

| Package (future) | Description |
|-----------------|-------------|
| `@exodus/ui` | Shared Tailwind + Radix UI component library |
| `@exodus/chain-types` | TypeScript interfaces for Agentic Chain protocol |
| `@exodus/config` | Shared ESLint, TypeScript, Tailwind configurations |

## Architecture

Follows Turborepo workspace conventions:
- Each package has its own `package.json` with `name: "@exodus/<pkg>"`
- Exported via `exports` field for proper ESM resolution
- Consumed by `apps/*` via workspace protocol (`workspace:*`)

## Status

`2026-02-25` — Directory created, no packages yet. Extraction from `apps/zkagenticnetwork/src/lib/` is planned.
