"""Unit tests for `app.seed` (the demo-member seeding helper).

This ticket carries no acceptance criteria of its own (the Jira ticket says
so explicitly), so these tests pin the contract the module's docstring and
code promise instead:

* `SEED_EMAIL`, `SEED_PASSWORD` default to `demo@example.com` /
  `password123` when `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` are unset, and
  are read from those environment variables when set.
* `seed_demo_user` creates exactly one `User` row with the seed email, seed
  name, `is_admin=True`, and a password hash that verifies against the seed
  password -- and nothing else (no plaintext password stored).
* Running it again against a database that already has that email is a
  no-op: it returns the existing row rather than inserting a second one or
  changing the one that is already there (the module's own "idempotent"
  claim, and the reason a caller can safely re-run it).

No `client` fixture, no `TestClient`: these call `seed_demo_user` directly
against a real `Session` (ENVIRONMENT.md: no mocking the configured
database) and clean up every row they create. Tests that reload the module
under patched `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` restore the real
values before returning, because `importlib.reload` mutates the same module
object other already-imported code still points at.
"""

import importlib
import os
import uuid

import pytest
from sqlalchemy.orm import Session

import app.seed as seed_module
from app.models import User
from app.security import verify_password

# Captured once, before any test touches the environment, so reload-based
# tests can put the module back exactly as every other test file expects it.
_REAL_SEED_EMAIL = os.environ.get("SEED_USER_EMAIL")
_REAL_SEED_PASSWORD = os.environ.get("SEED_USER_PASSWORD")


def _restore_real_module(monkeypatch: pytest.MonkeyPatch) -> None:
    if _REAL_SEED_EMAIL is None:
        monkeypatch.delenv("SEED_USER_EMAIL", raising=False)
    else:
        monkeypatch.setenv("SEED_USER_EMAIL", _REAL_SEED_EMAIL)
    if _REAL_SEED_PASSWORD is None:
        monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)
    else:
        monkeypatch.setenv("SEED_USER_PASSWORD", _REAL_SEED_PASSWORD)
    importlib.reload(seed_module)


def _delete_by_email(db_session: Session, email: str) -> None:
    row = db_session.query(User).filter(User.email == email).first()
    if row is not None:
        db_session.delete(row)
        db_session.commit()


def test_seed_email_defaults_to_demo_example_com_when_env_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("SEED_USER_EMAIL", raising=False)
    try:
        reloaded = importlib.reload(seed_module)
        assert reloaded.SEED_EMAIL == "demo@example.com"
    finally:
        _restore_real_module(monkeypatch)


def test_seed_password_defaults_to_password123_when_env_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)
    try:
        reloaded = importlib.reload(seed_module)
        assert reloaded.SEED_PASSWORD == "password123"
    finally:
        _restore_real_module(monkeypatch)


def test_seed_user_email_env_var_overrides_default(monkeypatch: pytest.MonkeyPatch) -> None:
    custom_email = f"seed-override-{uuid.uuid4().hex[:10]}@example.com"
    monkeypatch.setenv("SEED_USER_EMAIL", custom_email)
    try:
        reloaded = importlib.reload(seed_module)
        assert reloaded.SEED_EMAIL == custom_email
    finally:
        _restore_real_module(monkeypatch)


def test_seed_user_password_env_var_overrides_default(monkeypatch: pytest.MonkeyPatch) -> None:
    custom_password = f"custom-{uuid.uuid4().hex[:10]}"
    monkeypatch.setenv("SEED_USER_PASSWORD", custom_password)
    try:
        reloaded = importlib.reload(seed_module)
        assert reloaded.SEED_PASSWORD == custom_password
    finally:
        _restore_real_module(monkeypatch)


def test_seed_demo_user_creates_a_user_with_expected_attributes(
    monkeypatch: pytest.MonkeyPatch, db_session: Session
) -> None:
    custom_email = f"seed-create-{uuid.uuid4().hex[:10]}@example.com"
    custom_password = f"pw-{uuid.uuid4().hex[:10]}"
    monkeypatch.setenv("SEED_USER_EMAIL", custom_email)
    monkeypatch.setenv("SEED_USER_PASSWORD", custom_password)
    try:
        reloaded = importlib.reload(seed_module)

        created = reloaded.seed_demo_user(db_session)

        assert created.email == custom_email
        assert created.name == reloaded.SEED_NAME
        assert created.is_admin is True
        # The stored hash verifies the seed password, and is not the
        # plaintext password itself.
        assert created.password_hash != custom_password
        assert verify_password(custom_password, created.password_hash) is True

        found = db_session.query(User).filter(User.email == custom_email).all()
        assert len(found) == 1
    finally:
        _delete_by_email(db_session, custom_email)
        _restore_real_module(monkeypatch)


def test_seed_demo_user_is_idempotent_and_inserts_only_once(
    monkeypatch: pytest.MonkeyPatch, db_session: Session
) -> None:
    custom_email = f"seed-idempotent-{uuid.uuid4().hex[:10]}@example.com"
    monkeypatch.setenv("SEED_USER_EMAIL", custom_email)
    monkeypatch.setenv("SEED_USER_PASSWORD", f"pw-{uuid.uuid4().hex[:10]}")
    try:
        reloaded = importlib.reload(seed_module)

        first = reloaded.seed_demo_user(db_session)
        second = reloaded.seed_demo_user(db_session)

        assert second.id == first.id

        rows = db_session.query(User).filter(User.email == custom_email).all()
        assert len(rows) == 1
    finally:
        _delete_by_email(db_session, custom_email)
        _restore_real_module(monkeypatch)


def test_seed_demo_user_returns_existing_row_without_changing_it(
    monkeypatch: pytest.MonkeyPatch, db_session: Session
) -> None:
    # If the email already exists (e.g. a real member signed up with it, or
    # a previous seed run used a different password), re-running must not
    # reset the password or any other attribute on the existing row.
    from app.security import hash_password

    custom_email = f"seed-preexisting-{uuid.uuid4().hex[:10]}@example.com"
    monkeypatch.setenv("SEED_USER_EMAIL", custom_email)
    monkeypatch.setenv("SEED_USER_PASSWORD", "seed-password-not-used")
    try:
        reloaded = importlib.reload(seed_module)

        pre_existing = User(
            email=custom_email,
            password_hash=hash_password("a-completely-different-password"),
            name="Already Here",
            is_admin=False,
        )
        db_session.add(pre_existing)
        db_session.commit()
        db_session.refresh(pre_existing)

        returned = reloaded.seed_demo_user(db_session)

        assert returned.id == pre_existing.id
        assert returned.name == "Already Here"
        assert returned.is_admin is False
        assert returned.password_hash == pre_existing.password_hash
        # The seed password from this run must not verify against the row
        # that was already there.
        assert verify_password("seed-password-not-used", returned.password_hash) is False

        rows = db_session.query(User).filter(User.email == custom_email).all()
        assert len(rows) == 1
    finally:
        _delete_by_email(db_session, custom_email)
        _restore_real_module(monkeypatch)
