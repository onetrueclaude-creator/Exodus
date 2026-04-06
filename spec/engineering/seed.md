# Seed — spec/engineering/

> Engineering knowledge base: architecture decisions, system design, and runbooks.
> Read `CLAUDE.md` for what changed and what's being added.

## What This Directory Serves

Stores technical architecture documentation, architectural decision records (ADRs), and operational runbooks for the ZK Agentic Network platform.

## Contents

| Dir/File | Description |
|----------|-------------|
| `architecture/` | System architecture diagrams and design documents |
| `runbooks/` | Operational runbooks (deployment, incident response, database ops) |
| `_index.md` | Directory index and navigation guide |

## Architectures Documented

- Frontend architecture (Next.js 16, PixiJS 8, Zustand 5 data flow)
- Blockchain integration (ChainService interface, TestnetChainService vs MockChainService)
- Auth architecture (NextAuth v5, Prisma adapter, two-tier user model)
- Supabase middleware design (chain_claims sync, realtime relay)
- PoE (Proof of Energy) protocol specification
