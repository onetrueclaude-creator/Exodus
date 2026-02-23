# Compaction-Proof Memory — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically capture conversation history before every compaction into `compacted.md` and `prompts.md`, then restore context after compaction via `session-start-compact.sh`.

**Architecture:** Two bash hook scripts respond to `PreCompact` and `SessionStart(compact)` events. The PreCompact script reads the transcript JSONL provided by Claude Code, parses it with python3, and appends two files. The SessionStart script injects the summary file into Claude's context as `additionalContext` JSON.

**Tech Stack:** Bash, Python 3 (stdlib only — json module), Claude Code hooks API, settings.json hooks format.

---

## Task 1: Create hooks directory + scaffold `precompact.sh`

**Files:**
- Create: `.claude/hooks/precompact.sh`

**Step 1: Create the directory**

```bash
mkdir -p /Users/toyg/Exodus/.claude/hooks
```

Expected: no output, directory created.

**Step 2: Write `precompact.sh`**

Create `.claude/hooks/precompact.sh` with this content:

```bash
#!/usr/bin/env bash
# PreCompact hook — captures full conversation and user prompts before compaction.
# Appends to compacted.md (full) and prompts.md (user only) at project root.

set -euo pipefail

# Read full hook input from stdin
HOOK_INPUT=$(cat)

# Extract fields from hook JSON
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('transcript_path',''))" 2>/dev/null || true)
SESSION_ID=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('session_id','unknown'))" 2>/dev/null || echo "unknown")
CWD=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd','.'))" 2>/dev/null || pwd)

COMPACTED_FILE="${CWD}/compacted.md"
PROMPTS_FILE="${CWD}/prompts.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TIMESTAMP_HUMAN=$(date -u +"%Y-%m-%d %H:%M UTC")

# Count turns in transcript (lines = messages)
TURN_COUNT="?"
if [ -f "$TRANSCRIPT_PATH" ]; then
    TURN_COUNT=$(wc -l < "$TRANSCRIPT_PATH" | tr -d ' ')
fi

# ── Write to compacted.md ──────────────────────────────────────────────────

{
    printf '<!-- compaction-block: %s | session: %s | turns: %s -->\n' \
        "$TIMESTAMP" "$SESSION_ID" "$TURN_COUNT"
    printf '## Session %s\n\n' "$TIMESTAMP_HUMAN"
} >> "$COMPACTED_FILE"

python3 - "$TRANSCRIPT_PATH" >> "$COMPACTED_FILE" <<'PYEOF'
import json, sys

transcript_path = sys.argv[1] if len(sys.argv) > 1 else ""

def extract_text(content):
    """Handle both plain string and Claude API list-of-blocks content."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                text = block.get("text", block.get("content", ""))
                if text:
                    parts.append(str(text))
            else:
                parts.append(str(block))
        return "\n".join(parts)
    return str(content)

try:
    with open(transcript_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                role = msg.get("role", msg.get("type", "unknown"))
                content = extract_text(msg.get("content", msg.get("text", "")))
                print(f"### [{role}]")
                print(content)
                print()
            except (json.JSONDecodeError, KeyError):
                # Non-JSON line — write as-is
                print(line)
                print()
except (FileNotFoundError, TypeError):
    print(f"[transcript not available: {transcript_path}]")
    print()
PYEOF

echo "<!-- /compaction-block -->" >> "$COMPACTED_FILE"
printf '\n' >> "$COMPACTED_FILE"

# ── Write to prompts.md ────────────────────────────────────────────────────

{
    printf '<!-- prompts-block: %s | session: %s -->\n' "$TIMESTAMP" "$SESSION_ID"
    printf '## Prompts — %s\n\n' "$TIMESTAMP_HUMAN"
} >> "$PROMPTS_FILE"

python3 - "$TRANSCRIPT_PATH" >> "$PROMPTS_FILE" <<'PYEOF'
import json, sys

transcript_path = sys.argv[1] if len(sys.argv) > 1 else ""

def extract_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                text = block.get("text", block.get("content", ""))
                if text:
                    parts.append(str(text))
            else:
                parts.append(str(block))
        return "\n".join(parts)
    return str(content)

counter = 1
try:
    with open(transcript_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                role = msg.get("role", msg.get("type", ""))
                if role == "user":
                    content = extract_text(msg.get("content", msg.get("text", "")))
                    # Single-line prompt: keep on one line; multi-line: indent continuation
                    lines = content.strip().splitlines()
                    if len(lines) <= 1:
                        print(f"{counter}. {content.strip()}")
                    else:
                        print(f"{counter}. {lines[0]}")
                        for l in lines[1:]:
                            print(f"   {l}")
                    counter += 1
            except (json.JSONDecodeError, KeyError):
                pass
except (FileNotFoundError, TypeError):
    print(f"[transcript not available: {transcript_path}]")
PYEOF

echo "" >> "$PROMPTS_FILE"
echo "<!-- /prompts-block -->" >> "$PROMPTS_FILE"
printf '\n' >> "$PROMPTS_FILE"

# ── Hook response ──────────────────────────────────────────────────────────

python3 - "$TIMESTAMP" <<'PYEOF'
import json, sys
ts = sys.argv[1]
print(json.dumps({
    "continue": True,
    "suppressOutput": False,
    "systemMessage": f"[precompact hook] Session transcript appended to compacted.md and prompts.md at {ts}."
}))
PYEOF

exit 0
```

