"""SQLite persistence for Agentic Chain testnet state.

Persists the mutable delta on top of a fresh deterministic genesis:
- Scalar counters (blocks, epoch, supply, burned fees, message counter, last block time)
- User claims added via /api/claim (genesis coords always reconstructed)
- Subgrid allocations per wallet
- Resource totals per wallet
- Intro messages per coordinate
- Message history

Usage:
    from agentic.testnet.persistence import init_db, save_state, load_state, clear_state

    db_path = Path("testnet_state.db")
    init_db(db_path)
    # After genesis init:
    load_state(genesis_state, last_block_time, db_path)
    # After each mine:
    save_state(genesis_state, last_block_time, db_path)
    # After /api/reset:
    clear_state(db_path)
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agentic.testnet.genesis import GenesisState

# Coordinates that are always reconstructed by create_genesis() — skip on save
from agentic.params import GENESIS_ORIGIN, GENESIS_FACTION_MASTERS, GENESIS_HOMENODES

_GENESIS_COORDS: frozenset[tuple[int, int]] = frozenset(
    [GENESIS_ORIGIN] + list(GENESIS_FACTION_MASTERS) + list(GENESIS_HOMENODES)
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS chain_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_claims (
    x          INTEGER NOT NULL,
    y          INTEGER NOT NULL,
    owner_hex  TEXT    NOT NULL,
    stake      INTEGER NOT NULL,
    slot       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (x, y)
);

CREATE TABLE IF NOT EXISTS intro_messages (
    x       INTEGER NOT NULL,
    y       INTEGER NOT NULL,
    message TEXT    NOT NULL,
    PRIMARY KEY (x, y)
);

CREATE TABLE IF NOT EXISTS message_history (
    msg_id    TEXT    PRIMARY KEY,
    sender_x  INTEGER NOT NULL,
    sender_y  INTEGER NOT NULL,
    target_x  INTEGER NOT NULL,
    target_y  INTEGER NOT NULL,
    text      TEXT    NOT NULL,
    timestamp REAL    NOT NULL
);

CREATE TABLE IF NOT EXISTS subgrid_allocations (
    owner_hex      TEXT    PRIMARY KEY,
    secure_cells   INTEGER NOT NULL DEFAULT 0,
    develop_cells  INTEGER NOT NULL DEFAULT 0,
    research_cells INTEGER NOT NULL DEFAULT 0,
    storage_cells  INTEGER NOT NULL DEFAULT 0,
    secure_level   INTEGER NOT NULL DEFAULT 1,
    develop_level  INTEGER NOT NULL DEFAULT 1,
    research_level INTEGER NOT NULL DEFAULT 1,
    storage_level  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS resource_totals (
    owner_hex        TEXT  PRIMARY KEY,
    dev_points       REAL  NOT NULL DEFAULT 0.0,
    research_points  REAL  NOT NULL DEFAULT 0.0,
    storage_units    REAL  NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS account_keys (
    owner_hex          TEXT PRIMARY KEY,
    signing_pubkey_hex TEXT,
    nonce              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS score_ledger (
    owner_hex            TEXT PRIMARY KEY,
    mined_blocks         INTEGER NOT NULL DEFAULT 0,
    proof_secured_count  INTEGER NOT NULL DEFAULT 0,
    activity_score       REAL    NOT NULL DEFAULT 0.0,
    capped_contribution  REAL    NOT NULL DEFAULT 0.0,
    last_activity_block  INTEGER,
    updated_at_block     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pin_shards (
    owner_hex        TEXT    NOT NULL,
    shard_id         INTEGER NOT NULL,
    assigned_block   INTEGER NOT NULL,
    size_bytes       INTEGER NOT NULL DEFAULT 0,
    passes           INTEGER NOT NULL DEFAULT 0,
    misses           INTEGER NOT NULL DEFAULT 0,
    last_pass_block  INTEGER,
    last_miss_block  INTEGER,
    active           INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (owner_hex, shard_id)
);

CREATE TABLE IF NOT EXISTS time_ledger (
    owner_hex        TEXT    PRIMARY KEY,
    time_accrued     INTEGER NOT NULL DEFAULT 0,
    passes_watermark INTEGER NOT NULL DEFAULT 0,
    updated_at_block INTEGER NOT NULL
);
"""


def _connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def init_db(db_path: Path) -> None:
    """Create tables if they don't exist. Safe to call on every startup."""
    with _connect(db_path) as conn:
        conn.executescript(_SCHEMA)


