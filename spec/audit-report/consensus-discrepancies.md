# Consensus Cross-Reference — Whitepaper Section 5 vs consensus/ + verification/

**Date:** 2026-04-02
**Whitepaper:** v1.2
**Code commit:** c4f7df35d

## Summary
- 7 findings total: 0 critical, 3 major, 3 minor, 1 cosmetic

## Findings

### Finding C-001: VRF is simulated (SHA-256 hash, not Ed25519)
- **Severity:** Major (expected testnet gap)
- **Whitepaper says:** Section 5.2 specifies Ed25519 VRF per RFC 9381 for committee selection. Section 22 lists VRF as a core cryptographic primitive.
- **Code does:** `consensus/vrf.py:45` uses `hashlib.sha256(f"{seed}:{slot}")` as a deterministic hash, then feeds it into `np.random.default_rng()` for weighted sampling. No Ed25519 signatures, no VRF proof generation or verification.
- **Recommendation:** Acceptable gap (testnet only). Document in whitepaper Section 24 (Limitations). Phase 6 implements real Ed25519 VRF.

### Finding C-002: ZK proofs are fully simulated
- **Severity:** Major (expected testnet gap)
- **Whitepaper says:** Section 5.3 describes agents producing ZK proofs of their verification work, committed via hash before reveal.
- **Code does:** `verification/proof.py` contains `SimulatedZKProof` and `SimulatedAttestation` classes. `SimulatedZKProof.generate()` produces a SHA-256 hash pretending to be a proof. No actual ZK circuit, no Groth16/PLONK, no proving key.
- **Recommendation:** Acceptable gap (testnet only). Already documented in whitepaper Section 24.1 (ZKML Gap). Phase 6.3 implements real circuits.

### Finding C-003: Commit-reveal protocol has no time windows enforced
- **Severity:** Major
- **Whitepaper says:** Section 5.3 specifies COMMIT phase (10s), REVEAL phase (20s), hard deadline (60s). Section 22 defines `VERIFICATION_COMMIT_WINDOW_S=10.0`, `VERIFICATION_REVEAL_WINDOW_S=20.0`, `VERIFICATION_HARD_DEADLINE_S=60.0`.
- **Code does:** `verification/commitment.py` implements phase transitions (COMMIT→REVEAL→CLOSED) but has NO time checks. `advance_to_reveal()` is called programmatically by the pipeline, not after 10s. `submit_reveal()` accepts any time. The params exist in `params.py` but are never imported or used by `commitment.py`.
- **Recommendation:** Add time-based enforcement or document as "testnet simplification: synchronous pipeline, no real-time windows."

### Finding C-004: Adversarial behavior is random, not strategic
- **Severity:** Minor
- **Whitepaper says:** Section 8 describes adversary model with PPT adversary, strategic behavior (equivocation, withholding, collusion).
- **Code does:** `verification/pipeline.py:266` — `is_adversarial = self._rng.random() < self.adversarial_rate`. Adversarial agents simply flip their verdict to INVALID randomly. No strategic equivocation, no collusion modeling.
- **Recommendation:** Acceptable for testnet simulation. Note in whitepaper that adversary model is theoretical; testnet uses random adversarial injection.

### Finding C-005: Safe mode triggers exist but aren't wired to global validator set
- **Severity:** Minor
- **Whitepaper says:** Section 5.4 — Safe mode activates when 20% of validators go offline, exits at 80% recovery.
- **Code does:** `verification/dispute.py` has `SafeMode` class with `check_activation()` and `check_recovery()` methods using the correct thresholds. `pipeline.py:77` uses `self.safe_mode.effective_threshold()`. However, `safe_mode.check_activation()` is never called from the main loop — the pipeline only checks if safe mode is already active, but nothing triggers the activation check against the global validator set.
- **Recommendation:** Wire `safe_mode.check_activation(offline_fraction)` into the mining/block production loop.

### Finding C-006: Block lifecycle skips ORDERED state
- **Severity:** Minor
- **Whitepaper says:** Section 5 describes: PROPOSED → ORDERED (BFT) → VERIFIED → FINALIZED.
- **Code does:** `consensus/block.py` has `BlockStatus.ORDERED` in the enum, but `pipeline.py:58` takes blocks starting at any status and processes them. The BFT ordering phase (PROPOSED→ORDERED) is not implemented — blocks jump straight to verification.
- **Recommendation:** Acceptable for testnet (single-node, no BFT needed). Document as Phase 6 scope.

### Finding C-007: Pipeline docstring references wrong whitepaper section
- **Severity:** Cosmetic
- **Whitepaper says:** Section 5 covers PoAIV verification.
- **Code does:** `verification/pipeline.py:7` says "Whitepaper Sections 4-5" but the pipeline implements Section 5 only. Section 4 is the Galaxy Grid, which is unrelated.
- **Recommendation:** Fix docstring to "Whitepaper Section 5".
