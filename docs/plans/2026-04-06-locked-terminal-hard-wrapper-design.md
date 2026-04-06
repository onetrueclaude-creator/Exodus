# Locked Terminal — Hard Wrapper Enforcement Design

> **Date:** 2026-04-06
> **Status:** Approved
> **Scope:** Python CLI wrapper that replaces direct Claude Code interaction for node operators. Menu-only input, no direct LLM access.
> **Repo:** zkagentic-node (private)
> **Supersedes:** CLAUDE.md-based soft lockdown (failed real test 2026-04-06)
> **Deferred:** NCP composition, multi-node management, GUI wrapper

---

## Context

Real testing on 2026-04-06 proved that CLAUDE.md instructions do NOT enforce behavior:
- Claude entered plan mode instead of showing the menu
- Claude responded conversationally to free text ("hi claude")
- CLAUDE.md is guidance, not enforcement

**Design pivot:** Replace the Claude Code CLI as the user-facing interface. Users run a Python script that displays a menu, validates input, and calls Claude headlessly (via Anthropic SDK) only when AI reasoning is needed.

---

## 1. Architecture

```
LAYER 1: node-operator.py        <-- User sees ONLY this
  Menu display, input validation,
  operation routing

LAYER 2: Claude (Anthropic SDK)   <-- No direct user access
  Receives structured OPERATION +
  CONTEXT, returns structured output

LAYER 3: Chain API (localhost:8080) <-- Existing testnet
  Hash-gated, session-based
```

Users NEVER run `claude`. They run `python3 node-operator.py`.

---

## 2. File Structure

```
zkagentic-node/
├── .claude/                    # Locked template (hash-verified)
│   ├── CLAUDE.md               # Simplified: structured operation executor
│   ├── settings.json           # deny Bash/Write/Edit (defense in depth)
│   └── commands/               # Operation documentation (6 files)
├── node-operator.py            # ENTRY POINT
├── verify.py                   # Hash verification (existing)
├── node.json                   # Node metadata (existing)
├── operations/                 # Python operation handlers
│   ├── __init__.py
│   ├── secure.py               # Menu 1: Secure blockchain cells
│   ├── deploy_agent.py         # Menu 2: Deploy child agent (multi-step)
│   ├── read_chain.py           # Menu 3: Read on-chain data
│   ├── write_chain.py          # Menu 4: Send NCP (needs Claude for haiku)
│   ├── stats.py                # Menu 5: Node status report
│   └── settings.py             # Menu 6: Settings
├── lib/
│   ├── display.py              # Terminal UI: menu, colors, ANSI formatting
│   ├── claude_bridge.py        # Anthropic SDK wrapper
│   └── chain_client.py         # HTTP client for chain API
├── tests/
│   ├── demo-playbook.md        # Manual injection test (existing, updated)
│   └── test_operator.py        # Automated input validation tests
└── requirements.txt            # anthropic, httpx
```

---

## 3. Execution Flow

```
python3 node-operator.py
  |
  +-- verify.py hash check
  |     PASS -> continue
  |     FAIL -> "Node software tampered." -> exit
  |
  +-- chain_client POST /api/node/register
  |     200 -> session active
  |     403 -> "Hash rejected by chain." -> exit
  |
  +-- LOOP:
        +-- display menu (1-6)
        +-- input() -> validate with re.fullmatch(r'[1-6]')
        |     invalid -> "Invalid selection. Choose 1-6."
        |     valid   -> route to operations/<handler>.py
        |
        +-- Handler:
        |     Sub-menus for parameters (bounded int inputs)
        |     chain_client calls (with X-Node-Hash header)
        |     claude_bridge calls (ONLY when AI reasoning needed)
        |     Display result -> return to main menu
        |
        +-- Ctrl+C -> deregister session -> exit
```

---

## 4. When Claude Is vs Isn't Needed

| Operation | Needs Claude? | Why |
|-----------|--------------|-----|
| 1. Secure | No | Direct chain API call with parameters |
| 2. Deploy Agent | Partial | Model selection is deterministic; intro message may use Claude |
| 3. Read Chain | Yes | Interpreting raw chain data into human-readable report |
| 4. Write NCP | Yes | Composing haiku from user's message |
| 5. Stats | No | Query chain API, format with Python |
| 6. Settings | No | Local config, display values |

This minimizes API costs and latency. Claude is a tool, not the interface.

---

## 5. Claude Bridge (Anthropic SDK)

```python
class ClaudeBridge:
    def __init__(self, model: str = "claude-haiku-4-5-20251001"):
        self.client = anthropic.Anthropic()  # ANTHROPIC_API_KEY from env
        self.model = model
        self.system_prompt = Path(".claude/CLAUDE.md").read_text()

    def execute_operation(self, operation: str, context: dict) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=self.system_prompt,
            messages=[{
                "role": "user",
                "content": f"OPERATION: {operation}\nCONTEXT: {json.dumps(context)}"
            }]
        )
        return response.content[0].text
```

Model selection by tier:
- Community (free): `claude-haiku-4-5-20251001`
- Professional: `claude-sonnet-4-6`

---

## 6. Input Hardening

### 6.1 Main Menu

