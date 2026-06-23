from pathlib import Path

from agentic.testnet.genesis import create_genesis
from agentic.testnet.persistence import init_db, save_state, load_state, clear_state


def test_account_keys_round_trip(tmp_path: Path):
    db = tmp_path / "t.db"
    init_db(db)

    g = create_genesis(seed=42)
    owner = g.wallets[1].public_key
    signing_pub = bytes(range(32))            # stand-in Phantom pubkey
    g.account_signing_keys[owner] = signing_pub
    g.account_nonces[owner] = 7
    save_state(g, last_block_time=123.0, db_path=db)

    # Fresh genesis (empty maps) then restore.
    g2 = create_genesis(seed=42)
    assert g2.account_signing_keys == {}
    assert g2.account_nonces == {}
    load_state(g2, db)

    assert g2.account_signing_keys[owner] == signing_pub
    assert g2.account_nonces[owner] == 7


def test_account_keys_persists_nonce_without_signing_key(tmp_path: Path):
    # A nonce can advance for an account that has no bound key yet (dev path).
    db = tmp_path / "t.db"
    init_db(db)
    g = create_genesis(seed=1)
    owner = g.wallets[2].public_key
    g.account_nonces[owner] = 3
    save_state(g, 0.0, db)

    g2 = create_genesis(seed=1)
    load_state(g2, db)
    assert g2.account_nonces[owner] == 3
    assert owner not in g2.account_signing_keys


def test_clear_state_wipes_account_keys(tmp_path: Path):
    db = tmp_path / "t.db"
    init_db(db)
    g = create_genesis(seed=1)
    owner = g.wallets[1].public_key
    g.account_signing_keys[owner] = bytes(range(32))
    g.account_nonces[owner] = 5
    save_state(g, 0.0, db)
    clear_state(db)

    g2 = create_genesis(seed=1)
    load_state(g2, db)
    assert g2.account_signing_keys == {}
    assert g2.account_nonces == {}
