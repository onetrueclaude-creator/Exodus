"""Benchmarks for ledger state, claims, and mining operations."""
import sys
import time
import pytest
from agentic.testnet.genesis import create_genesis


class TestGenesisScaling:
    @pytest.mark.parametrize("wallets,claims", [
        (10, 5), (50, 25), (100, 50), (200, 100),
    ])
    def test_genesis_creation_time(self, wallets, claims):
        start = time.perf_counter()
        g = create_genesis(num_wallets=wallets, num_claims=claims, seed=42)
        elapsed = time.perf_counter() - start
        print(f"\n  genesis({wallets}w, {claims}c): {elapsed:.3f}s"
              f" -- {g.ledger_state.record_count} records")
        assert elapsed < 30.0


class TestMiningScaling:
    @pytest.mark.parametrize("claims", [5, 25, 50, 100])
    def test_mine_block_time(self, claims):
        g = create_genesis(num_wallets=max(claims, 10), num_claims=claims, seed=42)
        claims_input = g.claim_registry.as_mining_claims()
        start = time.perf_counter()
        for _ in range(10):
            g.mining_engine.compute_block_yields(claims_input)
        elapsed = time.perf_counter() - start
        per_block = elapsed / 10
        headroom = ((60.0 - per_block) / 60.0) * 100
        print(f"\n  mine_block({claims} claims): {per_block*1000:.2f}ms/block"
              f" ({headroom:.1f}% headroom vs 60s)")
        assert per_block < 1.0


class TestClaimsScaling:
    @pytest.mark.parametrize("n", [25, 100, 500])
    def test_claim_lookup_time(self, n):
        g = create_genesis(num_wallets=max(n, 10), num_claims=n, seed=42)
        claims = g.claim_registry.all_active_claims()
        target = claims[n // 2].coordinate
        start = time.perf_counter()
        for _ in range(10_000):
            g.claim_registry.get_claim_at(target)
        elapsed = time.perf_counter() - start
        per_lookup = elapsed / 10_000
        print(f"\n  claim_lookup({n} claims): {per_lookup*1e6:.2f}us/lookup")
        assert per_lookup < 0.001


class TestStorageFootprint:
    def test_full_state_size(self):
        """Measure state size at varying scales."""
        for wallets, claims in [(10, 5), (50, 25), (100, 50), (200, 100)]:
            g = create_genesis(num_wallets=wallets, num_claims=claims, seed=42)
            ledger_nodes = sum(
                sys.getsizeof(k) + sys.getsizeof(v)
                for k, v in g.ledger_state.pct.nodes.items()
            )
            records = sum(
                sys.getsizeof(v) for v in g.ledger_state._record_store.values()
            )
            total = ledger_nodes + records
            print(f"\n  state({wallets}w, {claims}c): tree={ledger_nodes:,}B"
                  f" records={records:,}B total={total:,}B")
        assert total < 10_000_000  # under 10MB at max testnet scale