def save_state(g: GenesisState, last_block_time: float, db_path: Path) -> None:
    """Persist all mutable state to SQLite. Safe to call frequently."""
    from agentic.lattice.subgrid import SubcellType

    try:
        with _connect(db_path) as conn:
            # -- Scalar meta --------------------------------------------------
            meta = {
                "blocks_processed":         str(g.mining_engine.total_blocks_processed),
                "total_rewards_distributed": str(g.mining_engine.total_rewards_distributed),
                "epoch_ring":               str(g.epoch_tracker.current_ring),
                "epoch_total_mined":        str(g.epoch_tracker.total_mined),
                "fee_total_burned":         str(g.fee_engine.total_burned),
                "last_block_time":          str(last_block_time),
                "message_counter":          str(g._message_counter),
            }
            conn.executemany(
                "INSERT OR REPLACE INTO chain_meta (key, value) VALUES (?, ?)",
                meta.items(),
            )

            # -- User claims (non-genesis only) --------------------------------
            user_claims = [
                (c.coordinate.x, c.coordinate.y,
                 c.owner.hex(), c.stake_amount, c.slot)
                for c in g.claim_registry.all_active_claims()
                if (c.coordinate.x, c.coordinate.y) not in _GENESIS_COORDS
            ]
            conn.executemany(
                "INSERT OR REPLACE INTO user_claims (x, y, owner_hex, stake, slot) "
                "VALUES (?, ?, ?, ?, ?)",
                user_claims,
            )

            # -- Intro messages -----------------------------------------------
            conn.executemany(
                "INSERT OR REPLACE INTO intro_messages (x, y, message) VALUES (?, ?, ?)",
                [(x, y, msg) for (x, y), msg in g.intro_messages.items()],
            )

            # -- Message history -----------------------------------------------
            all_msgs = []
            for msg_list in g.message_history.values():
                for m in msg_list:
                    sc = m.get("sender_coord", {})
                    tc = m.get("target_coord", {})
                    all_msgs.append((
                        m["id"],
                        sc.get("x", 0), sc.get("y", 0),
                        tc.get("x", 0), tc.get("y", 0),
                        m.get("text", ""),
                        float(m.get("timestamp", 0.0)),
                    ))
            if all_msgs:
                conn.executemany(
                    "INSERT OR REPLACE INTO message_history "
                    "(msg_id, sender_x, sender_y, target_x, target_y, text, timestamp) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    all_msgs,
                )

            # -- Subgrid allocations ------------------------------------------
            alloc_rows = []
            for owner_bytes, alloc in g.subgrid_allocators.items():
                alloc_rows.append((
                    owner_bytes.hex(),
                    alloc.count(SubcellType.SECURE),
                    alloc.count(SubcellType.DEVELOP),
                    alloc.count(SubcellType.RESEARCH),
                    alloc.count(SubcellType.STORAGE),
                    alloc.get_level(SubcellType.SECURE),
                    alloc.get_level(SubcellType.DEVELOP),
                    alloc.get_level(SubcellType.RESEARCH),
                    alloc.get_level(SubcellType.STORAGE),
                ))
            if alloc_rows:
                conn.executemany(
                    "INSERT OR REPLACE INTO subgrid_allocations "
                    "(owner_hex, secure_cells, develop_cells, research_cells, storage_cells, "
                    " secure_level, develop_level, research_level, storage_level) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    alloc_rows,
                )

            # -- Resource totals ----------------------------------------------
            totals_rows = [
                (owner_bytes.hex(),
                 totals.get("dev_points", 0.0),
                 totals.get("research_points", 0.0),
                 totals.get("storage_units", 0.0))
                for owner_bytes, totals in g.resource_totals.items()
            ]
            if totals_rows:
                conn.executemany(
                    "INSERT OR REPLACE INTO resource_totals "
                    "(owner_hex, dev_points, research_points, storage_units) "
                    "VALUES (?, ?, ?, ?)",
                    totals_rows,
                )

            # -- Account keys: signing pubkey + replay nonce ------------------
            # Union of both maps' owners (a nonce can advance before a key is bound).
            owners = set(g.account_signing_keys) | set(g.account_nonces)
            acct_rows = [
                (
                    owner.hex(),
                    g.account_signing_keys[owner].hex() if owner in g.account_signing_keys else None,
                    int(g.account_nonces.get(owner, 0)),
                )
                for owner in owners
            ]
            if acct_rows:
                conn.executemany(
                    "INSERT OR REPLACE INTO account_keys "
                    "(owner_hex, signing_pubkey_hex, nonce) VALUES (?, ?, ?)",
                    acct_rows,
                )

            # -- Score ledger (W5): per-owner cumulative contribution ----------
            ledger = getattr(g, "score_ledger", None)
            if ledger is not None:
                ledger_rows = [
                    (
                        owner_hex,
                        int(row.get("mined_blocks", 0)),
                        int(row.get("proof_secured_count", 0)),
                        float(row.get("activity_score", 0.0)),
                        float(row.get("capped_contribution", 0.0)),
                        row.get("last_activity_block"),
                        int(row.get("updated_at_block", 0)),
                    )
                    for owner_hex, row in ledger.all().items()
                ]
                if ledger_rows:
                    conn.executemany(
                        "INSERT OR REPLACE INTO score_ledger "
                        "(owner_hex, mined_blocks, proof_secured_count, activity_score, "
                        " capped_contribution, last_activity_block, updated_at_block) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        ledger_rows,
                    )

            # -- Pin registry (DePIN S1): per-(owner, shard) audit history -----
            pins = getattr(g, "pin_registry", None)
            if pins is not None:
                pin_rows = [
                    (
                        owner_hex, int(sid),
                        int(r.get("assigned_block", 0)), int(r.get("size_bytes", 0)),
                        int(r.get("passes", 0)), int(r.get("misses", 0)),
                        r.get("last_pass_block"), r.get("last_miss_block"),
                        1 if r.get("active", True) else 0,
                    )
                    for owner_hex, shards in pins.all().items()
                    for sid, r in shards.items()
                ]
                if pin_rows:
                    conn.executemany(
                        "INSERT OR REPLACE INTO pin_shards "
                        "(owner_hex, shard_id, assigned_block, size_bytes, passes, misses, "
                        " last_pass_block, last_miss_block, active) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        pin_rows,
                    )

            # -- Time ledger (DePIN S3): soulbound tenure + persisted watermark
            tl = getattr(g, "time_ledger", None)
            if tl is not None:
                time_rows = [
                    (
                        owner_hex,
                        int(row.get("time_accrued", 0)),
                        int(row.get("passes_watermark", 0)),
                        int(row.get("updated_at_block", 0)),
                    )
                    for owner_hex, row in tl.all().items()
                ]
                if time_rows:
                    conn.executemany(
                        "INSERT OR REPLACE INTO time_ledger "
                        "(owner_hex, time_accrued, passes_watermark, "
                        " updated_at_block) VALUES (?, ?, ?, ?)",
                        time_rows,
                    )

    except Exception:
        pass  # persistence must never crash the miner


