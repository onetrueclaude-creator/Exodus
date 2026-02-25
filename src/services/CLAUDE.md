# Change Log — src/services/

> Tracks what changed in chain service adapters, what's planned, and why.
> Read `seed.md` first.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

---

## 2026-02-23 — TestnetChainService established

**Added:** `testnetChainService.ts` — calls Python FastAPI, `chainToVisual()` coordinate transform.

**Why:** Frontend needed a real data source; mock-only was blocking gameplay testing.

---

## 2026-02-23 — isTestnetOnline() gate added

**Changed:** Service initialization — `isTestnetOnline()` probe at startup picks Testnet vs Mock service.

**Why:** Local dev often runs without Python chain; fallback to mock prevents broken game load.

---

## Pending

- [ ] `testnetChainService.ts` — switch `getAgents()` to read from Supabase `chain_claims` table (supabase-middleware-sync feature)
- [ ] Add `claimCoordinate(x, y, userId)` method to interface
- [ ] Add `sendMessage(ncp)` method to interface

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../CLAUDE.md` | src/ changelog |
| Backend source | `../../apps/agentic-chain/CLAUDE.md` | Python API changes |
| Hooks that call this | `../hooks/CLAUDE.md` | useGameRealtime changes |
| Supabase plan | `../../vault/engineering/CLAUDE.md` | Middleware sync architecture |
