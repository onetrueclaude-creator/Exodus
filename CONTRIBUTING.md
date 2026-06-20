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

## Developer Certificate of Origin (DCO)

This project uses the [Developer Certificate of Origin](https://developercertificate.org/) (DCO) 1.1. By contributing, you certify that you wrote the patch or otherwise have the right to submit it under the project's open-source license.

**Every commit must be signed off.** Add a `Signed-off-by` line with your real name and email:

```
Signed-off-by: Jane Doe <jane@example.com>
```

The easiest way is to let git add it for you:

```bash
git commit -s        # appends Signed-off-by using your git user.name / user.email
```

Sign off on each commit in a PR. Pull requests whose commits are not signed off may be asked to amend before merge.

The full DCO text (what you are certifying) is reproduced below:

```
By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I have
    the right to submit it under the open source license indicated in
    the file; or
(b) The contribution is based upon previous work that, to the best of my
    knowledge, is covered under an appropriate open source license and I
    have the right under that license to submit that work with
    modifications, whether created in whole or in part by me, under the
    same open source license (unless I am permitted to submit under a
    different license), as indicated in the file; or
(c) The contribution was provided directly to me by some other person
    who certified (a), (b) or (c) and I have not modified it.
(d) I understand and agree that this project and the contribution are
    public and that a record of the contribution (including all personal
    information I submit with it, including my sign-off) is maintained
    indefinitely and may be redistributed consistent with this project
    or the open source license(s) involved.
```

## Trademark

The code is MIT-licensed, but the project name, the AGNTC ticker, and the logos are not — see [TRADEMARK.md](TRADEMARK.md). Don't use them in a way that implies endorsement of a fork.
