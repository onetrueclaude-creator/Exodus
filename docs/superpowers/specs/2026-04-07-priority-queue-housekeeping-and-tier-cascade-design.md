# Priority Queue: Housekeeping PRs + Tier Model Cascade

**Date:** 2026-04-07
**Status:** Design approved
**Scope:** Groups A (housekeeping) and B (tier model cascade) from the session priority queue

---

## Context

Session 2026-04-06 completed node operations in zkagentic-node and deployed marketing site fixes, but left several items uncommitted in Exodus:
- 2 design docs (node operations)
- 9 modified marketing files (already deployed to zkagentic-website)
- Canonical hash drift (params.py still has old zkagentic-node hash)
- Product decision to remove tier-based model restrictions hasn't cascaded to whitepaper, marketing, or CLAUDE.md

This spec covers 4 PRs that clear all debt before game UI work begins.

---

## PR 1: Design Docs (`docs/node-operations-plans`)

**Branch:** `docs/node-operations-plans`
**Files:** 2 new (untracked)

| File | Content |
|------|---------|
| `docs/plans/2026-04-06-node-operations-design.md` | Node operations design for zkagentic-node |
| `docs/plans/2026-04-06-node-operations-impl.md` | Implementation plan for node operations |

**Pre-commit check:** Grep for `/Users/` — must not contain local paths.

---

## PR 2: Marketing Sync (`chore/marketing-site-sync`)

**Branch:** `chore/marketing-site-sync`
**Files:** 9 modified in `web/marketing/`

| File | Change Summary |
|------|---------------|
| `404.html` | Error page updates |
| `_not-found.html` | Not-found page updates |
| `index.html` | Landing page — waitlist, contact emails, Neural Lattice terminology |
| `js/waitlist.js` | Waitlist form fixes |
| `roadmap.html` | Roadmap updates |
| `staking.html` | Staking page content |
| `technology.html` | Technology page content |
| `tokenomics.html` | Tokenomics page content |
| `whitepaper.html` | Whitepaper link page |

These are already deployed to zkagentic.com via the zkagentic-website repo. This PR syncs the Exodus source of truth.

**Pre-commit check:** Grep for `/Users/` in all HTML files.

---

## PR 3: Canonical Hash Update (`fix/canonical-claude-hash`)

**Branch:** `fix/canonical-claude-hash`
**Files:** 1 line in `chain/agentic/params.py`

```python
# Before (line 128)
CANONICAL_CLAUDE_HASH = "8def0b2a2e4a19107ebdb2093df248b62ed35a607862921bf1a4e17364b3be3d"

# After
CANONICAL_CLAUDE_HASH = "823c3f76b2b13ae2a9d50c84c51c2610146279e2eacf424d3c08e1eccaf39488"
```

**Pre-commit check:** Run `python3 -m pytest chain/tests/test_node_lockdown.py -v` to verify no tests assert against the old hash.

---

## PR 4: Tier Model Cascade (`feat/unrestricted-model-deploy`)

**Branch:** `feat/unrestricted-model-deploy`
**Product decision:** All tiers can deploy any Claude model. API cost is the natural gate. Tiers control resources (CPU, range, theme) and governance (vote weight), not model access.

### 4.1 Whitepaper Changes (`spec/whitepaper.md`)

**Section 19.3 table (lines 1926-1938):**

Replace:
```
| Homenode Model | Sonnet | Opus | Opus | Opus |
```
With:
```
| Homenode Model | Any (API cost-gated) | Any (API cost-gated) | Any | Any |
```

Replace:
```
| Max Deploy Model | Haiku | Opus | Opus | Opus |
```
With:
```
| Deploy Model | Any (API cost-gated) | Any (API cost-gated) | Any | Any |
```

**Add paragraph after table (before Deploy Range explanation):**

> **Model selection is unrestricted.** All subscription tiers can deploy any available Claude model (Haiku, Sonnet, Opus) for both homenode and child agents. The natural cost gate is the Claude API bill -- Opus costs approximately 19x more per token than Haiku. Participants who choose higher-cost models accept the operational expense. Tiers govern resources (CPU Energy, deploy range, subgrid visibility) and governance weight, not model access.

**Section 19.2 (line 1909):**

Change:
> The tier determines initial CPU Energy allocation, homenode model, and maximum deployable agent model.

To:
> The tier determines initial CPU Energy allocation, deploy range, and governance weight. Model selection (Haiku, Sonnet, Opus) is unrestricted across all tiers.

**Section 19.2 (line 1915):**

Change:
> An active Sonnet agent at their homenode (or Opus for Professional)

To:
> An active agent at their homenode (model chosen during setup)

