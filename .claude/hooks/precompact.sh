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
