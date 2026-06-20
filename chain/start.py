"""Blockchain startup gate — password-protected launcher for the Agentic Chain testnet.

First run: creates a password and stores its hash in .chain_auth.
Every subsequent run: prompts for the password before starting the server.

Usage:
    python3 start.py [--host 127.0.0.1] [--port 8080] [--reload]

The server binds to 127.0.0.1 (loopback only) by default so a fresh
checkout is not reachable from the LAN. Local dev (game on :3000 ->
chain on :8080, same machine) works unchanged. Pass --host 0.0.0.0 to
expose it deliberately, and firewall the port if you do.
"""
from __future__ import annotations

import argparse
import getpass
import hashlib
import os
import secrets
import subprocess
import sys
from pathlib import Path

_AUTH_FILE = Path(__file__).parent / ".chain_auth"
_ITERATIONS = 260_000
_HASH_ALG = "sha256"


def _hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(_HASH_ALG, password.encode(), salt, _ITERATIONS)


def _setup_password() -> None:
    print("=== Agentic Chain — First-Time Password Setup ===")
    while True:
        pw = getpass.getpass("Set vault password: ")
        if len(pw) < 6:
            print("Password must be at least 6 characters.")
            continue
        confirm = getpass.getpass("Confirm password: ")
        if pw != confirm:
            print("Passwords do not match. Try again.")
            continue
        break

    salt = secrets.token_bytes(32)
    digest = _hash_password(pw, salt)
    _AUTH_FILE.write_bytes(salt + digest)
    print("Password set. Starting blockchain...\n")


def _verify_password() -> bool:
    stored = _AUTH_FILE.read_bytes()
    salt, expected = stored[:32], stored[32:]
    attempt = getpass.getpass("Vault password: ")
    actual = _hash_password(attempt, salt)
    return secrets.compare_digest(actual, expected)


def main() -> None:
    parser = argparse.ArgumentParser(description="Start the Agentic Chain testnet")
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help=(
            "Interface to bind. Defaults to 127.0.0.1 (loopback only). "
            "Use 0.0.0.0 to expose on the LAN -- firewall the port if you do."
        ),
    )
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--reload", action="store_true", help="Enable uvicorn auto-reload")
    args = parser.parse_args()

    print()
    print("  ╔══════════════════════════════════════╗")
    print("  ║       AGENTIC CHAIN TESTNET          ║")
    print("  ║       Exodus Vault — Protected       ║")
    print("  ╚══════════════════════════════════════╝")
    print()

    if not _AUTH_FILE.exists():
        _setup_password()
    else:
        print("Enter password to unlock the vault.\n")
        for attempt in range(3):
            if _verify_password():
                print("\nAccess granted. Starting blockchain...\n")
                break
            remaining = 2 - attempt
            if remaining > 0:
                print(f"Wrong password. {remaining} attempt(s) remaining.")
            else:
                print("Access denied.")
                sys.exit(1)

    cmd = [
        sys.executable, "-m", "uvicorn",
        "agentic.testnet.api:app",
        "--host", args.host,
        "--port", str(args.port),
    ]
    if args.reload:
        cmd.append("--reload")

    os.execv(sys.executable, cmd)


if __name__ == "__main__":
    main()
