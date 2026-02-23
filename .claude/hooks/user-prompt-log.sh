#!/usr/bin/env bash
# UserPromptSubmit hook — appends each user prompt to user-prompts.md in real-time.
# Runs before Claude processes the prompt, capturing it immediately on submit.
# Short choice answers (≤10 chars) are annotated with the preceding question.

set -uo pipefail

# Unconditional trace — confirms hook is being called by Claude Code
echo "HOOK_CALLED $(date -u +"%H:%M:%S")" >> /tmp/hook-trace.log

HOOK_INPUT=$(cat)

# Vault path — always fixed, independent of cwd
LOG_FILE="/Users/toyg/Exodus/vault/user-prompts.md"
LOCK_FILE="/tmp/user-prompts.lock"

# Extract prompt and transcript path from hook input
read -r PROMPT TRANSCRIPT_PATH < <(echo "$HOOK_INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
p = d.get('prompt', '') or d.get('message', '') or d.get('user_message', '')
p = p.strip()
tp = d.get('transcript_path', '')
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
# Output prompt and transcript_path on one line, tab-separated
print(p.replace('\t', ' ').replace('\n', ' ') + '\t' + tp)
" 2>/dev/null || echo -e "\t") || true

# Silently exit if no prompt
if [ -z "${PROMPT:-}" ]; then
    python3 -c "import json; print(json.dumps({'continue': True, 'suppressOutput': True}))"
    exit 0
fi
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

python3 - "$LOG_FILE" "$LOCK_FILE" "$PROMPT" "$TIMESTAMP" "${TRANSCRIPT_PATH:-}" <<'PYEOF'
import sys, os, re, fcntl, json

log_file, lock_file, prompt, timestamp = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
transcript_path = sys.argv[5] if len(sys.argv) > 5 else ''

def extract_last_question(transcript_path):
    """Read transcript and return the last question Claude asked, or ''."""
    if not transcript_path or not os.path.isfile(transcript_path):
        return ''
    def get_text(content):
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            parts = [b.get('text', '') for b in content
                     if isinstance(b, dict) and b.get('type') == 'text']
            return '\n'.join(p.strip() for p in parts if p.strip())
        return ''
    last_text = ''
    try:
        with open(transcript_path) as f:
            for line in f:
                try:
                    msg = json.loads(line.strip())
                    if msg.get('type') == 'assistant':
                        text = get_text(msg.get('message', {}).get('content', []))
                        if text:
                            last_text = text
                except (json.JSONDecodeError, KeyError):
                    pass
    except OSError:
        return ''
    if not last_text:
        return ''
    # Find the last line ending with '?' in the assistant text
    for line in reversed(last_text.split('\n')):
        line = line.strip()
        if line.endswith('?') and len(line) >= 5:
            # Trim to ≤80 chars, strip leading markdown (bullets, numbers)
            line = re.sub(r'^[\*\-\d\.\s]+', '', line).strip()
            return line[:80]
    return ''

# Determine if this is a short choice answer that needs context
prompt_stripped = prompt.strip()
is_short_choice = (
    len(prompt_stripped) <= 10
    and bool(re.match(r'^[a-zA-Z0-9][a-zA-Z0-9\s\.\,\!\?]*$', prompt_stripped))
)

display_prompt = prompt_stripped
if is_short_choice and transcript_path:
    question = extract_last_question(transcript_path)
    if question:
        display_prompt = f"{prompt_stripped}  [re: {question}]"

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

    lines = display_prompt.strip().splitlines()
    if len(lines) == 1:
        entry = f"{next_num}. [{timestamp}] {display_prompt.strip()}\n"
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
