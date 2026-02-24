#!/usr/bin/env python3
"""Continuously watches Claude transcript for new user messages.

Polls the Claude project transcript JSONL every 3 seconds and appends
new user prompts to vault/user-prompts.md with sequential numbering.
Designed to run as a launchd agent so it persists across Claude Code sessions.

State: /tmp/prompt-watcher-state.json tracks byte offsets per transcript file
so we never re-log old prompts and never miss new ones.
"""

import json, os, re, time, fcntl
from pathlib import Path
from typing import Optional

PROJECT_DIR = Path.home() / ".claude/projects/-Users-toyg-Exodus"
LOG_FILE = Path("/Users/toyg/Exodus/vault/user-prompts.md")
STATE_FILE = Path("/tmp/prompt-watcher-state.json")
LOCK_FILE = Path("/tmp/user-prompts-watcher.lock")
POLL_INTERVAL = 3  # seconds

# Skip these — they're injected by Claude Code infrastructure, not real user input
SKIP_PREFIXES = (
    '<task-notification>',
    '<system-reminder>',
    '<task-id>',
    'This session is being continued',
    'Please continue the conversation',
    'Base directory for this skill:',
    'The following skills were invoked',
)


def get_next_num() -> int:
    if not LOG_FILE.exists():
        return 1
    content = LOG_FILE.read_text(encoding='utf-8')
    nums = re.findall(r'^(\d+)\. ', content, re.MULTILINE)
    return int(nums[-1]) + 1 if nums else 1


def append_entry(text: str) -> None:
    text = text.strip()
    if not text:
        return
    if any(text.startswith(p) for p in SKIP_PREFIXES):
        return
    # Skip extremely long messages — these are continuation summaries, not real prompts
    # Real user prompts can be several thousand chars (e.g. design specs); summaries are >10k
    if len(text) > 10000:
        return

    timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
    num = get_next_num()
    lines = text.splitlines()
    if len(lines) == 1:
        entry = f"{num}. [{timestamp}] {text}\n"
    else:
        entry = f"{num}. [{timestamp}] {lines[0]}\n"
        for line in lines[1:]:
            entry += f"   {line}\n"

    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Ensure file has header if brand new
    if not LOG_FILE.exists() or LOG_FILE.stat().st_size == 0:
        LOG_FILE.write_text(
            "# User Prompts\n\nAll prompts, numbered consecutively across sessions.\n\n",
            encoding='utf-8',
        )

    with open(LOCK_FILE, 'w') as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(entry)
    # lock released on lf close


def extract_text(content) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = [
            b.get('text', '').strip()
            for b in content
            if isinstance(b, dict) and b.get('type') == 'text'
        ]
        return '\n'.join(p for p in parts if p).strip()
    return ''


def get_latest_transcript() -> Optional[Path]:
    files = list(PROJECT_DIR.glob("*.jsonl"))
    if not files:
        return None
    return max(files, key=lambda f: f.stat().st_mtime)


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {}


def save_state(state: dict) -> None:
    try:
        STATE_FILE.write_text(json.dumps(state))
    except Exception:
        pass


def main() -> None:
    state = load_state()

    while True:
        try:
            transcript = get_latest_transcript()
            if transcript:
                fkey = str(transcript)
                current_pos = state.get(fkey)

                with open(transcript, 'r', encoding='utf-8', errors='replace') as f:
                    if current_pos is None:
                        # First time seeing this file — seek to end to avoid
                        # re-logging existing history already in user-prompts.md
                        f.seek(0, 2)
                        state[fkey] = f.tell()
                        save_state(state)
                    else:
                        f.seek(current_pos)
                        while True:
                            line = f.readline()
                            if not line:
                                state[fkey] = f.tell()
                                break
                            try:
                                msg = json.loads(line)
                                # Real user prompts: type='user', no toolUseResult
                                if msg.get('type') == 'user' and not msg.get('toolUseResult'):
                                    content = msg.get('message', {}).get('content', '')
                                    text = extract_text(content)
                                    if text:
                                        append_entry(text)
                            except (json.JSONDecodeError, KeyError):
                                pass
                        save_state(state)
        except Exception as e:
            # Never crash — just log and continue
            try:
                with open('/tmp/prompt-watcher.err', 'a') as ef:
                    ef.write(f"[{time.strftime('%H:%M:%S')}] Error: {e}\n")
            except Exception:
                pass

        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