def load_state(g: GenesisState, db_path: Path) -> float:
    """Restore mutable state from SQLite onto a freshly created genesis.

    Returns the last_block_time value (0.0 if no prior state).
    Safe to call even when the DB is empty (no-op).
    """
    from agentic.lattice.coordinate import GridCoordinate, GLOBAL_BOUNDS
    from agentic.lattice.subgrid import SubgridAllocator, SubcellType
    from agentic.consensus.validator import Validator
    from agentic.verification.agent import VerificationAgent, AgentState
    import random as _random

    last_block_time = 0.0

    if not db_path.exists():
        return last_block_time

    try:
        with _connect(db_path) as conn:
            # -- Scalar meta --------------------------------------------------
            rows = conn.execute("SELECT key, value FROM chain_meta").fetchall()
            meta = {r["key"]: r["value"] for r in rows}

            if "blocks_processed" in meta:
                g.mining_engine.total_blocks_processed = int(meta["blocks_processed"])
            if "total_rewards_distributed" in meta:
                g.mining_engine.total_rewards_distributed = float(meta["total_rewards_distributed"])
            if "epoch_ring" in meta:
                g.epoch_tracker.current_ring = int(meta["epoch_ring"])
            if "epoch_total_mined" in meta:
                g.epoch_tracker.total_mined = float(meta["epoch_total_mined"])
            if "fee_total_burned" in meta:
                g.fee_engine.total_burned = int(meta["fee_total_burned"])
            if "last_block_time" in meta:
                last_block_time = float(meta["last_block_time"])
            if "message_counter" in meta:
                g._message_counter = int(meta["message_counter"])

            # -- User claims --------------------------------------------------
            claim_rows = conn.execute(
                "SELECT x, y, owner_hex, stake, slot FROM user_claims"
            ).fetchall()
            for row in claim_rows:
                # Expand bounds before constructing coord — user claims may be beyond genesis ring
                GLOBAL_BOUNDS.expand_to_contain(row["x"], row["y"])
                coord = GridCoordinate(x=row["x"], y=row["y"])
                # Skip if already registered (genesis coord already present)
                if g.claim_registry.get_claim_at(coord) is not None:
                    continue
                owner_bytes = bytes.fromhex(row["owner_hex"])
                g.claim_registry.register(
                    owner=owner_bytes,
                    coordinate=coord,
                    stake=row["stake"],
                    slot=row["slot"],
                )

                # Create validator + verification agent (mirrors /api/claim logic)
                vid = len(g.validators)
                rng_vpu = _random.Random(vid + 7)
                v = Validator(
                    id=vid, token_stake=float(row["stake"]),
                    cpu_vpu=float(rng_vpu.randint(20, 120)), online=True,
                )
                g.validators.append(v)
                agent = VerificationAgent(
                    agent_id=f"verifier-{vid:03d}", validator_id=vid,
                    vpu_capacity=v.cpu_vpu, registered_epoch=0, state=AgentState.ACTIVE,
                )
                g.agents.append(agent)

                # Create subgrid allocator if not present
                if owner_bytes not in g.subgrid_allocators:
                    g.subgrid_allocators[owner_bytes] = SubgridAllocator(owner=owner_bytes)

            # -- Subgrid allocations ------------------------------------------
            alloc_rows = conn.execute(
                "SELECT owner_hex, secure_cells, develop_cells, research_cells, storage_cells, "
                "       secure_level, develop_level, research_level, storage_level "
                "FROM subgrid_allocations"
            ).fetchall()
            for row in alloc_rows:
                owner_bytes = bytes.fromhex(row["owner_hex"])
                alloc = g.subgrid_allocators.get(owner_bytes)
                if alloc is None:
                    alloc = SubgridAllocator(owner=owner_bytes)
                    g.subgrid_allocators[owner_bytes] = alloc

                # Reset then re-assign to ensure clean state
                for t in SubcellType:
                    alloc.assign(t, 0)

                col_map = {
                    SubcellType.SECURE:   ("secure_cells",   "secure_level"),
                    SubcellType.DEVELOP:  ("develop_cells",  "develop_level"),
                    SubcellType.RESEARCH: ("research_cells", "research_level"),
                    SubcellType.STORAGE:  ("storage_cells",  "storage_level"),
                }
                for cell_type, (count_col, level_col) in col_map.items():
                    count = row[count_col]
                    level = row[level_col]
                    if count > 0:
                        alloc.assign(cell_type, count)
                        if level > 1:
                            alloc.set_level(cell_type, level)

            # -- Resource totals ----------------------------------------------
            total_rows = conn.execute(
                "SELECT owner_hex, dev_points, research_points, storage_units "
                "FROM resource_totals"
            ).fetchall()
            for row in total_rows:
                owner_bytes = bytes.fromhex(row["owner_hex"])
                g.resource_totals[owner_bytes] = {
                    "dev_points":      float(row["dev_points"]),
                    "research_points": float(row["research_points"]),
                    "storage_units":   float(row["storage_units"]),
                }

            # -- Intro messages -----------------------------------------------
            intro_rows = conn.execute(
                "SELECT x, y, message FROM intro_messages"
            ).fetchall()
            for row in intro_rows:
                g.intro_messages[(row["x"], row["y"])] = row["message"]

            # -- Message history -----------------------------------------------
            msg_rows = conn.execute(
                "SELECT msg_id, sender_x, sender_y, target_x, target_y, text, timestamp "
                "FROM message_history ORDER BY timestamp"
            ).fetchall()
            for row in msg_rows:
                sc = {"x": row["sender_x"], "y": row["sender_y"]}
                tc = {"x": row["target_x"], "y": row["target_y"]}
                key = (row["target_x"], row["target_y"])
                if key not in g.message_history:
                    g.message_history[key] = []
                g.message_history[key].append({
                    "id":           row["msg_id"],
                    "sender_coord": sc,
                    "target_coord": tc,
                    "text":         row["text"],
                    "timestamp":    row["timestamp"],
                })

            # -- Account keys: signing pubkey + replay nonce ------------------
            acct_rows = conn.execute(
                "SELECT owner_hex, signing_pubkey_hex, nonce FROM account_keys"
            ).fetchall()
            for row in acct_rows:
                owner_bytes = bytes.fromhex(row["owner_hex"])
                if row["signing_pubkey_hex"]:
                    g.account_signing_keys[owner_bytes] = bytes.fromhex(row["signing_pubkey_hex"])
                g.account_nonces[owner_bytes] = int(row["nonce"])

            # -- Score ledger (W5): restore the cumulative contribution rows ---
            # _last_flushed stays empty (fresh ScoreLedger) so the first
            # post-restart delta is measured from 0 — no double-count. Guarded
            # so an old db lacking the table just leaves the empty ledger.
            try:
                from agentic.economics.score_ledger import ScoreLedger
                ledger_rows = conn.execute(
                    "SELECT owner_hex, mined_blocks, proof_secured_count, activity_score, "
                    "       capped_contribution, last_activity_block, updated_at_block "
                    "FROM score_ledger"
                ).fetchall()
                loaded: dict[str, dict] = {
                    row["owner_hex"]: {
                        "mined_blocks": int(row["mined_blocks"]),
                        "proof_secured_count": int(row["proof_secured_count"]),
                        "activity_score": float(row["activity_score"]),
                        "capped_contribution": float(row["capped_contribution"]),
                        "last_activity_block": row["last_activity_block"],
                        "updated_at_block": int(row["updated_at_block"]),
                    }
                    for row in ledger_rows
                }
                g.score_ledger = ScoreLedger(rows=loaded)
            except Exception:
                pass  # missing/old score_ledger table → keep the fresh empty ledger

            # -- Pin registry (DePIN S1): restore durable audit history --------
            try:
                from agentic.vault.pin_registry import PlayerPinRegistry
                pin_rows = conn.execute(
                    "SELECT owner_hex, shard_id, assigned_block, size_bytes, passes, "
                    "       misses, last_pass_block, last_miss_block, active FROM pin_shards"
                ).fetchall()
                loaded_pins: dict[str, dict[int, dict]] = {}
                for row in pin_rows:
                    loaded_pins.setdefault(row["owner_hex"], {})[int(row["shard_id"])] = {
                        "assigned_block": int(row["assigned_block"]),
                        "size_bytes": int(row["size_bytes"]),
                        "passes": int(row["passes"]),
                        "misses": int(row["misses"]),
                        "last_pass_block": row["last_pass_block"],
                        "last_miss_block": row["last_miss_block"],
                        "active": bool(row["active"]),
                    }
                g.pin_registry = PlayerPinRegistry(rows=loaded_pins)
            except Exception:
                pass  # missing/old pin_shards table → keep the fresh empty registry

            # -- Time ledger (DePIN S3): restore tenure + persisted watermark --
            # The watermark MUST ride the row: pin-registry passes are
            # cumulative-since-genesis and persisted, so (unlike score_ledger,
            # whose metrics reset to 0 on restart) an empty in-memory watermark
            # after a reboot would re-count all historical passes and grant a
            # free tick per restart.
            try:
                from agentic.economics.time_ledger import TimeLedger
                time_rows = conn.execute(
                    "SELECT owner_hex, time_accrued, passes_watermark, "
                    "       updated_at_block FROM time_ledger"
                ).fetchall()
                loaded_time: dict[str, dict] = {
                    row["owner_hex"]: {
                        "time_accrued": int(row["time_accrued"]),
                        "passes_watermark": int(row["passes_watermark"]),
                        "updated_at_block": int(row["updated_at_block"]),
                    }
                    for row in time_rows
                }
                g.time_ledger = TimeLedger(rows=loaded_time)
            except Exception:
                pass  # missing/old time_ledger table → keep the fresh empty ledger

    except Exception:
        pass  # load failures are non-fatal — fall back to fresh genesis

    return last_block_time


def clear_state(db_path: Path) -> None:
    """Wipe all persisted state (called on /api/reset)."""
    if not db_path.exists():
        return
    try:
        with _connect(db_path) as conn:
            conn.executescript("""
                DELETE FROM chain_meta;
                DELETE FROM user_claims;
                DELETE FROM intro_messages;
                DELETE FROM message_history;
                DELETE FROM subgrid_allocations;
                DELETE FROM resource_totals;
                DELETE FROM account_keys;
                DELETE FROM score_ledger;
                DELETE FROM pin_shards;
                DELETE FROM time_ledger;
            """)
    except Exception:
        pass
