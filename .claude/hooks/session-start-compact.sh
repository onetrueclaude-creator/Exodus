#!/usr/bin/env bash
# SessionStart hook (compact matcher) — injects compacted-summary.md into Claude's context.
# Falls back gracefully if no summary exists.
# Always emits valid JSON output.

set -uo pipefail

HOOK_INPUT=$(cat)

CWD=$(echo "$HOOK_INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || true)

# Validate CWD
if [ -z "$CWD" ] || [ ! -d "$CWD" ]; then
    python3 -c "
import json
print(json.dumps({
    'additional_context': '<compaction-memory>No project directory found. compacted-summary.md not loaded.</compaction-memory>',
    'hookSpecificOutput': {
        'hookEventName': 'SessionStart',
        'additionalContext': '<compaction-memory>No project directory found. compacted-summary.md not loaded.</compaction-memory>'
    }
}))
"
    exit 0
fi

SUMMARY_FILE="${CWD}/compacted-summary.md"

build_context() {
    local summary="$1"
    python3 -c "
import json, sys
summary = sys.argv[1]

if summary:
    body = (
        '<compaction-memory>\n'
        'Context has been restored from a previous session.\n\n'
        '## Session Summary\n\n'
        + summary +
        '\n\n---\n\n'
        'Full conversation history: \`compacted.md\`\n'
        'All user prompts: \`prompts.md\`\n\n'
        'Confirm to the user you have read the session summary and that both files are available.\n'
        '</compaction-memory>'
    )
else:
    body = (
        '<compaction-memory>\n'
        'No compacted-summary.md found. '
        'Full conversation history may be available in \`compacted.md\` '
        'and user prompts in \`prompts.md\` at the project root.\n'
        '</compaction-memory>'
    )

output = {
    'additional_context': body,
    'hookSpecificOutput': {
        'hookEventName': 'SessionStart',
        'additionalContext': body
    }
}
print(json.dumps(output))
" "$summary"
}

if [ -f "$SUMMARY_FILE" ]; then
    SUMMARY=$(cat "$SUMMARY_FILE")
    build_context "$SUMMARY"
else
    build_context ""
fi

exit 0
