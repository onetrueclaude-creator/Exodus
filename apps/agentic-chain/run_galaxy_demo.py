#!/usr/bin/env python3
"""Galaxy Grid & Mining Layer — Demo Script.

Demonstrates:
1. Star system exploration (coordinate → resource density → planets)
2. Claim mechanics (stake AGNTC at coordinates)
3. Per-block mining (airdrop from Community Pool)
4. Planet data storage (hash-referenced content)
5. Community pool depletion curve
"""
from agentic.galaxy.coordinate import GridCoordinate, resource_density, storage_slots
from agentic.galaxy.claims import ClaimRegistry
from agentic.galaxy.mining import CommunityPool, MiningEngine, COMMUNITY_POOL_TOTAL
from agentic.galaxy.content import ContentType, StorageTx, validate_storage, StorageMetadata
from agentic.params import BASE_MINING_RATE_PER_BLOCK, BLOCK_TIME_MS


def main():
    print("=" * 70)
    print("AGENTIC CHAIN — Galaxy Grid & Mining Layer Demo")
    print("=" * 70)

    # --- Phase 1: Galaxy exploration ---
    print("\n--- Phase 1: Star System Exploration ---\n")
    sample_coords = [
        GridCoordinate(0, 0),
        GridCoordinate(100, -200),
        GridCoordinate(-3240, 3240),
        GridCoordinate(42, -42),
        GridCoordinate(250, 250),
    ]
    for coord in sample_coords:
        density = resource_density(coord.x, coord.y)
        planets = storage_slots(coord.x, coord.y)
        print(f"  ({coord.x:+5d}, {coord.y:+5d})  density={density:.4f}  planets={planets}")

    # --- Phase 2: Claim star systems ---
    print("\n--- Phase 2: Stake-to-Claim Star Systems ---\n")
    registry = ClaimRegistry()
    users = {
        b"alice": {"stake": 500, "cpu_vpu": 5.0},
        b"bob": {"stake": 200, "cpu_vpu": 3.0},
        b"charlie": {"stake": 100, "cpu_vpu": 2.0},
    }

    alice_claims = [
        GridCoordinate(0, 0),
        GridCoordinate(1, 0),
        GridCoordinate(0, 1),
    ]
    bob_claims = [
        GridCoordinate(100, -200),
        GridCoordinate(42, -42),
    ]
    charlie_claims = [
        GridCoordinate(-100, 300),
    ]

    for coord in alice_claims:
        registry.register(b"alice", coord, users[b"alice"]["stake"] // len(alice_claims), slot=0)
    for coord in bob_claims:
        registry.register(b"bob", coord, users[b"bob"]["stake"] // len(bob_claims), slot=0)
    for coord in charlie_claims:
        registry.register(b"charlie", coord, users[b"charlie"]["stake"], slot=0)

    print(f"  Active claims: {len(registry.all_active_claims())}")
    print(f"  Total mining stake: {registry.total_mining_stake()} AGNTC")
    for name in [b"alice", b"bob", b"charlie"]:
        claims = registry.get_claims(name)
        print(f"  {name.decode()}: {len(claims)} claims")

    # --- Phase 3: Mining simulation ---
    print("\n--- Phase 3: Per-Block Mining (20 blocks = 20 minutes) ---\n")
    pool = CommunityPool()
    engine = MiningEngine(pool)
    turn_seconds = BLOCK_TIME_MS / 1000

    user_balances = {b"alice": 0.0, b"bob": 0.0, b"charlie": 0.0}

    for block in range(20):
        mining_claims = registry.as_mining_claims()
        rewards = engine.compute_block_yields(mining_claims)
        for owner, amount in rewards.items():
            user_balances[owner] = user_balances.get(owner, 0.0) + amount

        if block % 5 == 0:
            total_block_reward = sum(rewards.values())
            print(f"  Block {block:3d} (t={block * turn_seconds / 60:.0f}min): "
                  f"total_yield={total_block_reward:.4f} AGNTC  "
                  f"pool_remaining={pool.remaining:,.2f}")

    print(f"\n  After 20 blocks:")
    for name in [b"alice", b"bob", b"charlie"]:
        print(f"    {name.decode()}: {user_balances[name]:.4f} AGNTC mined")
    print(f"    Pool distributed: {pool.total_distributed:.4f} AGNTC")
    print(f"    Pool remaining: {pool.remaining:,.2f} / {COMMUNITY_POOL_TOTAL:,.2f} AGNTC")

    # --- Phase 4: Planet storage ---
    print("\n--- Phase 4: Planet Data Storage ---\n")
    occupied: dict[GridCoordinate, set[int]] = {}
    coord = GridCoordinate(0, 0)
    tx = StorageTx(
        owner=b"alice",
        coordinate=coord,
        content_type=ContentType.JSON,
        content_hash=b"\xab" * 32,
        size_bytes=2048,
        planet_index=0,
        slot=20,
    )
    result = validate_storage(tx, registry, occupied)
    print(f"  Store JSON at (0,0) planet 0: {'OK' if result.valid else result.error}")
    if result.valid:
        occupied.setdefault(coord, set()).add(0)

    # Try storing on occupied planet
    tx2 = StorageTx(
        owner=b"alice", coordinate=coord,
        content_type=ContentType.IMAGE, content_hash=b"\xcd" * 32,
        size_bytes=50000, planet_index=0, slot=21,
    )
    result2 = validate_storage(tx2, registry, occupied)
    print(f"  Store IMAGE at (0,0) planet 0: {'OK' if result2.valid else result2.error}")

    # Store on different planet
    tx3 = StorageTx(
        owner=b"alice", coordinate=coord,
        content_type=ContentType.VIDEO, content_hash=b"\xef" * 32,
        size_bytes=500000, planet_index=1, slot=22,
    )
    result3 = validate_storage(tx3, registry, occupied)
    print(f"  Store VIDEO at (0,0) planet 1: {'OK' if result3.valid else result3.error}")

    # --- Phase 5: Empire summary ---
    print("\n--- Phase 5: Empire Portfolio Summary ---\n")
    for name in [b"alice", b"bob", b"charlie"]:
        claims = registry.get_claims(name)
        total_density = sum(resource_density(c.coordinate.x, c.coordinate.y) for c in claims)
        total_planets = sum(storage_slots(c.coordinate.x, c.coordinate.y) for c in claims)
        print(f"  {name.decode()}:")
        print(f"    Claims: {len(claims)}")
        print(f"    Mining balance: {user_balances[name]:.4f} AGNTC")
        print(f"    Total resource density: {total_density:.4f}")
        print(f"    Total storage planets: {total_planets}")

    print(f"\n  Community Pool: {pool.fraction_remaining * 100:.6f}% remaining")
    print(f"  Blocks processed: {engine.total_blocks_processed}")
    print(f"  Block time: {turn_seconds:.0f}s (1 turn = 1 block)")

    print("\n" + "=" * 70)
    print("Galaxy Grid demo complete.")
    print("=" * 70)


if __name__ == "__main__":
    main()
