"""Node session management for Agent Lockdown hash verification."""

from __future__ import annotations

import hmac
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from agentic.params import (
    CANONICAL_CLAUDE_HASH,
    NODE_HASH_LENGTH,
    NODE_SESSION_TIMEOUT_S,
)


@dataclass
class NodeSession:
    wallet_index: int
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    claude_hash: str = ""
    coordinates: tuple = (0, 0)
    registered_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: datetime = field(default=None)
    last_activity: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if self.expires_at is None:
            self.expires_at = self.registered_at + timedelta(
                seconds=NODE_SESSION_TIMEOUT_S
            )

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def touch(self):
        self.last_activity = datetime.utcnow()


_active_sessions: dict[int, NodeSession] = {}


def verify_hash(claude_hash: str) -> bool:
    if not isinstance(claude_hash, str) or len(claude_hash) != NODE_HASH_LENGTH:
        return False
    return hmac.compare_digest(claude_hash, CANONICAL_CLAUDE_HASH)


def register_session(
    wallet_index: int, claude_hash: str, coordinates: tuple
) -> NodeSession:
    if not verify_hash(claude_hash):
        raise PermissionError(
            "Invalid node software — hash does not match canonical template"
        )
    existing = _active_sessions.get(wallet_index)
    if existing and not existing.is_expired:
        raise ValueError("Session already active for this wallet")
    session = NodeSession(
        wallet_index=wallet_index,
        claude_hash=claude_hash,
        coordinates=coordinates,
    )
    _active_sessions[wallet_index] = session
    return session


def get_session(wallet_index: int) -> NodeSession | None:
    session = _active_sessions.get(wallet_index)
    if session and session.is_expired:
        del _active_sessions[wallet_index]
        return None
    return session


def clear_sessions():
    _active_sessions.clear()


def get_all_sessions() -> dict[int, NodeSession]:
    return _active_sessions


def restore_sessions(sessions: dict[int, NodeSession]):
    _active_sessions.clear()
    _active_sessions.update(sessions)