**Step 3: Make executable**

```bash
chmod +x /Users/toyg/Exodus/.claude/hooks/precompact.sh
```

Expected: no output.

**Step 4: Commit**

```bash
git add .claude/hooks/precompact.sh
git commit -m "feat(hooks): add PreCompact hook — captures transcript to compacted.md + prompts.md"
```

---

## Task 2: Test `precompact.sh` with a mock transcript

**Files:**
- Create (temp, delete after): `/tmp/mock-transcript.jsonl`

**Step 1: Create a mock JSONL transcript**

```bash
cat > /tmp/mock-transcript.jsonl << 'EOF'
{"role": "user", "content": "I want to add a compaction forgetting proof mechanism"}
{"role": "assistant", "content": "Great idea. Let me explore the hooks infrastructure first."}
{"role": "user", "content": "a compacted.md file which is written into right before a compaction"}
{"role": "assistant", "content": "Understood. I'll use the PreCompact hook event for this."}
{"role": "user", "content": "let's make a prompts.md file"}
EOF
```

**Step 2: Run the script with mock hook input**

```bash
echo '{
  "session_id": "test-session-001",
  "transcript_path": "/tmp/mock-transcript.jsonl",
  "cwd": "/tmp"
}' | bash /Users/toyg/Exodus/.claude/hooks/precompact.sh
```

Expected output (JSON):
```json
{"continue": true, "suppressOutput": false, "systemMessage": "[precompact hook] Session transcript appended to compacted.md and prompts.md at ..."}
```

**Step 3: Verify `compacted.md` was created**

```bash
cat /tmp/compacted.md
```

Expected: contains a `<!-- compaction-block: ... -->` header, `## Session ...` heading, `### [user]` and `### [assistant]` sections, then `<!-- /compaction-block -->`.

**Step 4: Verify `prompts.md` was created**

```bash
cat /tmp/prompts.md
```

Expected: contains a `<!-- prompts-block: ... -->` header, numbered list with exactly 3 user prompts.

**Step 5: Run again to verify accumulation**

```bash
echo '{
  "session_id": "test-session-002",
  "transcript_path": "/tmp/mock-transcript.jsonl",
  "cwd": "/tmp"
}' | bash /Users/toyg/Exodus/.claude/hooks/precompact.sh
cat /tmp/prompts.md | grep "prompts-block" | wc -l
```

Expected: output is `2` — two separate blocks accumulated.

**Step 6: Clean up temp files**

```bash
rm /tmp/mock-transcript.jsonl /tmp/compacted.md /tmp/prompts.md
```

---

## Task 3: Create `session-start-compact.sh`

**Files:**
- Create: `.claude/hooks/session-start-compact.sh`

**Step 1: Write the script**

Create `.claude/hooks/session-start-compact.sh`:

```bash
#!/usr/bin/env bash
# SessionStart hook (compact matcher) — injects compacted-summary.md into context.
# Falls back to noting compacted.md is available if no summary exists.

set -euo pipefail

# Read hook input from stdin
HOOK_INPUT=$(cat)

CWD=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd','.'))" 2>/dev/null || pwd)

SUMMARY_FILE="${CWD}/compacted-summary.md"
COMPACTED_FILE="${CWD}/compacted.md"
PROMPTS_FILE="${CWD}/prompts.md"

escape_for_json() {
    python3 -c "
import json, sys
text = sys.stdin.read()
# json.dumps adds surrounding quotes — strip them
print(json.dumps(text)[1:-1])
"
}

if [ -f "$SUMMARY_FILE" ]; then
    SUMMARY_CONTENT=$(cat "$SUMMARY_FILE")
    ESCAPED=$(echo "$SUMMARY_CONTENT" | escape_for_json)

    CONTEXT="<compaction-memory>\\nContext has been restored from a previous session.\\n\\n## Session Summary\\n\\n${ESCAPED}\\n\\n---\\n\\nFull conversation history: \`compacted.md\`\\nAll user prompts: \`prompts.md\`\\n\\nConfirm to the user you have read the session summary and that both files are available.\\n</compaction-memory>"
else
    FALLBACK="No compacted-summary.md found. Full conversation history may be available in \`compacted.md\` and user prompts in \`prompts.md\` at the project root."
    ESCAPED=$(echo "$FALLBACK" | escape_for_json)
    CONTEXT="<compaction-memory>\\n${ESCAPED}\\n</compaction-memory>"
fi

python3 - "$CONTEXT" <<'PYEOF'
import json, sys
context = sys.argv[1]
output = {
    "additional_context": context,
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": context
    }
}
print(json.dumps(output))
PYEOF

exit 0
```

