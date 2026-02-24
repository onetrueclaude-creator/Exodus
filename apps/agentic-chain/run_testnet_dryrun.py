#!/usr/bin/env python3
"""Agentic Chain Testnet — Dry Run.

Exercises the full action pipeline against a fresh genesis state:
  1. Bootstraps genesis (wallets, claims, community pool, mining engine)
  2. Collects claim data (coordinate, owner, stake, resource density, storage slots)
  3. Mines N blocks via MiningEngine.compute_block_yields()
  4. Executes all 6 action types on the first wallet's first claimed coordinate
  5. Outputs a human-readable summary or structured JSON
"""
from __future__ import annotations

import argparse
import json
import sys

from agentic.actions.ownership import build_ownership_proof
from agentic.actions.pipeline import ActionResult
from agentic.actions.types import (
    ActionRequest,
    ActionType,
    CallerType,
    EditRequest,
    EditTarget,
    ReadRequest,
    ReadTarget,
    SecureRequest,
    SecurityAction,
    StoreRequest,
    VerifyRequest,
    VerifyTarget,
    VoteChoice,
    VoteRequest,
)
from agentic.galaxy.content import ContentType
from agentic.galaxy.coordinate import resource_density, storage_slots
from agentic.testnet.genesis import GenesisState, create_genesis


# ------------------------------------------------------------------ #
#  CLI
# ------------------------------------------------------------------ #

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Agentic Chain testnet dry-run — exercises full action pipeline",
    )
    parser.add_argument("--wallets", type=int, default=10, help="Number of genesis wallets")
    parser.add_argument("--claims", type=int, default=5, help="Number of genesis claims")
    parser.add_argument("--blocks", type=int, default=10, help="Number of blocks to mine")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic seed")
    parser.add_argument("--json", dest="json_output", action="store_true",
                        help="Output structured JSON instead of human-readable text")
    return parser.parse_args(argv)


# ------------------------------------------------------------------ #
#  Claim data collection
# ------------------------------------------------------------------ #

def collect_claims(genesis: GenesisState) -> list[dict]:
    """Return a list of dicts describing every active claim."""
    claims = []
    for entry in genesis.claim_registry.all_active_claims():
        x, y = entry.coordinate.x, entry.coordinate.y
        claims.append({
            "x": x,
            "y": y,
            "owner": entry.owner.hex(),
            "stake": entry.stake_amount,
            "density": resource_density(x, y),
            "slots": storage_slots(x, y),
        })
    return claims


# ------------------------------------------------------------------ #
#  Mining
# ------------------------------------------------------------------ #

def mine_blocks(genesis: GenesisState, num_blocks: int) -> dict:
    """Mine *num_blocks* blocks and return aggregate stats."""
    mining_claims = genesis.claim_registry.as_mining_claims()
    total_yield = 0.0
    for _ in range(num_blocks):
        yields = genesis.mining_engine.compute_block_yields(mining_claims)
        total_yield += sum(yields.values())
    return {
        "blocks": num_blocks,
        "total_yield": total_yield,
        "pool_remaining": genesis.community_pool.remaining,
    }


# ------------------------------------------------------------------ #
#  Action execution helpers
# ------------------------------------------------------------------ #

def _make_keys(wallet) -> dict[str, bytes]:
    return {
        "spending_key": wallet.spending_key,
        "viewing_key": wallet.viewing_key,
        "public_key": wallet.public_key,
    }


def _proof(wallet, coord, action_type, slot=0):
    """Build an ownership proof for the given wallet / coordinate / action."""
    return build_ownership_proof(
        keys=_make_keys(wallet),
        coordinate=coord,
        claim_commitment=b"\x01" * 32,
        claim_position=0,
        action_type=action_type,
        slot=slot,
    )


