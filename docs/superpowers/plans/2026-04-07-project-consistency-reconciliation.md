# Project Consistency Reconciliation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all cross-document discrepancies in CPU Energy values, tier model language, and stale planning docs across 10 files.

**Architecture:** Single PR with edits to whitepaper, game code, CLAUDE.md files, marketing HTML, planning docs, and ROADMAP. Then regenerate whitepaper PDF and deploy marketing site.

**Tech Stack:** TypeScript (subscription types), Markdown (whitepaper, CLAUDE.md, ROADMAP), HTML (marketing), Python (PDF generation)

**Spec:** `docs/superpowers/specs/2026-04-07-project-consistency-reconciliation-design.md`

**Commit identity:**
```bash
GIT_AUTHOR_NAME="ZK Agentic Network" GIT_AUTHOR_EMAIL="onetrueclaude-creator@users.noreply.github.com" GIT_COMMITTER_NAME="ZK Agentic Network" GIT_COMMITTER_EMAIL="onetrueclaude-creator@users.noreply.github.com"
```

---

### Task 1: Update subscription.ts (code — canonical tier values)

**Files:**
- Modify: `apps/game/src/types/subscription.ts`

- [ ] **Step 1: Update SubscriptionPlan interface — remove model-specific fields**

In `apps/game/src/types/subscription.ts`, replace the entire file with:

```typescript
import type { AgentTier } from "./agent";

export type SubscriptionTier = "COMMUNITY" | "PROFESSIONAL" | "MAX";

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number; // USD per month (0 = free)
  priceLabel: string;
  startEnergy: number;
  startAgntc: number;
  startMinerals: number;
  features: string[];
  accent: string; // Tailwind color classes: text border bg
}

/** Subscription plans — determines starting conditions at registration */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "COMMUNITY",
    name: "Community",
    price: 0,
    priceLabel: "Free",
    startEnergy: 1000,
    startAgntc: 10,
    startMinerals: 10,
    features: [
      "1,000 CPU Energy starting balance",
      "10 AGNTC tokens",
      "Deploy any Claude model (API cost-gated)",
      "1 Moore ring deploy range (8 nodes)",
      "Community governance voting (1x)",
    ],
    accent: "text-white border-white/30 bg-white/5",
  },
  {
    tier: "PROFESSIONAL",
    name: "Professional",
    price: 50,
    priceLabel: "$50/mo",
    startEnergy: 5000,
    startAgntc: 100,
    startMinerals: 50,
    features: [
      "5,000 CPU Energy starting balance",
      "100 AGNTC tokens",
      "Deploy any Claude model (API cost-gated)",
      "2 Moore rings deploy range (24 nodes)",
      "Enhanced governance voting (2x)",
      "Priority border pressure",
    ],
    accent: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
  },
  {
    tier: "MAX",
    name: "Max",
    price: 200,
    priceLabel: "$200/mo",
    startEnergy: 20000,
    startAgntc: 500,
    startMinerals: 200,
    features: [
      "20,000 CPU Energy starting balance",
      "500 AGNTC tokens",
      "Deploy any Claude model (API cost-gated)",
      "Full validator suite",
      "Maximum border influence",
      "Direct chain governance",
    ],
    accent: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  },
];
```

- [ ] **Step 2: Check for compile errors**

Run: `cd apps/game && npx tsc --noEmit 2>&1 | head -30`

If there are references to removed fields (`maxAgentTier`, `startAgent`, `homenode`), fix those callers:

```bash
grep -rn "maxAgentTier\|startAgent\|\.homenode" apps/game/src/ --include="*.ts" --include="*.tsx"
```

Fix each reference by removing it or replacing with a static value.

- [ ] **Step 3: Run game tests**

Run: `cd apps/game && npm run test:run 2>&1 | tail -20`

Expected: All tests pass (the removed fields may break some test assertions — fix as needed).

- [ ] **Step 4: Commit**

```bash
git add apps/game/src/types/subscription.ts
# Also add any files fixed in step 2
git commit -m "fix(game): update CPU Energy values (1000/5000/20000), remove model-tier fields"
```

