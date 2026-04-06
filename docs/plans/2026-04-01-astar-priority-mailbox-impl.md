# A* Priority Registry + Mailbox Relocation — Implementation Plan


**Goal:** Add adaptive priority scoring to all .claude/ files, create a prioritize skill that rescores each loop iteration, and relocate the mailbox (inbox/outbox) from .claude/ to the project root.

**Architecture:** Every .md file gets priority/last_read/read_count frontmatter. A new prioritize skill compiles a priorities.md registry each loop iteration. Mailbox files move from `.claude/prompt-inbox.md` and `.claude/prompt-outbox.md` to `inbox.md` and `outbox.md` at project root.

**Tech Stack:** Markdown files with YAML frontmatter. No Python or executable code — all logic is in skill/command definitions that Claude executes.

---

### Task 1: Add priority frontmatter to all existing .claude/ .md files

**Files to modify (14 files):**
- `.claude/SEED.md` — add `priority: 100`
- `.claude/MANIFEST.md` — add `priority: 60`
- `.claude/journal.md` — add `priority: 90`
- `.claude/layers/prompt.md` — add `priority: 95`
- `.claude/layers/context.md` — add `priority: 80`
- `.claude/layers/intent.md` — add `priority: 88`
- `.claude/layers/judgement.md` — add `priority: 85`
- `.claude/layers/coherence.md` — add `priority: 75`
- `.claude/layers/evaluation.md` — add `priority: 60`
- `.claude/layers/harness.md` — add `priority: 70`
- `.claude/skills/loop/SKILL.md` — add `priority: 70`
- `.claude/skills/self-scan/SKILL.md` — add `priority: 70`
- `.claude/skills/prompt-fetch/SKILL.md` — add `priority: 68`
- `.claude/skills/prompt-reply/SKILL.md` — add `priority: 68`

Domain skills (lower priority — read on demand):
- `.claude/skills/fastapi-testnet/SKILL.md` — add `priority: 60`
- `.claude/skills/debugger/SKILL.md` — add `priority: 55`
- `.claude/skills/supabase-expert/SKILL.md` — add `priority: 55`
- `.claude/skills/turborepo/SKILL.md` — add `priority: 50`
- `.claude/commands/comms.md` — add `priority: 80`
- `.claude/internals/comms-cursor.md` — add `priority: 75`

**Step 1:** For each file, add `priority: N`, `last_read: 2026-04-01T18:36:00Z`, `read_count: 0` to existing YAML frontmatter. If file has no frontmatter, wrap existing content.

**Pattern for files WITH existing frontmatter** (e.g., SEED.md currently has `id: exodus` etc.):
Add the three new fields after existing fields, before the closing `---`.

**Pattern for files WITHOUT frontmatter** (e.g., MANIFEST.md, journal.md):
Add a new `---` block at the top.

**Step 2: Verify**
```bash
for f in $(find .claude -name "*.md" -not -path ".claude/projects/*" -not -path ".claude/plans/*"); do
  echo -n "$f: "; head -10 "$f" | grep "priority:" || echo "MISSING"
done
```
Expected: every .md file shows its priority score.

**Step 3: Commit**
```bash
git add .claude/
git commit -m "feat: add priority frontmatter to all .claude/ governance files"
```

---

### Task 2: Create the prioritize skill

**File:** Create `.claude/skills/prioritize/SKILL.md`

**Content:**
```markdown
---
name: prioritize
description: Rescore all .claude/ files by effective priority each loop iteration. Reads frontmatter, applies freshness decay, writes compiled registry to priorities.md. Runs as step 0 of every /loop.
priority: 65
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Prioritize — A* Registry Scorer

## Purpose

Compile an ordered priority registry of all governance files. Runs as **step 0** of every `/loop` iteration, before comms check. Enables adaptive file reading — frequently-used files stay hot, stale files decay.

## When This Skill Activates

- Every `/loop` iteration (step 0, before comms)
- Manual invocation for ad-hoc rescore
- After adding new files to `.claude/`

## Scoring Algorithm

```
effective_priority = base_priority × freshness_multiplier

