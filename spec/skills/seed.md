# Seed — spec/skills/

> Claude Code skill library for ZK Agentic Network / Exodus development.
> Read `CLAUDE.md` for what skills exist and what's been added.

## What This Directory Serves

Houses the Claude Code skill definitions used by the Exodus development environment. Skills are invokable via the `Skill` tool and provide specialized expert personas and workflow guidance.

## Skills Available

| Skill | Purpose |
|-------|---------|
| `ai-integration-expert/` | Claude API, tool use, MCP, streaming, agentic patterns |
| `backend-expert/` | Hono, Prisma 7, NextAuth v5, PostgreSQL patterns |
| `frontend-expert/` | React 19, Next.js 16, Tailwind CSS 4, Server Components |
| `game-design-expert/` | Agent-based strategy, graph topology, ZkAgentic mechanics |
| `monorepo-expert/` | Turborepo, pnpm workspaces, TypeScript project references |
| `pixijs-expert/` | PixiJS 8, WebGL, 2D grid rendering, React integration |
| `state-expert/` | Zustand 5, slices, middleware, SSR hydration |
| `testing-expert/` | Vitest, RTL, Playwright, TDD workflow |
| `ui-design-expert/` | shadcn/ui, Radix UI, Tailwind CSS 4, dark crypto aesthetic |
| `web3-expert/` | Solana wallet-adapter, @solana/web3.js, two-tier user model |
| `Skills.md` | Skills index and invocation guide |

## Architecture

Skills are registered in `.claude/settings.json` and invoked via the `Skill` tool in Claude Code sessions.
