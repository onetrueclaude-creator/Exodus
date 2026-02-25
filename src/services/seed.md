# Seed — src/services/

> Chain service adapters for ZK Agentic Network.
> Read `CLAUDE.md` for what changed.

## What This Directory Serves

Implements the `ChainService` interface — the abstraction layer between the frontend game and the blockchain backend. Swapping services lets the game run offline (mock) or against the real testnet.

## Services

| File | Description |
|------|-------------|
| `chainService.ts` | **Interface** — `ChainService` type contract (agents, claims, mining) |
| `testnetChainService.ts` | **Primary** — calls Python FastAPI at `localhost:8080` |
| `mockData.ts` | Static mock data for offline development |
| `testnetApi.ts` | Raw fetch wrappers for each testnet API endpoint |

## Architecture

```
ChainService (interface in chainService.ts)
  ├─ TestnetChainService  → localhost:8080 (Python FastAPI)
  └─ MockChainService     → static mockData.ts (offline fallback)

isTestnetOnline() → picks which service to use at startup
```

## Key Pattern

`TestnetChainService.getAgents()` calls `/api/agents` → `chainToVisual()` maps blockchain coords `[-3240,3240]` to screen space `[-4000,4000]`.

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | src/ tree |
| Python backend | `../../apps/agentic-chain/seed.md` | What TestnetChainService calls |
| Hooks that use this | `../hooks/seed.md` | useGameRealtime calls ChainService |
| Store that receives | `../store/seed.md` | Agents loaded into Zustand store |
| Supabase alt path | `../../supabase/` | Future: read chain_claims from Supabase |
