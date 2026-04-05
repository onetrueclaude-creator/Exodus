# Contributing

## Setup

1. Clone the repo and install dependencies:
   ```bash
   cd apps/game && npm install
   cd ../../chain && pip3 install -r requirements.txt
   ```

2. Start PostgreSQL for auth: `cd apps/game && docker compose up -d`

3. Start the testnet miner: `cd chain && python3 -m uvicorn agentic.testnet.api:app --port 8080`

4. Start the game UI: `cd apps/game && npm run dev`

## Code Style

- **Python:** Follow existing patterns in `chain/agentic/`. No linter enforced yet.
- **TypeScript:** ESLint configured in `apps/game/`. Run `npm run lint`.
- **Tests required:** All PRs must include tests. Chain uses pytest, game uses Vitest.

## PR Conventions

- One logical change per PR
- Descriptive title explaining the "why"
- Include test output in PR description
- Reference the relevant design doc if applicable (`docs/plans/`)

## Architecture

- `chain/agentic/params.py` is the source of truth for all protocol parameters
- `spec/whitepaper.md` (v1.0) is the authoritative protocol specification
- Code must align with the whitepaper — if they disagree, the whitepaper wins