def execute_actions(genesis: GenesisState, blocks_mined: int) -> list[dict]:
    """Execute all 6 action types and return per-action results."""
    wallet = genesis.wallets[0]
    claims = genesis.claim_registry.get_claims(wallet.public_key)
    if not claims:
        return [{"action": a.name, "ok": False, "error": "No claims for wallet 0"}
                for a in ActionType]

    claim = claims[0]
    coord = claim.coordinate
    stake = claim.stake_amount
    pubkey = wallet.public_key
    slot = 0

    actions: list[tuple[str, ActionRequest]] = []

    # 1. READ — public, no proof
    actions.append(("READ", ActionRequest(
        action_type=ActionType.READ,
        caller_type=CallerType.USER,
        caller_pubkey=pubkey,
        slot=slot,
        request=ReadRequest(
            coordinate=coord, slot=slot,
            target=ReadTarget.RESOURCE_DENSITY,
            planet_index=-1,
            ownership_proof=None,
        ),
    )))

    # 2. EDIT — requires proof
    actions.append(("EDIT", ActionRequest(
        action_type=ActionType.EDIT,
        caller_type=CallerType.USER,
        caller_pubkey=pubkey,
        slot=slot,
        request=EditRequest(
            coordinate=coord, slot=slot,
            ownership_proof=_proof(wallet, coord, ActionType.EDIT, slot),
            target=EditTarget.CLAIM_METADATA,
            planet_index=-1,
            field_index=0,
            new_int_value=1,
            new_hash_value=b"",
        ),
    )))

    # 3. STORE — requires proof
    actions.append(("STORE", ActionRequest(
        action_type=ActionType.STORE,
        caller_type=CallerType.USER,
        caller_pubkey=pubkey,
        slot=slot,
        request=StoreRequest(
            coordinate=coord, slot=slot,
            ownership_proof=_proof(wallet, coord, ActionType.STORE, slot),
            planet_index=0,
            content_type=ContentType.JSON,
            content_hash=b"\xAB" * 32,
            size_bytes=2048,
        ),
    )))

    # 4. VERIFY — agent caller
    actions.append(("VERIFY", ActionRequest(
        action_type=ActionType.VERIFY,
        caller_type=CallerType.AGENT,
        caller_pubkey=pubkey,
        slot=slot,
        request=VerifyRequest(
            coordinate=coord, slot=slot,
            ownership_proof=_proof(wallet, coord, ActionType.VERIFY, slot),
            target=VerifyTarget.BLOCK,
            target_ref=blocks_mined,
            proof_commitment=b"\x00" * 32,
            cpu_cycles_spent=5000,
        ),
    )))

    # 5. VOTE
    actions.append(("VOTE", ActionRequest(
        action_type=ActionType.VOTE,
        caller_type=CallerType.USER,
        caller_pubkey=pubkey,
        slot=slot,
        request=VoteRequest(
            coordinate=coord, slot=slot,
            ownership_proof=_proof(wallet, coord, ActionType.VOTE, slot),
            proposal_id=1,
            choice=VoteChoice.FOR,
            weight=stake,
        ),
    )))

    # 6. SECURE — requires proof
    actions.append(("SECURE", ActionRequest(
        action_type=ActionType.SECURE,
        caller_type=CallerType.USER,
        caller_pubkey=pubkey,
        slot=slot,
        request=SecureRequest(
            coordinate=coord, slot=slot,
            ownership_proof=_proof(wallet, coord, ActionType.SECURE, slot),
            action=SecurityAction.SHIELD,
            target_planet=-1,
            key_commitment=b"\x00" * 32,
        ),
    )))

    results: list[dict] = []
    for name, req in actions:
        result: ActionResult = genesis.pipeline.execute(req)
        entry: dict = {
            "action": name,
            "ok": result.success,
        }
        if result.success:
            entry["data"] = result.data
        else:
            entry["error"] = result.error
        results.append(entry)

    return results


# ------------------------------------------------------------------ #
#  Serialization helper
# ------------------------------------------------------------------ #

def _serialize_for_json(obj):
    """Convert bytes and other non-JSON-serializable types."""
    if isinstance(obj, bytes):
        return obj.hex()
    if isinstance(obj, float):
        return round(obj, 6)
    raise TypeError(f"Not JSON serializable: {type(obj)}")