**Section 18.3 (line 1816):**

Change:
> Network color customization (Opus agents only -- premium visual identity)

To:
> Network color customization (premium visual identity feature)

### 4.2 Marketing Changes (`web/marketing/staking.html`)

**Community tier card** -- replace the Homenode and Max Deploy rows:

| Before | After |
|--------|-------|
| `Homenode: Sonnet` | `Homenode Model: Any` |
| `Max Deploy: Haiku` | `Deploy Model: Any` |

**Professional tier card** -- same treatment:

| Before | After |
|--------|-------|
| `Homenode: Opus` | `Homenode Model: Any` |
| `Max Deploy: Opus` | `Deploy Model: Any` |

### 4.3 CLAUDE.md Changes (`CLAUDE.md`)

**Subscription Tiers section** -- replace:
```
- **Community (free)**: Sonnet Homenode, 100 CPU Energy, yellowish-orange theme, deploys Haiku only
- **Professional ($50/mo)**: Opus Homenode, 500 CPU Energy, cyan blue theme, deploys up to Opus
- **Max ($200/mo)**: Opus Homenode, 2000 CPU Energy, purple theme, unlimited Opus deployment
```

With:
```
- **Community (free)**: 100 CPU Energy, yellowish-orange theme
- **Professional ($50/mo)**: 500 CPU Energy, cyan blue theme

All tiers can deploy any Claude model (Haiku/Sonnet/Opus) for both homenode and child agents. API cost is the natural gate. Tiers control resources (CPU Energy, deploy range, node count), visual theme, and governance weight.
```

**UX Design Spec** -- rewrite model-restriction paragraphs:

Replace:
> I see that the Free for Community access can only create Sonnet agent at max and it says on the card "Sonnet Homenode". Max says "Opus Homenode", Pro says "Opus Homenode". I choose free tier for now.

With:
> The tier cards show CPU Energy allocation, deploy range, node count, and governance weight. Each tier can use any Claude model -- the difference is in resources, not model access. I choose free tier for now.

Replace:
> I create a Haiku because it only allows me to create Haiku because I am a free user, but I'm sure the Max subscription tier allows full Opus model agent creation for Securing nodes.

With:
> I see model options: Haiku, Sonnet, and Opus. Each shows an estimated API cost indicator. I choose Haiku because it's the most cost-effective for a secondary node. I could deploy Opus here, but the API costs would be significantly higher -- the choice is economic, not a tier restriction.

### 4.4 Files NOT Changed

| File | Reason |
|------|--------|
| Prisma schema (`SubscriptionTier` enum) | MAX stays dormant -- kept in code, hidden from UI |
| `src/types/subscription.ts` | MAX type stays dormant |
| `chain/agentic/params.py` (faction distribution) | Factions are orthogonal to model selection |
| Game store (`gameStore.ts`) | No model enforcement logic exists to remove |

---

## Verification Plan

### PRs 1-3 (Housekeeping)
1. `git diff` review before each commit
2. `grep -r '/Users/' docs/plans/2026-04-06-node-operations-*` -- must return empty
3. `grep -r '/Users/' web/marketing/` -- must return empty
4. `python3 -m pytest chain/tests/test_node_lockdown.py -v` -- verify hash change doesn't break tests
5. CI passes on all PRs

### PR 4 (Tier Cascade)
1. After edits, grep whitepaper for remaining restriction language:
   - `grep -n "Haiku only\|deploy Haiku\|Max Deploy\|Sonnet Homenode\|Opus Homenode" spec/whitepaper.md`
2. Grep marketing for restriction language:
   - `grep -n "Max Deploy\|Haiku\|Sonnet" web/marketing/staking.html` -- should only show model names in generic context
3. Grep CLAUDE.md for restriction language:
   - `grep -n "deploys Haiku\|deploys up to\|Sonnet Homenode\|Opus Homenode\|unlimited Opus" CLAUDE.md`
4. Run chain tests: `python3 -m pytest chain/tests/ -v`
5. Run game tests: `npm test --prefix apps/game`
6. CI passes

### Post-merge
- Update memory file `product_tier_model_unrestricted.md` -- mark pending items as done
- Verify marketing deployment if staking.html changed (rsync to zkagentic-website)

---

## PR Dependency Order

```
PR 1 (docs)    ──┐
PR 2 (marketing) ├──> can merge independently, no dependencies
PR 3 (hash)    ──┘
                      ↓
PR 4 (tier cascade) ──> depends on PR 2 being merged first
                        (PR 4 modifies staking.html again)
```

PRs 1, 2, 3 can be created and merged in parallel.
PR 4 should be created after PR 2 merges (to avoid merge conflicts on staking.html).
