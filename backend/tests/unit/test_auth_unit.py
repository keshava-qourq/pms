"""Unit tests for `app.auth.get_current_user` (NFR-001).

These call the dependency function directly -- no `client` fixture, no
`TestClient` -- so they exercise exactly the fail-closed logic described in
`app/auth.py`'s module docstring: a missing, malformed or expired token, or
a token naming a user who no longer exists, must raise 401 before any
protected handler runs; a valid token for an existing user must return that
user. This ticket carries no acceptance criteria of its own, so tests are
named after the behaviour they cover rather than an AC id.
"""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import get_current_user
from app.security import JWT_ALGORITHM, JWT_SECRET_KEY, create_access_token


def _bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_missing_credentials_raises_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=None, db=None)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Not authenticated"


def test_blank_token_raises_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer(""), db=None)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Not authenticated"


def test_malformed_token_raises_401_invalid(db_session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer("not-a-real-token"), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_expired_token_raises_401_invalid(db_session) -> None:
    now = datetime.now(UTC)
    expired = jwt.encode(
        {"sub": "whoever", "iat": now - timedelta(hours=2), "exp": now - timedelta(hours=1)},
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer(expired), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_token_signed_with_wrong_secret_raises_401_invalid(db_session) -> None:
    now = datetime.now(UTC)
    bad_signature = jwt.encode(
        {"sub": "whoever", "iat": now, "exp": now + timedelta(hours=1)},
        "a-different-secret-entirely",
        algorithm=JWT_ALGORITHM,
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer(bad_signature), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_valid_token_for_nonexistent_user_raises_401_invalid(db_session) -> None:
    # A well-formed, unexpired token whose subject names no row: the user
    # was deleted (or never existed) after the token was issued.
    token = create_access_token("no-such-user-id")

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer(token), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_valid_token_for_existing_user_returns_that_user(seed_user, db_session) -> None:
    token = create_access_token(seed_user["user"].id)

    user = get_current_user(credentials=_bearer(token), db=db_session)

    assert user.id == seed_user["user"].id
    assert user.email == seed_user["email"]