---

### Task 2: Update Prisma schema comments

**Files:**
- Modify: `apps/game/prisma/schema.prisma:87-91`

- [ ] **Step 1: Update enum comments**

Replace:
```prisma
enum SubscriptionTier {
  COMMUNITY      // Free — starts with Sonnet, 100 Energy
  PROFESSIONAL   // $50/mo — starts with Sonnet, 500 Energy, validator access
  MAX            // Premium — starts with Opus, 2000 Energy, full features
}
```

With:
```prisma
enum SubscriptionTier {
  COMMUNITY      // Free — 1,000 CPU Energy, 1 Moore ring
  PROFESSIONAL   // $50/mo — 5,000 CPU Energy, 2 Moore rings
  MAX            // Dormant — 20,000 CPU Energy (hidden from UI)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/game/prisma/schema.prisma
git commit -m "fix(prisma): update SubscriptionTier enum comments to match canonical values"
```

---

### Task 3: Update whitepaper CPU Energy values

**Files:**
- Modify: `spec/whitepaper.md:1277` (Section 13.3)
- Modify: `spec/whitepaper.md:1279` (Section 13.3 explanation)
- Modify: `spec/whitepaper.md:1931` (Section 19.3 table)

- [ ] **Step 1: Update Section 13.3 table (line ~1277)**

Replace:
```
| Professional | $50 | Any (API cost-gated) | Any (API cost-gated) | 500 |
```

With:
```
| Professional | $50 | Any (API cost-gated) | Any (API cost-gated) | 5,000 |
```

- [ ] **Step 2: Rewrite Section 13.3 explanation (line ~1279)**

Replace:
```
**Why Professional has less initial CPU Energy than Community.** Professional tier users receive higher deploy range (2 Moore rings vs 1), more children (24 vs 8), and greater governance weight (2× vs 1×). The lower initial allocation reflects that Professional users have broader operational scope — they can manage more territory with fewer starting resources.
```

With:
```
**Why Professional has more CPU Energy.** Professional tier users pay a monthly subscription that funds protocol development and infrastructure. The higher CPU allocation (5× Community) enables them to fully utilize their broader deploy range (2 Moore rings, 24 nodes) and enhanced governance weight (2×). Community users receive a generous 1,000 CPU starting allocation — sufficient for meaningful gameplay within their single Moore ring.
```

- [ ] **Step 3: Update Section 19.3 table (line ~1931)**

Replace:
```
| Initial CPU Energy | 1,000 | 500 | Protocol-managed | Protocol-managed |
```

With:
```
| Initial CPU Energy | 1,000 | 5,000 | Protocol-managed | Protocol-managed |
```

- [ ] **Step 4: Commit**

```bash
git add spec/whitepaper.md
git commit -m "fix(whitepaper): update Professional CPU Energy to 5,000 (proportional model)"
```

---

### Task 4: Update root CLAUDE.md CPU values

**Files:**
- Modify: `CLAUDE.md:69-70`

- [ ] **Step 1: Update Subscription Tiers**

Replace:
```markdown
- **Community (free)**: 100 CPU Energy, yellowish-orange theme
- **Professional ($50/mo)**: 500 CPU Energy, cyan blue theme
```

With:
```markdown
- **Community (free)**: 1,000 CPU Energy, yellowish-orange theme
- **Professional ($50/mo)**: 5,000 CPU Energy, cyan blue theme
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "fix: update root CLAUDE.md CPU Energy values (1,000/5,000)"
```

---

### Task 5: Update apps/game/CLAUDE.md (full tier cascade)

**Files:**
- Modify: `apps/game/CLAUDE.md:65-68` (Subscription Tiers)
- Modify: `apps/game/CLAUDE.md:84` (Settings — "Opus only")
- Modify: `apps/game/CLAUDE.md:103` (UX spec — tier selection)
- Modify: `apps/game/CLAUDE.md:107` (UX spec — homenode entry)
- Modify: `apps/game/CLAUDE.md:109` (UX spec — terminal commands)
- Modify: `apps/game/CLAUDE.md:111` (UX spec — Secure action)
- Modify: `apps/game/CLAUDE.md:119` (UX spec — agent creation)

