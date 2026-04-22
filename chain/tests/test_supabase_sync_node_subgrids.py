from unittest.mock import MagicMock

import pytest

from agentic.testnet.genesis import create_genesis


def test_sync_node_subgrids_upserts_each_node(monkeypatch):
    # Flag off = new path active (that's when sync_node_subgrids should write).
    monkeypatch.setattr("agentic.testnet.supabase_sync.LEGACY_PER_WALLET_SUBGRID", False)

    fake_client = MagicMock()
    # _get_client is the canonical lazy-init singleton function in supabase_sync.py
    monkeypatch.setattr(
        "agentic.testnet.supabase_sync._get_client",
        lambda: fake_client,
        raising=False,
    )

    from agentic.testnet.supabase_sync import _sync_node_subgrids
    g = create_genesis(seed=42)
    _sync_node_subgrids(g)

    # Upsert called on node_subgrids table with a list of len(node_subgrids)
    fake_client.table.assert_any_call("node_subgrids")
    args = fake_client.table.return_value.upsert.call_args
    rows = args.args[0]
    assert len(rows) == len(g.node_subgrids)
    sample = rows[0]
    assert set(sample.keys()) >= {"node_id", "owner_wallet", "cells", "type_levels"}
    assert isinstance(sample["cells"], list) and len(sample["cells"]) == 64


def test_sync_node_subgrids_noop_when_legacy_flag_on(monkeypatch):
    # Flag default ON — new helper must skip the upsert entirely.
    monkeypatch.setattr("agentic.testnet.supabase_sync.LEGACY_PER_WALLET_SUBGRID", True)
    fake_client = MagicMock()
    monkeypatch.setattr(
        "agentic.testnet.supabase_sync._get_client",
        lambda: fake_client,
        raising=False,
    )
    from agentic.testnet.supabase_sync import _sync_node_subgrids
    g = create_genesis(seed=42)
    _sync_node_subgrids(g)

    # No upsert should have occurred
    fake_client.table.assert_not_called()
