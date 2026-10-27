"""Shared fixtures: migrated schema and a member with a known password.

Schema changes go through Alembic (US-001), so tests apply the same
migration a real deployment runs rather than recreating tables ad hoc.
"""

import os
import subprocess
import sys
import uuid

import pytest
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User  # noqa: F401 -- registers the table before upgrade
from app.security import hash_password

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(scope="session", autouse=True)
def _migrated_schema() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=_BACKEND_ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"alembic upgrade head failed:\n{result.stdout}\n{result.stderr}"


@pytest.fixture
def db_session() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def seed_user(db_session: Session) -> dict:
    """A member with a known password: the seed/fixture path tests sign in with."""
    email = f"member-{uuid.uuid4().hex[:10]}@example.com"
    password = "correct-horse-battery-staple"
    user = User(
        email=email,
        password_hash=hash_password(password),
        name="Seed Member",
        is_admin=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    yield {"user": user, "email": email, "password": password}

    db_session.delete(db_session.get(User, user.id))
    db_session.commit()
