# Exodus Development Workflow

Quick-start checklist for starting any feature or fix.
**Full reference:** `docs/WORKFLOW-DISTILLATION.md`

## Starting a New Feature

Run `/exodus:feature "describe what to build"` — the dispatcher handles all phases.

Or follow manually:

1. [ ] `superpowers:using-superpowers` — check for applicable skills
2. [ ] `superpowers:brainstorming` — explore intent, define scope (HARD GATE: approval required)
3. [ ] `superpowers:using-git-worktrees` — create isolated branch
4. [ ] `turborepo:turborepo` — confirm pipeline wired for new packages
5. [ ] `feature-dev:code-explorer` — map existing code, package boundaries
6. [ ] `feature-dev:code-architect` — assign package ownership before any code
7. [ ] `superpowers:writing-plans` — produce approved task list (HARD GATE)
8. [ ] Per task: `superpowers:test-driven-development` → implement → `superpowers:requesting-code-review`
9. [ ] `superpowers:dispatching-parallel-agents` — 3-branch validation (build, E2E, boundary audit)
10. [ ] `superpowers:verification-before-completion` — run fresh, show evidence
11. [ ] `code-review:code-review` — automated multi-agent review
12. [ ] Commit, push, PR
13. [ ] `superpowers:finishing-a-development-branch` — merge or keep
14. [ ] Update `CLAUDE.md` with new patterns

## Emergency Exits

| Situation | Action |
|-----------|--------|
| 3+ consecutive fix failures | Stop. Return to code-architect. Redesign boundaries. |
| Review suggests bad direction | Use `superpowers:receiving-code-review` — never accept blindly |
| Test passes on first write | Test is wrong. Red must come before green. |
| Baseline tests fail in worktree | Fix on main before creating feature branch |
| Plan file missing at Phase 4 | Hard stop. Complete Phase 3 first. |

## Resume an In-Progress Feature

```bash
cat .claude/dispatch-state.json   # check current phase/step
```

Then run `/exodus:feature` with no arguments to resume.
