# Change Log — spec/

> Tracks what changed in the knowledge tree (formerly `vault/`, renamed `spec/`), what will be added, and why.
> Format: `YYYY-MM-DD — [summary]`
> Read `seed.md` first to understand the structure before reading this log. Paths cited in pre-rename entries as `vault/...` now live at `spec/...`.

---

## 2026-06-2x — Whitepaper v1.6 (Fixed-Supply Tokenomics Revision)

**Changed:** `whitepaper.md` from v1.5 to v1.6 (June 2026). A token-economics revision reconciling the paper with the fixed-supply distribution model: AGNTC stated as a **fixed total supply of 1,000,000,000** allocated across defined buckets (participation mining 25% / ongoing emissions 25% / team 18% / treasury 14% / liquidity 10% / ecosystem 8%; community/earned ≈ 58%). The document now distinguishes the **distribution layer** (the fixed 1B) from the **internal economy** (subgrid mining, 900-AGNTC chain genesis, fee burn), and reframes the **"5% ceiling" as the per-epoch release rate** of the fixed participation/emissions buckets, not open-ended inflation. New **§10.1.3 Participation Distribution** documents the earned, pro-rata-capped 250M participation bucket (identity-gated; unclaimed → treasury; earned-for-work, not a sale). Affected: §9.1, §9.3, §10.1 (+§10.1.1/§10.1.2/§10.1.3), §10.4, §11.1. **§22 unchanged numerically** (`MAX_SUPPLY = 1,000,000,000` and `GENESIS_SUPPLY = 900` are both already parameters and remain concordant) — the concordance suite stays green. All protocol mechanics unchanged. *(Source: the whitepaper's own v1.6 header paragraph.)*

---

## 2026-06-22 — Whitepaper v1.5 (Finality-Firewall Revision)

**Changed:** `whitepaper.md` from v1.4 to v1.5. One consensus-behaviour change, reframed throughout: the **finality weight** — committee (verifier) selection *and* leader selection — became **AGNTC token-stake ONLY** (the "finality firewall"). The dual-staking effective stake `S_eff = α·token + β·cpu` (α=0.40, β=0.60) is preserved unchanged as the **economic** weight (reward share / earnings proportionality). Reason (blueprint item P1-1): CPU / Proof-of-Vault-derived work is Sybil-weak until PoRep-hardened, so letting it weight finality would be a cheap path to consensus capture. CPU-weighted committee selection is relabelled from current behaviour to a **PoRep-gated mainnet goal**, in the same honesty style as the ZK ladder (§5B.2). Affected: Abstract/§1.3, §5, §8 Sybil analysis, §13 (firewall vs economic-weight split; v1.4's "architectural keystone" caveat replaced by the shipped firewall), §23.3, §24.3, glossary (`finality_weight`, *finality firewall*). §22 unchanged (selection-source change, not a parameter change) — concordance suite stays green. *(Source: the whitepaper's own v1.5 header paragraph.)*

---

## 2026-06-20 — Whitepaper v1.4 (ZK-Agentic Revision)

**Changed:** `whitepaper.md` from v1.3 to v1.4. This revision **names and frames** what v1.3 already shipped as what the brand promises — *zero-knowledge-proven agentic activity* — without changing any mechanism or §22 parameter. The model is now called **Proof of Agentic Work (PoAW)**: Proof-of-Vault (§5A) performed by an autonomous agent, admitted only via a zero-knowledge **protocol-obedience proof** at the **model-agnostic Singularity gate**.

Section-by-section:
- **New §5B "The ZK-Agentic Gate / Proof of Agentic Work"** (placed right after §5A, before §6, with a ToC entry). Contains: §5B.1 substrate-vs-identity framing (storage = the verifiable WHAT; an autonomous agent proving protocol-obedient work in zero knowledge = the HOW; the Bitcoin "nobody calls it a SHA-256 chain" analogy); §5B.2 the **3-rung ZK honesty ladder**; §5B.3 the **gate contract stated verbatim** ("To mutate blockchain state, a participant — running any agent, model, or algorithm — MUST submit a valid proof that it followed the protocol. The Singularity verifies the proof and nothing else. No proof → no state change."); §5B.4 PoAW as the gating discipline over the three verbs (not a fourth verb); §5B.5 "built and operated by agentic force" (provenance + proof-of-work-obedience, **NOT** proof-of-cognition; named accountable human; quarantined from financial claims).
- **§5A.2 / §5A.6** — labeled the current PDP proof a succinct **possession** proof, **NOT yet zero-knowledge** (it reveals the sampled sub-units), with the SNARK-wrap (Poseidon + Groth16/PLONK) named as the next step; mirrored the 3-rung ladder into §5A.6 so Proof-of-Vault never overshoots its own rung. Rung (a) SNARK-compressed storage proofs = real/shippable (Filecoin WindowPoSt precedent); rung (b) the §6 private-state ZK layer = specified/phasing-in (testnet `SimulatedZKProof` stand-in); rung (c) zkML proof of agent inference = future/dated (~2027-2030).
- **§4.5 / §5A.4** — restated the Singularity as a **"model-agnostic protocol-obedience-proof verifier"** (not just a "storage coordinator"); same mechanism, brand-correct name.
- **§6.4** — added the storage-possession proof as a **fourth ZK use case** (cross-linked Filecoin [15]) plus an "Implementation honesty" note on the testnet `SimulatedZKProof` (rung b) and the not-yet-SNARK-wrapped possession proof (rung a).
- **Governance (§21.2 + §24.5)** — promoted from "deferred/core-team" to the specified **Bitcoin-Core-style PIP process**: PIP/BIP-like proposals on rough consensus across agent-operators + the PoAIV committee + token/CPU stakers; reference client + **multi-client diversity**; **immutable-vs-tunable split** (gate rule, 5% ceiling, BME 50/50, 16·band hardness, 900 genesis, ledger=committee/state=PoV separation change only by supermajority PIP; ‡-parameters by lighter governance); **soft-fork-default** fork resistance; **Singularity excluded from governance** (it meters, it does not legislate). Disclosed honestly: designed end-state; testnet/alpha is team-stewarded.
- **Abstract / §1.3** — lead with "zero-knowledge-proven agentic activity" and the "built and operated by agentic force" transparency claim.
- **§13.5 (+ §8.8/§24.3 cross-links)** — added the **architectural keystone P1-1 honest disclosure**: committee selection weights `α·token + β·cpu`, so the CPU leg feeds *committee selection* (finality), and the firewall holds only insofar as CPU-stake is Sybil-resistant — which testnet PoV is not. PoV proofs feed reward/stake **input**; the trusted-coordinator testnet is honestly scoped; trustless Sybil-resistance is NOT claimed at this phase. Kept all of §24's existing honest caveats intact.
- **Glossary** — added **Proof of Agentic Work (PoAW)**, **ZK-Agentic Gate**, **PIP**, **protocol-obedience proof**, **ZK honesty ladder**; refined **Singularity** to "model-agnostic protocol-obedience-proof verifier."
- **Version** — bumped H1, the version blockquote, and the footer v1.3 → v1.4 ("Version 1.4 (ZK-Agentic Revision)"); folded the v1.3 description into the historical paragraph.

**Why:** Source blueprint `docs/superpowers/specs/2026-06-20-zk-agentic-securing-model.md` (§6 "Implications"). The brand reconciliation is a free narrative/identity retrofit (most of the "ZK-proven agentic" direction is already true in code/spec) plus one well-scoped future SNARK PR; the whitepaper is now the brand-correct surface while remaining ruthlessly honest about which ZK rung ships. **No §22 numeric parameters were added or changed** (governance is prose, not new params), so the concordance suite `chain/tests/test_whitepaper_audit.py` still passes 108/108 (verified). The honesty discipline — forbid any present-tense ZK claim above the shipping rung; disclose the CPU-stake→finality coupling — is the whole point of the revision.

---

## 2026-06-18 — Whitepaper v1.3 (Proof-of-Vault Consensus Revision)

**Changed:** `whitepaper.md` from v1.2 to v1.3. Replaced the "holding a paid Claude API key secures the chain" model — a paywall, not consensus — with a **two-layer security model**, stated honestly throughout: (1) **Ledger safety** (balances, ordering) stays with the existing **PoAIV committee** (on testnet, the coordinator); (2) **State/data security** is the **collective knowledge vault**, secured by players' **real CPU + disk** via sampled possession proofs (**Proof-of-Vault**). Reframed the three economic verbs as distinct-but-coupled: **Mining = issuance** (subgrid, unchanged), **Securing = verifiable resource commitment** (replicating + serving + re-proving a vault shard, proof submitted through the Singularity link — NOT Claude-API spend), **Staking = the slashable bond** (dual-stake = AGNTC + committed CPU/disk capacity, slashed on failed vault proofs). Corrected every "Claude/LLM/API secures" claim: the LLM flips from a consensus paywall to an **optional content layer** (agents may use an LLM to author/curate vault entries; no paid key is required to secure). Added a new **§5A "The Knowledge Vault and Proof-of-Vault"** section (content-addressed Merkle-DAG vault = the same graph the /game page renders; CID-range shard assignment; sampled-PDP challenge/Merkle-proof on a fixed block cadence; the Singularity as the trusted coordinator/metering authority; replication factor + re-prove cadence; the **testnet-vs-mainnet honesty split** — coordinator-metered storage proofs are real on testnet, while trustless unique-replica sealing / on-chain verification is scoped as a mainnet research milestone). Added **§24.10 "Decentralized-AI incentive layer (future)"** — proof-of-inference receipts gate **rewards, never consensus**; zkML/optimistic/TEE survey; revisit zk-training in ~2–3 years. Rewrote §13 (dual-stake = AGNTC + committed capacity; the activity/securing signal is vault-proof success, not API spend), §15 (added §15.1a failed-vault-proof slashing condition + downtime row), §16/§17 (Secure cells commit CPU+disk to vault proofs; Storage cells reframed as the local vault-shard store), and the affected sentences in §3.1, §10, §11, §12, §19.2, §24. Updated §22 with a new **Vault & Proof-of-Vault** parameter block (`VAULT_SHARD_COUNT`, `VAULT_REPLICATION_FACTOR`, `VAULT_CHALLENGE_INTERVAL_BLOCKS`, `VAULT_CHALLENGE_WINDOW_BLOCKS`, `VAULT_PROOF_SAMPLE_SIZE`, `VAULT_MIN_STAKE_CAPACITY`, `VAULT_PROOF_CPU_CREDIT`, `VAULT_SLASH_RATE`) and the glossary (Securing, Vault, Knowledge Vault, Proof-of-Vault, Storage proof / PDP, Shard, Replication factor; retired API-securing wording from CPU Staked / CPU Tokens / Secure). Economic core (subgrid issuance, BME burns, 5% ceiling, vesting, phyllotaxis seating, hardness = 16·band, per-node density, Singularity accumulator) unchanged.

**Why:** The v1.2 mechanism implied every securer must hold a paid Anthropic key — permissioned, single-vendor-centralized, and un-marketable honestly ("an agentic process secures the chain" was really "the dev pays an API bill"). v1.3 keeps the narrative literally true while making the mechanism real, CPU+disk-based, and permissionless: agents maintain and prove the collective knowledge vault. Source: `docs/superpowers/specs/2026-06-18-proof-of-vault-securing-feasibility.md` (§9 impact map). §22 vault parameters are cross-checked against the merged chain Proof-of-Vault implementation's `chain/agentic/params.py` (PR #125) by `chain/tests/test_whitepaper_audit.py` (`TestWhitepaperVaultParams`).

**Hardening sweep:** purged residual ring/coordinate → band/seat legacy from Part IV–VII (§14/§16/§17/§18/§23), recast 3 surviving API-spend-secures remnants (§8/§13) to committed CPU+disk vault capacity, resolved the multi-provider vs single-Anthropic threat-model contradiction (§8 Attack 1), and fixed §20.2 genesis (Singularity-only) + test count + the v1.0 footer.

---

## 2026-06-14 — Whitepaper v1.2 (Phyllotaxis Revision)

**Changed:** `whitepaper.md` from v1.1 to v1.2. Replaced the open coordinate-grid spatial model with a golden-angle phyllotaxis lattice — a deterministic sunflower of agent seats around a central Singularity core (renamed from "Machines"). A seat is a single activity rank `k`: `angle(k) = k · 137.50776°`, `radius(k) = c·√k`; the golden angle guarantees non-overlapping interaction spokes. Hardness tiers are now equal-width radial bands (`band(k) = ceil(√(k/8))`, `hardness = 16 × band`); density is per-node (`SHA-256(node_id)`, origin clamped 1.0) rather than per-coordinate. Movement is activity-driven: rising activity spirals a seat inward, inactivity drifts it outward past a grace window; deliberate active relocation pays AGNTC + CPU to advance standing. Retired empire/territory/adjacency/deploy-range and the `MAX_CHILDREN_*` model in favour of one seat + 2–4 orbiting subagents (Community 2, Professional/Founder 4). The Singularity is gateway + accumulator only and never mines or secures (resolves Bugs #9/#10); genesis seats only the Singularity with inner ranks open (Bug #11). Updated Abstract, §1.3, §4.1–§4.5, Figure 1, §10.1–§10.3, §11.2/§11.3/§11.4/§11.5, §18.5, §19.1–§19.6, §22 parameters, and the glossary. §22 added `GOLDEN_ANGLE_DEG`, `SEATS_INNER_BAND`, the Activity & Seating block (half-life, cheap-action cap, promotion cooldown, edge fade, subagent caps), and `SINGULARITY_*` aliases; dropped `GRID_SIDE`, `NODE_GRID_SPACING`, `HOMENODE_BASE_ANGLE`, `*_DEPLOY_RANGE`, `MAX_CHILDREN_*`. Economic core (subgrid mining, dual staking, BME, 5% ceiling, vesting) unchanged.

**Why:** Align the public protocol specification with the phyllotaxis overhaul (spec `docs/superpowers/specs/2026-06-14-orbital-lattice-overhaul-design.md`, rev 2) and the chain params landed in Plan 2 (`chain/agentic/params.py`). §22 values are cross-checked against the code by `chain/tests/test_whitepaper_audit.py`.

---

## 2026-05-14 — Whitepaper v1.1 (Open-Grid Revision)

**Changed:** `whitepaper.md` from v1.0 to v1.1. Retired the four-arm logarithmic spiral spatial model. Factions are now identity classes, not territorial divisions. AGNTC no longer split 25%/25%/25%/25% by faction-arm; mints directly to claimants. Machines accumulator preserved structurally via permanent origin occupancy. New §4.5 "Open-Grid Spatial Economy" added. Updated Abstract, §1.3, §4.1, §4.2, §4.3, Figure 1, §10.1, §10.2, §10.3, §11.2, §12.3, §19.1, §19.2, §19.3, §22 parameters, §22 Genesis Topology, and the glossary. Removed `DIST_*=0.25` parameter rows; added `MACHINES_ORIGIN_COORD = (0, 0)`. Internal revision log (`whitepaper-changelog.md`, gitignored) updated with the corresponding v2.0 entry.

**Why:** Align the public protocol specification with the open-grid implementation that landed in the reference client (PRs #84/#85/#86). v1.0 described territorial faction arms that the implementation no longer enforces.

---

## 2026-03-28 — Security hardening + Supabase sync additions

**Changed:** `agentic-chain/agentic/testnet/supabase_sync.py` — removed hardcoded service_role key, moved to env vars via python-dotenv. Added sync functions for new `subgrid_allocations` and `resource_rewards` tables.
**Changed:** `agentic-chain/agentic/testnet/api.py` — CORS restricted to specific origins, admin-gated `/api/reset` and `/api/automine`, rate limiting via SlowAPI, WebSocket cap at 50.

---

## 2026-02-25 — Hierarchical memory system initialized

**Added:**
- `seed.md` (existed, updated with navigation header — vault/seed.md contains canonical game design vision)
- `CLAUDE.md` (this file) — changelog tracking for the vault directory tree
- Sub-CLAUDE.md and seed.md files added across all vault subdirectories

**Why:** Establish hierarchical Claude navigation — seed.md describes purpose, CLAUDE.md tracks history. Claude reads seed.md first, then CLAUDE.md, when entering any directory.

---

## 2026-02-24 — Galaxy grid redesign vision captured

**Added:** `seed.md` — galaxy grid redesign golden prompt recovered from session transcript (was silently dropped by 1500-char watcher limit). Approved design summary added (4-arm spiral, faction system, minigrids as blockchain ledger visualization).

**Why:** The original spec (3217 chars) was lost during compaction. Recovered from `compacted.md` and saved permanently.

---

## 2026-02-23 — Vault knowledge structure established

**Added:** All top-level vault subdirectories (`engineering/`, `product/`, `research/`, `collaborate/`, `ideas/`, `reviews/`, `skills/`, `prompts/`, `_templates/`). Template files in `_templates/` for consistent document formatting.

**Why:** Centralized knowledge base for the ZK Agentic Network project — all non-code artifacts (decisions, research, specs) live here.

---

## 2026-02-25 — Tokenomics v2: organic growth model

**Design:** `docs/plans/2026-02-25-tokenomics-v2-design.md`
**Impl plan:** `docs/plans/2026-02-25-tokenomics-v2-impl.md` (10 tasks, TDD)

**Key changes:**
- Removed scheduled inflation — minting IS inflation (1 AGNTC per coordinate claimed)
- 25/25/25/25 faction distribution (Community/Machines/Founders/Professional)
- Hardness = 16N (grows 2× faster than grid expansion)
- Dynamic grid bounds (no fixed ±3240)
- Genesis supply = 900 AGNTC (9 nodes × 100 coords)
- Machines Faction: AI agents, hardcoded never-sell-below-acquisition-cost
- 50% fee burn on chat/storage/secure/transact
- CommunityPool removed entirely

**Backend commits:** `788b9cb38`..`7f5a00950` (8 files, 26 new tests)
**Frontend commit:** `764195e6b` (11 files — dynamic grid defaults, removed pool references)

---

## 2026-02-25 — Epoch + subgrid implementation complete (commit `a783213a2`)

**Added (backend):** `EpochTracker` (`agentic/galaxy/epoch.py`) — ring-based mining expansion, hardness divides yield. `SubgridAllocator` (`agentic/galaxy/subgrid.py`) — 4-type sub-cell allocation (Secure/Develop/Research/Storage), 64 cells, `level^0.8` scaling.
**Added (API):** `/api/epoch`, `/api/resources/{wallet_index}`, `/api/resources/{wallet_index}/assign`.
**Added (frontend):** `gameStore.ts` `energy`→`cpuTokens` rename + 9 new resource fields; `ResourceBar.tsx` 5-counter HUD; `useGameRealtime.ts` chain resource fetch.

---

## 2026-02-25 — Resource system redesign approved

**Added:** `docs/plans/2026-02-25-resource-system-design.md` — full resource model revision.

**Key decisions:**
- CPU Energy renamed to **CPU Tokens** (read-only cumulative proof-of-work counter)
- **CPU Staked** introduced (active + all-time, driven by Secure sub-agent token spend)
- **Subgrid allocation panel** — private 8×8 inner grid assigns sub-cells to 4 autonomous agent types
- 4 types: Secure (AGNTC), Develop (dev points), Research (research points), Storage (ZK data on-chain)
- Level scaling: `output = base × level^0.8`
- Canonical design captured in `vault/seed.md` under "Resource System Redesign"

**Also updated:** `vault/seed.md` with approved design summary.

---

## 2026-03-09 — Whitepaper v1.1 academic upgrade + companion documents

**Changed:** `whitepaper.md` upgraded from v1.0 to v1.1 (1964 -> 2413 lines). Major additions:
- Formal adversary model and 3 security properties (VER-INT, VER-PRIV, COM-UNBIAS)
- PoAIV pseudocode (committee selection, attestation protocol)
- Per-mechanism attack analysis (5 attack vectors with mitigations)
- 6 ASCII diagrams (grid, block lifecycle, staking, subgrid, ZK pipeline, migration)
- Competitor comparison table (vs Bitcoin, Ethereum, Solana, Zcash, Bittensor)
- Limitations and Open Problems section (7 honest disclosures incl. ZKML gap)
- VRF specification (Ed25519, RFC 9381), ZK circuit architecture overview
- Completed the staking yield-schedule table (the term "APY" was later retired from public copy per the value-language discipline), fixed Gini coefficient formula, fixed VRF selection formula
- CPU measurement trust assumptions and mitigation roadmap
- 7 new references [29]-[35]

**Added:**
- `vault/poaiv-formal.md` — PoAIV formal paper (~20 pages, security games, proofs, anti-injection)
- `vault/feasibility-report.md` — technology assessment, risk analysis, competitor positioning (~15 pages)
- `vault/litepaper.md` — 6-page investor-friendly overview
- `vault/whitepaper-v1-0.md` — backup of v1.0

**Design:** `docs/plans/2026-03-09-whitepaper-v1-1-academic-upgrade-design.md`
**Plan:** `docs/plans/2026-03-09-whitepaper-v1-1-academic-upgrade-impl.md`

---

## Pending (historical — Feb/Mar-2026 era)

> Kept for archaeology; superseded by the v1.1–v1.6 revisions. `research/competitors/` was filled 2026-02-25; base rates and subgrid parameters have since been defined in `chain/agentic/params.py` (the source of truth, guarded by `chain/tests/test_whitepaper_audit.py`); the PoE section was overtaken by Proof-of-Vault (§5A) and PoAW (§5B).
