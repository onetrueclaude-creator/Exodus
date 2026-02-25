# Change Log — src/hooks/

> Tracks what changed in hooks, what's planned, and why.
> Read `seed.md` first.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

---

## 2026-02-23 — useGameRealtime: SSL timeout fix

**Changed:** `useGameRealtime.ts`
- Added `Promise.race` with 5s timeout for Supabase calls
- Added `catch` block to prevent unhandled rejections when Supabase unreachable
- `isReady` now set in `finally` block — always resolves even on error

**Why:** Supabase SSL error (`ERR_CERT_AUTHORITY_INVALID`) on corporate proxy was hanging the loading overlay indefinitely. Game now falls back to empty grid within 5s.

---

## Pending

- [ ] `useGameRealtime`: switch from Python API polling to Supabase read (once chain_claims table is synced)
- [ ] Add `useBlockEvents` hook for real-time block creation notifications

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../CLAUDE.md` | src/ changelog |
| Services | `../services/CLAUDE.md` | Service layer hooks call into |
| Store | `../store/CLAUDE.md` | Zustand state hooks modify |
| Supabase plan | `../../vault/engineering/CLAUDE.md` | Supabase middleware design |
