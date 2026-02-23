#!/usr/bin/env bash
# SessionStart hook (compact matcher) — injects compacted-summary.md into Claude's context.
# Falls back gracefully if no summary exists.
# Always emits valid JSON output.

set -uo pipefail

HOOK_INPUT=$(cat) || HOOK_INPUT=""

CWD=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || true)

build_context() {
    # $1 = path to compacted-summary.md (may be empty string if no file)
    python3 - "$1" <<'PYEOF_SESSION'
import json, sys, pathlib

summary_path = sys.argv[1] if len(sys.argv) > 1 else ""
p = pathlib.Path(summary_path)

if summary_path and p.is_file():
    summary = p.read_text(encoding="utf-8")
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
else:
    body = (
        "<compaction-memory>\n"
        "No compacted-summary.md found. "
        "Full conversation history may be available in `compacted.md` "
        "and user prompts in `prompts.md` at the project root.\n"
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
    build_context ""
    exit 0
fi

SUMMARY_FILE="${CWD}/compacted-summary.md"
build_context "$SUMMARY_FILE"

exit 0
