# Enforced Zero-Knowledge L1 Architecture — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement the companion implementation plan task-by-task.

**Goal:** Replace all simulated cryptographic primitives with real ZK proof infrastructure, making every transaction on the Agentic Chain require a verified zero-knowledge proof — no transparent transactions exist.

**Architecture:** Client-side Groth16 proving (snarkjs WASM in browser) for individual transactions, recursive PLONK aggregation per block for validator efficiency, Poseidon hash function throughout, Zcash-derived nullifier scheme for privacy.

**Tech Stack:** Circom (circuit language), snarkjs (prover/verifier, JS/WASM), Poseidon hash (iden3 implementation), BLAKE2b (key derivation), ChaCha20-Poly1305 (encryption), Python + TypeScript.

**Competitor Derivation:** Architecture derived from ZCash Orchard (nullifier design, Poseidon, note commitments) and zkSync Era (recursive proof aggregation, STARK-to-SNARK wrapping, Poseidon2 in-circuit hashing, client-side proving pipeline). Aleo referenced as the only production L1 with per-transaction ZK proofs.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Current State (Gap Analysis)](#2-current-state-gap-analysis)
3. [Cryptographic Primitives](#3-cryptographic-primitives)
4. [Key Derivation Hierarchy](#4-key-derivation-hierarchy)
5. [Note Commitment Scheme](#5-note-commitment-scheme)
6. [Nullifier Scheme](#6-nullifier-scheme)
7. [Merkle Tree Migration](#7-merkle-tree-migration)
8. [Circuit Definitions (4 Types)](#8-circuit-definitions-4-types)
9. [Proving Pipeline](#9-proving-pipeline)
10. [Transaction Format](#10-transaction-format)
11. [Block Validation (Enforced ZK)](#11-block-validation-enforced-zk)
12. [Encryption Upgrade](#12-encryption-upgrade)
13. [Implementation Phases](#13-implementation-phases)
14. [Security Considerations](#14-security-considerations)
15. [Performance Budget](#15-performance-budget)
16. [Migration Strategy](#16-migration-strategy)

---

## 1. Design Principles

### Enforced ZK — No Transparent Pool

Unlike Zcash (where shielded transactions are optional) or Ethereum (where state is public), the Agentic Chain enforces ZK proofs on **every** transaction:

- **No plaintext state on chain.** The ledger stores only commitments, nullifiers, and proofs.
- **No transparent addresses.** Every account interacts through ZK-proven operations.
- **No unverified transactions in blocks.** Validators reject any transaction without a valid proof.
- **No trust assumptions on validators.** Validators cannot see private state — they only verify proofs.

This is architecturally closest to **Aleo** (the only production L1 with per-tx ZK proofs).

### Design Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max client-side proving time | 5 seconds | UX — users won't wait longer in a game |
| Max proof size (per tx) | 256 bytes | Network efficiency — Groth16 proofs |
| Max verification time (per proof) | 2 ms | Validator throughput |
| Max block verification time | 50 ms | Block production cadence |
| Merkle tree depth | 26 | Matches existing SMT (67M leaf capacity) |
| Hash function (in-circuit) | Poseidon | 100x fewer constraints than SHA-256 |
| Hash function (key derivation) | BLAKE2b | Standard, fast, domain-separable |
| Encryption | ChaCha20-Poly1305 | AEAD, constant-time, no padding oracle |

---

## 2. Current State (Gap Analysis)

### Files Requiring Migration

| File | Current Primitive | Target Primitive | Risk |
|------|-------------------|------------------|------|
| `ledger/crypto.py` | SHA-256 domain-separated hash | Poseidon hash (same domain separation) | High — foundation of all commitments |
| `ledger/crypto.py` | SHA-256 nullifier | `PoseidonHash(nk, cm)` | High — must match circuit |
| `ledger/crypto.py` | SHA-256 key derivation | BLAKE2b domain-separated | Medium — breaks all existing keys |
| `ledger/crypto.py` | XOR encryption | ChaCha20-Poly1305 AEAD | Medium — breaks encrypted records |
| `ledger/merkle.py` | `SHA-256(left \|\| right)` | `Poseidon(left, right)` | High — changes all roots |
| `verification/proof.py` | `SimulatedZKProof` (hash digest) | Real Groth16 proof bytes + verifier | Critical — core ZK layer |
| `verification/proof.py` | `SimulatedAttestation` (hash sig) | Ed25519 signature | Medium |
| `ledger/nullifier.py` | SHA-256 nullifier set | Poseidon nullifier set | High — must match circuit |
| `testnet/api.py` | No proof requirement on endpoints | Proof required for all state-changing endpoints | High — API contract change |
| `consensus/block.py` | No proof verification in block validation | Proof verification mandatory | Critical — enforces ZK |

### What Stays the Same

- Sparse Merkle Tree structure (depth 26, sparse dict storage) — only hash function changes
- Domain separation pattern (`b"AgenticCommitment:"`, etc.) — preserved with Poseidon
- Key triple structure (spending, viewing, public) — same hierarchy, different derivation
- Nullifier set semantics (insert + check uniqueness) — same logic, different hash
- All game logic (mining, epochs, subgrids, factions) — unchanged
- API shape (endpoints, request/response format) — adds `proof` field

---

## 3. Cryptographic Primitives

### 3.1 Poseidon Hash

**Why Poseidon:** SHA-256 requires ~27,000 R1CS constraints per hash in a ZK circuit. Poseidon requires ~200-300 constraints — a **100x reduction**. Since every proof includes multiple hashes (commitment, nullifier, Merkle path of 26 levels), this is the single most impactful optimization.

**Parameters (matching Zcash Orchard / iden3 audited):**

| Parameter | Value |
|-----------|-------|
| Field | BN128 scalar field (snarkjs default) |
| Width (t) | 3 (rate 2, capacity 1) |
| S-box | x^5 (Pow5) |
| Full rounds | 8 (4 start, 4 end) |
| Partial rounds | 57 |
| Security level | 128-bit |

**Python implementation:** `poseidon-py` (iden3 reference) or custom using audited round constants.

**In-circuit implementation:** `circomlib/circuits/poseidon.circom` (iden3, production-audited).

### 3.2 BLAKE2b (Key Derivation Only)

Used only **outside** circuits for key derivation. Domain-separated with unique prefixes per key type:

```
spending_key = BLAKE2b-256("Agentic:SpendingKey", seed)
nullifier_key = BLAKE2b-256("Agentic:NullifierKey", spending_key)
viewing_key = BLAKE2b-256("Agentic:ViewingKey", spending_key)
public_key = BLAKE2b-256("Agentic:PublicKey", spending_key)
```

### 3.3 Ed25519 (Signatures)

Replaces `SimulatedAttestation`'s SHA-256 pseudo-signatures. Standard Ed25519 for transaction authorization and attestation signing.

### 3.4 ChaCha20-Poly1305 (Encryption)

Replaces XOR "encryption". AEAD cipher providing confidentiality + integrity. Used for encrypting note data to the recipient's viewing key.

---

## 4. Key Derivation Hierarchy

Simplified from Zcash Orchard (no diversified addresses, no proof-authorizing key):

```
seed (32 bytes, user-generated or from wallet)
  │
  ├── spending_key (sk) = BLAKE2b-256("Agentic:SpendingKey", seed)
  │     │
  │     ├── nullifier_key (nk) = BLAKE2b-256("Agentic:NullifierKey", sk)
  │     │     Used in: nullifier derivation, inside ZK circuit
  │     │
  │     ├── viewing_key (vk) = BLAKE2b-256("Agentic:ViewingKey", sk)
  │     │     Used in: decrypting notes addressed to this user
  │     │
  │     └── public_key (pk) = BLAKE2b-256("Agentic:PublicKey", sk)
  │           Used in: note commitments (recipient), on-chain identity
  │
  └── signing_key (sig_sk) = BLAKE2b-256("Agentic:SigningKey", seed)
        Used in: Ed25519 transaction signatures
        sig_pk = Ed25519_pub(sig_sk)
```

**Comparison with current `generate_key_pair(seed: int)`:**
- Current: Derives from integer seed via SHA-256
- New: Derives from 32-byte seed via BLAKE2b
- Migration: One-time re-derivation at genesis reset or account migration

---

## 5. Note Commitment Scheme

A "note" represents any piece of private state: coordinate ownership, resource balance, subgrid cell state.

### Note Structure

```python
@dataclass
class Note:
    owner_pk: bytes       # 32 bytes — owner's public key
    data: list[int]       # variable — domain-specific payload
    nonce: bytes           # 32 bytes — random blinding factor
    tag: bytes             # 32 bytes — note type identifier
    program_id: bytes      # 32 bytes — which program created this note
```

### Commitment Formula

```
cm = Poseidon(owner_pk, Poseidon(data...), nonce, tag, program_id)
```

For fixed-size notes (most common):
```
cm = Poseidon(owner_pk, d0, d1, d2, nonce, tag)
```

Where the Poseidon sponge absorbs fields sequentially (rate-2, multiple absorptions for >2 inputs).

**Domain separation:** The `tag` field serves the same purpose as the current `b"AgenticCommitment:"` prefix — different note types use different tags.

### On-Chain Storage

Only `cm` (32 bytes) is stored in the Merkle tree. The full note is kept client-side (encrypted to the owner's viewing key).

---

## 6. Nullifier Scheme

Derived from Zcash Orchard, simplified for game context.

### Formula

```
nf = Poseidon(nk, cm)
```

Where:
- `nk` = nullifier key (derived from spending key, known only to owner)
- `cm` = note commitment being spent/consumed

### Properties

| Property | How It's Achieved |
|----------|-------------------|
| **Only owner can compute** | Requires `nk` (derived from spending key) |
| **Unlinkable to commitment** | Poseidon is a PRF — `nf` looks random without `nk` |
| **Collision resistant** | Poseidon collision resistance (128-bit security) |
| **Double-spend prevention** | Nullifier set checked atomically before insertion |

### Simplification from Zcash

Zcash Orchard uses: `nf = Extract_P([PoseidonHash(nk, rho) + psi] * G + cm)`

We simplify to: `nf = Poseidon(nk, cm)`

**Why this is safe for our use case:**
- Zcash needs `rho` (chaining) and `psi` (sender randomness) because notes can be created by senders who don't know the recipient's `nk`. In our system, notes are always created by the owner.
- Zcash needs the elliptic curve operations for sender-unlinkability across diversified addresses. We don't have diversified addresses.
- The simpler formula still provides the three critical properties above.

### In-Circuit Cost

One Poseidon hash = ~200-300 R1CS constraints. This is a single function call in the ownership proof circuit.

---

## 7. Merkle Tree Migration

### Current Implementation (`merkle.py`)

```python
@staticmethod
def _hash_pair(left: bytes, right: bytes) -> bytes:
    """SHA-256(left || right)."""
    return hashlib.sha256(left + right).digest()
```

### Target Implementation

```python
@staticmethod
def _hash_pair(left: bytes, right: bytes) -> bytes:
    """Poseidon(left, right) over BN128 scalar field."""
    # Convert 32-byte inputs to field elements
    l_fe = int.from_bytes(left, 'big') % FIELD_MODULUS
    r_fe = int.from_bytes(right, 'big') % FIELD_MODULUS
    result = poseidon_hash([l_fe, r_fe])
    return result.to_bytes(32, 'big')
```

### What Changes

| Property | Before | After |
|----------|--------|-------|
| Hash function | SHA-256 | Poseidon (BN128 field) |
| Leaf size | 32 bytes | 32 bytes (field element) |
| Root size | 32 bytes | 32 bytes (field element) |
| Proof size | 26 × 32 = 832 bytes | 26 × 32 = 832 bytes |
| Default leaf | `b"\x00" * 32` | `F(0)` as 32 bytes |
| Proof verification | SHA-256 chain | Poseidon chain (matches circuit) |

### Why This Matters for Enforced ZK

The Merkle tree hash function **must match** the circuit's hash function. If the tree uses SHA-256 but the circuit proves Poseidon membership, the proof is meaningless. By migrating the tree to Poseidon, the off-chain tree and in-circuit tree are identical.

---

## 8. Circuit Definitions (4 Types)

### 8.1 Ownership Proof Circuit

**Purpose:** Prove you own a note (coordinate, resource, etc.) without revealing which one.

**Public Inputs (visible on-chain):**
- `merkle_root` — current Merkle root of the note commitment tree
- `nullifier` — the nullifier for the note being proven

**Private Witnesses (known only to prover):**
- `note` — the full note data (owner, data, nonce, tag, program_id)
- `spending_key` — the owner's spending key
- `merkle_path[26]` — 26 sibling hashes from leaf to root
- `leaf_index` — position in the tree

**Circuit Constraints:**
1. Derive `nk = BLAKE2b("Agentic:NullifierKey", spending_key)` — **outside circuit** (nk provided as witness, binding checked via public key derivation)
2. Derive `pk = BLAKE2b("Agentic:PublicKey", spending_key)` — similarly
3. Compute `cm = Poseidon(pk, data..., nonce, tag, program_id)` — ~300 constraints
4. Verify `cm` is at `leaf_index` in the Merkle tree with root `merkle_root` — 26 Poseidon hashes = ~7,800 constraints
5. Compute `nf = Poseidon(nk, cm)` — ~300 constraints
6. Assert `nf == public nullifier` — 1 constraint

**Estimated total:** ~8,500 R1CS constraints
**Estimated proving time:** <1 second (snarkjs WASM)
**Proof size:** 256 bytes (Groth16)

### 8.2 State Transition Proof Circuit

**Purpose:** Prove a valid subgrid state change (e.g., assigning cells, leveling up) without revealing subgrid contents.

**Public Inputs:**
- `old_state_root` — Merkle root of the subgrid before the change
- `new_state_root` — Merkle root of the subgrid after the change
- `nullifier` — nullifier of the old state note
- `new_commitment` — commitment to the new state note

**Private Witnesses:**
- `old_state` — full old subgrid state (64 cells × cell data)
- `new_state` — full new subgrid state
- `spending_key` — owner's spending key
- `transition_type` — what kind of change (assign, level up, etc.)
- `transition_params` — parameters of the change

**Circuit Constraints:**
1. Verify old state commitment is in the tree (same as ownership, ~8,500 constraints)
2. Verify the transition is valid according to game rules (~2,000-5,000 constraints depending on transition type)
3. Compute new state commitment (~300 constraints)
4. Compute new state root with new commitment (~7,800 constraints)
5. Assert nullifier correctness (~300 constraints)

**Estimated total:** ~20,000 R1CS constraints
**Estimated proving time:** 2-4 seconds (snarkjs WASM)
**Proof size:** 256 bytes (Groth16)

### 8.3 NCP (Neural Communication Packet) Privacy Circuit

**Purpose:** Prove you are a valid network member sending a message within your rate limit, without revealing your identity. Based on the RLN (Rate-Limiting Nullifier) pattern from Ethereum PSE.

**Public Inputs:**
- `epoch` — current epoch number
- `message_hash` — hash of the NCP content
- `internal_nullifier` — rate-limiting nullifier (unique per user per epoch per message slot)
- `membership_root` — Merkle root of the identity commitment tree

**Private Witnesses:**
- `identity_secret` — user's identity secret
- `identity_path[26]` — Merkle path proving membership
- `message_slot` — which message slot this is (0, 1, ..., max_messages-1)
- `identity_index` — leaf position in identity tree

**Circuit Constraints:**
1. Compute identity commitment: `id_cm = Poseidon(identity_secret)` — ~300 constraints
2. Verify membership in identity tree — ~7,800 constraints
3. Compute rate-limiting nullifier: `internal_nf = Poseidon(identity_secret, epoch, message_slot)` — ~300 constraints
4. Assert `internal_nf == public internal_nullifier` — 1 constraint
5. Compute share for Shamir reconstruction (for slashing if rate exceeded) — ~500 constraints

**Estimated total:** ~9,000 R1CS constraints
**Estimated proving time:** <1 second
**Proof size:** 256 bytes (Groth16)

**Rate limiting mechanism:** Each user gets N message slots per epoch. Each slot produces a unique `internal_nullifier`. If a user tries to send more than N messages, they must reuse a slot — the duplicate nullifier reveals their identity secret via Shamir reconstruction, enabling slashing.

### 8.4 Epoch Batch Proof Circuit (Future — Phase 4)

**Purpose:** Recursively aggregate all transaction proofs in an epoch into a single proof.

**Approach:** This circuit verifies Groth16 proofs inside a PLONK circuit (proof-of-proof). Deferred to Phase 4 because:
- Requires a different proving system (PLONK with transparent setup)
- Groth16-in-PLONK verification is expensive (~40,000 constraints per inner proof)
- Not needed for testnet — validators can verify individual proofs

**Public Inputs:**
- `epoch_start_state_root`
- `epoch_end_state_root`
- `num_transactions`

**This circuit is designed but not implemented in the initial phases.**

---

## 9. Proving Pipeline

### Client-Side (Browser)

```
User Action (e.g., "Secure 10 blocks")
    │
    ├── 1. Construct witness from local state
    │     (note data, Merkle path, keys)
    │
    ├── 2. Load circuit WASM + proving key
    │     (cached after first load, ~2-5 MB per circuit)
    │
    ├── 3. Generate Groth16 proof via snarkjs
    │     (1-5 seconds depending on circuit)
    │
    ├── 4. Construct transaction:
    │     { public_inputs, proof, tx_type, signature }
    │
    └── 5. Submit to chain API
```

**Browser requirements:**
- snarkjs WASM prover (~2 MB runtime)
- Circuit-specific WASM (~1-3 MB per circuit, 4 circuits = ~4-12 MB total)
- Proving key per circuit (~5-20 MB each, loaded on demand)
- Total cold-start download: ~30-50 MB (cached after first visit)

### Delegated Proving (Optional)

For mobile or resource-constrained clients:
1. User signs an intent (what action they want to take)
2. Sends intent + encrypted witness to a prover node
3. Prover generates proof and returns it
4. User signs the transaction with the proof attached
5. Prover cannot steal funds (doesn't have spending key for signatures)

### Validator-Side

```
Transaction arrives in mempool
    │
    ├── 1. Deserialize proof + public inputs (<1 ms)
    │
    ├── 2. Identify circuit type from tx_type
    │
    ├── 3. Load verification key for that circuit type
    │
    ├── 4. Verify Groth16 proof (1-2 ms)
    │     └── Reject if invalid (spam prevention)
    │
    ├── 5. Check nullifier not in spent set
    │     └── Reject if duplicate (double-spend prevention)
    │
    ├── 6. Check Merkle root matches current state
    │     └── Reject if stale (state consistency)
    │
    └── 7. Accept into mempool for block inclusion
```

---

## 10. Transaction Format

### Current Format (Plaintext)

```python
# Current: everything visible
Transaction(
    tx_type="transfer",
    sender="wallet_0",
    receiver="wallet_1",
    amount=100,
    data={"x": 5, "y": 10},
)
```

### Enforced ZK Format

```python
@dataclass
class ZKTransaction:
    tx_type: str                  # "ownership" | "state_transition" | "ncp" | "epoch_batch"
    public_inputs: list[bytes]    # Circuit-specific public inputs
    proof: bytes                  # 256 bytes (Groth16 proof: 2×G1 + 1×G2)
    nullifiers: list[bytes]       # Nullifiers consumed by this tx
    new_commitments: list[bytes]  # New note commitments created
    signature: bytes              # Ed25519 signature over (public_inputs + proof + nullifiers)
    memo: bytes                   # Encrypted note data for recipient (ChaCha20-Poly1305)
```

**What validators see:** `tx_type`, `public_inputs`, `proof`, `nullifiers`, `new_commitments`, `signature`. They can verify correctness but cannot see the actual data (amounts, coordinates, identities).

**What recipients see:** Decrypt `memo` with their viewing key to recover the full note.

---

## 11. Block Validation (Enforced ZK)

### Block Structure

```python
@dataclass
class ZKBlock:
    height: int
    prev_hash: bytes
    timestamp: float
    state_root: bytes              # Poseidon Merkle root after all txs applied
    nullifier_set_root: bytes      # Merkle root of the nullifier set
    transactions: list[ZKTransaction]
    # Phase 4: batch_proof: bytes  # Single aggregated proof for all txs
```

### Validation Rules (Enforced)

Every block MUST satisfy:

1. **Every transaction has a valid proof.** No exceptions. If proof verification fails, the entire block is invalid.
2. **No nullifier appears twice.** Within a block and across the chain history. Atomic check against the nullifier set.
3. **Public Merkle roots match chain state.** The `merkle_root` in each tx's public inputs must match the state at the time of execution.
4. **State root is correctly computed.** After applying all transactions (inserting new commitments, adding nullifiers), the resulting Merkle root matches `state_root` in the block header.
5. **Signatures are valid.** Ed25519 signature over the transaction data.

### Validator Verification Cost

| Operation | Per-tx cost | 100 txs/block |
|-----------|-------------|---------------|
| Groth16 proof verification | ~2 ms | ~200 ms |
| Nullifier set lookup | <1 ms | ~50 ms |
| Merkle root check | <1 ms | ~50 ms |
| Signature verification | <1 ms | ~50 ms |
| **Total** | ~4 ms | **~350 ms** |

With batch verification (Phase 4 aggregated proofs): **<50 ms** regardless of tx count.

---

## 12. Encryption Upgrade

### Current: XOR "Encryption"

```python
def encrypt_record(key: bytes, plaintext: bytes) -> bytes:
    """Repeating-key XOR encryption."""
    return bytes(p ^ key[i % key_len] for i, p in enumerate(plaintext))
```

This provides zero security — trivially breakable with known-plaintext attacks.

### Target: ChaCha20-Poly1305 AEAD

```python
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

def encrypt_note(viewing_key: bytes, plaintext: bytes) -> bytes:
    """Encrypt note data to recipient's viewing key."""
    # Derive symmetric key from viewing key
    sym_key = BLAKE2b-256("Agentic:NoteEncKey", viewing_key)
    nonce = os.urandom(12)  # 96-bit nonce
    aead = ChaCha20Poly1305(sym_key)
    ciphertext = aead.encrypt(nonce, plaintext, associated_data=None)
    return nonce + ciphertext  # 12 + len(plaintext) + 16 bytes

def decrypt_note(viewing_key: bytes, encrypted: bytes) -> bytes:
    """Decrypt note data with viewing key."""
    sym_key = BLAKE2b-256("Agentic:NoteEncKey", viewing_key)
    nonce = encrypted[:12]
    ciphertext = encrypted[12:]
    aead = ChaCha20Poly1305(sym_key)
    return aead.decrypt(nonce, ciphertext, associated_data=None)
```

**Properties gained:**
- 256-bit key security
- Authenticated encryption (tamper detection)
- Constant-time implementation (no timing side-channels)
- 16-byte authentication tag
- Standard (RFC 8439), widely audited

---

## 13. Implementation Phases

### Phase 1 — Cryptographic Foundation (No Circuits Yet)

**Goal:** Replace all simulated crypto primitives. All existing tests pass with new hash functions.

**Files:**
- `ledger/crypto.py` — Poseidon hash, BLAKE2b key derivation, ChaCha20 encryption
- `ledger/merkle.py` — Poseidon `_hash_pair()`
- `ledger/nullifier.py` — Poseidon nullifier computation
- `verification/proof.py` — Ed25519 attestation signatures
- All test files updated for new hash outputs

**Deliverables:**
- Poseidon hash function (Python, using audited round constants)
- BLAKE2b key derivation with domain separation
- ChaCha20-Poly1305 note encryption/decryption
- Merkle tree with Poseidon hashing
- All 593+ existing tests passing with new primitives

**No circuit code. No snarkjs. Just the cryptographic foundation.**

### Phase 2 — Circuit Definition + Client Proving

**Goal:** Write 3 Circom circuits, generate verification keys, integrate snarkjs.

**Files:**
- `circuits/ownership.circom` — Ownership proof circuit
- `circuits/state_transition.circom` — State transition circuit
- `circuits/ncp.circom` — NCP privacy circuit (RLN)
- `circuits/poseidon.circom` — Poseidon gadget (from circomlib)
- `circuits/merkle.circom` — Merkle tree membership gadget
- `verification/proof.py` — Real Groth16 verifier (replaces SimulatedZKProof)
- Frontend: snarkjs WASM integration

**Deliverables:**
- 3 compiled circuits with R1CS, WASM, verification keys
- Trusted setup (Powers of Tau + phase 2 per circuit)
- Python verifier calling snarkjs or native Groth16 verifier
- Browser proving via snarkjs WASM
- Integration tests: generate proof in browser, verify in Python

### Phase 3 — Enforced Verification Pipeline

**Goal:** Make proof verification mandatory for all state-changing operations.

**Files:**
- `consensus/block.py` — Add proof verification to block validation
- `testnet/api.py` — Require proof in all state-changing API endpoints
- `ledger/state.py` — Atomic nullifier set with double-spend check
- `testnet/genesis.py` — Genesis block with initial commitments (not plaintext claims)

**Deliverables:**
- Block validation rejects transactions without valid proofs
- API endpoints require `proof` field for Mint/Transfer/Stake/Unstake/Birth/Storage
- Nullifier set checked atomically before state update
- Genesis initialization creates proper note commitments
- No plaintext state anywhere in the chain

### Phase 4 — Recursive Aggregation (Future)

**Goal:** Batch all transaction proofs in a block into a single aggregated proof.

**Deferred** — not needed for testnet. Individual Groth16 verification is fast enough for testnet block sizes. Design is documented above (Section 8.4) for future implementation.

---

## 14. Security Considerations

### 14.1 Trusted Setup (Groth16)

Each of the 3 circuits requires a separate trusted setup ceremony:
- **Powers of Tau** (Phase 1): Reusable across all circuits. Use Hermez/iden3 existing ceremony (100+ participants).
- **Phase 2**: Per-circuit contribution. For testnet, a small ceremony (10+ participants) is acceptable.
- **Risk:** If all Phase 2 participants collude, they can forge proofs for that circuit type. Mitigated by: (a) mainnet migration to PLONK eliminates this, (b) multiple independent participants.

### 14.2 Poseidon Parameter Security

- Use only **audited** Poseidon parameters (iden3 or Aztec audit).
- Weak parameters have been exploited in CTF challenges and research papers.
- The specific parameters (t=3, alpha=5, R_F=8, R_P=57 over BN128) match iden3's production deployment in Polygon ID and Hermez.

### 14.3 Nullifier Atomicity

The nullifier set MUST be checked and updated **atomically**:
- Check: "Is this nullifier already in the set?"
- Insert: "Add this nullifier to the set."
- These two operations must be a single atomic operation. Race conditions between check and insert enable double-spending.

### 14.4 Client-Side Proving Attack Surface

Circuit WASM and witness generation run in the user's browser. A compromised client could:
- Generate proofs for invalid state transitions (if circuit is buggy)
- Not generate proofs at all (tx rejected — no harm)
- Generate valid proofs for malicious actions (but only if the circuit allows those actions)

**Mitigation:** The circuit defines what is provable. If the circuit correctly constrains valid state transitions, a malicious client cannot prove an invalid transition.

### 14.5 Viewing Key Separation

The viewing key allows decrypting notes but NOT spending them. This enables:
- Auditors/regulators to view transaction history (if given viewing key)
- Wallet recovery services to show balances without spending authority
- Future: selective disclosure proofs ("I own at least X" without revealing exact amount)

---

## 15. Performance Budget

### Client-Side (Browser, snarkjs WASM)

| Circuit | Constraints | Proving Time | Proof Size | WASM + PK Size |
|---------|-------------|-------------|------------|----------------|
| Ownership | ~8,500 | <1s | 256 B | ~8 MB |
| State Transition | ~20,000 | 2-4s | 256 B | ~15 MB |
| NCP | ~9,000 | <1s | 256 B | ~8 MB |
| **Total first-load** | — | — | — | **~31 MB** (cached) |

### Validator-Side

| Operation | Time |
|-----------|------|
| Groth16 verification | 1-2 ms |
| Nullifier set lookup (in-memory) | <0.1 ms |
| Ed25519 signature verification | <0.1 ms |
| Merkle root comparison | <0.01 ms |
| **Per-transaction total** | **~2 ms** |
| **100 tx block** | **~200 ms** |

### Storage

| Data | Size per entry |
|------|---------------|
| Note commitment | 32 bytes |
| Nullifier | 32 bytes |
| Groth16 proof | 256 bytes |
| Encrypted note (memo) | ~200-500 bytes |
| **Per-transaction on-chain** | **~550-820 bytes** |

---

## 16. Migration Strategy

### Testnet Reset Approach (Recommended)

Since the testnet is ephemeral, the cleanest migration path is:

1. **Phase 1:** Implement Poseidon + BLAKE2b + ChaCha20 in parallel with existing SHA-256 code
2. **Run both:** Dual-hash mode for testing (compute both, compare behavior)
3. **Phase 2:** Add circuit compilation and proof generation
4. **Phase 3:** Enable enforced mode — genesis reset with new primitives
5. **Old testnet data is not migrated** — clean genesis with ZK from block 0

### API Compatibility

The API shape stays the same (same endpoints, same game logic). The only addition is a `proof` field in state-changing requests. Frontend changes:
- `useGameRealtime.ts` — Add proof generation before API calls
- `store/gameStore.ts` — Store proving keys in IndexedDB
- New component: `ProofStatus` indicator (showing proving progress)

---

## Appendix A: Competitor Architecture Comparison

| Property | ZCash Orchard | zkSync Era | Aleo | **Agentic Chain (this design)** |
|----------|---------------|------------|------|-------------------------------|
| ZK mandatory? | No (optional shielded) | Yes (for L1 settlement) | Yes (every tx) | **Yes (every tx)** |
| Proving system | Halo2 (IPA) | Boojum (PLONK+FRI) | Marlin (universal SNARK) | **Groth16 → PLONK** |
| Hash (in-circuit) | Sinsemilla + Poseidon | Poseidon2 | Poseidon | **Poseidon** |
| Merkle depth | 32 | 264 | 32 | **26** |
| Trusted setup | None | None (FRI) | Universal | **Per-circuit (testnet)** |
| Proof size | ~5 KB | ~800 B (SNARK-wrapped) | ~1 KB | **256 B (Groth16)** |
| Client proving | Desktop wallet | Not applicable (L2) | snarkVM (native) | **snarkjs (browser WASM)** |
| Nullifier scheme | Poseidon + EC ops | N/A (account model) | Serial numbers | **Poseidon(nk, cm)** |

## Appendix B: Reference Sources

### ZCash
- [Zcash Protocol Specification v2025 (NU6.1)](https://zips.z.cash/protocol/protocol.pdf)
- [ZIP 224: Orchard Shielded Protocol](https://zips.z.cash/zip-0224)
- [The Orchard Book](https://zcash.github.io/orchard/)
- [The halo2 Book](https://zcash.github.io/halo2/)

### zkSync
- [ZKsync Protocol — Circuits Overview](https://docs.zksync.io/zksync-protocol/era-vm/circuits)
- [Boojum Gadgets](https://docs.zksync.io/zksync-protocol/circuits/boojum-gadgets)
- [matter-labs/zksync-crypto](https://github.com/matter-labs/zksync-crypto)
- [RedShift Paper (IACR)](https://eprint.iacr.org/2019/1400.pdf)
- [ZKsync Airbender](https://zksync.mirror.xyz/ZgRmbYA_EE3wfGcXWv81m-xcED-ppNKkRzkleS6YZRc)

### ZK Proving Systems
- [Circom Documentation](https://docs.circom.io/)
- [snarkjs GitHub](https://github.com/iden3/snarkjs)
- [Poseidon Hash (iden3)](https://github.com/iden3/circomlib/tree/master/circuits/poseidon.circom)
- [RLN Specification](https://rate-limiting-nullifier.github.io/rln-docs/)
- [Aleo Developer Documentation](https://developer.aleo.org/)

### Our Research
- `vault/research/competitors/zkp-privacy.md` — Comprehensive ZK systems survey
- `vault/whitepaper.md` — Agentic Chain whitepaper v1.0 (privacy architecture sections)
