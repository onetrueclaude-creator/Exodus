#!/usr/bin/env bash
# Stop hook — appends a 1-sentence summary of Claude's last response to user-prompts.md.
# Fires after every assistant turn; skips trivial responses.

set -uo pipefail

HOOK_INPUT=$(cat)

# Debug: log every invocation so we can confirm the hook fires
echo "[$(date -u +%H:%M:%S)] stop-log invoked" >> /tmp/stop-hook-debug.log 2>/dev/null || true

LOG_FILE="/Users/toyg/Exodus/vault/user-prompts.md"
LOCK_FILE="/tmp/user-prompts-stop.lock"

TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('transcript_path',''))" \
  2>/dev/null || true)

# Silently exit if no transcript
if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
    python3 -c "import json; print(json.dumps({'continue': True, 'suppressOutput': True}))"
    exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

python3 - "$LOG_FILE" "$LOCK_FILE" "$TRANSCRIPT_PATH" "$TIMESTAMP" <<'PYEOF'
import sys, os, re, fcntl, json

log_file, lock_file, transcript_path, timestamp = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

def extract_text(content):
    """Extract only plain text blocks, skipping tool_use and tool_result."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get('type') == 'text':
                text = block.get('text', '').strip()
                if text:
                    parts.append(text)
        return '\n'.join(parts)
    return str(content).strip()

# Find last assistant message in transcript
last_text = ''
try:
    with open(transcript_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                if msg.get('type') == 'assistant':
                    content = msg.get('message', {}).get('content', [])
                    text = extract_text(content)
                    if text:
                        last_text = text
            except (json.JSONDecodeError, KeyError):
                pass
except (FileNotFoundError, OSError):
    pass

if not last_text:
    sys.exit(0)

# Extract first meaningful sentence (skip markdown headers, code fences, short lines)
summary = ''
for line in last_text.split('\n'):
    line = line.strip()
    # Skip headers, code fences, table rows, short lines, tool invocations
    if (len(line) < 30
            or line.startswith('#')
            or line.startswith('```')
            or line.startswith('|')
            or line.startswith('`★')
            or line.startswith('`─')):
        continue
    # Take up to the first sentence end (. ! ?)
    match = re.search(r'^(.{20,250}?[.!?])(?:\s|$)', line)
    if match:
        summary = match.group(1)
    else:
        summary = line[:250]
    break

if not summary:
    summary = last_text.split('\n')[0][:250]

# Only log responses with substantive content
if len(summary) < 20:
    sys.exit(0)

os.makedirs(os.path.dirname(log_file), exist_ok=True)

with open(lock_file, 'w') as lf:
    fcntl.flock(lf, fcntl.LOCK_EX)
    with open(log_file, 'a') as f:
        f.write(f"[A] [{timestamp}] {summary}\n")
    # Lock released on lf close
PYEOF

# Always continue — never block the response
python3 -c "import json; print(json.dumps({'continue': True, 'suppressOutput': True}))"
