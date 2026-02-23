# Skill Library — Master Index

> All 10 expert skills for the ZkAgentic + Conclave project.
> Invoke with `/skills:<name>` in Claude Code.

---

## General Skills (Conclave Monorepo)

| Skill | Invocation | Domain |
|-------|-----------|--------|
| [[frontend-expert/skill-description\|Frontend Expert]] | `/skills:frontend-expert` | React 19, Next.js 16, Tailwind CSS 4 |
| [[backend-expert/skill-description\|Backend Expert]] | `/skills:backend-expert` | Hono, Prisma 7, NextAuth v5, pg |
| [[ui-design-expert/skill-description\|UI Design Expert]] | `/skills:ui-design-expert` | shadcn/ui, Radix, CSS tokens, accessibility |
| [[testing-expert/skill-description\|Testing Expert]] | `/skills:testing-expert` | Vitest, React Testing Library, Playwright, TDD |
| [[monorepo-expert/skill-description\|Monorepo Expert]] | `/skills:monorepo-expert` | Turborepo, pnpm workspaces, TypeScript refs |

## ZkAgentic-Specific Skills

| Skill | Invocation | Domain |
|-------|-----------|--------|
| [[state-expert/skill-description\|State Expert]] | `/skills:state-expert` | Zustand 5, slices, middleware, testing |
| [[pixijs-expert/skill-description\|PixiJS Expert]] | `/skills:pixijs-expert` | PixiJS 8, WebGL, graph rendering, game loop |
| [[web3-expert/skill-description\|Web3 Expert]] | `/skills:web3-expert` | Solana wallet-adapter, @solana/web3.js 1.x |
| [[game-design-expert/skill-description\|Game Design Expert]] | `/skills:game-design-expert` | Agent state machines, network mechanics, ZK |
| [[ai-integration-expert/skill-description\|AI Integration Expert]] | `/skills:ai-integration-expert` | Claude API, tool use, MCP, streaming |

---

## Quick Reference — When to use which skill

| Task | Primary skill | Secondary skill |
|------|-------------|----------------|
| Building a React page/component | `frontend-expert` | `ui-design-expert` |
| Adding a Hono API route | `backend-expert` | `testing-expert` |
| Writing tests | `testing-expert` | (domain skill) |
| Designing a new UI component | `ui-design-expert` | `frontend-expert` |
| Adding/modifying packages | `monorepo-expert` | — |
| Working with Zustand stores | `state-expert` | `testing-expert` |
| PixiJS rendering / game loop | `pixijs-expert` | `state-expert` |
| Solana wallet / transactions | `web3-expert` | `testing-expert` |
| Game mechanics / rules | `game-design-expert` | — |
| Claude API / MCP integration | `ai-integration-expert` | `backend-expert` |

---

## File Structure

```
vault/skills/
├── Skills.md                          ← this file
├── frontend-expert/skill-description.md
├── backend-expert/skill-description.md
├── ui-design-expert/skill-description.md
├── testing-expert/skill-description.md
├── monorepo-expert/skill-description.md
├── state-expert/skill-description.md
├── pixijs-expert/skill-description.md
├── web3-expert/skill-description.md
├── game-design-expert/skill-description.md
└── ai-integration-expert/skill-description.md

.claude/commands/skills/
├── frontend-expert.md
├── backend-expert.md
├── ui-design-expert.md
├── testing-expert.md
├── monorepo-expert.md
├── state-expert.md
├── pixijs-expert.md
├── web3-expert.md
├── game-design-expert.md
└── ai-integration-expert.md
```

_Last updated: 2026-02-22_
