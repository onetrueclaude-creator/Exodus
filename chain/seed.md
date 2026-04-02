# Seed — vault/agentic-chain/

> Knowledge and documentation for the Agentic Chain blockchain protocol.
> The implementation lives in `apps/agentic-chain/`; this directory contains design docs and session artifacts.
> Read `CLAUDE.md` for change history.

## What This Directory Serves

Houses design artifacts, session records, and documentation for the **Agentic Chain** — the custom blockchain protocol underpinning ZK Agentic Network.

## Contents

| File/Dir | Description |
|----------|-------------|
| `CLAUDE.md` | Change log for this directory |
| `agentic/` | Protocol spec artifacts (if any) |
| `compacted.md` | Session transcript archive for chain dev sessions |
| `prompts.md` | User prompt log for chain development |
| `requirements.txt` | Python dependencies |
| `run_*.py` | Demo/simulation runner scripts |
| `stack/` | **Blockchain Operations Stack** — 5-layer model for running the testnet healthily |
| `tests/` | Test suite |

## Architecture Link

This vault directory documents the protocol; the runnable code is in `apps/agentic-chain/agentic/`.

Key protocol parameters (source of truth): `apps/agentic-chain/agentic/params.py`

## Key Concepts Documented Here

- **Proof of Energy (PoE):** Token spend → CPU Tokens (read-only) + CPU Staked (Secure actions) → blockchain mining
- **Proof of AI Verifiable (PoAIV):** 6 action types verified on-chain
- **Resource density:** SHA-256 hash of (x,y) determines mining yield
- **Epoch hardness:** Mining yield divided by current ring number (replaces dynamic block time + halving)
- **Subgrid allocation:** 4 sub-cell types per homenode (Secure, Develop, Research, Storage)
- **Storage ZK protocol:** Filecoin PoST reference — private on-chain data via SMT nullifiers
