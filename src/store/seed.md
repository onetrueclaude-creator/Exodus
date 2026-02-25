# Seed — src/store/

> Zustand 5 global game store for ZK Agentic Network.
> Read `CLAUDE.md` for what changed.

## What This Directory Serves

The single source of truth for all client-side game state — agents, resources, UI state (active dock panel, active tab, focus requests), and blockchain data.

## Files

| File | Description |
|------|-------------|
| `gameStore.ts` | **Main store** — all Zustand slices + actions |
| `index.ts` | Re-exports + store hooks |
| `__tests__/` | Vitest tests for store actions |

## State Shape (key slices)

```typescript
{
  // Game entities
  agents: Agent[]           // All deployed agents (from chain)
  selectedAgentId: string | null
  selectedNodeCoord: {x,y} | null

  // Resources (HUD)
  cpuEnergy: number         // Yellow resource
  securedChains: number     // Green resource
  agntcBalance: number

  // UI
  activeDockPanel: string | null  // Right sidebar panel
  activeTab: string               // Bottom tab
  focusRequest: {x,y} | null      // Camera focus request

  // Loading
  isInitializing: boolean
  isReady: boolean
}
```

## Key Patterns

- `activeDockPanel` — `null` = close, same id = toggle close, different id = switch
- `focusRequest` must be cleared after camera moves (`clearFocusRequest()`)
- `tick()` has zero-agent guard: if no own agents, skip income tick

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | src/ tree |
| Writes from | `../hooks/seed.md` | Hooks that call store actions |
| Reads from services | `../services/seed.md` | Services that feed agent data |
| Components reading | `../components/seed.md` | UI components subscribing to store |
| Types used | `../types/seed.md` | Agent, Blockchain types used in store |
