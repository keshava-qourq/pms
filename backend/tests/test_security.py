"""Unit tests for password hashing and JWT issue/verify (US-001)."""

from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.security import (
    JWT_ALGORITHM,
    JWT_SECRET_KEY,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_ac_passwords_are_stored_only_as_passlib_hashes() -> None:
    hashed = hash_password("hunter2")
    assert hashed != "hunter2"
    assert verify_password("hunter2", hashed) is True


def test_ac_wrong_password_does_not_verify() -> None:
    hashed = hash_password("hunter2")
    assert verify_password("wrong-password", hashed) is False


def test_ac_jwt_round_trip_with_pyjwt() -> None:
    token = create_access_token("user-123")
    assert decode_access_token(token) == "user-123"


def test_ac_expired_jwt_is_rejected() -> None:
    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {"sub": "user-123", "iat": now - timedelta(hours=2), "exp": now - timedelta(hours=1)},
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(expired)


def test_ac_malformed_jwt_is_rejected() -> None:
    with pytest.raises(jwt.PyJWTError):
        decode_access_token("not-a-real-token")