# ------------------------------------------------------------------ #
#  Output
# ------------------------------------------------------------------ #

def output_json(
    args: argparse.Namespace,
    genesis: GenesisState,
    claims_data: list[dict],
    mining_data: dict,
    action_results: list[dict],
) -> None:
    """Print structured JSON to stdout."""
    payload = {
        "genesis": {
            "wallets": args.wallets,
            "claims": args.claims,
            "seed": args.seed,
            "state_root": genesis.ledger_state.get_state_root().hex(),
            "records": genesis.ledger_state.record_count,
            "community_pool": genesis.community_pool.remaining,
        },
        "claims": claims_data,
        "mining": mining_data,
        "actions": action_results,
    }
    print(json.dumps(payload, indent=2, default=_serialize_for_json))


def output_human(
    args: argparse.Namespace,
    genesis: GenesisState,
    claims_data: list[dict],
    mining_data: dict,
    action_results: list[dict],
) -> None:
    """Print a human-readable summary to stdout."""
    sep = "=" * 60
    state_root = genesis.ledger_state.get_state_root().hex()[:12] + "..."
    pool = genesis.community_pool.remaining

    print(sep)
    print("  AGENTIC CHAIN TESTNET — DRY RUN")
    print(sep)
    print()
    print(f"Genesis: {args.wallets} wallets, {args.claims} claims, seed={args.seed}")
    print(f"State root: {state_root}")
    print(f"Records: {genesis.ledger_state.record_count}")
    print(f"Community pool: {pool:,.6f} AGNTC")
    print()

    # -- Claims --------------------------------------------------------
    print("--- Claims ---")
    for c in claims_data:
        owner_short = c["owner"][:12] + "..."
        print(f"  ({c['x']:+d}, {c['y']:+d}) | owner={owner_short}"
              f" | stake={c['stake']} | density={c['density']:.4f}"
              f" | slots={c['slots']}")
    print()

    # -- Mining --------------------------------------------------------
    print(f"--- Mining ({mining_data['blocks']} blocks) ---")
    print(f"  Total yield: {mining_data['total_yield']:.6f} AGNTC")
    print(f"  Pool remaining: {mining_data['pool_remaining']:,.2f} AGNTC")
    print()

    # -- Actions -------------------------------------------------------
    print("--- Actions (all 6 types) ---")
    all_ok = True
    for a in action_results:
        status = "[OK]" if a["ok"] else "[FAIL]"
        detail = a.get("data") or a.get("error", "")
        print(f"  {a['action']:<8} {status}  {detail}")
        if not a["ok"]:
            all_ok = False
    print()

    # -- Summary -------------------------------------------------------
    passed = sum(1 for a in action_results if a["ok"])
    total = len(action_results)
    verdict = "PASS" if all_ok else f"FAIL ({total - passed}/{total} failed)"
    print("--- Summary ---")
    print(f"  All {total} actions: {verdict}")
    print(f"  Coordinates mapped: {len(claims_data)}")
    print(f"  Mining active: {mining_data['total_yield']:.6f} AGNTC"
          f" over {mining_data['blocks']} blocks")
    print(sep)


# ------------------------------------------------------------------ #
#  Main
# ------------------------------------------------------------------ #

def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    # 1. Genesis
    genesis = create_genesis(
        num_wallets=args.wallets,
        num_claims=args.claims,
        seed=args.seed,
    )

    # 2. Claim data
    claims_data = collect_claims(genesis)

    # 3. Mining
    mining_data = mine_blocks(genesis, num_blocks=args.blocks)

    # 4. Actions
    action_results = execute_actions(genesis, blocks_mined=args.blocks)

    # 5. Output
    if args.json_output:
        output_json(args, genesis, claims_data, mining_data, action_results)
    else:
        output_human(args, genesis, claims_data, mining_data, action_results)

    # Non-zero exit if any action failed
    if not all(a["ok"] for a in action_results):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
