# Exodus Feature Dispatch

Orchestrate the full Exodus development workflow from a single command.
Invoke as: /exodus:feature "description of what to build"
Or: /exodus:feature (to resume an in-progress workflow)

**Canonical reference:** `docs/WORKFLOW-DISTILLATION.md`
**State file:** `.claude/dispatch-state.json`

---

## ENFORCEMENT RULES

1. **No silent skipping.** Every step MUST either execute OR display an explicit skip notice. State file MUST be updated even for skipped steps.

2. **State after every step.** Updated after EVERY step — not after phases, not in batches.

3. **Banners are mandatory.** Every step displays its start banner before executing and completion banner after.

4. **Hard gates block.** Steps marked HARD GATE loop until the gate condition is met.

---

## Phase 0: State Management

### Step 0.1 — Check for existing state

```bash
cat .claude/dispatch-state.json 2>/dev/null || echo "NO_STATE_FILE"
```

### Step 0.2 — If state file exists: display resume banner and ask

Display:
```
════════════════════════════════════════════════════════════════
🔄 EXODUS DISPATCH — Resume Detected
════════════════════════════════════════════════════════════════
Feature:   [feature field from state]
Phase:     [phase] · [phase name]
Step:      [step]
Branch:    [branch or "not set yet"]
Completed: [count] steps done
════════════════════════════════════════════════════════════════
```

Use AskUserQuestion: "Resume from where you left off, or start fresh?"

### Step 0.3 — If no state file: capture feature description

If invoked with argument, use that. Otherwise prompt user.

### Step 0.4 — Create initial state file

Write `.claude/dispatch-state.json`:
```json
{
  "version": 1,
  "feature": "[2-3 word slug]",
  "description": "[full description]",
  "phase": 1,
  "step": "1.1",
  "currentTaskIndex": null,
  "totalTasks": null,
  "branch": null,
  "worktreeDir": null,
  "completedSteps": [],
  "artifacts": {
    "designDoc": null,
    "boundaryMap": null,
    "planFile": null,
    "deployUrl": null,
    "prUrl": null
  },
  "lastUpdated": "[ISO timestamp]"
}
```

---

## Phase 1: Discovery

**Hard gate:** No code until Step 1.5 completes with explicit design approval.

### Step 1.1 — superpowers:using-superpowers
### Step 1.2 — feature-dev:code-explorer (subagent)

Prompt: "Explore the codebase to understand apps/zkagenticnetwork (Next.js/PixiJS/Zustand) and apps/agentic-chain (Python/FastAPI blockchain). Map: existing package boundaries, exports, hooks, schemas, types, shared utilities relevant to: [description]. Produce a dependency map."

### Step 1.3 — context7 MCP — Pull library docs

Libraries to check: Next.js 16, React 19, PixiJS 8, Zustand 5, Vitest 4 (frontend); FastAPI, Pydantic (backend).

### Step 1.4 — superpowers:brainstorming — HARD GATE

Do NOT proceed until design is explicitly approved.
Write design doc to `docs/plans/[date]-[feature]-design.md`.

```
✅ PHASE 1 COMPLETE — proceeding to Phase 2
```

---

## Phase 2: Isolation

### Step 2.1 — superpowers:using-git-worktrees

Create isolated branch. Run `pnpm install`. Run baseline tests:
- `pnpm turbo test:run` (frontend — must PASS)
- `python3 -m pytest tests/ -q` from `apps/agentic-chain/` (if backend touched — must PASS)

**Hard exit:** If baseline tests fail, stop and fix on main first.

### Step 2.2 — turborepo:turborepo

Ensure `turbo.json` tasks cover any new packages this feature introduces.

---

## Phase 3: Design

**Hard gate:** No implementation without package boundary map.

### Step 3.1 — feature-dev:code-architect (subagent)

Produce package boundary map. Enforce:
- Apps never import from each other
- Shared logic goes to `packages/` first
- Python/FastAPI changes stay in `apps/agentic-chain/`
- Frontend changes go to `apps/zkagenticnetwork/src/`

### Step 3.2 — frontend-design:frontend-design (conditional — if UI work)

### Step 3.3 — superpowers:writing-plans — HARD GATE

Each task must specify: exact file path, package, expected exports, test location, verify command, dependencies.
Plan → `docs/plans/[date]-[feature]-impl.md`

Ask for approval. Loop until approved.

---

## Phase 4: Implementation

### Step 4.0 — superpowers:executing-plans
### Step 4.sub — superpowers:subagent-driven-development

**Per-task inner cycle (repeat for each task):**

- **4a** — context7 MCP (task-specific library docs)
- **4b** — superpowers:test-driven-development (RED → GREEN → refactor)
  - Frontend: `pnpm turbo test:run --filter=zkagenticnetwork`
  - Backend: `python3 -m pytest tests/<specific_test>.py -v`
- **4c** — superpowers:systematic-debugging (only if 3+ consecutive failures)
- **4d** — code-simplifier:code-simplifier (post-green cleanup)
- **4e** — superpowers:requesting-code-review
- **4f** — superpowers:receiving-code-review

After each task: update state, confirm with user to continue or pause.

---

## Phase 5: Validation

### Step 5.1 — superpowers:dispatching-parallel-agents

**Branch A — Build + Types:**
```bash
pnpm turbo build
pnpm turbo typecheck
```

**Branch B — E2E Testing:**
- playwright MCP → navigate to feature entry point
- Take accessibility snapshot, exercise critical user path

**Branch C — Boundary Audit:**
- Verify no app-specific logic leaked into packages/
- Verify apps/agentic-chain and apps/zkagenticnetwork don't import from each other

All 3 branches must pass.

### Step 5.2 — superpowers:verification-before-completion

```bash
pnpm turbo build
pnpm turbo typecheck
pnpm turbo test:run
pnpm turbo lint
```

All must exit 0. Show evidence explicitly.

### Step 5.3 — code-review:code-review

---

## Phase 6: Ship

### Step 6.1 — Commit + PR

```bash
git push origin [branch]
gh pr create ...
```

### Step 6.2 — superpowers:finishing-a-development-branch

Clean up worktree after merge/PR decision.

---

## Post-Ship

### Step 7.1 — Update CLAUDE.md files (root + affected apps)
### Step 7.2 — superpowers:writing-skills (if workflow gaps found)

```
🎉 EXODUS DISPATCH — WORKFLOW COMPLETE
```

---

## Phase Transition Gates

| Transition | Gate |
|-----------|------|
| Phase 1 → 2 | brainstorming approved |
| Phase 2 → 3 | worktree created + baseline tests PASS |
| Phase 3 → 4 | boundary map + approved plan |
| Task N → N+1 | tests GREEN + review resolved + user confirms |
| Phase 4 → 5 | all tasks complete |
| Phase 5 → 6 | all validation branches pass + verification clear |