- [ ] **Step 1: Replace Subscription Tiers section (lines 65-68)**

Replace:
```markdown
## Subscription Tiers
- **Community (free)**: Sonnet Homenode, 1000 CPU Energy, yellowish-orange theme, deploys Haiku only
- **Professional ($50/mo)**: Opus Homenode, 500 CPU Energy, cyan blue theme, deploys up to Opus
- **Max ($200/mo)**: Opus Homenode, 2000 CPU Energy, purple theme, unlimited Opus deployment
```

With:
```markdown
## Subscription Tiers
- **Community (free)**: 1,000 CPU Energy, yellowish-orange theme
- **Professional ($50/mo)**: 5,000 CPU Energy, cyan blue theme

All tiers can deploy any Claude model (Haiku/Sonnet/Opus) for both homenode and child agents. API cost is the natural gate. Tiers control resources (CPU Energy, deploy range, node count), visual theme, and governance weight.
```

- [ ] **Step 2: Update Settings menu reference (line ~84)**

Replace:
```markdown
5. **Settings** → network color (Opus only), status report
```

With:
```markdown
5. **Settings** → network color (premium visual feature), status report
```

- [ ] **Step 3: Rewrite UX spec tier selection paragraph (line ~103)**

Replace:
```
> I am asked to choose between three subscription methods. First one is Free for Community, a yellowish orange themed tier card. Second one is for Professional method, a cyan blue tier card. And a Max access tier, able to start with Opus 4.6 agent model. I see that the Free for Community access can only create Sonnet agent at max and it says on the card "Sonnet Homenode". Max says "Opus Homenode", Pro says "Opus Homenode". I choose free tier for now.
```

With:
```
> I am asked to choose between two subscription methods. First one is Free for Community, a yellowish orange themed tier card. Second one is for Professional method, a cyan blue tier card. The tier cards show CPU Energy allocation, deploy range, node count, and governance weight. Each tier can use any Claude model — the difference is in resources, not model access. I choose free tier for now.
```

- [ ] **Step 4: Update homenode entry (line ~107)**

Replace:
```
> I seem to have a CPU Energy ticker on the resources tab on the top, and Secured Chains. When the 2D grid map first rendered, it was focused on my Sonnet Homenode. I see Neural Lattice networked nodes, and my Homenode has a border around it, it is yellow, like the subscription tier I've chosen.
```

With:
```
> I seem to have a CPU Energy ticker on the resources tab on the top, and Secured Chains. When the 2D grid map first rendered, it was focused on my Homenode. I see Neural Lattice networked nodes, and my Homenode has a border around it, it is yellow, like the subscription tier I've chosen.
```

- [ ] **Step 5: Update terminal command reference (line ~109)**

Replace:
```
> I see a window opened to give my Sonnet prewritten commands. There are: Deploy Agent, Blockchain Protocols, Adjust Securing Operations Rate, Adjust Network Parameters, and Settings. I click Blockchain Protocols. This choice is most likely the only choice to perform operations on chain, it looks like. The Sonnet now asks me for additional prewritten choices: Secure, Write Data On Chain, Read Data On Chain, Transact, Stats.
```

With:
```
> I see a window opened to give my agent prewritten commands. There are: Deploy Agent, Blockchain Protocols, Adjust Securing Operations Rate, Adjust Network Parameters, and Settings. I click Blockchain Protocols. This choice is most likely the only choice to perform operations on chain, it looks like. The agent now asks me for additional prewritten choices: Secure, Write Data On Chain, Read Data On Chain, Transact, Stats.
```

- [ ] **Step 6: Update Secure action reference (line ~111)**

Replace:
```
> For now I choose Secure. Other choices are self-explanatory and they can do what they say. Sonnet now asks me to choose again, for how many block generation cycles and for how much AGNTC Coin.
```

