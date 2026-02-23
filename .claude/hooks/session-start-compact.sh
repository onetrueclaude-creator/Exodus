#!/usr/bin/env bash
# SessionStart hook (compact matcher) — injects compacted-summary.md into Claude's context.
# For auto-compaction (no summary written): falls back to the most recent compaction-block
# from compacted.md and instructs Claude to generate the summary as its first action.
# Always emits valid JSON output.

set -uo pipefail

HOOK_INPUT=$(cat) || HOOK_INPUT=""

CWD=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || true)

build_context() {
    # $1 = path to compacted-summary.md (may be empty or non-existent)
    # $2 = path to compacted.md (for auto-compaction fallback)
    python3 - "$1" "$2" <<'PYEOF_SESSION'
import json, sys, pathlib, re

summary_path = sys.argv[1] if len(sys.argv) > 1 else ""
compacted_path = sys.argv[2] if len(sys.argv) > 2 else ""

summary_file = pathlib.Path(summary_path)
compacted_file = pathlib.Path(compacted_path)

if summary_path and summary_file.is_file():
    # Manual compaction: summary was written before /compact
    summary = summary_file.read_text(encoding="utf-8")
    body = (
        "<compaction-memory>\n"
        "Context has been restored from a previous session.\n\n"
        "## Session Summary\n\n"
        + summary
        + "\n\n---\n\n"
        "Full conversation history: `compacted.md`\n"
        "All user prompts: `prompts.md`\n\n"
        "Confirm to the user you have read the session summary and that both files are available.\n"
        "</compaction-memory>"
    )
elif compacted_path and compacted_file.is_file():
    # Auto-compaction: no summary written — inject the most recent compaction-block
    raw = compacted_file.read_text(encoding="utf-8")
    # Extract the last compaction-block (between last opening and closing markers)
    blocks = list(re.finditer(
        r'<!--\s*compaction-block:.*?-->.*?<!--\s*/compaction-block\s*-->',
        raw, re.DOTALL
    ))
    if blocks:
        last_block = blocks[-1].group(0)
        body = (
            "<compaction-memory>\n"
            "AUTO-COMPACTION DETECTED: No session summary was written before compaction.\n\n"
            "The most recent session transcript is provided below. "
            "As your FIRST ACTION, write a summary block to `compacted-summary.md` "
            "(append, do not overwrite), then confirm to the user what was compacted.\n\n"
            "## Most Recent Session Transcript\n\n"
            + last_block
            + "\n\n---\n\n"
            "Full conversation history: `compacted.md`\n"
            "All user prompts: `prompts.md`\n"
            "</compaction-memory>"
        )
    else:
        body = (
            "<compaction-memory>\n"
            "AUTO-COMPACTION DETECTED: No session summary found. "
            "`compacted.md` exists but contains no parseable blocks. "
            "Full conversation history: `compacted.md`, all prompts: `prompts.md`.\n"
            "</compaction-memory>"
        )
else:
    body = (
        "<compaction-memory>\n"
        "No compacted-summary.md or compacted.md found at the project root. "
        "This may be the first session or compaction memory files were removed.\n"
        "</compaction-memory>"
    )

output = {
    "additional_context": body,
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": body
    }
}
print(json.dumps(output))
PYEOF_SESSION
}

# Validate CWD
if [ -z "$CWD" ] || [ ! -d "$CWD" ]; then
    build_context "" ""
    exit 0
fi

SUMMARY_FILE="${CWD}/compacted-summary.md"
COMPACTED_FILE="${CWD}/compacted.md"
build_context "$SUMMARY_FILE" "$COMPACTED_FILE"

exit 0
