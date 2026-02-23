#!/usr/bin/env bash
# PreCompact hook — captures full conversation and user prompts before compaction.
# Appends to compacted.md (full) and prompts.md (user only) at project root.
# Always emits a JSON hook response, even on error.

set -uo pipefail
# Note: -e removed intentionally. We use a trap to ensure JSON response is always emitted.

HOOK_RESPONSE_MSG="[precompact hook] Session transcript appended to compacted.md and prompts.md."
HOOK_ERROR=""

emit_response() {
    local msg="${HOOK_RESPONSE_MSG}"
    if [ -n "$HOOK_ERROR" ]; then
        msg="[precompact hook ERROR] ${HOOK_ERROR}"
    fi
    python3 -c "
import json, sys
print(json.dumps({
    'continue': True,
    'suppressOutput': False,
    'systemMessage': sys.argv[1]
}))
" "$msg"
}

trap 'emit_response' EXIT

# ── Parse hook input ───────────────────────────────────────────────────────

HOOK_INPUT=$(cat)

TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('transcript_path',''))" 2>/dev/null || true)
SESSION_ID=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('session_id','unknown'))" 2>/dev/null || echo "unknown")
CWD=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || true)

# Validate CWD — cannot proceed without a real project root
if [ -z "$CWD" ] || [ ! -d "$CWD" ]; then
    HOOK_ERROR="cwd is missing or not a directory ('${CWD}'). Cannot write compacted.md / prompts.md."
    exit 0
fi

COMPACTED_FILE="${CWD}/compacted.md"
PROMPTS_FILE="${CWD}/prompts.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TIMESTAMP_HUMAN=$(date -u +"%Y-%m-%d %H:%M UTC")

# Count turns in transcript
TURN_COUNT="?"
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    TURN_COUNT=$(wc -l < "$TRANSCRIPT_PATH" | tr -d ' ')
fi

# ── Single Python pass: write both compacted.md and prompts.md ─────────────

python3 - "$TRANSCRIPT_PATH" "$COMPACTED_FILE" "$PROMPTS_FILE" \
         "$TIMESTAMP" "$TIMESTAMP_HUMAN" "$SESSION_ID" "$TURN_COUNT" <<'PYEOF_CAPTURE'
import json, sys

transcript_path, compacted_path, prompts_path, ts, ts_human, session_id, turn_count = sys.argv[1:]

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

messages = []
if transcript_path:
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
                    messages.append((role, content))
                except (json.JSONDecodeError, KeyError):
                    messages.append(("raw", line))
    except (FileNotFoundError, OSError):
        messages.append(("info", f"[transcript not available: {transcript_path}]"))
else:
    messages.append(("info", "[no transcript_path provided]"))

# Write compacted.md — all messages
with open(compacted_path, "a") as cf:
    cf.write(f"<!-- compaction-block: {ts} | session: {session_id} | turns: {turn_count} -->\n")
    cf.write(f"## Session {ts_human}\n\n")
    for role, content in messages:
        cf.write(f"### [{role}]\n")
        cf.write(content + "\n\n")
    cf.write("<!-- /compaction-block -->\n\n")

# Write prompts.md — user messages only, numbered
user_messages = [(i+1, content) for i, (role, content) in enumerate(
    (r, c) for r, c in messages if r == "user"
)]

with open(prompts_path, "a") as pf:
    pf.write(f"<!-- prompts-block: {ts} | session: {session_id} -->\n")
    pf.write(f"## Prompts — {ts_human}\n\n")
    for n, content in user_messages:
        lines = content.strip().splitlines()
        if len(lines) <= 1:
            pf.write(f"{n}. {content.strip()}\n")
        else:
            pf.write(f"{n}. {lines[0]}\n")
            for l in lines[1:]:
                pf.write(f"   {l}\n")
    if not user_messages:
        pf.write("(no user messages found)\n")
    pf.write("\n<!-- /prompts-block -->\n\n")
PYEOF_CAPTURE

exit 0
