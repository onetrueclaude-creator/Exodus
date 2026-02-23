#!/usr/bin/env bash
# UserPromptSubmit hook — appends each user prompt to user-prompts.md in real-time.
# Runs before Claude processes the prompt, capturing it immediately on submit.

set -uo pipefail

# Unconditional trace — confirms hook is being called by Claude Code
echo "HOOK_CALLED $(date -u +"%H:%M:%S")" >> /tmp/hook-trace.log

HOOK_INPUT=$(cat)

# Vault path — always fixed, independent of cwd
LOG_FILE="./ vault/user-prompts.md"
LOCK_FILE="/tmp/user-prompts.lock"

PROMPT=$(echo "$HOOK_INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
# 'prompt' is standard; slash commands sometimes arrive as different fields
p = d.get('prompt', '') or d.get('message', '') or d.get('user_message', '')
p = p.strip()
# Skip system/XML content — task-notifications and other synthetic messages
# arrive through UserPromptSubmit but are not real user input
SYSTEM_PREFIXES = ('<task-notification>', '<system-reminder>', '<task-id>')
if any(p.startswith(prefix) for prefix in SYSTEM_PREFIXES):
    p = ''
# Debug: log full input keys when prompt is empty
if not p:
    import os
    with open('/tmp/userprompt-debug.log', 'a') as f:
        f.write('EMPTY_PROMPT keys=' + str(list(d.keys())) + ' val=' + repr(str(d)[:300]) + '\n')
print(p)
" 2>/dev/null || true)

# Silently exit if no prompt
if [ -z "$PROMPT" ]; then
    python3 -c "import json; print(json.dumps({'continue': True, 'suppressOutput': True}))"
    exit 0
fi
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

python3 - "$LOG_FILE" "$LOCK_FILE" "$PROMPT" "$TIMESTAMP" <<'PYEOF'
import sys, os, re, fcntl

log_file, lock_file, prompt, timestamp = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

os.makedirs(os.path.dirname(log_file), exist_ok=True)

# Use a dedicated lock file — avoids stale fd issues from truncate+rewrite
with open(lock_file, 'w') as lf:
    fcntl.flock(lf, fcntl.LOCK_EX)   # exclusive lock held for entire read-append cycle

    # Read current content
    content = ""
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            content = f.read()

    if not content:
        content = "# User Prompts\n\nAll prompts, numbered consecutively across sessions.\n\n"

    nums = re.findall(r'^(\d+)\. ', content, re.MULTILINE)
    next_num = int(nums[-1]) + 1 if nums else 1

    lines = prompt.strip().splitlines()
    if len(lines) == 1:
        entry = f"{next_num}. [{timestamp}] {prompt.strip()}\n"
    else:
        entry = f"{next_num}. [{timestamp}] {lines[0]}\n"
        for line in lines[1:]:
            entry += f"   {line}\n"

    # Simple append — lock already guarantees sequential numbering
    with open(log_file, 'a') as f:
        if not os.path.getsize(log_file) > 0:
            f.write(content)
        f.write(entry)
    # Lock released on lf close
PYEOF

# Always continue — never block the prompt
python3 -c "import json; print(json.dumps({'continue': True, 'suppressOutput': True}))"
