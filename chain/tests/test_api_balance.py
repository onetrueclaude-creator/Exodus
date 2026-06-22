"""/api/balance/{wallet_index}: real spendable balance for the HUD AGNTC display.

The HUD AGNTC ticker reads this endpoint so it reflects the wallet's live ledger
balance (sum of unspent record values) instead of a static plan value. Per the
earn-by-securing model (GENESIS_BALANCE = 0) a fresh wallet starts at 0 and grows
as it mines / secures.

UNIT CONTRACT: spendable_micro_agntc is in microAGNTC. Every app-facing mint path
scales by 1e6 before storage (mining.mint_block_rewards and the secure-reward mint
both do round(amount * 1_000_000)), so get_balance() returns a microAGNTC sum and
the endpoint exposes it raw. These tests mint via the same receive_mint path with
the same 1e6 scaling and assert the raw micro value comes straight back.
"""
import pytest
from fastapi.testclient import TestClient

from agentic.testnet.api import app
from tests.conftest import TEST_ADMIN_TOKEN

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture
def client():
    with TestClient(app) as c:
        # Fresh genesis: wallets start at GENESIS_BALANCE = 0.
        c.post("/api/reset?wallets=10&seed=42", headers=_ADMIN)
        yield c


def test_fresh_wallet_balance_is_zero(client):
    resp = client.get("/api/balance/1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["wallet_index"] == 1
    # Earn-by-securing: no pre-mine, so a fresh wallet is empty.
    assert body["spendable_micro_agntc"] == 0


def test_balance_grows_after_mint_in_micro_agntc(client):
    """A mint of 1 AGNTC (scaled by 1e6, as the app does) yields 1_000_000 micro.

    This pins the unit: the secure reward (SECURE_AGNTC_REWARD = 1.0) is minted as
    round(1.0 * 1_000_000) = 1_000_000 microAGNTC, and the endpoint returns that
    raw micro value.
    """
    from agentic.testnet import api as _api

    g = _api._genesis
    assert g is not None
    one_agntc_micro = round(1.0 * 1_000_000)  # same scaling as the app mint paths
    g.wallets[1].receive_mint(g.ledger_state, amount=one_agntc_micro, slot=0)

    body = client.get("/api/balance/1").json()
    assert body["spendable_micro_agntc"] == 1_000_000  # 1 AGNTC == 1e6 microAGNTC


def test_balance_accumulates_across_mints(client):
    """Balance is the sum of all unspent record values (micro)."""
    from agentic.testnet import api as _api

    g = _api._genesis
    assert g is not None
    g.wallets[2].receive_mint(g.ledger_state, amount=1_000_000, slot=0)
    g.wallets[2].receive_mint(g.ledger_state, amount=500_000, slot=1)

    body = client.get("/api/balance/2").json()
    assert body["spendable_micro_agntc"] == 1_500_000  # 1.5 AGNTC


def test_balance_is_per_wallet(client):
    """Minting to one wallet does not change another wallet's balance."""
    from agentic.testnet import api as _api

    g = _api._genesis
    assert g is not None
    g.wallets[3].receive_mint(g.ledger_state, amount=2_000_000, slot=0)

    assert client.get("/api/balance/3").json()["spendable_micro_agntc"] == 2_000_000
    assert client.get("/api/balance/4").json()["spendable_micro_agntc"] == 0


def test_balance_404_on_out_of_range_index(client):
    assert client.get("/api/balance/9999").status_code == 404


def test_balance_404_on_negative_index(client):
    # FastAPI coerces the path param to int; -1 is in range syntactically but
    # out of range for the wallet list, so the handler's guard returns 404.
    assert client.get("/api/balance/-1").status_code == 404
