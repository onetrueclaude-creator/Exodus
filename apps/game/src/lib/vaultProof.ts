/**
 * vaultProof — browser-side sampled-PDP Merkle prover for Proof-of-Vault.
 *
 * A faithful TypeScript port of the chain's `chain/agentic/vault/pdp.py`
 * (`build_shard_tree` + `make_proof`). The proof this module builds MUST be
 * byte-for-byte acceptable to the chain's `verify_proof`, so the hashing is
 * matched exactly:
 *
 *   - SHA-256 throughout.
 *   - Domain-separated leaf/node hashes:
 *       leaf = sha256("leaf\0" || sub_unit)
 *       node = sha256("node\0" || left_bytes || right_bytes)
 *     where left_bytes/right_bytes are the RAW 32 bytes of the child hashes
 *     (not their hex strings).
 *   - Bitcoin-style odd-node duplication: a level's last node, when unpaired,
 *     is hashed with itself.
 *
 * Proof shape (matches pdp.py `make_proof`):
 *   { root: hex, leaves: { [idx]: hex }, paths: { [idx]: hex[] } }
 *
 * The sampled sub-units are taken in the order the signed `POST /api/vault/shard`
 * endpoint returns them (already canonical/sorted on the chain via `sub_units_for_shard`),
 * and `indices` come from `/api/vault/challenge`. Callers must pass the full
 * sub-unit list (every sibling is needed to rebuild the Merkle paths).
 *
 * This is an honest *possession* / protocol-obedience proof, NOT a ZK/SNARK
 * proof — the SNARK wrap is a later milestone (spec §3 rung (a)).
 */
import { sha256 } from "@noble/hashes/sha256";

/** A sampled-PDP proof — identical shape to the chain's `make_proof` output. */
export interface VaultProof {
  /** Merkle root, lowercase hex. */
  root: string;
  /** Sampled-index → leaf hash (hex). */
  leaves: Record<number, string>;
  /** Sampled-index → sibling path, bottom-up (array of hex node hashes). */
  paths: Record<number, string[]>;
}

const LEAF_PREFIX = new Uint8Array([0x6c, 0x65, 0x61, 0x66, 0x00]); // "leaf\0"
const NODE_PREFIX = new Uint8Array([0x6e, 0x6f, 0x64, 0x65, 0x00]); // "node\0"

const HEX = "0123456789abcdef";

/** Lowercase hex of a byte array (matches Python's `hexdigest()`). */
export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
  }
  return out;
}

/** Parse lowercase/uppercase hex into bytes. Throws on odd-length/invalid input. */
export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`vaultProof: odd-length hex string (${hex.length})`);
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`vaultProof: invalid hex at byte ${i}`);
    }
    out[i] = byte;
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** leaf = sha256("leaf\0" || sub_unit) → hex. */
function hashLeaf(subUnit: Uint8Array): string {
  return toHex(sha256(concat(LEAF_PREFIX, subUnit)));
}

/** node = sha256("node\0" || left_bytes || right_bytes) → hex (children given as hex). */
function hashNode(leftHex: string, rightHex: string): string {
  return toHex(sha256(concat(NODE_PREFIX, fromHex(leftHex), fromHex(rightHex))));
}

/**
 * SHA-256 binary Merkle tree over `subUnits` (each already raw bytes).
 * Returns [rootHex, levels] bottom-up; `levels[0]` is the leaf level.
 * Odd nodes at a level are duplicated (Bitcoin-style). Mirrors pdp.py
 * `build_shard_tree`, including the empty-shard sentinel.
 */
export function buildShardTree(subUnits: Uint8Array[]): [string, string[][]] {
  if (subUnits.length === 0) {
    // sha256("empty-shard") — matches `_h(b"empty-shard")` on the chain.
    const empty = toHex(sha256(new TextEncoder().encode("empty-shard")));
    return [empty, [[]]];
  }
  let level: string[] = subUnits.map(hashLeaf);
  const levels: string[][] = [level];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(hashNode(left, right));
    }
    level = next;
    levels.push(level);
  }
  return [level[0], levels];
}

/**
 * Build leaves + sibling paths for the sampled `indices`. The returned object is
 * exactly what the chain's `submit-proof` endpoint expects in `proof`. Mirrors
 * pdp.py `make_proof`.
 *
 * @param subUnits full, canonically-ordered shard sub-units (raw bytes)
 * @param indices  the challenge's sampled indices into `subUnits`
 */
export function makeProof(subUnits: Uint8Array[], indices: number[]): VaultProof {
  const [root, levels] = buildShardTree(subUnits);
  const leaves: Record<number, string> = {};
  const paths: Record<number, string[]> = {};
  for (const idx of indices) {
    leaves[idx] = hashLeaf(subUnits[idx]);
    const path: string[] = [];
    let cur = idx;
    // levels[:-1] — every level except the root level.
    for (let l = 0; l < levels.length - 1; l++) {
      const lvl = levels[l];
      let sib = cur % 2 === 0 ? cur + 1 : cur - 1;
      if (sib >= lvl.length) sib = cur; // duplicated odd node
      path.push(lvl[sib]);
      cur = Math.floor(cur / 2);
    }
    paths[idx] = path;
  }
  return { root, leaves, paths };
}

/**
 * Recompute each sampled leaf's path to the root; reject on any mismatch.
 * A faithful port of pdp.py `verify_proof` — used client-side to self-check a
 * proof before submitting (the chain runs the authoritative copy).
 */
export function verifyProof(
  challengeIndices: number[],
  expectedRoot: string,
  proof: VaultProof,
): boolean {
  if (proof.root !== expectedRoot) return false;
  for (const idx of challengeIndices) {
    const leaf = proof.leaves[idx];
    const path = proof.paths[idx];
    if (leaf === undefined || path === undefined) return false;
    let curHash = leaf;
    let cur = idx;
    for (const sib of path) {
      curHash = cur % 2 === 0 ? hashNode(curHash, sib) : hashNode(sib, curHash);
      cur = Math.floor(cur / 2);
    }
    if (curHash !== expectedRoot) return false;
  }
  return true;
}

/**
 * Convenience: build a proof directly from the hex sub-units returned by the
 * signed `POST /api/vault/shard` (which serves the canonical order) for the
 * given challenge indices.
 */
export function makeProofFromHex(subUnitsHex: string[], indices: number[]): VaultProof {
  return makeProof(subUnitsHex.map(fromHex), indices);
}