freshness_multiplier:
  last_read within 1 hour   → 1.0
  last_read within 24 hours → 0.9
  last_read within 48 hours → 0.8
  last_read older than 48h  → 0.7

Floor rule: files with base_priority >= 85 never decay below effective 70
(core identity and comms files stay hot regardless of freshness)
```

## Procedure

### 1. Glob all governance files

Scan these locations:
- `.claude/*.md` (SEED, MANIFEST, journal, priorities)
- `.claude/layers/*.md` (7 identity layers)
- `.claude/skills/*/SKILL.md` (all skills)
- `.claude/commands/*.md` (slash commands — skip subdirectories)
- `.claude/internals/*.md` (cursor state)
- `inbox.md` (project root — inbound mailbox, base priority 85)
- `outbox.md` (project root — outbound mailbox, base priority 80)

Exclude: `.claude/projects/`, `.claude/plans/`, `.claude/plugins/`

### 2. Read frontmatter from each file

Extract: `priority` (base score), `last_read` (ISO timestamp), `read_count` (integer)

If a file has no frontmatter or no priority field → assign default priority 40 and flag as `new`.

### 3. Compute effective priority

Apply the freshness formula above. Round to nearest integer.

### 4. Sort and write registry

Sort all files by effective priority descending. Write to `.claude/priorities.md`:

```markdown
---
priority: 40
last_read: <now>
read_count: 0
auto_generated: true
---

# Priority Registry
> Auto-generated by prioritize skill. Do not edit manually.
> Last updated: <ISO timestamp>
> Files scored: <count>

| Eff | Base | File | Last Read | Reads | Status |
|-----|------|------|-----------|-------|--------|
| 100 | 100 | SEED.md | <timestamp> | N | active |
| 95 | 95 | layers/prompt.md | <timestamp> | N | active |
| ... |
```

Status: `active` (read within 48h), `stale` (>48h), `new` (never read or no frontmatter)

### 5. Output summary

```
[prioritize] Scored N files. Top 3: SEED.md(100), layers/prompt.md(95), journal.md(90).
Stale: N files. New: N files.
```

## How Other Skills Use This

- **loop** reads `priorities.md` in step 2 (local state check) to know scan order
- **self-scan** reads `priorities.md` instead of its hardcoded table (falls back to frontmatter if registry missing)
- When any skill reads a file, it SHOULD update that file's `last_read` and increment `read_count`
  - This is advisory, not mandatory — the system works without it, just with stale freshness data
```

**Step 1:** Write the file above to `.claude/skills/prioritize/SKILL.md`

**Step 2: Verify** the skill appears in Claude Code's skill list (it auto-discovers from filesystem)

**Step 3: Commit**
```bash
git add .claude/skills/prioritize/
git commit -m "feat: add prioritize skill — A* registry scorer for loop iterations"
```

---

### Task 3: Create initial priorities.md

**File:** Create `.claude/priorities.md`

**Step 1:** Run the prioritize skill mentally — compute effective priorities for all files and write the initial registry.

All files were just read (last_read = now), so freshness_multiplier = 1.0 for all. The initial registry is just the base priorities sorted descending.

**Step 2: Commit**
```bash
git add .claude/priorities.md
git commit -m "feat: initial priorities.md registry (all files scored)"
```

---

### Task 4: Move and rename mailbox files

**Step 1:** Move files
```bash
mv .claude/prompt-inbox.md inbox.md
mv .claude/prompt-outbox.md outbox.md
```

**Step 2:** Add priority frontmatter to both files at their new location.

`inbox.md` — add frontmatter block:
```yaml
---
priority: 85
last_read: 2026-04-01T18:36:00Z
read_count: 0
---
```
Keep the existing header content below.

`outbox.md` — same pattern with `priority: 80`.

**Step 3: Verify** files exist at project root
```bash
ls -la inbox.md outbox.md
cat inbox.md
cat outbox.md
```

**Step 4: Commit**
```bash
git add inbox.md outbox.md
git commit -m "feat: relocate mailbox to project root (inbox.md, outbox.md)"
```

---

### Task 5: Update all skills with new mailbox paths

**11 files, 33 references. Do them in groups.**

#### Group A: Skills (4 files)

**`.claude/skills/loop/SKILL.md`** — 3 edits:
- Line 23: `.claude/prompt-inbox.md` → `inbox.md` (at project root)
- Line 31: `.claude/prompt-outbox.md` → `outbox.md` (at project root)
- Lines 19-50: Add new step 0 (prioritize) before existing step 1, renumber steps 1→2, 2→3, 3→4, 4→5, 5→6. Add prioritize to the loop entry announcement.

**`.claude/skills/prompt-fetch/SKILL.md`** — 6 edits:
- Line 3 (description): `prompt-inbox.md` → `inbox.md`
- Line 10: `.claude/prompt-inbox.md` → `inbox.md`
- Line 21: `.claude/prompt-inbox.md` → `inbox.md` (at project root)
- Line 35: `prompt-inbox.md` → `inbox.md`
- Line 77: `prompt-inbox.md` → `inbox.md`
- Line 79: inbox → inbox.md (already correct wording)

**`.claude/skills/prompt-reply/SKILL.md`** — 7 edits:
- Line 3 (description): `prompt-outbox.md` → `outbox.md`
- Line 10: `.claude/prompt-outbox.md` → `outbox.md`
- Line 41: `.claude/prompt-outbox.md` → `outbox.md`
- Line 71: `.claude/prompt-outbox.md` → `outbox.md`
- Line 88: header text `prompt-outbox.md` → `outbox.md`
- Lines 90-96: update header template to say `outbox.md`
- Line 102: `prompt-inbox.md` → `inbox.md`

**`.claude/skills/self-scan/SKILL.md`** — 5 edits:
- Line 21: `.claude/prompt-inbox.md` → `inbox.md` (project root)
- Line 22: `.claude/prompt-outbox.md` → `outbox.md` (project root)
- Line 33: `.claude/prompt-inbox.md` → `inbox.md`
- Line 34: `.claude/prompt-outbox.md` → `outbox.md`
- Replace hardcoded priority table (lines 16-25) with: "Read `.claude/priorities.md` for current effective priorities. Fall back to base priorities in file frontmatter if registry is missing."

#### Group B: Command (1 file)

**`.claude/commands/comms.md`** — 4 edits:
- Line 8: `prompt-inbox.md` → `inbox.md`
- Line 14: `.claude/prompt-inbox.md` → `inbox.md`
- Line 24: `.claude/prompt-outbox.md` → `outbox.md`
- Line 28: `.claude/prompt-outbox.md` → `outbox.md`

#### Group C: Layers (3 files)

**`.claude/layers/harness.md`** line 11:
- `prompt-inbox.md` → `inbox.md` (project root)
- `prompt-outbox.md` → `outbox.md` (project root)
- Add `prioritize` to the Skills (protocol) list

**`.claude/layers/prompt.md`** line 18:
- `prompt-inbox` → `inbox.md`
- `prompt-outbox` → `outbox.md`

**`.claude/layers/context.md`** lines 31-32:
- `prompt-inbox.md` → `inbox.md` (project root)
- `prompt-outbox.md` → `outbox.md` (project root)

#### Group D: Config (2 files)

**`.claude/settings.json`** — 3 permission changes:
- Line 10: `Read(.claude/prompt-inbox.md)` → `Read(inbox.md)`
- Line 11: `Read(.claude/prompt-outbox.md)` → `Read(outbox.md)`
- Line 18: `Write(.claude/prompt-outbox.md)` → `Write(outbox.md)`
- Add: `Skill(prioritize)` to the allow list
- Add: `Read(.claude/priorities.md)` to the allow list

**`.claude/MANIFEST.md`** — update throughout:
- Lines 13-14: remove `prompt-inbox.md` and `prompt-outbox.md` from Required Files table
- Add new row to Required Files: `inbox.md` and `outbox.md` (at project root, not in .claude/)
- Add `priorities.md` to Required Files
- Lines 50-51: update Communication Protocol table paths
- Lines 58: update verification script to check project root
- Add `prioritize` to minimum skills list (line 22)

**Step: Commit**
```bash
git add .claude/ inbox.md outbox.md
git commit -m "feat: update all references — mailbox at project root, priority registry integration"
```

---

### Task 6: Update SEED.md and MANIFEST.md for child bootstrapping

**`.claude/SEED.md`** — update Children table to show inbox/outbox convention:
```markdown
| Child | Path | Bootstrapped | Inbox | Outbox |
|-------|------|-------------|-------|--------|
| (none yet) | — | — | `<path>/inbox.md` | `<path>/outbox.md` |
```

**`.claude/MANIFEST.md`** — ensure the Communication Protocol section shows:
```markdown
| File | Location | Owner | Direction |
|------|----------|-------|-----------|
| `inbox.md` | Project root | Origin writes, project reads | Inbound |
| `outbox.md` | Project root | Project writes, origin reads | Outbound |
| `internals/comms-cursor.md` | .claude/ | Project writes | Internal sync state |
| `priorities.md` | .claude/ | Prioritize skill writes | Internal registry |
```

**Step: Commit**
```bash
git add .claude/SEED.md .claude/MANIFEST.md
git commit -m "docs: update SEED and MANIFEST for new mailbox convention and priorities"
```

---

### Task 7: Verify everything

**Step 1:** Check file structure
```bash
echo "=== Mailbox at project root ==="
ls -la inbox.md outbox.md

echo "=== Priorities registry ==="
cat .claude/priorities.md | head -20

echo "=== No stale prompt-inbox/outbox in .claude/ ==="
ls .claude/prompt-inbox.md .claude/prompt-outbox.md 2>&1

echo "=== Priority frontmatter on all files ==="
for f in $(find .claude -name "*.md" -not -path ".claude/projects/*" -not -path ".claude/plans/*" -not -path ".claude/plugins/*"); do
  echo -n "$f: "; head -10 "$f" | grep "priority:" || echo "MISSING"
done

echo "=== No stale references ==="
grep -r "prompt-inbox" .claude/ --include="*.md" | grep -v "projects/" || echo "CLEAN"
grep -r "prompt-outbox" .claude/ --include="*.md" | grep -v "projects/" || echo "CLEAN"
```

Expected:
- `inbox.md` and `outbox.md` exist at project root
- `.claude/prompt-inbox.md` and `.claude/prompt-outbox.md` do NOT exist
- All .md files show a priority score
- Zero grep hits for old `prompt-inbox`/`prompt-outbox` paths
- `priorities.md` shows a compiled table

**Step 2:** Check that comms still works conceptually
- Read `inbox.md` at project root — should have the standard header
- Read `outbox.md` at project root — should have the standard header
- Read `.claude/internals/comms-cursor.md` — should be intact

**Step 3: Commit any fixups**
```bash
git add -A
git commit -m "chore: verify A* priority + mailbox relocation complete"
```

---

### Task 8: Update journal and memory

**`.claude/journal.md`** — append entry:
```markdown
- Added A* priority frontmatter to all .claude/ governance files (20 files scored)
- Created prioritize skill — runs as step 0 of every /loop, writes priorities.md registry
- Relocated mailbox: prompt-inbox.md → inbox.md (project root), prompt-outbox.md → outbox.md (project root)
- Updated 11 files (33 references) to new mailbox paths
- Updated MANIFEST and SEED for new conventions
```

**Project MEMORY.md** — update the governance architecture entry to reflect:
- Priority frontmatter on all files
- Prioritize skill in loop step 0
- Mailbox at project root (inbox.md, outbox.md)

**Step: Commit**
```bash
git add .claude/journal.md
git commit -m "docs: journal entry for A* priority + mailbox relocation"
```