**Step 2: Make executable**

```bash
chmod +x /Users/toyg/Exodus/.claude/hooks/session-start-compact.sh
```

**Step 3: Commit**

```bash
git add .claude/hooks/session-start-compact.sh
git commit -m "feat(hooks): add SessionStart(compact) hook — injects compacted-summary.md as context"
```

---

## Task 4: Test `session-start-compact.sh`

**Step 1: Test with no summary file**

```bash
echo '{"cwd": "/tmp"}' | bash /Users/toyg/Exodus/.claude/hooks/session-start-compact.sh
```

Expected: valid JSON containing `"additional_context"` with fallback message mentioning `compacted.md`.

**Step 2: Test with a summary file**

```bash
cat > /tmp/compacted-summary.md << 'EOF'
<!-- summary-block: 2026-02-23T10:00:00Z -->
## Summary — 2026-02-23 10:00 UTC

We designed the compaction-proof memory mechanism with three files:
- compacted.md for full transcripts
- compacted-summary.md for LLM summaries
- prompts.md for user prompts only

<!-- /summary-block -->
EOF

echo '{"cwd": "/tmp"}' | bash /Users/toyg/Exodus/.claude/hooks/session-start-compact.sh
```

Expected: valid JSON with `"additionalContext"` containing the summary content and a note about `compacted.md` and `prompts.md`.

**Step 3: Verify JSON is valid**

```bash
echo '{"cwd": "/tmp"}' | bash /Users/toyg/Exodus/.claude/hooks/session-start-compact.sh | python3 -m json.tool > /dev/null && echo "VALID JSON" || echo "INVALID JSON"
```

Expected: `VALID JSON`

**Step 4: Clean up**

```bash
rm /tmp/compacted-summary.md
```

---

## Task 5: Update `.claude/settings.json` — add hooks

**Files:**
- Modify: `.claude/settings.json`

**Step 1: Read the current file**

Read `.claude/settings.json` to confirm current structure (no `"hooks"` key yet).

**Step 2: Add the hooks section**

Add a `"hooks"` top-level key to `.claude/settings.json`. The final file should look like:

```json
{
  "permissions": {
    "allow": [ ... ],
    "additionalDirectories": [ ... ]
  },
  "enabledPlugins": { ... },
  "hooks": {
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash /Users/toyg/Exodus/.claude/hooks/precompact.sh",
            "timeout": 30
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "bash /Users/toyg/Exodus/.claude/hooks/session-start-compact.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**Step 3: Verify the JSON is valid**

```bash
python3 -m json.tool /Users/toyg/Exodus/.claude/settings.json > /dev/null && echo "VALID" || echo "INVALID"
```

Expected: `VALID`

**Step 4: Commit**

```bash
git add .claude/settings.json
git commit -m "feat(hooks): register PreCompact and SessionStart(compact) hooks in settings.json"
```

---

## Task 6: Update `.gitignore`

**Files:**
- Modify: `.gitignore`

**Step 1: Append the three memory files**

Add to the end of `/Users/toyg/Exodus/.gitignore`:

```
# Compaction memory (local only — never commit)
compacted.md
compacted-summary.md
prompts.md
```

**Step 2: Verify they are now ignored**

```bash
echo "test" > /Users/toyg/Exodus/compacted.md
git -C /Users/toyg/Exodus status --short | grep compacted.md || echo "CORRECTLY IGNORED"
rm /Users/toyg/Exodus/compacted.md
```

Expected: `CORRECTLY IGNORED`

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore compacted.md, compacted-summary.md, prompts.md"
```

---

## Task 7: Update `CLAUDE.md` — Compaction Memory section

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Read current CLAUDE.md**

