"""Unit tests for backend/app/seed.py: the demo-member seeding helper.

This ticket carries no acceptance criteria, so the tests below are named for
the behaviours the module's own docstring promises:

* `seed_demo_user` creates the demo member, with a password that verifies
  against `SEED_PASSWORD`, when no user with `SEED_EMAIL` exists yet.
* the created member is an admin (`is_admin=True`) with `SEED_NAME` as its
  display name.
* running it again against a database that already has the demo email is a
  no-op: it returns the existing row rather than inserting a second one
  (`python -m app.seed` is documented as idempotent).
* `SEED_EMAIL`/`SEED_PASSWORD` are read from `SEED_USER_EMAIL`/
  `SEED_USER_PASSWORD` at import time, with the documented defaults
  (`demo@example.com` / `password123`) when those env vars are unset.

Each test that inserts a row cleans it up itself, since these tests run
against the real (sandbox) Postgres database shared with the rest of the
suite and `email` is unique.
"""

import importlib
import os

import pytest
from sqlalchemy.orm import Session

from app import seed as seed_module
from app.models import User
from app.security import verify_password


@pytest.fixture
def reloaded_seed(monkeypatch: pytest.MonkeyPatch):
    """Reload app.seed under patched env vars, then put it back.

    Yields the freshly-imported module so a test can inspect the
    module-level constants that are computed at import time.
    """
    original_email = os.environ.get("SEED_USER_EMAIL")
    original_password = os.environ.get("SEED_USER_PASSWORD")
    try:
        yield seed_module
    finally:
        if original_email is None:
            monkeypatch.delenv("SEED_USER_EMAIL", raising=False)
        else:
            monkeypatch.setenv("SEED_USER_EMAIL", original_email)
        if original_password is None:
            monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)
        else:
            monkeypatch.setenv("SEED_USER_PASSWORD", original_password)
        importlib.reload(seed_module)


def _delete_by_email(db_session: Session, email: str) -> None:
    row = db_session.query(User).filter(User.email == email).first()
    if row is not None:
        db_session.delete(row)
        db_session.commit()


def test_seed_demo_user_creates_a_user_when_none_exists(db_session: Session) -> None:
    _delete_by_email(db_session, seed_module.SEED_EMAIL)

    try:
        user = seed_module.seed_demo_user(db_session)

        assert user.email == seed_module.SEED_EMAIL
        assert user.name == seed_module.SEED_NAME
        assert user.is_admin is True
        assert user.password_hash != seed_module.SEED_PASSWORD
        assert verify_password(seed_module.SEED_PASSWORD, user.password_hash) is True

        persisted = db_session.query(User).filter(User.email == seed_module.SEED_EMAIL).first()
        assert persisted is not None
        assert persisted.id == user.id
    finally:
        _delete_by_email(db_session, seed_module.SEED_EMAIL)


def test_seed_demo_user_does_not_store_the_password_in_plaintext(db_session: Session) -> None:
    _delete_by_email(db_session, seed_module.SEED_EMAIL)

    try:
        user = seed_module.seed_demo_user(db_session)

        assert verify_password("not-the-right-password", user.password_hash) is False
    finally:
        _delete_by_email(db_session, seed_module.SEED_EMAIL)


def test_seed_demo_user_is_idempotent_when_the_email_already_exists(db_session: Session) -> None:
    _delete_by_email(db_session, seed_module.SEED_EMAIL)

    try:
        first = seed_module.seed_demo_user(db_session)
        second = seed_module.seed_demo_user(db_session)

        assert second.id == first.id

        rows = db_session.query(User).filter(User.email == seed_module.SEED_EMAIL).all()
        assert len(rows) == 1
    finally:
        _delete_by_email(db_session, seed_module.SEED_EMAIL)


def test_seed_demo_user_returns_the_existing_row_unchanged(db_session: Session) -> None:
    """Calling it again must not touch the password hash of the row already
    there -- it returns the existing member rather than re-creating it."""
    _delete_by_email(db_session, seed_module.SEED_EMAIL)

    try:
        first = seed_module.seed_demo_user(db_session)
        original_hash = first.password_hash

        second = seed_module.seed_demo_user(db_session)

        assert second.password_hash == original_hash
    finally:
        _delete_by_email(db_session, seed_module.SEED_EMAIL)


def test_seed_email_defaults_to_demo_example_com(
    monkeypatch: pytest.MonkeyPatch, reloaded_seed
) -> None:
    monkeypatch.delenv("SEED_USER_EMAIL", raising=False)

    reloaded = importlib.reload(reloaded_seed)

    assert reloaded.SEED_EMAIL == "demo@example.com"


def test_seed_password_defaults_to_password123(
    monkeypatch: pytest.MonkeyPatch, reloaded_seed
) -> None:
    monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)

    reloaded = importlib.reload(reloaded_seed)

    assert reloaded.SEED_PASSWORD == "password123"


def test_seed_email_and_password_are_read_from_the_environment_when_set(
    monkeypatch: pytest.MonkeyPatch, reloaded_seed
) -> None:
    monkeypatch.setenv("SEED_USER_EMAIL", "custom-seed@example.com")
    monkeypatch.setenv("SEED_USER_PASSWORD", "s3cret-override")

    reloaded = importlib.reload(reloaded_seed)

    assert reloaded.SEED_EMAIL == "custom-seed@example.com"
    assert reloaded.SEED_PASSWORD == "s3cret-override"


def test_seed_name_is_the_documented_demo_member() -> None:
    assert seed_module.SEED_NAME == "Demo Member"
