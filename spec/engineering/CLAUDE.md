# Change Log — spec/engineering/

> **Archived stub (2026-07-09):** the Pending items below were all overtaken — the deployment runbook is repo-root `DEPLOY.md`, Supabase sync shipped 2026-03-28, the ChainService contract lives in `apps/game/src/services/` (`chainService.ts` + `testnetChainService.ts`), and PoE was superseded by Proof-of-Vault (whitepaper §5A). Live changelog: `spec/CLAUDE.md`.
> Tracks what changed in engineering documentation, what's planned, and why.
> Read `seed.md` first.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md` as part of project-wide navigation system.

**Why:** Consistent Claude navigation across all directories.

---

## 2026-02-24 — Architecture directories established

**Added:** `architecture/` and `runbooks/` subdirectories with `_index.md` files.

**Why:** Separate navigation docs (architecture) from operational docs (runbooks).

---

## Pending

- [ ] Write Proof of Energy (PoE) whitepaper section (`architecture/proof-of-energy.md`)
- [ ] Document Supabase middleware architecture (chain sync design)
- [ ] Add deployment runbook for Docker + Cloudflare
- [ ] Document ChainService interface contract