Read `/Users/toyg/Exodus/CLAUDE.md` to find the best insertion point (after Workflow section, before Skills).

**Step 2: Add Compaction Memory section**

Insert the following section into `CLAUDE.md` after the `## Workflow` section:

```markdown
## Compaction Memory

Three files at the project root capture conversation history across compactions (all gitignored):

| File | Contents |
|------|----------|
| `compacted.md` | Full conversation transcript (auto-written by PreCompact hook) |
| `compacted-summary.md` | LLM summary you write before compacting |
| `prompts.md` | User prompts only (auto-written by PreCompact hook) |

### Before running `/compact`

**You MUST write a session summary first:**

1. Append a summary block to `compacted-summary.md`:
   ```
   <!-- summary-block: [ISO timestamp] -->
   ## Summary — [human timestamp]

   [What was accomplished, key decisions made, open work remaining, current branch/feature context]

   <!-- /summary-block -->
   ```
2. Then proceed with `/compact`

### After compaction resumes

The SessionStart hook automatically injects `compacted-summary.md` into your context. You MUST:

1. Confirm to the user: "I've read the session summary from `compacted-summary.md`."
2. Briefly state what the summary says (1-2 sentences)
3. Note: "Full transcript in `compacted.md`, all prompts in `prompts.md`"

If `compacted-summary.md` was NOT written before compaction (e.g. context limit was hit suddenly), read `compacted.md` manually and reconstruct context from the most recent `<!-- compaction-block -->`.
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): add Compaction Memory section — pre/post compact instructions"
```

---

## Task 8: End-to-End Dry Run

**Step 1: Simulate a full PreCompact → SessionStart cycle**

```bash
# Create mock transcript
cat > /tmp/e2e-transcript.jsonl << 'EOF'
{"role": "user", "content": "I want to add a compaction forgetting proof mechanism under this repo"}
{"role": "assistant", "content": "Let me explore the existing hooks infrastructure."}
{"role": "user", "content": "a compacted.md file which is written into right before a compaction"}
{"role": "user", "content": "let's make a prompts.md file"}
EOF

# Create mock summary (as Claude would write it)
cat > /tmp/compacted-summary.md << 'EOF'
<!-- summary-block: 2026-02-23T12:00:00Z -->
## Summary — 2026-02-23 12:00 UTC

Designed and implemented a compaction-proof memory system with three gitignored files at the project root. Two bash hook scripts handle PreCompact capture and SessionStart injection. CLAUDE.md instructs pre-compact summary writing.

<!-- /summary-block -->
EOF

# Run PreCompact hook
echo '{
  "session_id": "e2e-test-001",
  "transcript_path": "/tmp/e2e-transcript.jsonl",
  "cwd": "/tmp"
}' | bash /Users/toyg/Exodus/.claude/hooks/precompact.sh

# Run SessionStart hook
echo '{"cwd": "/tmp"}' | bash /Users/toyg/Exodus/.claude/hooks/session-start-compact.sh
```

**Step 2: Verify all three outputs**

```bash
echo "=== compacted.md ===" && cat /tmp/compacted.md
echo "=== prompts.md ===" && cat /tmp/prompts.md
echo "=== SessionStart output ===" && echo '{"cwd": "/tmp"}' | bash /Users/toyg/Exodus/.claude/hooks/session-start-compact.sh | python3 -m json.tool
```

Expected:
- `compacted.md`: full conversation with `[user]` and `[assistant]` blocks
- `prompts.md`: numbered list of 3 user prompts only
- SessionStart output: valid JSON with summary injected in `additionalContext`

**Step 3: Clean up**

```bash
rm /tmp/e2e-transcript.jsonl /tmp/compacted.md /tmp/prompts.md /tmp/compacted-summary.md
```

**Step 4: Final commit check**

```bash
git -C /Users/toyg/Exodus log --oneline -6
```

Expected: 4-5 new commits visible (hooks, settings, gitignore, CLAUDE.md).

---

## Verification Checklist

- [ ] `.claude/hooks/precompact.sh` exists and is executable
- [ ] `.claude/hooks/session-start-compact.sh` exists and is executable
- [ ] `settings.json` has `"hooks"` key with both `PreCompact` and `SessionStart(compact)` entries
- [ ] `settings.json` is valid JSON
- [ ] `.gitignore` ignores all three memory files
- [ ] `CLAUDE.md` has Compaction Memory section with pre/post instructions
- [ ] Both scripts produce valid JSON output
- [ ] Accumulation works (second run appends, not overwrites)
- [ ] `prompts.md` contains user messages only (no assistant content)
