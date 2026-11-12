"""Unit tests for `app.database` (engine, session factory, `get_db`).

The ticket for this module carries no acceptance criteria of its own, so these
tests pin the contract the module's docstring and code promise:

* `DATABASE_URL` defaults to a local SQLite file when the environment does not
  set it, and is read from the environment when it does.
* SQLite connections get `check_same_thread=False` (the comment explains why:
  FastAPI runs a sync dependency in its threadpool, and SQLite otherwise
  refuses a connection used on a different thread than it was opened on); any
  other backend gets no extra connect args.
* `SessionLocal` is configured `autoflush=False, expire_on_commit=False`
  (tested through the behaviour those settings produce, against the real
  database the sandbox provides, per ENVIRONMENT.md -- no mocking the DB).
* `Base` is the shared `DeclarativeBase` every model inherits.
* `get_db` yields exactly one session and always closes it, even when the
  caller raises -- the one guarantee a request-scoped dependency must keep.

No `client` fixture, no `TestClient`: these call the module's functions and
inspect its objects directly. Tests that reload the module under a patched
`DATABASE_URL` restore the real value (not just whatever monkeypatch undoes
afterwards) before returning, because `importlib.reload` mutates the same
module object other already-imported code still points at.
"""

import importlib
import os
import sqlite3
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase

import app.database as database_module
from app.database import Base, SessionLocal, engine, get_db
from app.models import User

# Captured once, before any test touches the environment, so reload-based
# tests can put the module back exactly as every other test file expects it.
_REAL_DATABASE_URL = os.environ.get("DATABASE_URL")


def _restore_real_module(monkeypatch: pytest.MonkeyPatch) -> None:
    if _REAL_DATABASE_URL is None:
        monkeypatch.delenv("DATABASE_URL", raising=False)
    else:
        monkeypatch.setenv("DATABASE_URL", _REAL_DATABASE_URL)
    importlib.reload(database_module)


def test_database_url_defaults_to_a_local_sqlite_file_when_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    try:
        reloaded = importlib.reload(database_module)
        assert reloaded.DATABASE_URL == "sqlite:///./app.db"
    finally:
        _restore_real_module(monkeypatch)


def test_database_url_reads_the_environment_variable_when_set(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    custom_url = f"sqlite:///{tmp_path}/custom-database-url.db"
    monkeypatch.setenv("DATABASE_URL", custom_url)
    try:
        reloaded = importlib.reload(database_module)
        assert reloaded.DATABASE_URL == custom_url
    finally:
        _restore_real_module(monkeypatch)


def test_connect_args_disable_check_same_thread_for_sqlite_urls(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/sqlite-connect-args.db")
    try:
        reloaded = importlib.reload(database_module)
        assert reloaded._connect_args == {"check_same_thread": False}
    finally:
        _restore_real_module(monkeypatch)


def test_connect_args_are_empty_for_non_sqlite_urls(monkeypatch: pytest.MonkeyPatch) -> None:
    # No credentials in this URL: create_engine never has to open it, only
    # parse the dialect, so a host that does not exist is fine here.
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://unit-test-host/unit_test_db")
    try:
        reloaded = importlib.reload(database_module)
        assert reloaded._connect_args == {}
    finally:
        _restore_real_module(monkeypatch)


def test_sqlite_connect_args_actually_reach_the_sqlite3_driver(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    # Pins the reason the comment gives, not just the dict: the engine must
    # really pass check_same_thread=False down to sqlite3.connect, or a
    # connection opened in one thread still cannot be used from another.
    captured: dict = {}
    real_connect = sqlite3.connect

    def _capturing_connect(*args, **kwargs):
        captured.update(kwargs)
        return real_connect(*args, **kwargs)

    monkeypatch.setattr(sqlite3, "connect", _capturing_connect)
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/sqlite-driver-args.db")
    try:
        reloaded = importlib.reload(database_module)
        with reloaded.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        assert captured.get("check_same_thread") is False
    finally:
        _restore_real_module(monkeypatch)


def test_base_is_the_shared_declarative_base(db_session) -> None:
    assert issubclass(Base, DeclarativeBase)
    # `User` (and every other model) inherits it, and its table is registered
    # on this same metadata -- the point of a *shared* base.
    assert issubclass(User, Base)
    assert "users" in Base.metadata.tables


def test_sessionlocal_sessions_do_not_autoflush_pending_changes() -> None:
    # If autoflush were still True (the sessionmaker default), a query run
    # with a pending INSERT in the session would flush it first and the new
    # row would match. It must not: database.py sets autoflush=False.
    session = SessionLocal()
    try:
        email = f"autoflush-probe-{uuid.uuid4().hex[:10]}@example.com"
        pending = User(email=email, password_hash="not-a-real-hash", name="Pending", is_admin=False)
        session.add(pending)

        found = session.query(User).filter_by(email=email).first()

        assert found is None
    finally:
        session.rollback()
        session.close()


def test_sessionlocal_sessions_keep_attributes_readable_after_commit_without_a_new_query() -> None:
    # expire_on_commit=False: if it were True (the default), reading an
    # attribute after commit would need a fresh SELECT to un-expire it. Count
    # statements on the connection to prove none ran.
    session = SessionLocal()
    user = User(
        email=f"expire-probe-{uuid.uuid4().hex[:10]}@example.com",
        password_hash="not-a-real-hash",
        name="Expire Probe",
        is_admin=False,
    )
    try:
        session.add(user)
        session.commit()

        statements: list[str] = []

        def _record(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement)

        from sqlalchemy import event

        event.listen(engine, "before_cursor_execute", _record)
        try:
            assert user.email.startswith("expire-probe-")
        finally:
            event.remove(engine, "before_cursor_execute", _record)

        assert statements == []
    finally:
        session.delete(session.get(User, user.id))
        session.commit()
        session.close()


def test_get_db_yields_exactly_one_session_then_stops(monkeypatch: pytest.MonkeyPatch) -> None:
    from unittest.mock import MagicMock

    fake_session = MagicMock(name="fake_session")
    monkeypatch.setattr(database_module, "SessionLocal", lambda: fake_session)

    gen = database_module.get_db()
    produced = next(gen)
    assert produced is fake_session

    with pytest.raises(StopIteration):
        next(gen)


def test_get_db_closes_the_session_when_the_caller_finishes_normally(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from unittest.mock import MagicMock

    fake_session = MagicMock(name="fake_session")
    monkeypatch.setattr(database_module, "SessionLocal", lambda: fake_session)

    gen = database_module.get_db()
    next(gen)
    with pytest.raises(StopIteration):
        next(gen)

    fake_session.close.assert_called_once()


def test_get_db_closes_the_session_even_when_the_caller_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # The docstring's whole promise: "closed even when the handler raises".
    from unittest.mock import MagicMock

    fake_session = MagicMock(name="fake_session")
    monkeypatch.setattr(database_module, "SessionLocal", lambda: fake_session)

    gen = database_module.get_db()
    next(gen)

    with pytest.raises(RuntimeError, match="boom"):
        gen.throw(RuntimeError("boom"))

    fake_session.close.assert_called_once()


def test_get_db_session_is_usable_against_the_real_configured_database() -> None:
    # End-to-end sanity on the real, un-mocked database the sandbox provides
    # (ENVIRONMENT.md): the session get_db hands out can actually query it.
    gen = get_db()
    session = next(gen)
    try:
        assert session.execute(text("SELECT 1")).scalar() == 1
    finally:
        with pytest.raises(StopIteration):
            next(gen)
