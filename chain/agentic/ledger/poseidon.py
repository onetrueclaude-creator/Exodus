"""Poseidon hash function for BN128 scalar field (ZK-friendly).

Implements Poseidon with parameters:
  - Field: BN128 scalar field (p = 21888242871839275222246405745257275088548364400416034343698204186575808495617)
  - Width t=3 (rate=2, capacity=1)
  - Alpha=5 (S-box exponent)
  - 8 full rounds (4 before, 4 after) + 57 partial rounds = 65 total
  - Round constants: 195 (65 rounds x 3) generated via deterministic SHA-256 PRNG
  - MDS matrix: 3x3 Cauchy construction

Reference: Grassi et al., "Poseidon: A New Hash Function for Zero-Knowledge Proof Systems"
           https://eprint.iacr.org/2019/458
"""
from __future__ import annotations

import hashlib
import struct

# BN128 scalar field modulus
FIELD_MODULUS = (
    21888242871839275222246405745257275088548364400416034343698204186575808495617
)

# Poseidon parameters for t=3 over BN128
_T = 3          # width (rate=2, capacity=1)
_ALPHA = 5      # S-box exponent
_R_F = 8        # full rounds (4 + 4)
_R_P = 57       # partial rounds
_N_ROUNDS = _R_F + _R_P  # 65 total


def _generate_round_constants() -> list[int]:
    """Generate 195 round constants deterministically using SHA-256 PRNG.

    Uses a domain-separated counter mode: each constant is derived from
    SHA-256("PoseidonBN128_t3_rc:" || counter_as_uint32_be), reduced mod p.
    This guarantees determinism and nothing-up-my-sleeve generation.
    """
    n_constants = _N_ROUNDS * _T  # 65 * 3 = 195
    constants = []
    for i in range(n_constants):
        h = hashlib.sha256()
        h.update(b"PoseidonBN128_t3_rc:")
        h.update(struct.pack(">I", i))
        # Use 32 bytes of hash output as a big-endian integer, reduce mod p
        val = int.from_bytes(h.digest(), "big") % FIELD_MODULUS
        constants.append(val)
    return constants


def _generate_mds_matrix() -> list[list[int]]:
    """Generate a 3x3 MDS matrix using Cauchy construction.

    M[i][j] = 1 / (x_i + y_j) mod p
    where x = [0, 1, 2] and y = [t, t+1, t+2] = [3, 4, 5]
    ensuring x_i + y_j != 0 mod p for all i, j.
    """
    t = _T
    xs = list(range(t))           # [0, 1, 2]
    ys = list(range(t, 2 * t))    # [3, 4, 5]
    matrix = []
    for i in range(t):
        row = []
        for j in range(t):
            # (x_i + y_j) mod p -- guaranteed non-zero since x_i + y_j in [3..7]
            val = (xs[i] + ys[j]) % FIELD_MODULUS
            # Modular inverse via Fermat's little theorem: a^(p-2) mod p
            inv = pow(val, FIELD_MODULUS - 2, FIELD_MODULUS)
            row.append(inv)
        matrix.append(row)
    return matrix


# Pre-compute constants and MDS matrix at module load time
_ROUND_CONSTANTS = _generate_round_constants()
_MDS_MATRIX = _generate_mds_matrix()


def _add_round_constants(state: list[int], round_idx: int) -> list[int]:
    """Add round constants to state for a given round."""
    offset = round_idx * _T
    return [
        (state[i] + _ROUND_CONSTANTS[offset + i]) % FIELD_MODULUS
        for i in range(_T)
    ]


def _sbox_full(state: list[int]) -> list[int]:
    """Apply S-box (x^5) to ALL state elements (full round)."""
    return [pow(x, _ALPHA, FIELD_MODULUS) for x in state]


def _sbox_partial(state: list[int]) -> list[int]:
    """Apply S-box (x^5) to FIRST state element only (partial round)."""
    result = list(state)
    result[0] = pow(state[0], _ALPHA, FIELD_MODULUS)
    return result


def _mds_mix(state: list[int]) -> list[int]:
    """Multiply state by the MDS matrix."""
    result = []
    for i in range(_T):
        acc = 0
        for j in range(_T):
            acc = (acc + _MDS_MATRIX[i][j] * state[j]) % FIELD_MODULUS
        result.append(acc)
    return result


def _poseidon_permutation(state: list[int]) -> list[int]:
    """Apply the full Poseidon permutation to a t-element state.

    Structure:
      1. First R_F/2 = 4 full rounds
      2. R_P = 57 partial rounds
      3. Last R_F/2 = 4 full rounds
    Each round: AddRoundConstants -> S-box -> MDS mix
    """
    assert len(state) == _T, f"Expected state of length {_T}, got {len(state)}"
    half_f = _R_F // 2  # 4

    round_idx = 0

    # First 4 full rounds
    for _ in range(half_f):
        state = _add_round_constants(state, round_idx)
        state = _sbox_full(state)
        state = _mds_mix(state)
        round_idx += 1

    # 57 partial rounds
    for _ in range(_R_P):
        state = _add_round_constants(state, round_idx)
        state = _sbox_partial(state)
        state = _mds_mix(state)
        round_idx += 1

    # Last 4 full rounds
    for _ in range(half_f):
        state = _add_round_constants(state, round_idx)
        state = _sbox_full(state)
        state = _mds_mix(state)
        round_idx += 1

    return state


def poseidon_hash(inputs: list[int]) -> int:
    """Poseidon hash of 1-2 field elements, returning a field element.

    Args:
        inputs: List of 1 or 2 integers. Values are reduced mod FIELD_MODULUS.

    Returns:
        Integer in [0, FIELD_MODULUS).

    Raises:
        ValueError: If inputs is empty or has more than 2 elements.
    """
    if not inputs or len(inputs) > 2:
        raise ValueError(f"poseidon_hash expects 1 or 2 inputs, got {len(inputs)}")

    # Reduce inputs mod p
    reduced = [x % FIELD_MODULUS for x in inputs]

    # Pad to rate=2 if single input
    if len(reduced) == 1:
        reduced.append(0)

    # Initialize state: [capacity=0, input0, input1]
    state = [0, reduced[0], reduced[1]]

    # Apply permutation
    state = _poseidon_permutation(state)

    # Output is state[0]
    return state[0]


def poseidon_hash_bytes(left: bytes, right: bytes) -> bytes:
    """Poseidon hash of two 32-byte values, returning 32 bytes.

    Interprets each input as a big-endian unsigned integer, reduces mod
    FIELD_MODULUS, hashes with poseidon_hash, and returns the result as
    32 bytes (big-endian). Note: 32-byte values above FIELD_MODULUS
    (~2^254) are silently reduced — this is standard Poseidon behavior.

    Args:
        left: Exactly 32 bytes.
        right: Exactly 32 bytes.

    Returns:
        32 bytes (big-endian encoding of the hash output).

    Raises:
        ValueError: If either input is not exactly 32 bytes.
    """
    if len(left) != 32 or len(right) != 32:
        raise ValueError(
            f"poseidon_hash_bytes expects two 32-byte inputs, "
            f"got {len(left)} and {len(right)} bytes"
        )
    left_int = int.from_bytes(left, "big")
    right_int = int.from_bytes(right, "big")
    h = poseidon_hash([left_int, right_int])
    return h.to_bytes(32, "big")