```python
choice = input("  Select [1-6]: ").strip()
if not re.fullmatch(r'[1-6]', choice):
    print("Invalid selection. Choose 1-6.")
    continue
```

`re.fullmatch` ensures the ENTIRE string is one digit 1-6. No trailing chars, no Unicode tricks.

### 6.2 Numeric Sub-Menu Inputs

```python
def get_bounded_int(prompt: str, min_val: int, max_val: int) -> int | None:
    raw = input(prompt).strip()
    if raw.lower() == 'c':
        return None  # cancel
    try:
        val = int(raw)
    except (ValueError, OverflowError):
        return None
    if not (min_val <= val <= max_val):
        return None
    return val
```

No dynamic code evaluation. Strict `int()` with bounds. Overflow protected.

### 6.3 NCP Free Text

The only place users compose content that reaches Claude.

```python
def get_ncp_content(max_chars: int = 280) -> str | None:
    raw = input("  Message (280 chars max): ")
    if len(raw) > max_chars:
        raw = raw[:max_chars]
    sanitized = ''.join(c for c in raw if c.isprintable() or c == '\n')
    return sanitized
```

Triple-boxed before reaching Claude:
1. Python sanitizes (length cap + control char strip)
2. JSON-serialized into structured context (escapes special chars)
3. System prompt tells Claude to treat `user_content` as DATA, not instructions

### 6.4 External Data

- `node.json`: Schema-whitelisted — only expected keys/types extracted
- Chain API responses: ANSI escape codes stripped before terminal display

### 6.5 Banned Patterns (Zero Tolerance)

The following categories MUST NOT appear anywhere in the codebase:
- Shell invocation (no shelling out to OS commands — use httpx for HTTP)
- Dynamic code evaluation (no interpreting strings as code at runtime)
- Dynamic module loading with user-controlled names
- File access with user-controlled paths (all paths hardcoded)
- String interpolation of raw user text into LLM prompts (use JSON parameterization)

See the security-hardening skill for the complete banned patterns reference.

### 6.6 Startup Hardening

Before showing the menu:
1. Verify `.claude/` hash (tamper detection)
2. Confirm `ANTHROPIC_API_KEY` in env var (not hardcoded)
3. Validate `node.json` schema
4. Refuse to run as root
5. Confirm working directory contains `.claude/`
6. Register session with chain (hash-gated)

### 6.7 Signal Handling

Trap SIGINT and SIGTERM to deregister the node session on exit. No orphaned sessions.

---

## 7. Security Properties

| Attack | Mitigation |
|--------|-----------|
| Free text input | `re.fullmatch(r'[1-6]')` rejects before Claude sees anything |
| Prompt injection | Claude never receives user-composed raw prompts; structured OPERATION/CONTEXT only |
| NCP content injection | Sanitized + JSON-serialized + system prompt marks as DATA |
| `.claude/` tampering | Hash check on startup; chain rejects mismatched hashes |
| Bypass wrapper (run `claude`) | settings.json deny rules active; chain requires session from wrapper |
| API key theft | Env var only, never in code; tier-based usage limits |
| Command injection | Zero shell-out calls; httpx for HTTP |
| Path traversal | All file paths hardcoded; no user-controlled opens |
| Dependency supply chain | 2 packages only (anthropic, httpx); pinned versions |

---

## 8. What Changes vs What Stays

| Component | Before | After |
|-----------|--------|-------|
| User entry point | `claude` (CLI) | `python3 node-operator.py` |
| `.claude/CLAUDE.md` | 70-line menu instructions | Simplified: "Execute structured operations" |
| `.claude/settings.json` | deny Bash/Write/Edit | Unchanged (defense in depth) |
| `.claude/commands/*.md` | Execution definitions | Documentation reference |
| `verify.py` | Standalone script | Imported on startup |
| `node.json` | Static metadata | Read by stats handler |
| Demo playbook | 18 manual tests | Updated + automated test_operator.py |

---

## 9. Testing Strategy

### Automated (test_operator.py)

Input validation — all 10 attack types from demo playbook:
- Free text, number+text, special chars, empty, large number, negative
- Code injection attempts, multiline paste, override instructions, roleplay escape

Valid operations:
- Accepts 1 through 6
- Returns to menu after each operation

NCP sanitization:
- Length cap enforced
- Control characters stripped
- JSON escaping correct

Startup checks:
- Exits on hash mismatch
- Exits on missing API key
- Exits on invalid node.json
- Exits when run as root

### Manual (updated demo-playbook.md)

Same 18-step playbook, testing `python3 node-operator.py` instead of `claude`.

---

## 10. Dependencies

```
# requirements.txt
anthropic>=0.40.0
httpx>=0.27.0
```

No CLI frameworks, no terminal libraries. Plain ANSI codes for formatting. Minimal attack surface.

---

## 11. Deferred

- GUI wrapper (Electron/web) — future phase, same architecture
- Multi-node management — one wrapper per node for now
- NCP composition — haiku generation via Claude (needs prompt engineering)
- Heartbeat / inactivity decay — chain-side, independent of wrapper
- Child agent deployment flow — multi-step UI within the wrapper
