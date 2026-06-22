"""Tests for the on-chain Scores board: dev Founder seat + Secure credits.

The upper-right Scores widget shows the player's OWN wallet stats:
  - Mined   = mining_engine.get_mined_chains(wallet_pubkey)
  - Secured = securing_registry.get_secured_chains(wallet_index)
both surfaced via GET /api/settings/{wallet_index}.

Two pieces make those numbers move for the dev player:
  A) ensure_dev_founder_claim — a real, STAKED claim seated for the dev wallet at
     STARTUP (idempotent), so it earns mining yield every block.
  B) credit_proof_secured — the terminal "Secure" action (an accepted PoAW
     possession proof) credits +1 Secured, since the proof does not open a
     securing position.
"""
import pytest
from fastapi.testclient import TestClient

from agentic.economics.securing import SecuringRegistry
from agentic.testnet.genesis import (
    create_genesis,
    ensure_dev_founder_claim,
    DEV_FOUNDER_COORD,
    DEV_FOUNDER_STAKE,
)


# --------------------------------------------------------------------------- #
# A) ensure_dev_founder_claim — staked + idempotent                           #
# --------------------------------------------------------------------------- #
class TestEnsureDevFounderClaim:
    def test_creates_staked_claim_for_wallet_1(self):
        g = create_genesis(num_wallets=50, num_claims=0, seed=42)
        # Genesis seats only the Singularity (v1.2 §10.1).
        assert len(g.claim_registry.all_active_claims()) == 1

        created = ensure_dev_founder_claim(g, wallet_index=1)
        assert created is True

        claims = g.claim_registry.get_claims(g.wallets[1].public_key)
        assert len(claims) == 1
        # Stake must be > 0 so the claim earns mining yield every block.
        assert claims[0].stake_amount == DEV_FOUNDER_STAKE
        assert claims[0].stake_amount > 0
        assert (claims[0].coordinate.x, claims[0].coordinate.y) == DEV_FOUNDER_COORD
        # Singularity (origin) + dev Founder = 2 active claims now.
        assert len(g.claim_registry.all_active_claims()) == 2

    def test_seats_a_matching_validator_and_agent(self):
        g = create_genesis(num_wallets=50, num_claims=0, seed=42)
        n_validators_before = len(g.validators)
        n_agents_before = len(g.agents)
        ensure_dev_founder_claim(g, wallet_index=1)
        # A validator + verification agent are wired so the seat joins PoAIV.
        assert len(g.validators) == n_validators_before + 1
        assert len(g.agents) == n_agents_before + 1
        # Viewing key is registered so mining rewards can be minted.
        assert g.wallets[1].public_key in g.viewing_keys

    def test_is_idempotent_no_duplicate_on_second_call(self):
        g = create_genesis(num_wallets=50, num_claims=0, seed=42)
        assert ensure_dev_founder_claim(g, wallet_index=1) is True
        total_after_first = len(g.claim_registry.all_active_claims())
        n_validators = len(g.validators)

        # Second call is a no-op — no duplicate claim, no extra validator.
        assert ensure_dev_founder_claim(g, wallet_index=1) is False
        assert len(g.claim_registry.get_claims(g.wallets[1].public_key)) == 1
        assert len(g.claim_registry.all_active_claims()) == total_after_first
        assert len(g.validators) == n_validators

    def test_does_not_touch_create_genesis_count(self):
        """The seed is startup-only — create_genesis stays player-empty."""
        g = create_genesis(num_wallets=50, num_claims=0, seed=42)
        assert len(g.claim_registry.all_active_claims()) == 1  # Singularity only

    def test_rejects_out_of_range_wallet_index(self):
        g = create_genesis(num_wallets=50, num_claims=0, seed=42)
        assert ensure_dev_founder_claim(g, wallet_index=99999) is False
        assert len(g.claim_registry.all_active_claims()) == 1


# --------------------------------------------------------------------------- #
# B) The dev Founder claim earns mining yield → Mined grows                   #
# --------------------------------------------------------------------------- #
class TestDevFounderEarnsMiningYield:
    def test_mined_chains_grows_after_blocks(self):
        g = create_genesis(num_wallets=50, num_claims=0, seed=42)
        ensure_dev_founder_claim(g, wallet_index=1)
        pubkey = g.wallets[1].public_key

        assert g.mining_engine.get_mined_chains(pubkey) == 0
        for _ in range(5):
            claims_input = g.claim_registry.as_mining_claims()
            g.mining_engine.compute_block_yields(
                claims_input, epoch_tracker=g.epoch_tracker,
            )
        # The staked claim earned yield on every processed block.
        assert g.mining_engine.get_mined_chains(pubkey) == 5


