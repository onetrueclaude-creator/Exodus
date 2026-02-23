"""Integration tests: verify coordinates → coins → blocks mapping."""
import pytest


class TestCoordinateToCoinMapping:
    def test_every_claim_has_ledger_records(self):
        """Each claimed coordinate must be backed by ledger Records."""
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(num_wallets=10, num_claims=8, seed=42)
        for claim in g.claim_registry.all_active_claims():
            found = False
            for pos in range(g.ledger_state.record_count):
                rec = g.ledger_state.get_record(pos)
                if rec.owner == claim.owner:
                    found = True
                    break
            assert found, f"No record for claim owner at ({claim.coordinate.x}, {claim.coordinate.y})"

    def test_coordinate_has_deterministic_properties(self):
        """Every coordinate in range has deterministic density and slots."""
        from agentic.galaxy.coordinate import resource_density, storage_slots
        from agentic.params import GRID_MIN, GRID_MAX
        import random
        rng = random.Random(42)
        for _ in range(100):
            x = rng.randint(GRID_MIN, GRID_MAX)
            y = rng.randint(GRID_MIN, GRID_MAX)
            d = resource_density(x, y)
            s = storage_slots(x, y)
            assert 0.0 <= d <= 1.0
            assert 1 <= s <= 10
            assert resource_density(x, y) == d
            assert storage_slots(x, y) == s

    def test_all_six_actions_work_on_claimed_coordinate(self):
        """Execute all 6 action types on a claimed coordinate."""
        from agentic.testnet.genesis import create_genesis
        from agentic.actions.types import (
            ActionType, CallerType, ActionRequest,
            ReadRequest, ReadTarget,
            EditRequest, EditTarget,
            StoreRequest, VerifyRequest, VerifyTarget,
            VoteRequest, VoteChoice,
            SecureRequest, SecurityAction,
        )
        from agentic.actions.ownership import build_ownership_proof
        from agentic.galaxy.content import ContentType

        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        wallet = g.wallets[0]
        claims = g.claim_registry.get_claims(wallet.public_key)
        assert len(claims) > 0, "Wallet 0 should have at least one claim"
        coord = claims[0].coordinate
        slot = 100
        keys = {"spending_key": wallet.spending_key, "viewing_key": wallet.viewing_key, "public_key": wallet.public_key}

        def proof(at: ActionType):
            return build_ownership_proof(
                keys=keys, coordinate=coord,
                claim_commitment=b"\x01" * 32, claim_position=0,
                action_type=at, slot=slot,
            )

        actions = [
            ActionRequest(ActionType.READ, CallerType.USER, wallet.public_key, slot,
                ReadRequest(coord, slot, ReadTarget.RESOURCE_DENSITY, -1, None)),
            ActionRequest(ActionType.EDIT, CallerType.USER, wallet.public_key, slot,
                EditRequest(coord, slot, proof(ActionType.EDIT),
                    EditTarget.CLAIM_METADATA, -1, 0, 1, b"\x00" * 32)),
            ActionRequest(ActionType.STORE, CallerType.USER, wallet.public_key, slot,
                StoreRequest(coord, slot, proof(ActionType.STORE),
                    0, ContentType.JSON, b"\xAB" * 32, 1024)),
            ActionRequest(ActionType.VERIFY, CallerType.AGENT, wallet.public_key, slot,
                VerifyRequest(coord, slot, proof(ActionType.VERIFY),
                    VerifyTarget.BLOCK, 1, b"\xCC" * 32, 5000)),
            ActionRequest(ActionType.VOTE, CallerType.USER, wallet.public_key, slot,
                VoteRequest(coord, slot, proof(ActionType.VOTE),
                    1, VoteChoice.FOR, claims[0].stake_amount)),
            ActionRequest(ActionType.SECURE, CallerType.USER, wallet.public_key, slot,
                SecureRequest(coord, slot, proof(ActionType.SECURE),
                    SecurityAction.SHIELD, -1, b"\xDD" * 32)),
        ]

        for action_req in actions:
            result = g.pipeline.execute(action_req)
            assert result.success, f"{action_req.action_type.name} failed: {result.error}"

    def test_mining_yields_map_to_coordinates(self):
        """Mining yields should come from specific coordinate densities."""
        from agentic.testnet.genesis import create_genesis
        from agentic.galaxy.coordinate import resource_density

        g = create_genesis(num_wallets=5, num_claims=3, seed=42)
        claims_input = g.claim_registry.as_mining_claims()
        yields = g.mining_engine.compute_block_yields(claims_input)

        for owner_bytes, yield_amount in yields.items():
            owner_claims = g.claim_registry.get_claims(owner_bytes)
            assert len(owner_claims) > 0
            total_density = sum(
                resource_density(c.coordinate.x, c.coordinate.y)
                for c in owner_claims
            )
            assert total_density > 0

    def test_replay_protection_across_actions(self):
        """Same nullifier can't be used twice."""
        from agentic.testnet.genesis import create_genesis
        from agentic.actions.types import (
            ActionType, CallerType, ActionRequest,
            ReadRequest, ReadTarget, OwnershipProof,
        )
        from agentic.galaxy.coordinate import GridCoordinate

        g = create_genesis(num_wallets=3, num_claims=2, seed=42)
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_nullifier=b"\xDE\xAD" * 16,
            action_nonce=b"\x03" * 32, proof_hash=b"\x04" * 32,
        )
        req = ActionRequest(
            action_type=ActionType.READ, caller_type=CallerType.USER,
            caller_pubkey=g.wallets[0].public_key, slot=1,
            request=ReadRequest(
                coordinate=GridCoordinate(x=0, y=0), slot=1,
                target=ReadTarget.RESOURCE_DENSITY, planet_index=-1,
                ownership_proof=proof,
            ),
        )
        r1 = g.pipeline.execute(req)
        assert r1.success is True
        r2 = g.pipeline.execute(req)
        assert r2.success is False
