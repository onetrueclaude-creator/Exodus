# Seed — vault/agentic-chain/stack/

> Blockchain Operations Stack — the layered architecture for keeping the Agentic Chain testnet running healthily.

## Purpose

This stack governs the **operational health** of the Agentic Chain testnet. It is independent of the AI-Human Engineering Stack at `Exodus/stack/` (which governs how we *build* the chain). This stack governs how we *run* it.

## Layer Diagram

```
 +-------------------------------------------------------+
 |  Layer 5: DEPLOYMENT & OPERATIONS                      |
 |  Question: Where does the chain live?                  |
 |  Cloud infra, Docker, process mgmt, upgrades           |
 +-------------------------------------------------------+
                        |
 +-------------------------------------------------------+
 |  Layer 4: MONITORING & OBSERVABILITY                   |
 |  Question: Is the chain healthy right now?             |
 |  Metrics, dashboards, alerting, anomaly detection      |
 +-------------------------------------------------------+
                        |
 +-------------------------------------------------------+
 |  Layer 3: NETWORK & API                                |
 |  Question: How do clients talk to the chain?           |
 |  FastAPI endpoints, WebSocket, CORS, rate limiting     |
 +-------------------------------------------------------+
                        |
 +-------------------------------------------------------+
 |  Layer 2: CONSENSUS & BLOCK PRODUCTION                 |
 |  Question: Are blocks being produced correctly?        |
 |  Auto-miner, epoch advancement, PoAIV validation       |
 +-------------------------------------------------------+
                        |
 +-------------------------------------------------------+
 |  Layer 1: STATE PERSISTENCE                            |
 |  Question: Can we survive a restart?                   |
 |  Storage engine, checkpoints, recovery, snapshots      |
 +-------------------------------------------------------+
```

## Reading Order

Start from Layer 1 (bottom) and work up — each layer depends on the one below it.

| Layer | File | Question |
|-------|------|----------|
| 1 | `persistence.md` | Can we survive a restart? |
| 2 | `consensus.md` | Are blocks being produced correctly? |
| 3 | `network.md` | How do clients talk to the chain? |
| 4 | `monitoring.md` | Is the chain healthy right now? |
| 5 | `deployment.md` | Where does the chain live? |

## Relationship to Other Stacks

- `Exodus/stack/` — AI-Human Engineering Stack (building the software). **Do not modify.**
- `vault/agentic-chain/stack/` — Blockchain Operations Stack (running the testnet). **This directory.**

## Navigation

- **Parent:** `vault/agentic-chain/seed.md`
- **Siblings:** `vault/agentic-chain/agentic/` (implementation), `vault/agentic-chain/tests/` (test suite)
