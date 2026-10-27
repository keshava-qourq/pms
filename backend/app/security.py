"""Password hashing and JWT issuance/verification for member sign-in.

Passwords are only ever stored as passlib hashes (`pbkdf2_sha256`, pure
Python, no extra native dependency). Tokens are signed and verified with
PyJWT using `JWT_SECRET_KEY` -- the platform's `SECRET_KEY` is public and
used only to authenticate the frontend's own API client, never to sign a
member's session.
"""

import os
from datetime import UTC, datetime, timedelta

import jwt
from passlib.context import CryptContext

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    """Return the passlib hash to store for a plaintext password."""
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """True when `password` matches the stored passlib hash."""
    try:
        return _pwd_context.verify(password, password_hash)
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    """A signed JWT whose subject is the user's id, valid for 24 hours."""
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    """The user id encoded in a valid, unexpired token.

    Raises `jwt.PyJWTError` (or a subclass) for any invalid, malformed or
    expired token -- callers should fail closed on that exception.
    """
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    return payload["sub"]
