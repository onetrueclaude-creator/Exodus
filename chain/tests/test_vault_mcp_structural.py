"""DePIN Vault S4 — structural tripwires (design §12, Global Constraint 2).

1) The /api/vault route surface is a frozen allowlist — adding any
   transfer-shaped or write-shaped route forces a deliberate re-review.
2) No memory activity mints AGNTC: the entry endpoints and the entries module
   never touch mint/reward machinery (source sweep, house S3 pattern).
3) No AGNTC buys quota: economics modules never reference the S4 entry/quota
   machinery (reverse sweep, auto-covering future econ modules).
"""
import importlib
import inspect
import pkgutil


class TestVaultRouteSurface:
    def test_vault_route_surface_is_a_frozen_allowlist(self):
        from agentic.testnet import api as api_module
        vault_routes = [r for r in api_module.app.routes
                        if getattr(r, "path", "").startswith("/api/vault")]
        surface = {(r.path, tuple(sorted(m for m in r.methods if m != "HEAD")))
                   for r in vault_routes}
        assert surface == {
            ("/api/vault/root", ("GET",)),
            ("/api/vault/assignment/{wallet_index}", ("GET",)),
            ("/api/vault/shard", ("POST",)),
            ("/api/vault/challenge", ("POST",)),
            ("/api/vault/submit-proof", ("POST",)),
            ("/api/vault/status/{wallet_index}", ("GET",)),
            ("/api/vault/pins/{wallet_index}", ("GET",)),
            ("/api/vault/entry", ("POST",)),
            ("/api/vault/entries", ("GET",)),
            ("/api/vault/audit-summary", ("GET",)),
            ("/api/vault/backfill", ("POST",)),
        }, "the /api/vault surface changed — re-clear the S4 design review"

    def test_no_transfer_shaped_vault_routes(self):
        from agentic.testnet import api as api_module
        for r in api_module.app.routes:
            path = getattr(r, "path", "")
            if not path.startswith("/api/vault"):
                continue
            for word in ("transfer", "send", "trade", "swap", "buy", "sell",
                         "withdraw", "deposit"):
                assert word not in path, (
                    f"{path} looks transfer-shaped — the vault surface moves "
                    f"content, never value (Global Constraint 2)"
                )


_MONEY_TOKENS = (
    "MintTx", "validate_mint", "receive_mint", "LedgerState",
    "MiningEngine", "FeeEngine", "SecuringRegistry", "ScoreLedger",
    "AIRDROP_POOL", "capped_contribution", "SECURE_AGNTC_REWARD",
)

_S4_TOKENS = (
    "vault.entries", "ingest_entry", "build_entry_payload",
    "VAULT_ENTRY_MAX_BYTES", "VAULT_MCP_QUOTA_TIERS",
    "VAULT_MCP_STANDING_PASS_WINDOWS", "VAULT_INDEX_EMBED_MODEL_ID",
)


class TestNoAgntcCoupling:
    def test_entries_module_never_touches_money(self):
        """Forward guard (mirrors test_time_ledger_never_touches_money):
        memory writes can never mint."""
        from agentic.vault import entries
        src = inspect.getsource(entries)
        for token in _MONEY_TOKENS:
            assert token not in src, (
                f"vault.entries references {token!r} — memory activity must "
                f"never mint AGNTC (Global Constraint 2)"
            )

    def test_entry_endpoints_never_touch_money(self):
        """The three S4 endpoint bodies, scoped like the _do_mine sweep."""
        from agentic.testnet import api as api_module
        for fn in (api_module.post_vault_entry, api_module.list_vault_entries,
                   api_module.post_vault_backfill):
            src = inspect.getsource(fn)
            for token in _MONEY_TOKENS:
                assert token not in src, (
                    f"{fn.__name__} references {token!r} — the S4 write path "
                    f"adds ZERO faucets/sinks (design §1)"
                )

    def test_economics_never_reference_s4_machinery(self):
        """Reverse guard: no AGNTC term may read quota/entry machinery.
        Package sweep (not a hand-list) so a FUTURE econ module that couples
        memory into yield fails automatically."""
        import agentic.economics as econ_pkg
        modules = [
            importlib.import_module(f"agentic.economics.{m.name}")
            for m in pkgutil.iter_modules(econ_pkg.__path__)
        ]
        modules.append(importlib.import_module("agentic.lattice.mining"))
        for mod in modules:
            src = inspect.getsource(mod)
            for token in _S4_TOKENS:
                assert token not in src, (
                    f"{mod.__name__} references {token!r} — AGNTC math must "
                    f"never read memory-quota/entry machinery (no AGNTC buys "
                    f"quota; Global Constraint 2)"
                )

    def test_do_mine_never_references_s4_machinery(self):
        """The mining orchestrator itself stays memory-blind."""
        from agentic.testnet import api as api_module
        src = inspect.getsource(api_module._do_mine)
        for token in _S4_TOKENS:
            assert token not in src, (
                f"_do_mine references {token!r} — block rewards must never "
                f"read S4 entry/quota machinery"
            )
