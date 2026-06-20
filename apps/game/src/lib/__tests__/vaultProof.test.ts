/**
 * Cross-implementation prover test — THE correctness anchor for the PoAW gate.
 *
 * `fixtures/vaultProofVectors.json` is generated directly from the chain's
 * `chain/agentic/vault/pdp.py` (build_shard_tree + make_proof + derive_challenge
 * over canonical sub-units). This suite asserts the TypeScript prover produces
 * the IDENTICAL root + proof for every vector, and that its self-verify passes.
 * If this is green, a proof the browser builds will be accepted by the chain's
 * `verify_proof` — which is the whole point of "the player's machine proves."
 *
 * Regenerate vectors:
 *   cd chain && python3 -c "<generator>" > \
 *     ../apps/game/src/lib/__tests__/fixtures/vaultProofVectors.json
 * (generator is recorded in the feat/game-poaw-gate PR description.)
 */
import { describe, it, expect } from "vitest";
import {
  makeProofFromHex,
  buildShardTree,
  verifyProof,
  fromHex,
  toHex,
  type VaultProof,
} from "@/lib/vaultProof";
import vectorsJson from "./fixtures/vaultProofVectors.json";

interface Vector {
  n: number;
  shard_id: number;
  sub_units_hex: string[];
  indices: number[];
  expected_root: string;
  expected_proof: {
    root: string;
    leaves: Record<string, string>;
    paths: Record<string, string[]>;
  };
}

/** JSON object keys are strings; normalise a proof's leaves/paths to int keys. */
function normalise(proof: VaultProof): {
  root: string;
  leaves: Record<number, string>;
  paths: Record<number, string[]>;
} {
  const leaves: Record<number, string> = {};
  for (const [k, v] of Object.entries(proof.leaves)) leaves[Number(k)] = v;
  const paths: Record<number, string[]> = {};
  for (const [k, v] of Object.entries(proof.paths)) paths[Number(k)] = v;
  return { root: proof.root, leaves, paths };
}

function normaliseExpected(p: Vector["expected_proof"]) {
  const leaves: Record<number, string> = {};
  for (const [k, v] of Object.entries(p.leaves)) leaves[Number(k)] = v;
  const paths: Record<number, string[]> = {};
  for (const [k, v] of Object.entries(p.paths)) paths[Number(k)] = v;
  return { root: p.root, leaves, paths };
}

// JSON import is typed as a precise literal; widen via unknown to the contract.
const vectors = vectorsJson as unknown as Vector[];

describe("vaultProof — cross-implementation parity with chain pdp.py", () => {
  it("loaded a non-empty vector set generated from the Python prover", () => {
    expect(vectors.length).toBeGreaterThanOrEqual(8);
  });

  for (const v of vectors) {
    describe(`vector n=${v.n} (shard ${v.shard_id}, ${v.sub_units_hex.length} sub-units)`, () => {
      it("TS root === Python root", () => {
        const [root] = buildShardTree(v.sub_units_hex.map(fromHex));
        expect(root).toBe(v.expected_root);
      });

      it("TS proof === Python proof (root + leaves + paths, byte-for-byte)", () => {
        const tsProof = normalise(makeProofFromHex(v.sub_units_hex, v.indices));
        expect(tsProof).toEqual(normaliseExpected(v.expected_proof));
      });

      it("TS self-verify accepts the TS proof against the Python root", () => {
        const tsProof = makeProofFromHex(v.sub_units_hex, v.indices);
        expect(verifyProof(v.indices, v.expected_root, tsProof)).toBe(true);
      });

      it("TS verify accepts the Python proof (chain → browser direction)", () => {
        const pythonProof: VaultProof = {
          root: v.expected_proof.root,
          leaves: Object.fromEntries(
            Object.entries(v.expected_proof.leaves).map(([k, val]) => [Number(k), val]),
          ),
          paths: Object.fromEntries(
            Object.entries(v.expected_proof.paths).map(([k, val]) => [Number(k), val]),
          ),
        };
        expect(verifyProof(v.indices, v.expected_root, pythonProof)).toBe(true);
      });
    });
  }

  describe("verifyProof rejection cases", () => {
    const v = vectors.find((x) => x.n === 8)!;

    it("rejects a wrong expected root", () => {
      const proof = makeProofFromHex(v.sub_units_hex, v.indices);
      expect(verifyProof(v.indices, "0".repeat(64), proof)).toBe(false);
    });

    it("rejects a tampered leaf", () => {
      const proof = makeProofFromHex(v.sub_units_hex, v.indices);
      const i = v.indices[0];
      proof.leaves[i] = "ff".repeat(32);
      expect(verifyProof(v.indices, v.expected_root, proof)).toBe(false);
    });

    it("rejects a missing sampled index", () => {
      const proof = makeProofFromHex(v.sub_units_hex, v.indices);
      delete proof.leaves[v.indices[0]];
      expect(verifyProof(v.indices, v.expected_root, proof)).toBe(false);
    });
  });

  describe("hex round-trip helpers", () => {
    it("toHex(fromHex(x)) === x", () => {
      const x = "0a1bff00deadbeef";
      expect(toHex(fromHex(x))).toBe(x);
    });

    it("buildShardTree handles the empty shard with the chain sentinel", () => {
      const [root, levels] = buildShardTree([]);
      // sha256("empty-shard") — matches pdp.py build_shard_tree([]) exactly.
      expect(root).toBe(
        "799963089fc21583a77e4c6501d747c061a7d2745b1a6da9fdf5c8b14c2cf831",
      );
      expect(levels).toEqual([[]]);
    });
  });
});