With:
```
> For now I choose Secure. Other choices are self-explanatory and they can do what they say. The agent now asks me to choose again, for how many block generation cycles and for how much AGNTC Coin.
```

- [ ] **Step 7: Rewrite agent creation paragraph (line ~119)**

Replace:
```
> I create a Haiku because it only allows me to create Haiku because I am a free user, but I'm sure the Max subscription tier allows full Opus model agent creation for Securing nodes.
```

With:
```
> I see model options: Haiku, Sonnet, and Opus. Each shows an estimated API cost indicator. I choose Haiku because it's the most cost-effective for a secondary node. I could deploy Opus here, but the API costs would be significantly higher — the choice is economic, not a tier restriction.
```

- [ ] **Step 8: Commit**

```bash
git add apps/game/CLAUDE.md
git commit -m "fix(game): cascade tier model changes + CPU Energy update to apps/game/CLAUDE.md"
```

---

### Task 6: Update marketing staking.html CPU values

**Files:**
- Modify: `web/marketing/staking.html`

- [ ] **Step 1: Update Community CPU Energy**

Find and replace in the minified HTML:
```
>CPU Energy</span><span class="text-text-primary font-mono">100<
```
With:
```
>CPU Energy</span><span class="text-text-primary font-mono">1,000<
```

- [ ] **Step 2: Update Professional CPU Energy**

Find and replace:
```
>CPU Energy</span><span class="text-text-primary font-mono">500<
```
With:
```
>CPU Energy</span><span class="text-text-primary font-mono">5,000<
```

- [ ] **Step 3: Commit**

```bash
git add web/marketing/staking.html
git commit -m "fix(marketing): update tier CPU Energy values (1,000/5,000)"
```

---

### Task 7: Update stale planning docs

**Files:**
- Modify: `docs/plans/2026-04-02-solana-grade-rollout-design.md:1-8`
- Modify: `docs/plans/2026-04-05-phase2-gate-opensource-research.md:1-7`

- [ ] **Step 1: Add status note to master rollout doc**

After line 7 (`> **Estimated Timeline:**...`), add:

```markdown
>
> **Status Update (2026-04-07):** Phase 1 gates COMPLETE (2026-04-05). Phase 2 gates COMPLETE (2026-04-06). See ROADMAP.md for current status.
```

- [ ] **Step 2: Update Phase 2 gate doc status**

Replace:
```markdown
> **Status:** Research (append-only, no implementation yet)
```

With:
```markdown
> **Status:** COMPLETE (2026-04-06) — all gate items done. Repo public, CI green, SECURITY.md published, 5 PRs merged.
```

- [ ] **Step 3: Commit**

```bash
git add docs/plans/2026-04-02-solana-grade-rollout-design.md docs/plans/2026-04-05-phase2-gate-opensource-research.md
git commit -m "docs: mark Phase 1-2 gates as complete in planning docs"
```

---

### Task 8: Update ROADMAP.md with Phase 3 progress

**Files:**
- Modify: `ROADMAP.md:39-47`

- [ ] **Step 1: Add progress items to Phase 3**

Replace:
```markdown
## Phase 3: Game UI Demo 🔄

- Neural Lattice code refactor (aligning codebase with whitepaper terminology)
- Locked blockchain operator node template ([zkagentic-node](https://github.com/onetrueclaude-creator/zkagentic-node))
- SMT hash verification of operator `.claude/` directory
- Game onboarding flow: landing → Google OAuth → username → tier selection → /game
- Territory visualization: online/offline nodes, agent deployment, faction borders
- Agent Terminal: pre-defined blockchain operations (Secure, Deploy, Read, Write, Stats)
```

