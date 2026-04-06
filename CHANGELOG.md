# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0-testnet] - 2026-04-06

### Added
- SECURITY.md with PGP key and responsible disclosure policy
- GitHub issue templates, PR template, CODEOWNERS
- CI/CD workflow (chain tests + game build)
- Dependabot configuration
- CODE_OF_CONDUCT.md (Contributor Covenant)
- Whitepaper v1.0 published (76 pages, 45 references)
- Proton Mail email infrastructure (security@, legal@, support@, info@, press@)

### Changed
- Terminology alignment: Neural Lattice replaces all non-code references
- README badges (CI, license, testnet status)
- Marketing site CSS fix

### Removed
- Development .claude/ orchestration (not for public)
- Stale feature specs from previous project
- Duplicate test directory

### Security
- Supabase keys rotated (legacy JWT disabled, new opaque keys)
- Git history scrubbed (4 filter-repo passes — personal emails, paths, usernames)
- Author identity normalized across all commits

## [Pre-release] - 2026-03-28

### Added
- Gameplay wiring: agent terminal, blockchain protocols, secure command
- Public API deployment (FastAPI, Docker, CORS, rate limiting)
- Testnet monitor: circulating supply, burned fees, epoch progress, subgrid simulator
- Supabase tables: subgrid_allocations, resource_rewards

## [Pre-release] - 2026-03-12

### Added
- Tokenomics v3: Burn-Mint Equilibrium, city real estate model
- Machines Faction (AI accumulator, no voting power)
- 5% annual inflation ceiling
- Whitepaper governance section

## [Pre-release] - 2026-02-25

### Added
- Tokenomics v2: organic growth model
- Epoch system with ring-based mining expansion
- Subgrid allocator (4-type, 64-cell, level scaling)
- Resource system redesign (CPU Tokens, Staked CPU)
- 28 seed.md + 23 CLAUDE.md navigation files

## [Pre-release] - 2026-02-24

### Added
- Galaxy grid: 4-faction coloring, connections, full coverage
- Playwright beta-tester agents (4 parallel)

## [Pre-release] - 2026-02-23

### Added
- Blockchain sync pipeline
- Supabase game state integration
- Initial test suite (22 Playwright E2E tests)
