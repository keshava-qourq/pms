"""Unit tests for backend/app/database.py: the engine/session wiring itself,
not anything that depends on a particular table existing.

This ticket carries no acceptance criteria, so the tests below are named for
the behaviours the module's own docstring promises:

* `DATABASE_URL` is read from the environment with a SQLite fallback so a
  fresh clone runs without a database server.
* SQLite connections get `check_same_thread=False` (required because FastAPI
  runs a sync dependency in its threadpool); other engines do not get that
  option forced on them.
* `get_db()` hands out one session per call and always closes it, including
  when the caller raises.
* `Base` is the declarative base every model inherits from.

The reload-based tests patch `DATABASE_URL` and re-import the module to
exercise the module-level default/branch logic; `create_engine` does not
open a connection until something is executed, so this never touches a real
socket and always restores the real `DATABASE_URL` (the sandbox's Postgres)
before the test ends, so later tests see the same module state they would
without this file.
"""

import importlib
import os

import pytest
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase, Session

from app import database as database_module
from app.database import Base, SessionLocal, engine, get_db


@pytest.fixture
def reloaded_database(monkeypatch: pytest.MonkeyPatch):
    """Reload app.database under a patched DATABASE_URL, then put it back.

    Yields the freshly-imported module so the test can inspect the values
    that were computed at import time.
    """
    original_url = os.environ.get("DATABASE_URL")
    try:
        yield database_module
    finally:
        if original_url is None:
            monkeypatch.delenv("DATABASE_URL", raising=False)
        else:
            monkeypatch.setenv("DATABASE_URL", original_url)
        importlib.reload(database_module)


def test_database_url_defaults_to_sqlite_when_env_var_is_unset(
    monkeypatch: pytest.MonkeyPatch, reloaded_database
) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    reloaded = importlib.reload(reloaded_database)

    assert reloaded.DATABASE_URL == "sqlite:///./app.db"


def test_database_url_reads_the_env_var_when_set(
    monkeypatch: pytest.MonkeyPatch, reloaded_database
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@example:5432/db")

    reloaded = importlib.reload(reloaded_database)

    assert reloaded.DATABASE_URL == "postgresql+psycopg://user:pass@example:5432/db"


def test_sqlite_engine_gets_check_same_thread_false(
    monkeypatch: pytest.MonkeyPatch, reloaded_database
) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    reloaded = importlib.reload(reloaded_database)

    assert reloaded._connect_args == {"check_same_thread": False}
    assert str(reloaded.engine.url).startswith("sqlite")


def test_non_sqlite_engine_does_not_get_check_same_thread_forced_on(
    monkeypatch: pytest.MonkeyPatch, reloaded_database
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@example:5432/db")

    reloaded = importlib.reload(reloaded_database)

    assert reloaded._connect_args == {}


def test_base_is_a_declarative_base_that_models_subclass() -> None:
    from app.models import User

    assert issubclass(Base, DeclarativeBase)
    assert issubclass(User, Base)
    assert "users" in Base.metadata.tables


def test_sessionmaker_is_configured_with_autoflush_off_and_expire_on_commit_off() -> None:
    assert SessionLocal.kw["autoflush"] is False
    assert SessionLocal.kw["expire_on_commit"] is False
    assert SessionLocal.kw["bind"] is engine


def test_get_db_yields_a_working_session_against_the_real_database() -> None:
    generator = get_db()
    session = next(generator)

    try:
        assert isinstance(session, Session)
        assert session.execute(text("SELECT 1")).scalar() == 1
    finally:
        # Drain the generator the way FastAPI's dependency resolution does,
        # so the finally-block in get_db runs and closes the session.
        with pytest.raises(StopIteration):
            next(generator)


def test_get_db_closes_the_session_once_the_generator_is_exhausted() -> None:
    generator = get_db()
    session = next(generator)
    closed = {"value": False}
    original_close = session.close

    def spy_close():
        closed["value"] = True
        original_close()

    session.close = spy_close

    with pytest.raises(StopIteration):
        next(generator)

    assert closed["value"] is True


def test_get_db_closes_the_session_even_when_the_caller_raises() -> None:
    """FastAPI drives this dependency as a context manager via `.throw()`
    when the request handler raises; the session must still be closed."""
    generator = get_db()
    session = next(generator)
    closed = {"value": False}
    original_close = session.close

    def spy_close():
        closed["value"] = True
        original_close()

    session.close = spy_close

    with pytest.raises(ValueError):
        generator.throw(ValueError("boom"))

    assert closed["value"] is True


def test_get_db_hands_out_a_fresh_session_each_call() -> None:
    first_generator = get_db()
    second_generator = get_db()
    first = next(first_generator)
    second = next(second_generator)

    try:
        assert first is not second
    finally:
        first.close()
        second.close()