# --------------------------------------------------------------------------- #
# C) credit_proof_secured — Secure action moves Secured                       #
# --------------------------------------------------------------------------- #
class TestCreditProofSecured:
    def test_increments_secured_chains_by_one_per_call(self):
        reg = SecuringRegistry()
        assert reg.get_secured_chains(1) == 0
        reg.credit_proof_secured(1)
        assert reg.get_secured_chains(1) == 1
        reg.credit_proof_secured(1)
        assert reg.get_secured_chains(1) == 2

    def test_credit_is_per_wallet(self):
        reg = SecuringRegistry()
        reg.credit_proof_secured(1)
        reg.credit_proof_secured(1)
        reg.credit_proof_secured(3)
        assert reg.get_secured_chains(1) == 2
        assert reg.get_secured_chains(3) == 1
        assert reg.get_secured_chains(7) == 0  # untouched wallet

    def test_secured_includes_position_blocks_plus_proof_credits(self):
        """get_secured_chains = position secured_blocks + proof credits."""
        reg = SecuringRegistry()
        # Open a position and let it secure two blocks.
        pos = reg.create_position(
            wallet_index=1, owner=b"owner-1",
            duration_blocks=10, current_block=0, node_x=0, node_y=0,
        )
        pos.secured_blocks = 2  # simulate two blocks of position-based securing
        assert reg.get_secured_chains(1) == 2
        # Proof credits stack ON TOP of position-based secured blocks.
        reg.credit_proof_secured(1)
        assert reg.get_secured_chains(1) == 3


# --------------------------------------------------------------------------- #
# D) End-to-end: an accepted proof bumps Secured via the settings path        #
# --------------------------------------------------------------------------- #
class TestSecuredViaSettingsPath:
    @pytest.fixture
    def client(self, admin_headers):
        from agentic.testnet import api as api_module

        c = TestClient(api_module.app)
        c.post("/api/reset", headers=admin_headers)
        # Seat 5 distinct wallets so shard ownership is distributed and wallet 1
        # reliably owns at least one shard (mirrors test_api_vault seeding).
        from tests.conftest import seat_player_claims
        seat_player_claims([(20, 0)], wallet_index=1)
        seat_player_claims([(0, 20)], wallet_index=2)
        seat_player_claims([(-20, 0)], wallet_index=3)
        seat_player_claims([(0, -20)], wallet_index=4)
        seat_player_claims([(20, 20)], wallet_index=5)
        api_module._refresh_vault_owners()
        return c

    def test_accepted_proof_increments_total_secured_chains(self, client):
        from agentic.testnet import api as api_module

        before = client.get("/api/settings/1").json()["total_secured_chains"]

        assignment = client.get("/api/vault/assignment/1").json()
        if not assignment["shards"]:
            pytest.skip("wallet 1 holds no shard in this seeding")
        shard_id = assignment["shards"][0]

        ch = client.post(
            "/api/vault/challenge",
            json={"wallet_index": 1, "shard_id": shard_id},
        ).json()

        g = api_module._g()
        from agentic.vault.pdp import make_proof
        units = g.vault_registry.shard_sub_units(shard_id)
        proof = make_proof(units, ch["indices"])

        resp = client.post("/api/vault/submit-proof", json={
            "wallet_index": 1, "shard_id": shard_id,
            "issued_block": ch["issued_block"], "expires_block": ch["expires_block"],
            "indices": ch["indices"], "block_seed_hex": ch["block_seed_hex"],
            "proof": proof,
        }).json()
        assert resp["accepted"] is True

        after = client.get("/api/settings/1").json()["total_secured_chains"]
        assert after == before + 1

    def test_rejected_proof_does_not_increment_secured(self, client):
        from agentic.testnet import api as api_module

        before = client.get("/api/settings/1").json()["total_secured_chains"]

        assignment = client.get("/api/vault/assignment/1").json()
        if not assignment["shards"]:
            pytest.skip("wallet 1 holds no shard in this seeding")
        shard_id = assignment["shards"][0]
        ch = client.post(
            "/api/vault/challenge",
            json={"wallet_index": 1, "shard_id": shard_id},
        ).json()

        g = api_module._g()
        from agentic.vault.pdp import make_proof
        units = g.vault_registry.shard_sub_units(shard_id)
        proof = make_proof(units, ch["indices"])
        proof["leaves"][str(ch["indices"][0])] = "ff" * 32  # tamper

        resp = client.post("/api/vault/submit-proof", json={
            "wallet_index": 1, "shard_id": shard_id,
            "issued_block": ch["issued_block"], "expires_block": ch["expires_block"],
            "indices": ch["indices"], "block_seed_hex": ch["block_seed_hex"],
            "proof": proof,
        }).json()
        assert resp["accepted"] is False

        after = client.get("/api/settings/1").json()["total_secured_chains"]
        assert after == before  # rejected proof must not credit Secured
