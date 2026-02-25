# Seed — src/types/

> TypeScript type definitions for ZK Agentic Network.
> Read `CLAUDE.md` for what changed.

## What This Directory Serves

All TypeScript interfaces and type definitions shared across the application — game entities, blockchain types, API responses, and domain models.

## Files

| File | Description |
|------|-------------|
| `agent.ts` | `Agent`, `AgentModel`, `AgentTier` — deployed AI agents |
| `blockchain.ts` | `Block`, `Claim`, `Transaction`, `MineResult` |
| `grid.ts` | `GridCell`, `GridCoord`, `Faction`, `NodeDensity` |
| `haiku.ts` | `NCP` (Neural Communication Packet), `HaikuLine` |
| `research.ts` | `ResearchNode`, `ResearchTree` |
| `subscription.ts` | `SubscriptionTier`, `TierConfig` |
| `testnet.ts` | Python API response types (mirrors `frontend_contract.ts`) |
| `global.d.ts` | Global type augmentations |
| `index.ts` | Re-exports all types |

## Key Domain Types

```typescript
type Faction = 'community' | 'treasury' | 'founder' | 'professional'
type AgentModel = 'haiku' | 'sonnet' | 'opus'
type SubscriptionTier = 'community' | 'professional' | 'max'
```

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | src/ tree |
| Used by store | `../store/seed.md` | Store uses these types |
| Used by components | `../components/seed.md` | Components use these types |
| Python contract | `../../apps/agentic-chain/seed.md` | testnet.ts mirrors Python frontend_contract.ts |
