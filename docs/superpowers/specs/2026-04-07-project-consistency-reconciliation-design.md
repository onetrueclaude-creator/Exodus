# Project Consistency Reconciliation

**Date:** 2026-04-07
**Status:** Design approved
**Scope:** Fix all cross-document discrepancies: CPU Energy values, tier model language, stale planning docs, whitepaper alignment

---

## Context

A deep consistency audit revealed conflicts across whitepaper, code, CLAUDE.md files, marketing site, and planning documents. The tier model cascade (PR #23) updated the root CLAUDE.md and whitepaper but missed `apps/game/CLAUDE.md`, `subscription.ts`, and the planning docs. CPU Energy values were inconsistent across all sources.

**Product decisions made during this design:**
1. CPU Energy follows proportional model: Community=1,000, Professional=5,000
2. MAX tier stays dormant in code but bumped to 20,000 (proportional)
3. `apps/game/CLAUDE.md` mirrors root CLAUDE.md changes
4. Stale planning docs get completion markers

---

## Canonical Tier Values (Source of Truth)

| Feature | Community (Free) | Professional ($50/mo) | Max (dormant) |
|---------|-----------------|----------------------|---------------|
| CPU Energy | 1,000 | 5,000 | 20,000 |
| Deploy Range | 1 Moore ring (8 nodes) | 2 Moore rings (24 nodes) | — |
| Max Children | 8 | 24 | — |
| Governance Weight | 1x | 2x | — |
| Model Selection | Any (API cost-gated) | Any (API cost-gated) | Any |
| Theme | yellowish-orange | cyan blue | purple (dormant) |

---

## File Changes

### Group A: Code Changes

#### A1. `apps/game/src/types/subscription.ts`

- Community: `startEnergy: 100` -> `1000`; remove `startAgent: "sonnet"`, `homenode: "Sonnet Homenode"`, `maxAgentTier: "haiku"`; update features list (remove model restriction language, update CPU value)
- Professional: `startEnergy: 500` -> `5000`; remove `startAgent: "sonnet"`, `homenode: "Opus Homenode"`, `maxAgentTier: "opus"`; update features list
- Max: `startEnergy: 2000` -> `20000`; remove model-specific fields; update features list
- Remove `maxAgentTier` from `SubscriptionPlan` interface
- Remove `startAgent` and `homenode` from interface (or change homenode to just "Homenode")

#### A2. `apps/game/prisma/schema.prisma`

- Update enum comments only (remove model references)

### Group B: Whitepaper Changes

#### B1. `spec/whitepaper.md` Section 13.3

Current:
```
| Community | Free | Any (API cost-gated) | Any (API cost-gated) | 1,000 |
| Professional | $50 | Any (API cost-gated) | Any (API cost-gated) | 500 |
```

Change Professional CPU Energy: `500` -> `5,000`

Rewrite explanation paragraph:
> **Why Professional has more CPU Energy.** Professional tier users pay a monthly subscription that funds protocol development and infrastructure. The higher CPU allocation (5x Community) reflects their investment and enables them to fully utilize their broader deploy range (2 Moore rings, 24 nodes). Community users receive a generous 1,000 CPU starting allocation — sufficient for meaningful gameplay within their single Moore ring.

#### B2. `spec/whitepaper.md` Section 19.3

Same table change: Professional Initial CPU Energy `500` -> `5,000`

### Group C: CLAUDE.md Changes

#### C1. Root `CLAUDE.md`

Update Subscription Tiers section:
```
- **Community (free)**: 1,000 CPU Energy, yellowish-orange theme
- **Professional ($50/mo)**: 5,000 CPU Energy, cyan blue theme
```

#### C2. `apps/game/CLAUDE.md`

**Subscription Tiers section** — replace with:
```
- **Community (free)**: 1,000 CPU Energy, yellowish-orange theme
- **Professional ($50/mo)**: 5,000 CPU Energy, cyan blue theme

All tiers can deploy any Claude model (Haiku/Sonnet/Opus) for both homenode and child agents. API cost is the natural gate.
```

**UX Design Spec** — mirror the same narrative changes from root CLAUDE.md PR #23:
1. Tier card paragraph: remove "Sonnet Homenode" / "Opus Homenode" / Max tier references
2. Grid entry: "my Sonnet Homenode" -> "my Homenode"
3. Terminal commands: "my Sonnet prewritten" -> "my agent prewritten"
4. Agent creation: remove "it only allows me to create Haiku" paragraph, replace with cost-choice narrative

### Group D: Marketing Changes

#### D1. `web/marketing/staking.html`

- Community card: CPU Energy `100` -> `1,000`
- Professional card: CPU Energy `500` -> `5,000`

### Group E: Planning Doc Updates

#### E1. `docs/plans/2026-04-02-solana-grade-rollout-design.md`

Add completion notes at the top:
```
> **Status Update (2026-04-07):** Phase 1 gates COMPLETE (2026-04-05). Phase 2 gates COMPLETE (2026-04-06). See ROADMAP.md for current status.
```

#### E2. `docs/plans/2026-04-05-phase2-gate-opensource-research.md`

Add completion note at the top:
```
> **Status Update (2026-04-07):** All Phase 2 gate items COMPLETE. Repo public since 2026-04-06. CI green. SECURITY.md published. 5 PRs merged.
```

#### E3. `ROADMAP.md`

Add to Phase 3 progress:
- zkagentic-node hard wrapper implemented (74 tests)
- All 4 node operations complete (secure, read, deploy, write)
- Tier model restrictions removed (any model, any tier)

### Group F: Regenerate & Deploy

#### F1. Regenerate whitepaper PDF

Run `python3 web/marketing/gen_whitepaper_pdf.py` after whitepaper changes

#### F2. Deploy to zkagentic-website

Rsync web/marketing/ to deploy repo, push

---

## Verification Plan

1. Grep all sources for old CPU values:
   - `grep -rn "startEnergy.*100\b" apps/game/src/`
   - `grep -rn "500 CPU\|500 Energy" spec/ CLAUDE.md apps/game/CLAUDE.md`
2. Grep for remaining model restriction language:
   - `grep -rn "Sonnet Homenode\|Opus Homenode\|deploys Haiku\|maxAgentTier" apps/game/`
3. Run game tests: `npm test --prefix apps/game`
4. Run chain tests: `python3 -m pytest chain/tests/ -v`
5. CI passes on PR

---

## PR Strategy

Single PR: `fix/project-consistency-reconciliation` covering all groups A-E.
Then deploy (Group F) after merge.
