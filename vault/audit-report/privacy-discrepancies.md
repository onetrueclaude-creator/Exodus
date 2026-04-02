# Privacy Cross-Reference — Whitepaper Section 6 vs ledger/

**Date:** 2026-04-02
**Whitepaper:** v1.2
**Code commit:** c4f7df35d

## Summary
- 5 findings total: 0 critical, 2 major, 2 minor, 1 cosmetic

## Findings

### Finding P-001: ZK proofs are fully simulated
- **Severity:** Major (expected testnet gap)
- **Whitepaper says:** Section 6.2 — Agents communicate through ZK private channels, proving correctness without revealing data. Section 21.1 specifies Circom→Noir→RLN→Nova/Halo2 progression.
- **Code does:** `verification/proof.py` has `SimulatedZKProof` — produces SHA-256 hash, no actual circuit execution. No Circom, no Noir, no proving/verification keys. ZK is a stub throughout.
- **Recommendation:** Acceptable for testnet. Already acknowledged in whitepaper Section 24.1 (ZKML Gap). Phase 6.3 implements real circuits.

### Finding P-002: Private channels not implemented
- **Severity:** Major (expected testnet gap)
- **Whitepaper says:** Section 6.3 — "Verification agents communicate exclusively through ZK private channels — proving correctness of state transitions without exposing the underlying data."
- **Code does:** `verification/pipeline.py` runs all verification synchronously in-process. There are no channels (private or otherwise) — agents are function calls, not networked entities. Proofs are collected in a dict, not transmitted over any channel.
- **Recommendation:** Acceptable for testnet (single-node). Phase 6 networking layer will implement inter-agent communication. Document as testnet simplification.

### Finding P-003: Sparse Merkle Tree correctly implements depth 26
- **Severity:** Minor (positive finding)
- **Whitepaper says:** Section 6.1 — "Sparse Merkle Tree of depth 26 with 2^26 leaf nodes per user."
- **Code does:** `ledger/merkle.py` implements `SparseMerkleTree` with configurable depth. `params.py` has `MERKLE_TREE_DEPTH = 26`. Tests verify depth 26 behavior.
- **Recommendation:** None — matches.

### Finding P-004: Nullifier system implemented but simplified
- **Severity:** Minor
- **Whitepaper says:** Section 6.1 — Nullifier-based ownership proofs "derived from the Zcash Sapling design."
- **Code does:** `ledger/nullifier.py` implements nullifier registry for double-spend prevention. Uses Poseidon hash (from `poseidon.py`) for nullifier computation. However, the Zcash Sapling design involves note commitments, spending keys, and viewing keys with specific algebraic structure — the code uses a simplified version without the full Sapling key hierarchy.
- **Recommendation:** Acceptable simplification for testnet. Document that the nullifier system is "Sapling-inspired" rather than a full Sapling implementation.

### Finding P-005: Poseidon hash implemented with real algebraic structure
- **Severity:** Cosmetic (positive finding)
- **Whitepaper says:** Section 6 references Poseidon as the ZK-friendly hash function.
- **Code does:** `ledger/poseidon.py` implements Poseidon hash with round constants, S-boxes, and MDS matrix. This is one of the few cryptographic primitives that is NOT simulated — it's a real Poseidon implementation.
- **Recommendation:** None — this is a strength. Document in whitepaper v1.3 that Poseidon is production-ready.
