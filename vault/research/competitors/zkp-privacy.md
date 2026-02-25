# ZK Proof Systems and Privacy Algorithms — Research Report

**Date:** 2026-02-25
**Purpose:** Research into zero-knowledge proof systems and privacy algorithms relevant to ZK Agentic Network's private subgrid state, resource ownership proofs, and NCP (neural communication packet) privacy. Our system uses Sparse Merkle Trees (depth 26) with nullifiers for ownership proofs.

---

## Table of Contents

1. [ZK-SNARK Systems](#1-zk-snark-systems)
   - Groth16
   - PLONK
   - Halo2
   - Nova / SuperNova / HyperNova Folding Schemes
2. [ZK-STARK Systems](#2-zk-stark-systems)
3. [zkEVM Projects](#3-zkevm-projects)
4. [Aztec Network](#4-aztec-network)
5. [Mina Protocol](#5-mina-protocol)
6. [Zcash / Sapling](#6-zcash--sapling)
7. [Tornado Cash Privacy Pool Design](#7-tornado-cash-privacy-pool-design)
8. [Semaphore / RLN](#8-semaphore--rln)
9. [FHE (Fully Homomorphic Encryption)](#9-fhe-fully-homomorphic-encryption)
10. [MPC (Multi-Party Computation)](#10-mpc-multi-party-computation)
11. [Comparison Matrix](#11-comparison-matrix)
12. [Recommendations for ZK Agentic Network](#12-recommendations-for-zk-agentic-network)
13. [Sources](#13-sources)

---

## 1. ZK-SNARK Systems

### 1.1 Groth16

**Overview:**
Groth16 is the most widely deployed ZK-SNARK in production. Introduced by Jens Groth in 2016, it produces the smallest proof sizes of any currently practical system and has extremely fast on-chain verification.

**Core crypto primitive:** R1CS (Rank-1 Constraint System) with pairing-based cryptography (BN128 or BLS12-381 curves). Uses bilinear pairings over elliptic curves.

**Performance:**
- Proof size: ~128–200 bytes (2 G1 elements + 1 G2 element). Smallest of all practical ZK-SNARK systems.
- Verification time: Extremely fast — requires only 3 pairing checks regardless of circuit size, typically sub-millisecond on-chain.
- Proving time: Fast for well-optimized circuits; proving large SHA256 circuits requires ~8 GB RAM. GPU acceleration (e.g. ICICLE-Snark) can bring Groth16 proving times down significantly.
- Trust setup: Circuit-specific trusted setup ("toxic waste" ceremony per circuit). Cannot reuse setup across circuits. This is the main practical drawback.

**Privacy guarantees:** Computational soundness under the q-strong Diffie-Hellman and related assumptions. Proof reveals nothing beyond validity of statement.

**Language / tooling:**
- Circom (domain-specific language, Rust backend), snarkjs (JS/WASM), gnark (Go), rapidsnark (C++ prover)
- Circom has a mature ecosystem: CircomLib (hundreds of circuits), Circomspect (static analysis), Hardhat-zkit, Circomkit for testing.

**Relevance to our SMT + nullifier design:**
High. Groth16 is widely used for nullifier-based systems (it powers Zcash Sprout). Our depth-26 SMT membership proofs with nullifiers map well onto R1CS. The circuit-specific trusted setup is the key downside — each distinct proof type (ownership proof, subgrid state proof, NCP proof) requires its own ceremony. For a testnet this is acceptable; for mainnet, a universal setup system (PLONK/Halo2) may be preferable.

---

### 1.2 PLONK

**Overview:**
PLONK (Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge) introduced the concept of a universal and updateable trusted setup — a single ceremony reusable across any circuit of up to a maximum degree. TurboPLONK and UltraPLONK are optimized variants.

**Core crypto primitive:** Polynomial commitment schemes (KZG10 by default, or IPA). Permutation arguments over evaluation domains.

**Performance:**
- Proof size: ~800–900 bytes (9 G1 elements + 7 field elements). Roughly 5–7x larger than Groth16.
- Verification time: Slightly higher than Groth16 (~10% more gas on-chain), still fast.
- Proving time: Aztec benchmarks show PLONK (TurboPLONK) is 2.5x–5x faster than Groth16 on hash functions like MiMC and Pedersen. General performance varies by circuit.
- Trust setup: Universal and updateable — one "powers of tau" ceremony reusable for all circuits up to a degree bound. This is a significant practical advantage over Groth16.

**Privacy guarantees:** Same computational soundness as Groth16 under KZG assumptions.

**Language / tooling:**
- Aztec's Barretenberg backend (C++), gnark (Go), snarkjs (supports PLONK via powers of tau)
- Noir language compiles to PLONK via Barretenberg by default

**Relevance:**
Very high. The universal setup makes PLONK superior for a system with multiple distinct circuit types (our three proof use cases: resource ownership, subgrid state, NCP). No new ceremony needed per circuit type.

---

### 1.3 Halo2

**Overview:**
Halo2 was developed by the Electric Coin Company (Zcash) and eliminates the trusted setup entirely using an Inner Product Argument (IPA) polynomial commitment. It supports recursive proof composition natively and is widely adopted by Protocol Labs, Ethereum Foundation PSE, Scroll, and Taiko.

**Core crypto primitive:** IPA (Inner Product Argument) with Pedersen commitments over Pasta curves (Pallas/Vesta). Custom gate support via "custom constraints."

**Performance:**
- Proof size: Larger than PLONK due to IPA (~2–10 KB depending on circuit size). Halo2 uses accumulation to partially mitigate this in recursive contexts.
- Verification time: Moderate; IPA verification is more expensive than KZG pairing checks.
- Proving time: Generally slower than Groth16 for large circuits. Halo2 is well-suited for circuits with custom constraints (lookup arguments, range checks) which are expensive in other systems.
- Trust setup: None required (IPA is transparent). Significant advantage for production trustlessness.

**Privacy guarantees:** Conjectured secure under discrete log assumption (no pairings). Information-theoretically hiding commitments.

**Language / tooling:**
- Rust-based circuit API (halo2 crate by zcash)
- Used by Scroll and Taiko for their zkEVM circuits
- Relatively high learning curve compared to Circom/Noir

**Relevance:**
Moderate-high. No trusted setup is attractive for a decentralized game where no trusted party should exist. Recursive composition (accumulation) is useful for batching multiple proof types. The larger proof sizes and slower proving are drawbacks for real-time game interactions. Best fit for infrequent high-value operations (e.g. batch settling subgrid states).

---

### 1.4 Nova / SuperNova / HyperNova Folding Schemes

**Overview:**
Nova (Microsoft Research, 2021) introduced folding schemes for Incrementally Verifiable Computation (IVC). Instead of recursively composing SNARKs (expensive), Nova folds multiple instances of the same circuit together incrementally. SuperNova extends this to multiple circuit types. HyperNova (CRYPTO 2024) extends to Customizable Constraint Systems (CCS), simultaneously generalizing R1CS, PLONK, and AIR.

**Core crypto primitive:**
- Nova: R1CS relaxation + Pedersen commitments
- HyperNova: CCS + multi-linear polynomial commitments (Spartan-style)
- MicroNova: On-chain efficient version with HyperKZG polynomial commitment, presented at IEEE S&P 2025

**Performance:**
- Per-step IVC prover cost: ~1 µs/constraint (extremely fast incremental proving)
- Compressed proof cost: ~24 µs/constraint
- Compressed proof size: ~8–9 KB
- Trust setup: None for Nova (uses Pedersen), structured for HyperNova with HyperKZG

**Privacy guarantees:** Argument of knowledge under DLog/DLEQ assumptions. Note that Nova itself is not a ZK proof — it is an argument of knowledge. A separate "compression" step (Spartan or similar) is needed to produce the final ZK proof.

**Language / tooling:**
- microsoft/Nova (Rust), lurk-lab awesome-folding collection
- Experimental/research-grade; not yet production mainstream
- Efficient GKR-based IVC scheme published at ePrint 2025 (collaborative proving variant)

**Relevance:**
High for long-running computations — specifically for the blockchain epoch system where we need to prove correct execution of many sequential blocks. Folding is ideal for "prove that epoch N was correctly computed from epoch N-1." Less suited for single-shot proofs (resource ownership, NCP). HyperNova's CCS support makes it the most flexible folding scheme for mixed circuit types.

---

## 2. ZK-STARK Systems

### 2.1 StarkWare / StarkNet

**Overview:**
ZK-STARKs (Scalable Transparent Arguments of Knowledge) use hash-based cryptography (FRI polynomial commitment) instead of pairing-based cryptography. They require no trusted setup and are quantum-resistant.

**Core crypto primitive:** FRI (Fast Reed-Solomon IOP of Proximity) commitment scheme over prime fields. Polynomial IOPs.

**Performance:**
- Proof size: Large (~100–500 KB for general computations). Verification compresses to ~logarithmic in computation size.
- Verification time: Logarithmic in computation size O(log T)
- Proving time: Quasi-linear O(T log T). S-two (StarkWare's latest prover, 2025) achieves 28x–39x speed improvements over competing zkVM precompiles. S-two can prove the entire Bitcoin header chain on a Raspberry Pi in ~25 ms.
- Trust setup: None. Transparent — all randomness from Fiat-Shamir.
- Quantum resistance: Yes (hash-based, not pairing-based).

**StarkNet specifics:**
- Powers 1+ trillion USD volume, 1+ billion transactions
- Cairo language for writing provable programs (native STARK targets)
- Recursive STARKs in production — many proofs rolled into one proof
- S-two prover (2025): "fastest prover for real-world ZK applications"
- Starknet 2025 review: upgrades toward decentralization, BTCFi integration, privacy roadmap

**Cairo Language:**
Cairo is purpose-built for STARK-based programs. Uses a VM-like execution trace model. Learning curve is significant for developers coming from Solidity/Rust but has strong tooling support.

**Relevance:**
Moderate for our use case. STARKs shine for large-scale computation verification (L2 rollups, VM execution traces), not small private state operations. Proof sizes are too large for frequent on-chain game interactions. However, the quantum resistance and no-trusted-setup properties are ideal long-term. Relevant if we eventually aggregate many game state transitions into a STARK proof.

---

## 3. zkEVM Projects

The major zkEVM projects (Polygon zkEVM, zkSync Era, Scroll, Linea, Taiko) focus on scaling Ethereum execution rather than application-layer privacy. Their primary goal is proving EVM state transitions, not hiding user data.

### 3.1 Architecture Types

| Type | Example | Characteristic |
|------|---------|----------------|
| Type 1 | Taiko | Full Ethereum equivalence, modified Geth client |
| Type 2 | Scroll, Linea | Full EVM compatibility, ZK-optimized |
| Type 3 | Polygon zkEVM | Modified EVM opcodes for circuit efficiency |
| Type 4 | zkSync Era | Custom VM (LLVM-compiled), fastest proving |

### 3.2 Key Performance Notes

- **Polygon zkEVM:** Uses PLONK + STARK combo — inner STARKs for fast proving, outer SNARK for compact on-chain verification.
- **Scroll:** Uses Halo2-based circuits, $748M TVL as of June 2025, dominant zkEVM by market share.
- **Linea:** ConsenSys R&D, lattice-powered prover, avoids trusted setup. Multi-prover architecture mitigates single-point-of-failure.
- **zkSync Era (Type 4):** LLVM-based compilation. Sub-50ms verification times with 288-byte proof sizes reported in some benchmarks.
- **Ethereum L1 zkEVM (2025):** Ethereum Foundation published "Shipping an L1 zkEVM #1: Realtime Proving" in July 2025 — formal roadmap to bring ZK proving to Ethereum L1.

### 3.3 Privacy Gap

None of the above zkEVM projects provide application-layer privacy by default. They prove that public state transitions are correct — not that state is hidden. For our private subgrid requirement, using these chains as the underlying L1/L2 would require additional ZK layers (like Aztec or FHE) on top.

**Relevance:** Low for direct privacy use. High as deployment infrastructure — our ZK proofs can be verified on-chain via a zkSync Era or Scroll contract.

---

## 4. Aztec Network

### 4.1 Overview

Aztec is a privacy-first Layer 2 on Ethereum. In November 2025, the Aztec Ignition Chain launched as the first decentralized private L2 on Ethereum, with 3,400+ sequencers across 185+ operators on 5 continents.

**Architecture:**
- Hybrid ZK rollup: one layer encrypts (privacy), another layer compresses (scalability)
- Client-side proofs: sensitive data never leaves the user's machine; only ZK proofs are submitted on-chain
- Private state: note-based UTXO model (similar to Zcash) for private balances and state
- Public functions: Solidity-compatible public execution layer

### 4.2 Noir Language

Noir is a Rust-inspired domain-specific language for ZK circuits, backend-agnostic:
- Compiles to ACIR (Abstract Circuit IR)
- Default backend: Barretenberg (PLONK-based, developed by Aztec)
- Can target other backends: Marlin (R1CS), other PLONK variants
- Aztec's core privacy circuits were rewritten from C++ to Noir by 3 engineers in under one month
- NoirJS: run ZK proof generation directly in the browser
- Noir 1.0 pre-release announced; stable browser proving achieved

**Performance:**
- Proving backend (Barretenberg) is the main contributor to proving time
- Circuit compilation time governed by Noir toolchain
- PLONK-class performance: ~800-byte proofs, fast verification

### 4.3 Privacy Guarantees

- Client-side proof generation: zero data exposure to network
- Note nullifiers: UTXO-style private notes with Zcash-inspired nullifier scheme
- Programmable privacy: specify privacy at user, data, metadata, transaction, or contract logic level
- Public keyword `pub` exposes specific fields; private by default
- Decentralized proving/sequencing baked into protocol (no centralized party)

### 4.4 Aztec.nr Framework

Aztec.nr gives Noir smart-contract syntax for private state, functions, and inter-contract calls. Enables:
- Private token balances
- Private NFT ownership
- Private function calls with selective disclosure

**Relevance:** Very high. Aztec's private note + nullifier model is architecturally identical to our SMT + nullifier design. Noir is the closest available language to what we would write our circuits in. The UTXO note model maps directly to our "private subgrid cells" concept. Client-side proving matches our requirement that subgrid state stays with the owner. Consider adopting Noir as the circuit language for our ZK proofs and targeting Barretenberg as the proving backend.

---

## 5. Mina Protocol

### 5.1 Overview

Mina maintains a constant 22 KB blockchain size using recursive zk-SNARKs — the entire chain history is compressed into a single, always-updatable proof. Anyone can verify the entire chain state from a browser.

**Core primitive:** Recursive Pickles protocol (Kimchi/Pasta curves), o1js (TypeScript SDK)

### 5.2 How It Works

Recursive zk-SNARKs allow each new block to contain a proof that "everything up to and including this block is valid." The proof does not grow with chain length. Verification is constant time regardless of chain age.

**Performance (2025):**
- Blockchain size: constant 22 KB
- Zeko (Mina L2): 100x faster slot times than base Mina, 50x faster post-Mesa Upgrade
- Silvana testnet: 1+ million proof generations processed
- Transaction finality: still slower than EVM chains for interactive use cases

### 5.3 o1js / zkApps

zkApps are Mina's smart contracts written in TypeScript using o1js. They run entirely client-side — computation happens in the browser and only the proof is submitted on-chain.

**Relevance:** Moderate. The recursive proof architecture is conceptually useful for our epoch system (each epoch proves the previous). The TypeScript-native o1js SDK has good developer ergonomics for a Next.js project. However, Mina's ecosystem is smaller than Ethereum's and its mainnet TPS remains limited. Good reference architecture for our epoch proof design.

---

## 6. Zcash / Sapling

### 6.1 Overview

Zcash introduced practical ZK-SNARKs to production blockchain in 2016 (Sprout, using Groth16). The Sapling upgrade (2018) drastically improved performance with new circuit design. Zcash's nullifier scheme is the canonical reference for private ownership proofs.

### 6.2 Sapling Note and Nullifier Design

**Note commitment scheme:**
A note (value, owner_pubkey, memo, randomness) is committed using a Pedersen hash: `cm = Commit(note, rcm)`. The commitment is added to a Merkle tree of note commitments.

**Nullifier scheme:**
```
nf = PRF_nk(rho)
```
Where:
- `nk` = nullifier deriving key (derived from spending key)
- `rho` = a position-dependent value derived from the note

Properties:
- Only the legitimate owner can compute the nullifier (requires `nk`)
- Nullifier looks like a random field element — no linkage to the original note
- Once spent, `nf` is added to the on-chain nullifier set
- Double-spend: full nodes reject any transaction whose nullifier is already in the set

**ZK proof for spending:**
The spend ZK proof proves (without revealing):
1. Knowledge of a valid note with commitment `cm` that is in the Merkle tree at some path
2. Knowledge of the spending key that derives to `nk`
3. The nullifier `nf` was correctly computed from `nk` and `rho`

**Circuit depth:** Sapling uses a depth-32 Merkle tree of note commitments, with Pedersen hashes throughout. Our depth-26 SMT is directly analogous.

### 6.3 Zcash Protocol Specification (2025)

The Zcash protocol specification is versioned and actively maintained at zips.z.cash. The 2025.6.3 version covers both the Sapling and current NU6.1 protocol. The Sapling design document in the Zcash GitHub remains one of the best references for nullifier-based ownership proofs.

**Relevance:** Extremely high. Zcash Sapling is the direct ancestor of our SMT + nullifier approach. Our depth-26 SMT ownership proofs should follow the same nullifier derivation design: `nf = PRF_nk(position_dependent_value)`. The key lesson from Zerocash-to-Sapling: include the spending key in nullifier computation to prevent a note from being spendable by multiple parties (original Zerocash vulnerability).

---

## 7. Tornado Cash Privacy Pool Design

*Note: Referenced as a technical design study only — not for cloning or regulatory non-compliance.*

### 7.1 Core Design

Tornado Cash implements a privacy pool using:
1. **Commitment:** User generates `secret ∈ B248` and `nullifier ∈ B248`, computes `commitment = MiMC(nullifier, secret)`, deposits ETH + commitment on-chain.
2. **Merkle tree:** All commitments accumulate in an on-chain Merkle tree (using MiMC hashes throughout for circuit efficiency).
3. **Withdrawal proof:** User provides ZK proof (Groth16) proving knowledge of `(secret, nullifier, merkle_path)` such that `commitment` is in the tree, without revealing which commitment.
4. **Nullifier reveal:** The `nullifier_hash = MiMC(nullifier)` is posted publicly. The smart contract checks this hash is not already in the spent set.

**Privacy mechanism:** Even though `nullifier_hash` is public, the original `nullifier` and `secret` are not. Without breaking MiMC, an observer cannot link `nullifier_hash` to any specific commitment in the tree.

### 7.2 Key Design Lessons for Our System

- **Split deposit data:** The commitment/nullifier split (secret for ownership, nullifier for spending) maps cleanly to our system: the "secret" is the user's private subgrid data, the "nullifier" is what gets revealed on-chain when claiming ownership.
- **MiMC hash:** ZK-friendly hash function. SHA256 is expensive in circuits; Pedersen and MiMC/Poseidon are 10–50x cheaper. Our Merkle tree should use Poseidon (the current state-of-the-art ZK-friendly hash, used by Aztec and others).
- **Deposit/withdrawal separation:** Two-phase interaction maps well to our "claim node" (deposit) / "prove ownership" (withdrawal) flow.
- **Nova upgrade:** Tornado Cash Nova supports arbitrary amounts (shielded UTXO model) rather than fixed denominations — directly relevant for our variable resource amounts.

**Relevance:** Very high for design pattern. The commit-reveal-nullifier pattern is exactly what we need for NCP privacy and resource ownership proofs.

---

## 8. Semaphore / RLN

### 8.1 Semaphore

Semaphore is an Ethereum Foundation PSE (Privacy and Scaling Explorations) project providing ZK group membership proofs. Users can prove they are a member of a group (Merkle tree of identity commitments) without revealing which member they are.

**Core primitive:** Groth16 proofs (or PLONK variant) over identity commitment Merkle tree.

**Use cases:** Anonymous voting, anonymous signaling, whistleblowing, anonymous message broadcasting.

### 8.2 RLN (Rate-Limiting Nullifier)

RLN extends Semaphore with rate limiting — members can send messages anonymously but are limited to N messages per epoch. If they exceed the limit, their identity is automatically revealed (via Shamir secret sharing of their private key across messages).

**Mechanism:**
- User registers by staking ERC-20 tokens in an RLN contract
- Per-message proof: proves group membership + that this is the user's k-th message in the epoch
- If user sends k+1 messages, enough information is on-chain to reconstruct their private key → automatic slashing
- Nullifiers track "has this user already sent their quota this epoch"

**Applications in PSE projects:**
- Voting (1 vote per election)
- Chat rate limiting (1 message/second)
- CDN DoS protection
- Anonymous bid auctions with rate limits

**Relevance:** High for NCP privacy. Our Neural Communication Packets need rate limiting (prevent spam, maintain network integrity) while preserving sender anonymity. RLN is a drop-in design for: "prove you are a valid network participant, you have not exceeded your message quota this epoch, without revealing who you are." The staking mechanism maps to our CPU Energy resource.

---

## 9. FHE (Fully Homomorphic Encryption)

### 9.1 Overview

FHE allows computation directly on encrypted data — the server never sees plaintext. Unlike ZK proofs (which prove a computation was done correctly), FHE enables a third party to perform computation on your data without learning it.

**Core primitive:** TFHE (Fast Fully Homomorphic Encryption over the Torus), BFV/BGV schemes. Zama's Concrete compiler translates Python programs into FHE equivalents using TFHE-rs.

### 9.2 Zama / fhEVM (2025)

**fhEVM** (Fully Homomorphic EVM): Enables confidential smart contracts on EVM-compatible chains by treating FHE ciphertext as first-class on-chain values.

Key architecture:
- FHE operations are executed symbolically on the host chain
- Actual encrypted computations offloaded asynchronously to a co-processor
- Developers use `euint32`, `euint64`, `ebool` encrypted types in Solidity

**2025 milestones:**
- July 2025: fhEVM public testnet (v0.7) launched — first public FHE smart contracts on Ethereum
- fhEVM v0.6: Coprocessor released, allowing any EVM chain to use FHE
- Zama Concrete v2.10 (April 2025): Rust support, multiple precision, TFHE-rs v1.1 compatibility
- Claimed: 20 TPS per chain currently, targeting 1,000 TPS

**Performance limitations:**
FHE is computationally expensive — simple operations on encrypted values take milliseconds to seconds. Not suitable for real-time game interactions. Latency is orders of magnitude higher than ZK proofs.

### 9.3 Comparison: FHE vs ZK Proofs

| Property | ZK Proofs | FHE |
|----------|-----------|-----|
| What is proven | Correctness of computation | Computation on encrypted data |
| Data stays private | Yes (prover has it) | Yes (server never sees plaintext) |
| Computational cost | Moderate (proving) | Very high (all operations) |
| Suitable for real-time | Yes (sub-second proving) | No (seconds per operation) |
| On-chain verification | Yes (small proof) | Growing (co-processor model) |
| Maturity | Production | Early production (2025) |

**Relevance:** Low-to-moderate for real-time gameplay. FHE is too slow for per-interaction proofs in a live game. However, it is a compelling option for protecting stored private state (subgrid contents) where latency is acceptable — e.g. encrypting the contents of a user's 8x8 subgrid in a way that even our server cannot read it, with computation on encrypted state possible for specific aggregation operations.

---

## 10. MPC (Multi-Party Computation)

### 10.1 Overview

MPC allows multiple parties to jointly compute a function over their private inputs without any party learning other inputs. Unlike FHE (single-party computation on encrypted data) or ZK (one party proves to another), MPC involves N parties all contributing secret shares.

**Core primitives:**
- Shamir Secret Sharing: split secret S into N shares where any K shares reconstruct S
- Additive Secret Sharing: simpler, requires all parties to reconstruct
- Garbled Circuits (Yao's protocol): 2-party secure computation
- SPDZ protocol: maliciously-secure MPC with preprocessing

### 10.2 Blockchain Applications (2025)

**MPC wallets:** The dominant 2025 production use case. Private keys are split across N parties (devices/signers); a threshold K-of-N must collaborate to sign, but the key is never assembled in one place. Used by Fireblocks, Copper, and others for institutional custody.

**State-level MPC:**
Research paper "Scalable Multiparty Computation from Non-linear Secret Sharing" (ePrint 2025) introduces new efficiency improvements. Permissioned blockchain studies show MPC can be integrated with distributed ledgers for privacy-preserving analytics without revealing individual records.

**2025 applications (Partisia):**
- Privacy-preserving student ID (facial recognition + decentralized identity)
- Healthcare analytics across institutions without data sharing
- Cross-border digital identity

### 10.3 MPC vs ZK for Our Use Case

| Scenario | MPC | ZK Proofs |
|----------|-----|-----------|
| Subgrid state kept private | All N parties hold shares; need K to reconstruct — adds trust on parties | Single user holds state; proves properties without revealing |
| Resource ownership proof | Impractical — requires active participation of all parties | Single non-interactive proof, better fit |
| NCP anonymous messaging | MPC mix-networks possible but complex | Semaphore/RLN cleaner |
| Epoch state aggregation | Useful for distributed computation across validators | ZK batch proofs more efficient |

**Relevance:** Moderate. MPC is most relevant if we want a threshold-key model for high-value node ownership — e.g. a guild collectively owning a star system with 3-of-5 key shares required to authorize actions. Not the right tool for individual-user private state proofs.

---

## 11. Comparison Matrix

| System | Proof Size | Proving Time | Verification Time | Trusted Setup | Quantum-Safe | ZK (Full Privacy) | Language | Maturity |
|--------|-----------|--------------|-------------------|---------------|--------------|-------------------|----------|----------|
| Groth16 | ~128–200 B | Fast | Very fast | Per-circuit | No | Yes | Circom, gnark | Production |
| PLONK | ~800–900 B | Moderate | Fast | Universal | No | Yes | Noir, Circom, gnark | Production |
| Halo2 | ~2–10 KB | Moderate-slow | Moderate | None | No | Yes | Rust (halo2) | Production |
| Nova/HyperNova | ~8–9 KB | ~1 µs/step | Moderate | Structured | No | No (needs compression) | Rust | Research/Early |
| ZK-STARK | ~100–500 KB | Fast (S-two: very fast) | O(log T) | None | Yes | Yes | Cairo, Rust | Production |
| Aztec/Noir | ~800 B (PLONK) | Moderate | Fast | Universal | No | Yes | Noir (TypeScript-like) | Production (2025) |
| Mina/Pickles | Constant 22 KB chain | Slow (block) | Constant | None | No | Yes | o1js (TypeScript) | Production |
| Zcash/Sapling | ~192 B (Groth16) | ~2.3 s (CPU) | ~2 ms | Per-circuit | No | Yes | Rust (librustzcash) | Production |
| Semaphore | ~256 B | Fast (Groth16) | Very fast | Per-circuit | No | Yes | Circom/Solidity | Production |
| RLN | ~256 B | Fast | Very fast | Per-circuit | No | Yes | Circom/Rust | Production |
| FHE (Zama) | N/A (encrypted) | Very slow (ms–s/op) | N/A | None | Yes | Computation-private | Solidity+fhEVM | Early prod. |
| MPC | N/A (distributed) | Varies | N/A | None | Yes | Depends on protocol | Various | Production (wallets) |

---

## 12. Recommendations for ZK Agentic Network

### 12.1 Use Case Analysis

Our three ZK proof requirements:

**A. Resource Ownership Without Revealing Amounts**
Prove "I own ≥ X of resource Y" or "I own this AGNTC at coordinate (x,y)" without revealing exact balance.

**B. Private Subgrid State Verification**
An 8x8 inner panel per user that is hidden from other users. Prove the state is valid (e.g. within bounds, consistent with previous state) without revealing contents.

**C. NCP (Neural Communication Packet) Privacy**
Prove a message was sent by a valid network participant within their quota, without revealing sender identity.

---

### 12.2 Recommended Stack

#### Circuit Language: Noir (Aztec)

Noir is the best fit because:
1. Rust-like syntax — close to our existing TypeScript/Rust codebase
2. Backend-agnostic (can swap PLONK → Groth16 → Halo2 as needs evolve)
3. Default Barretenberg backend uses universal PLONK setup (one ceremony for all circuits)
4. NoirJS enables client-side proving in the browser — critical for client-side subgrid privacy
5. Aztec's own private note/nullifier model is directly applicable to our design
6. EF ZK grants actively funding Noir projects (grants wave announced 2025)

**Alternative if Noir proves immature:** Circom + snarkjs (proven, large ecosystem, good browser support via WASM)

#### Nullifier Scheme: Zcash Sapling Pattern

For **resource ownership** and **subgrid state** proofs, adopt the Sapling nullifier design:
```
commitment = Poseidon(note_value, owner_pubkey, randomness)
nullifier = PRF_nk(position_or_note_id)
```
Key decisions:
- Use **Poseidon hash** (not SHA256, not MiMC) — the current state-of-the-art ZK-friendly hash, 10–50x cheaper in circuits than SHA256, used by Aztec, Zcash Orchard, and most 2025 systems
- Include spending key in nullifier derivation (Sapling lesson: prevents multi-party spending attacks)
- Depth-26 SMT is directly compatible with Sapling-style Merkle proofs

#### Rate-Limiting for NCPs: RLN (Rate-Limiting Nullifier)

For NCP privacy, use an RLN-style protocol:
- Users register their identity commitment in an on-chain Merkle tree (backed by their wallet/subscription tier)
- Each NCP message includes a ZK proof: "I am a registered member, this is my K-th message in epoch N, epoch ≤ my quota"
- If quota exceeded, private key fragments accumulated on-chain reveal sender → slashing mechanism
- Maps directly to CPU Energy as the staking/registration resource

#### Proving Backend Priority

1. **Short term (testnet):** Groth16 via snarkjs/Circom — fastest on-chain verification, smallest proofs, simplest to get working. Accept the per-circuit trusted setup cost (run a small ceremony per circuit type).
2. **Medium term (pre-mainnet):** Migrate to PLONK/Noir + Barretenberg — universal setup, one ceremony, all circuits covered. ~5x larger proofs but still fast verification.
3. **Long term:** Evaluate Halo2 or Nova for epoch-level batch proofs — no trusted setup, better for recursive proofs of epoch transitions.

#### Subgrid State: Client-Side Proving Pattern

Following Aztec's model:
- User's 8x8 subgrid state is never sent to the server
- When state changes, user generates a ZK proof locally (browser via NoirJS/snarkjs WASM)
- Proof commits to the new state root without revealing contents
- On-chain: only the state root hash and validity proof are recorded
- Server verifies proof; subgrid contents stay client-side

This requires:
- A Merkle root of the 8x8 subgrid (64 cells) as the committed value
- A ZK circuit that proves "new_root is a valid transformation of old_root given the allowed operations"
- Nullifiers for each "cell claim" to prevent double-claiming

#### Hash Function: Poseidon

Replace SHA256/Keccak in ZK circuits with **Poseidon**:
- Designed specifically for ZK proofs (SNARK-friendly)
- ~100x fewer constraints than SHA256 in R1CS
- Used by Aztec, Zcash Orchard, Semaphore, most 2025 ZK projects
- Reference: `poseidon-rs` Rust crate, `@iden3/js-crypto` for browser

---

### 12.3 Implementation Roadmap

**Phase 1 — Proof of concept (testnet):**
- Implement resource ownership proof with Circom + Groth16 + snarkjs
- Depth-26 SMT Merkle inclusion proof circuit
- Nullifier derivation circuit (Poseidon-based)
- On-chain Solidity verifier (auto-generated by snarkjs)
- Trusted setup: run Hermez-style ceremony or use existing Powers of Tau

**Phase 2 — Private subgrid (alpha):**
- Migrate circuits to Noir + Barretenberg (PLONK)
- 8x8 subgrid state root circuit (64-leaf local Merkle tree)
- State transition proof (old_root → new_root given valid operations)
- NoirJS integration for browser-side proving
- Client-side proving in Next.js frontend

**Phase 3 — NCP privacy (beta):**
- RLN-style identity registry contract
- NCP message proof circuit (Noir): membership + epoch rate limit
- Integration with CPU Energy staking mechanic
- Slashing logic for rate-limit violators

**Phase 4 — Epoch proofs (mainnet prep):**
- Evaluate Nova/HyperNova folding for epoch-to-epoch state transitions
- Batch-prove multiple block epochs into single recursive proof
- Transition to Halo2 or HyperNova for no-trusted-setup production system

---

### 12.4 Security Considerations

1. **Nullifier uniqueness is non-negotiable.** The nullifier set must be checked atomically on-chain. Race conditions in nullifier submission can allow double-spending. Use a single smart contract as the nullifier registry.

2. **Poseidon parameter selection matters.** Use only audited Poseidon parameters (e.g. those from the iden3 or Aztec audits). Weak Poseidon parameters have been exploited in CTF challenges.

3. **Trusted setup ceremonies for Groth16** must involve enough participants (ideally 100+) that at least one is honest. For testnet, a smaller ceremony is acceptable with the understanding that it is not production-secure.

4. **Client-side proving surface area:** Users proving subgrid state in-browser means the circuit and witness generation code runs client-side. This code must be thoroughly audited — bugs can allow false proofs.

5. **RLN staking economics:** The staking amount must be calibrated so that the economic cost of deanonymization (losing stake) exceeds the benefit of spamming. This is part of the CPU Energy tokenomics design.

---

## 13. Sources

### ZK-SNARK Systems
- [SoK: Understanding zk-SNARKs — The Gap Between Research and Practice (ePrint 2025)](https://eprint.iacr.org/2025/172.pdf)
- [HOBBIT: Space-Efficient zkSNARK with Optimal Prover Time (ePrint 2025)](https://eprint.iacr.org/2025/1214.pdf)
- [Zero-Knowledge Proof Frameworks: A Systematic Survey (arXiv 2025)](https://arxiv.org/pdf/2502.07063)
- [Plonk vs Groth16 — Mehry Rezaei, Medium](https://medium.com/@mehialiabadi/plonk-vs-groth16-50254c157196)
- [PLONK Benchmarks I — 2.5x faster than Groth16 on MiMC, Aztec](https://aztec.network/blog/plonk-benchmarks-i----2-5x-faster-than-groth16-on-mimc)
- [PLONK Benchmarks II — ~5x faster than Groth16 on Pedersen, Aztec](https://aztec.network/blog/plonk-benchmarks-ii----5x-faster-than-groth16-on-pedersen-hashes)
- [On the Security of Halo2 Proof System, Kudelski Security](https://kudelskisecurity.com/research/on-the-security-of-halo2-proof-system)
- [Explaining Halo 2, Electric Coin Company](https://electriccoin.co/blog/explaining-halo-2/)
- [The Halo2 Proving System (official book)](https://halo2.dev/)
- [Nova: Recursive Zero-Knowledge Arguments from Folding Schemes (ePrint)](https://eprint.iacr.org/2021/370.pdf)
- [HyperNova: Recursive Arguments for Customizable Constraint Systems (Springer)](https://link.springer.com/chapter/10.1007/978-3-031-68403-6_11)
- [Microsoft Nova GitHub](https://github.com/microsoft/Nova)
- [Efficient GKR-based Folding/IVC Scheme (ePrint 2025)](https://eprint.iacr.org/2025/1294.pdf)
- [An Incomplete Guide to Folding: Nova, Sangria, SuperNova, Taiko Mirror](https://taiko.mirror.xyz/tk8LoE-rC2w0MJ4wCWwaJwbq8-Ih8DXnLUf7aJX1FbU)
- [SnarkFold: Efficient Proof Aggregation (ePrint 2023)](https://eprint.iacr.org/2023/1946.pdf)
- [Proof Types — Succinct SP1 Docs](https://docs.succinct.xyz/docs/sp1/generating-proofs/proof-types)
- [Proving Schemes and Curves — gnark Docs](https://docs.gnark.consensys.io/Concepts/schemes_curves)
- [ICICLE-Snark: Fastest Groth16 Implementation](https://www.ingonyama.com/post/icicle-snark-the-fastest-groth16-implementation-in-the-world)

### ZK-STARKs and StarkNet
- [Recursive STARKs, Starknet Blog](https://www.starknet.io/blog/recursive-starks/)
- [Introducing S-two: Fastest prover for real-world ZK applications, StarkWare](https://starkware.co/blog/s-two-prover/)
- [Starknet 2025: Upgrades, Decentralization, BTCFi and Privacy](https://www.starknet.io/blog/starknet-2025-year-in-review/)
- [The ZK Proving Race: StarkWare's Vision](https://www.starknet.io/blog/the-zk-proving-race-starkwares-vision-for-the-future-of-zero-knowledge-proofs/)
- [Top 10 Zero-Knowledge Proof Projects Reshaping Blockchain in 2025, Rumble Fish](https://www.rumblefish.dev/blog/post/top-zk-projects-2025/)

### zkEVM Projects
- [zkEVM Comparison: Polygon zkEVM vs. zkSync Era vs. Linea vs. Scroll, Thirdweb](https://blog.thirdweb.com/polygon-zkevm-vs-zksync-era-vs-linea-vs-scroll-vs-taiko/)
- [Constraint-Level Design of zkEVMs: Architectures, Trade-offs, and Evolution (arXiv)](https://arxiv.org/html/2510.05376v1)
- [ZKsync Era vs Polygon zkEVM Comparative Analysis, CoinBureau](https://coinbureau.com/analysis/zksync-era-vs-polygon-zkevm/)
- [Polygon zkEVM, Scroll, and Linea: New Scaling Frontier, Covalent](https://www.covalenthq.com/blog/zkevms/)

### Aztec Network and Noir
- [Aztec Network: First Decentralized Privacy-Preserving L2 on Ethereum](https://aztec.network/)
- [Introducing Aztec.nr: Aztec's Private Smart Contract Framework, Aztec Blog](https://aztec.network/blog/introducing-aztec-nr-aztecs-private-smart-contract-framework)
- [The Future of ZK Development: Announcing Noir 1.0 Pre-Release, Aztec](https://aztec.network/blog/the-future-of-zk-development-is-here-announcing-the-noir-1-0-pre-release)
- [Announcing NoirJS: Privacy-Preserving ZK Applications in the Browser](https://aztec.network/blog/announcing-noirjs-privacy-preserving-zk-applications-in-your-browser)
- [Ignition Chain Launch, CotiNews](https://www.coti.news/news/ignition-chain-launch-pushes-aztec-closer-to-a-private-world-computer-on-ethereum)
- [Indexed Merkle Tree (Nullifier Tree), Aztec Documentation](https://docs.aztec.network/aztec/concepts/advanced/storage/indexed_merkle_tree)
- [Why Hashes Dominate in SNARKs, Aztec Blog](https://aztec.network/blog/why-hashes-dominate-in-snarks)
- [Noir Language Documentation](https://noir-lang.org/docs/)
- [A Developer's Guide to Building Safe Noir Circuits, OpenZeppelin](https://www.openzeppelin.com/news/developer-guide-to-building-safe-noir-circuits)

### Mina Protocol
- [22kB-Sized Blockchain — A Technical Reference, Mina Protocol](https://minaprotocol.com/blog/22kb-sized-blockchain-a-technical-reference)
- [What are zk-SNARKs? Mina Protocol](https://minaprotocol.com/blog/what-are-zk-snarks)
- [Bringing the Mina Stack to Life with Zeko](https://minaprotocol.com/blog/bringing-the-mina-stack-to-life-with-zeko)
- [Looking back at 2025: A Year of Community and Rebuilding, Mina](https://minaprotocol.com/blog/2025-mina-recap)

### Zcash / Sapling
- [Zcash Protocol Specification 2025.6.3, zips.z.cash](https://zips.z.cash/protocol/sapling.pdf)
- [Zcash Protocol Specification NU6.1, zips.z.cash](https://zips.z.cash/protocol/protocol.pdf)
- [Zcash Protocol Deep Dive: The Cryptography Behind Financial Privacy](https://profincognito.me/blog/privacy/zcash-protocol/)
- [Design of Sapling, Zcash Hackworks GitHub](https://github.com/zcash-hackworks/design-of-sapling-book/blob/master/zerocash.md)
- [Understanding Zcash: A Comprehensive Overview, Messari](https://messari.io/report/understanding-zcash-a-comprehensive-overview)

### Tornado Cash
- [How do privacy pools like Tornado Cash work? Liam Zebedee](https://liamz.co/tech-blog/2024/09/06/how-do-privacy-pools-tornadocash-work.html)
- [Tornado Cash Privacy Solution Whitepaper, Berkeley DeFi](https://berkeley-defi.github.io/assets/material/Tornado%20Cash%20Whitepaper.pdf)
- [Tornado Cash Nova — HackMD](https://hackmd.io/@ak36/tornado_cash_nova)
- [Derecho: Privacy Pools with Proof-Carrying Disclosures (ePrint 2023)](https://eprint.iacr.org/2023/273.pdf)

### Semaphore / RLN
- [Rate-Limiting Nullifier (RLN), PSE Mirror](https://mirror.xyz/privacy-scaling-explorations.eth/iCLmH1JVb7fDqp6Mms2NR001m2_n5OOSHsLF2QrxDnQ)
- [What is RLN, RLN Docs](https://rate-limiting-nullifier.github.io/rln-docs/what_is_rln.html)
- [RLN in Details, RLN Docs](https://rate-limiting-nullifier.github.io/rln-docs/rln_in_details.html)
- [Rate-Limiting Nullifier, PSE Dev](https://pse.dev/projects/rln)
- [RLN JS Client Library, GitHub](https://github.com/Rate-Limiting-Nullifier/rlnjs)
- [Semaphore RLN: Rate Limiting Nullifier for Spam Prevention, Ethereum Research](https://ethresear.ch/t/semaphore-rln-rate-limiting-nullifier-for-spam-prevention-in-anonymous-p2p-setting/5009)

### FHE
- [Zama — Open Source Cryptography](https://www.zama.org)
- [fhEVM GitHub (Zama)](https://github.com/zama-ai/fhevm)
- [Zama Product Releases January 2025](https://www.zama.org/post/zama-product-releases-january-2025)
- [FHE on Blockchain, Zama Protocol Docs](https://docs.zama.org/protocol/protocol/overview)
- [What Is Zama FHE, MEXC Blog](https://blog.mexc.com/news/what-is-zama-fhe-the-1b-unicorn-bringing-private-smart-contracts-to-ethereum-and-shibarium-2026/)

### MPC
- [Secure Multi-Party Computation, Wikipedia](https://en.wikipedia.org/wiki/Secure_multi-party_computation)
- [Scalable Multiparty Computation from Non-linear Secret Sharing (ePrint 2025)](https://eprint.iacr.org/2025/1007.pdf)
- [Multi-Party Computation, Cyfrin](https://www.cyfrin.io/blog/multi-party-computation-secure-private-collaboration)
- [What is MPC, Fireblocks](https://www.fireblocks.com/what-is-mpc)
- [MPC Wallets: Complete Developer Guide 2025, Alchemy](https://www.alchemy.com/overviews/what-is-a-multi-party-computation-mpc-wallet)
- [Using Secure MPC to Protect Privacy on a Permissioned Blockchain, MDPI Sensors](https://www.mdpi.com/1424-8220/21/4/1540)

### Sparse Merkle Trees and ZK State
- [Designing Nullifier Sets for Nomos Zones: Sparse vs Indexed Merkle Trees](https://blog.nomos.tech/designing-nullifier-sets-for-nomos-zones-sparse-vs-indexed-merkle-trees/)
- [Sparse Merkle Trees, Valence Protocol Docs](https://docs.valence.zone/zk/05_sparse_merkle_trees.html)
- [Sparse Merkle Tree, Polygon Knowledge Layer](https://docs.polygon.technology/zkEVM/concepts/sparse-merkle-trees/sparse-merkle-tree/)
- [Merkle Trees, zkopru Docs](https://docs.zkopru.network/how-it-works/merkle-trees)
- [Incremental Merkle Trees in Zero-Knowledge Privacy Systems, Medium](https://medium.com/@jaymakwanna/incremental-merkle-trees-in-zero-knowledge-privacy-systems-from-library-cards-to-cryptographic-040cf884d9e5)

### Circuit Development Tools
- [Circom GitHub, iden3](https://github.com/iden3/circom)
- [snarkjs GitHub, iden3](https://github.com/iden3/snarkjs)
- [Circom Documentation](https://docs.circom.io/getting-started/proving-circuits/)
- [Circom: A Circuit Description Language for Building ZK Applications, IEEE TDSC](https://dl.acm.org/doi/10.1109/TDSC.2022.3232813)

### State of ZKPs 2025
- [The State of ZKPs: 2025 Perspective, Orochi Network](https://orochi.network/blog/The-State-of-ZKPs-2025-Perspective)
- [List of 8 ZK Proving Systems (2025), Alchemy](https://www.alchemy.com/dapps/best/zk-proving-systems)
- [Top Zero-Knowledge (ZK) Proof Crypto Projects of 2025, KuCoin Learn](https://www.kucoin.com/learn/crypto/top-zero-knowledge-zk-proof-crypto-projects)
- [Promise of ZKPs for Blockchain Privacy and Security, Wiley Online Library](https://onlinelibrary.wiley.com/doi/10.1002/spy2.461)
- [Zero-Knowledge Proofs: The Silent Revolution Reshaping Crypto's Future, 2025](https://markets.financialcontent.com/wral/article/breakingcrypto-2025-11-12-zero-knowledge-proofs-the-silent-revolution-reshaping-cryptos-future)

---

*Research compiled 2026-02-25. The ZK landscape evolves rapidly; verify specific performance figures against current benchmarks before implementation decisions.*
