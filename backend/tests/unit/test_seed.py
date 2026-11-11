"""Unit tests for `app.seed` (no acceptance criteria of its own).

`app.seed.seed_demo_user` inserts a demo member with a known password only
if no user with `SEED_EMAIL` already exists, so running `python -m app.seed`
twice against the same database is safe. These tests exercise the function
and the module's env-driven defaults directly -- no `client` fixture, no
`TestClient` -- per the ticket. Tests are named after the behaviour they
cover rather than an AC id, since this ticket carries none.
"""

import importlib
import uuid

import app.seed as seed_module
from app.models import User
from app.security import hash_password, verify_password


def test_seed_email_defaults_to_demo_example_when_env_var_unset(monkeypatch) -> None:
    monkeypatch.delenv("SEED_USER_EMAIL", raising=False)
    reloaded = importlib.reload(seed_module)
    try:
        assert reloaded.SEED_EMAIL == "demo@example.com"
    finally:
        importlib.reload(seed_module)


def test_seed_email_honours_env_var_when_set(monkeypatch) -> None:
    monkeypatch.setenv("SEED_USER_EMAIL", "custom-seed@example.com")
    reloaded = importlib.reload(seed_module)
    try:
        assert reloaded.SEED_EMAIL == "custom-seed@example.com"
    finally:
        importlib.reload(seed_module)


def test_seed_password_defaults_to_password123_when_env_var_unset(monkeypatch) -> None:
    monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)
    reloaded = importlib.reload(seed_module)
    try:
        assert reloaded.SEED_PASSWORD == "password123"
    finally:
        importlib.reload(seed_module)


def test_seed_password_honours_env_var_when_set(monkeypatch) -> None:
    monkeypatch.setenv("SEED_USER_PASSWORD", "super-secret-456")
    reloaded = importlib.reload(seed_module)
    try:
        assert reloaded.SEED_PASSWORD == "super-secret-456"
    finally:
        importlib.reload(seed_module)


def test_seed_name_is_demo_member() -> None:
    assert seed_module.SEED_NAME == "Demo Member"


def _unique_seed_email() -> str:
    return f"seed-{uuid.uuid4().hex[:10]}@example.com"


def test_seed_demo_user_creates_a_user_with_the_configured_email_and_password(
    db_session, monkeypatch
) -> None:
    email = _unique_seed_email()
    monkeypatch.setattr(seed_module, "SEED_EMAIL", email)
    monkeypatch.setattr(seed_module, "SEED_PASSWORD", "a-known-password")

    try:
        user = seed_module.seed_demo_user(db_session)

        assert user.email == email
        assert user.name == "Demo Member"
        assert user.is_admin is True
        # The stored hash must actually verify the configured password, and
        # reject a wrong one -- not merely be "some non-empty string".
        assert verify_password("a-known-password", user.password_hash)
        assert verify_password("wrong-password", user.password_hash) is False

        stored = db_session.query(User).filter(User.email == email).one()
        assert stored.id == user.id
    finally:
        existing = db_session.query(User).filter(User.email == email).first()
        if existing is not None:
            db_session.delete(existing)
            db_session.commit()


def test_seed_demo_user_is_idempotent_and_does_not_insert_a_duplicate(
    db_session, monkeypatch
) -> None:
    email = _unique_seed_email()
    monkeypatch.setattr(seed_module, "SEED_EMAIL", email)
    monkeypatch.setattr(seed_module, "SEED_PASSWORD", "first-password")

    try:
        first = seed_module.seed_demo_user(db_session)

        # Running it again -- as `python -m app.seed` would on a second
        # deploy, possibly with a changed env var -- must not insert a
        # second row for the same email.
        monkeypatch.setattr(seed_module, "SEED_PASSWORD", "second-password")
        second = seed_module.seed_demo_user(db_session)

        assert second.id == first.id
        matches = db_session.query(User).filter(User.email == email).all()
        assert len(matches) == 1

        # The already-existing user's password is left untouched by the
        # second, no-op call.
        assert verify_password("first-password", matches[0].password_hash)
        assert verify_password("second-password", matches[0].password_hash) is False
    finally:
        existing = db_session.query(User).filter(User.email == email).first()
        if existing is not None:
            db_session.delete(existing)
            db_session.commit()


def test_seed_demo_user_returns_a_pre_existing_user_unmodified(db_session, monkeypatch) -> None:
    email = _unique_seed_email()
    monkeypatch.setattr(seed_module, "SEED_EMAIL", email)
    monkeypatch.setattr(seed_module, "SEED_PASSWORD", "ignored-password")

    pre_existing = User(
        email=email,
        password_hash=hash_password("already-set-password"),
        name="Someone Else",
        is_admin=False,
    )
    db_session.add(pre_existing)
    db_session.commit()
    db_session.refresh(pre_existing)

    try:
        returned = seed_module.seed_demo_user(db_session)

        assert returned.id == pre_existing.id
        assert returned.name == "Someone Else"
        assert returned.is_admin is False
        # The configured SEED_PASSWORD is ignored once a user already
        # exists with that email -- it must not overwrite their hash.
        assert verify_password("already-set-password", returned.password_hash)
        assert verify_password("ignored-password", returned.password_hash) is False

        matches = db_session.query(User).filter(User.email == email).all()
        assert len(matches) == 1
    finally:
        existing = db_session.query(User).filter(User.email == email).first()
        if existing is not None:
            db_session.delete(existing)
            db_session.commit()