With:
```markdown
## Phase 3: Game UI Demo 🔄

- Neural Lattice code refactor (aligning codebase with whitepaper terminology) ✅
- Locked blockchain operator node template ([zkagentic-node](https://github.com/onetrueclaude-creator/zkagentic-node)) ✅
- SMT hash verification of operator `.claude/` directory ✅
- Hard wrapper enforcement: Python CLI with menu-only input (74 tests) ✅
- All 4 node operations implemented: Secure, Read, Deploy, Write ✅
- Tier model restrictions removed: any tier, any Claude model (API cost-gated) ✅
- Game onboarding flow: landing → Google OAuth → username → tier selection → /game
- Territory visualization: online/offline nodes, agent deployment, faction borders
- Agent Terminal: pre-defined blockchain operations (Secure, Deploy, Read, Write, Stats)
```

- [ ] **Step 2: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: update ROADMAP Phase 3 with completed milestones"
```

---

### Task 9: Regenerate whitepaper PDF and deploy

**Files:**
- Regenerate: `web/marketing/AGNTC-Whitepaper-v1.0.pdf`

- [ ] **Step 1: Regenerate PDF**

Run: `python3 web/marketing/gen_whitepaper_pdf.py`

Expected output: `PDF generated: .../AGNTC-Whitepaper-v1.0.pdf (76 pages)`

- [ ] **Step 2: Add design spec to commit**

```bash
git add web/marketing/AGNTC-Whitepaper-v1.0.pdf docs/superpowers/specs/2026-04-07-project-consistency-reconciliation-design.md docs/superpowers/plans/2026-04-07-project-consistency-reconciliation.md
git commit -m "chore: regenerate whitepaper PDF, add reconciliation spec and plan"
```

- [ ] **Step 3: Verify all changes with grep checks**

```bash
# Should find NO old CPU values in subscription.ts
grep -n "startEnergy.*100\b\|startEnergy.*500\b\|startEnergy.*2000\b" apps/game/src/types/subscription.ts

# Should find NO model restriction language in game CLAUDE.md
grep -n "Sonnet Homenode\|Opus Homenode\|deploys Haiku\|maxAgentTier" apps/game/CLAUDE.md

# Should find NO "500" CPU Energy for Professional in whitepaper (except in generic contexts)
grep -n "Professional.*500\|500.*Professional" spec/whitepaper.md
```

All three should return empty or only irrelevant matches.

- [ ] **Step 4: Run game tests**

Run: `cd apps/game && npm run test:run 2>&1 | tail -10`

Expected: All tests pass.

- [ ] **Step 5: Push branch and create PR**

```bash
git push -u origin fix/project-consistency-reconciliation
gh pr create --title "fix: reconcile CPU Energy values, tier model, and stale docs" --body "$(cat <<'EOF'
## Summary
- CPU Energy values aligned: Community=1,000, Professional=5,000, Max=20,000 (dormant)
- Tier model cascade completed in apps/game/CLAUDE.md (was missed in PR #23)
- subscription.ts: removed model-tier fields, updated energy values
- Whitepaper Sections 13.3 + 19.3: Professional CPU Energy 500→5,000
- Marketing staking.html: CPU values updated
- Planning docs: Phase 1-2 marked complete
- ROADMAP: Phase 3 progress updated with completed milestones
- Prisma enum comments updated
- Whitepaper PDF regenerated

## Test plan
- [x] grep finds no old CPU values in subscription.ts
- [x] grep finds no model restriction language in game CLAUDE.md
- [x] Game tests pass
- [ ] CI passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: After CI passes, merge and deploy**

```bash
gh pr merge --merge --delete-branch
git checkout main && git pull origin main
```

Then deploy marketing:
```bash
rsync -av --delete --exclude='.git' --exclude='.nojekyll' --exclude='CNAME' --exclude='__next.*' --exclude='*.txt' --exclude='gen_whitepaper_pdf.py' web/marketing/ /tmp/zkagentic-website-deploy/
cd /tmp/zkagentic-website-deploy
git add -A
GIT_AUTHOR_NAME="ZK Agentic Network" GIT_AUTHOR_EMAIL="onetrueclaude-creator@users.noreply.github.com" GIT_COMMITTER_NAME="ZK Agentic Network" GIT_COMMITTER_EMAIL="onetrueclaude-creator@users.noreply.github.com" git commit -m "deploy: CPU Energy values + tier model reconciliation"
git push origin main
```
