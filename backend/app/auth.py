"""
Auth primitives. Uses stdlib pbkdf2 for password hashing (no compiled
dependency like bcrypt to install) and PyJWT for stateless session tokens.

This is sized for a hackathon demo: users live in memory (see
`user_store.py`), and the JWT secret is a fixed dev value. Swap in a real
secret from an environment variable and a persistent user store (MongoDB,
matching `state_store.py`'s pattern) before this goes anywhere near
production.
"""

from __future__ import annotations
import hashlib
import hmac
import os
import time
import uuid

import jwt

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 60 * 60 * 12  # 12 hours

_PBKDF2_ITERATIONS = 260_000


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or uuid.uuid4().hex
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), _PBKDF2_ITERATIONS)
    return f"{salt}${derived.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, _ = password_hash.split("$", 1)
    except ValueError:
        return False
    candidate = hash_password(password, salt=salt)
    return hmac.compare_digest(candidate, password_hash)


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
