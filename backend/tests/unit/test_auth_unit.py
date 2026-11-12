"""Unit tests for `app.auth.get_current_user` (NFR-001).

These call the dependency function directly -- no `client` fixture, no
`TestClient`, no HTTP -- with a real `db_session` and hand-built
`HTTPAuthorizationCredentials`, the same shape FastAPI's `HTTPBearer` would
hand it. The ticket for `backend/app/auth.py` carries no acceptance criteria
of its own, so tests are named for the behaviour the module's docstring
promises: fail closed on anything but a valid token for a user who exists.
"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.models import User
from app.security import JWT_ALGORITHM, JWT_SECRET_KEY, create_access_token


def _bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_valid_token_for_existing_user_returns_that_user(
    db_session: Session, seed_user: dict
) -> None:
    token = create_access_token(seed_user["user"].id)

    result = get_current_user(credentials=_bearer(token), db=db_session)

    assert result.id == seed_user["user"].id
    assert result.email == seed_user["email"]


def test_missing_credentials_raises_401_not_authenticated(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=None, db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Not authenticated"


def test_empty_bearer_token_raises_401_not_authenticated(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer(""), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Not authenticated"


def test_malformed_token_raises_401_invalid_or_expired(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer("not-a-real-token"), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_expired_token_raises_401_invalid_or_expired(
    db_session: Session, seed_user: dict
) -> None:
    now = datetime.now(UTC)
    expired = jwt.encode(
        {
            "sub": seed_user["user"].id,
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer(expired), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_token_signed_with_wrong_secret_raises_401_invalid_or_expired(
    db_session: Session, seed_user: dict
) -> None:
    now = datetime.now(UTC)
    forged = jwt.encode(
        {"sub": seed_user["user"].id, "iat": now, "exp": now + timedelta(hours=1)},
        "a-different-secret-entirely",
        algorithm=JWT_ALGORITHM,
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer(forged), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_valid_token_for_a_user_who_no_longer_exists_raises_401(db_session: Session) -> None:
    # A well-formed, unexpired token naming a user id that is not (or no
    # longer) in the database -- the deleted-user / revoked-account case the
    # module docstring calls out by name.
    token = create_access_token(str(uuid.uuid4()))

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=_bearer(token), db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_db_lookup_uses_the_token_subject_as_the_primary_key(
    db_session: Session, seed_user: dict
) -> None:
    # Pins the contract between `decode_access_token`'s return value and how
    # `get_current_user` looks the user up: by primary key, not by email or
    # any other field a future refactor might reach for instead.
    other = User(
        id=str(uuid.uuid4()),
        email=f"other-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="irrelevant",
        name="Someone Else",
        is_admin=False,
    )
    db_session.add(other)
    db_session.commit()
    try:
        token = create_access_token(seed_user["user"].id)

        result = get_current_user(credentials=_bearer(token), db=db_session)

        assert result.id == seed_user["user"].id
        assert result.id != other.id
    finally:
        db_session.delete(db_session.get(User, other.id))
        db_session.commit()
