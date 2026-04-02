"""Benchmarks for Sparse Merkle Tree operations at varying scales."""
import hashlib
import sys
import time
import pytest
from agentic.ledger.merkle import SparseMerkleTree
from agentic.params import MERKLE_TREE_DEPTH


class TestMerkleInsert:
    @pytest.mark.parametrize("n", [100, 1_000, 10_000])
    def test_insert_throughput(self, n):
        tree = SparseMerkleTree(depth=MERKLE_TREE_DEPTH)
        start = time.perf_counter()
        for i in range(n):
            leaf = hashlib.sha256(i.to_bytes(4, "big")).digest()
            tree.insert(i, leaf)
        elapsed = time.perf_counter() - start
        per_insert = (elapsed / n) * 1e6  # microseconds
        print(f"\n  insert({n}): {per_insert:.1f}us/insert, {n/elapsed:.0f} inserts/s")
        # Poseidon is ~100x slower than SHA-256 in pure Python (65 rounds
        # of modular exponentiation over BN128 field). Phase 2 will add C/gmpy2.
        assert elapsed < 300.0


class TestMerkleProof:
    @pytest.mark.parametrize("n", [100, 1_000, 10_000])
    def test_proof_generation(self, n):
        tree = SparseMerkleTree(depth=MERKLE_TREE_DEPTH)
        for i in range(n):
            leaf = hashlib.sha256(i.to_bytes(4, "big")).digest()
            tree.insert(i, leaf)
        target = n // 2
        start = time.perf_counter()
        for _ in range(1000):
            tree.get_proof(target)
        elapsed = time.perf_counter() - start
        per_proof = (elapsed / 1000) * 1e6
        print(f"\n  proof_gen({n} leaves): {per_proof:.1f}us/proof")
        assert per_proof < 10_000

    @pytest.mark.parametrize("n", [100, 1_000, 10_000])
    def test_proof_verification(self, n):
        tree = SparseMerkleTree(depth=MERKLE_TREE_DEPTH)
        for i in range(n):
            leaf = hashlib.sha256(i.to_bytes(4, "big")).digest()
            tree.insert(i, leaf)
        target = n // 2
        leaf = hashlib.sha256(target.to_bytes(4, "big")).digest()
        proof = tree.get_proof(target)
        root = tree.get_root()
        start = time.perf_counter()
        for _ in range(1000):
            SparseMerkleTree.verify_proof(root, target, leaf, proof, depth=MERKLE_TREE_DEPTH)
        elapsed = time.perf_counter() - start
        per_verify = (elapsed / 1000) * 1e6
        print(f"\n  proof_verify({n} leaves): {per_verify:.1f}us/verify")
        assert per_verify < 10_000


class TestMerkleMemory:
    def test_memory_footprint(self):
        """Measure memory per-leaf at varying scales."""
        results = {}
        for n in [100, 1_000, 10_000, 50_000]:
            tree = SparseMerkleTree(depth=MERKLE_TREE_DEPTH)
            for i in range(n):
                leaf = hashlib.sha256(i.to_bytes(4, "big")).digest()
                tree.insert(i, leaf)
            node_count = len(tree.nodes)
            node_bytes = sum(
                sys.getsizeof(k) + sys.getsizeof(v)
                for k, v in tree.nodes.items()
            )
            results[n] = {
                "leaves": n,
                "stored_nodes": node_count,
                "bytes": node_bytes,
                "bytes_per_leaf": node_bytes / n,
            }
        for n, r in results.items():
            print(f"\n  {r['leaves']:>6} leaves -> {r['stored_nodes']:>7} nodes,"
                  f" {r['bytes']:>10,} bytes ({r['bytes_per_leaf']:.0f} B/leaf)")
        bpl = [r["bytes_per_leaf"] for r in results.values()]
        assert max(bpl) / min(bpl) < 3.0, "Bytes/leaf should be roughly O(depth)"
