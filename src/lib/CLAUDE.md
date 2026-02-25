# Change Log — src/lib/

> Tracks what changed in utility functions, what's planned, and why.
> Read `seed.md` first.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

---

## 2026-02-24 — spiral/ utilities added

**Added:** `spiral/` directory — logarithmic spiral math for 4-arm galaxy grid layout.

**Why:** Galaxy grid redesign requires spiral coordinate transformation: blockchain (x,y) → screen position following logarithmic spiral arms.

---

## 2026-02-23 — supabase/ client added

**Added:** `supabase/` directory — Supabase JS client and helpers for chain_claims/chain_messages sync.

**Why:** Supabase middleware sync feature (supabase-middleware-sync, dispatch phase 1).

---

## Pending

- [ ] `energy.ts` — implement `tokensToEnergy(tokens, density)` function (energy rate TBD)
- [ ] `fog.ts` — implement faction-tinted fog rendering logic for rival arm areas
- [ ] `spiral/` — complete `spiralToScreen(x, y, armIndex)` coordinate transform

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../CLAUDE.md` | src/ changelog |
| Uses these | `../components/CLAUDE.md` | Component changes that use lib |
| Protocol math | `../../apps/agentic-chain/CLAUDE.md` | Chain params that lib mirrors |
| Product decisions | `../../vault/product/CLAUDE.md` | Energy rate decisions pending |
