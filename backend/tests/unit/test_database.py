"""Unit tests for `app.database` (no acceptance criteria of its own).

`app.database` builds the engine, the session factory and the
`get_db` request-scoped dependency described in its module docstring:
`DATABASE_URL` (default sqlite) selects the engine, sqlite connections get
`check_same_thread=False` so FastAPI's sync-dependency threadpool can use
them, and `get_db` yields exactly one session per call and closes it even
when the caller raises. These tests exercise the module and its objects
directly -- no `client` fixture, no `TestClient` -- per the ticket. Tests
are named after the behaviour they cover rather than an AC id, since this
ticket carries none.
"""

import importlib

import pytest
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

import app.database as database_module
from app.database import Base, SessionLocal, engine, get_db


def test_database_url_defaults_to_sqlite_when_env_var_unset(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    reloaded = importlib.reload(database_module)
    try:
        assert reloaded.DATABASE_URL == "sqlite:///./app.db"
    finally:
        importlib.reload(database_module)


def test_database_url_honours_env_var_when_set(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://example-host:5432/example_db")
    reloaded = importlib.reload(database_module)
    try:
        assert reloaded.DATABASE_URL == "postgresql+psycopg://example-host:5432/example_db"
    finally:
        importlib.reload(database_module)


def test_sqlite_urls_get_check_same_thread_false(monkeypatch) -> None:
    # SQLite rejects a connection made on one thread and used on another --
    # exactly what happens when FastAPI runs a sync dependency in its
    # threadpool -- so every sqlite URL must disable that check.
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    reloaded = importlib.reload(database_module)
    try:
        assert reloaded._connect_args == {"check_same_thread": False}
    finally:
        importlib.reload(database_module)


def test_non_sqlite_urls_get_no_extra_connect_args(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://example-host:5432/example_db")
    reloaded = importlib.reload(database_module)
    try:
        assert reloaded._connect_args == {}
    finally:
        importlib.reload(database_module)


def test_engine_connects_to_the_configured_database() -> None:
    # The real DATABASE_URL for this run (set by the project's services),
    # not a reloaded fake one: proves the module-level `engine` actually
    # works against the database the rest of the app uses.
    with engine.connect() as connection:
        assert connection.execute(text("SELECT 1")).scalar() == 1


def test_session_local_produces_a_working_session() -> None:
    session = SessionLocal()
    try:
        assert isinstance(session, Session)
        assert session.execute(text("SELECT 1")).scalar() == 1
    finally:
        session.close()


def test_base_is_a_declarative_base_models_can_inherit() -> None:
    assert issubclass(Base, DeclarativeBase)

    class _Sample(Base):
        __tablename__ = "_database_unit_test_sample"

        id: Mapped[int] = mapped_column(primary_key=True)

    assert "_database_unit_test_sample" in Base.metadata.tables
    # Clean up so this throwaway table does not linger in shared metadata
    # for any test that runs after this one in the same process.
    Base.metadata.remove(Base.metadata.tables["_database_unit_test_sample"])


def test_get_db_yields_exactly_one_session() -> None:
    gen = get_db()
    session = next(gen)
    try:
        assert isinstance(session, Session)
    finally:
        with pytest.raises(StopIteration):
            next(gen)


def test_get_db_closes_the_session_after_normal_exhaustion(monkeypatch) -> None:
    closed = []

    class _FakeSession:
        def close(self) -> None:
            closed.append(True)

    fake_session = _FakeSession()
    monkeypatch.setattr(database_module, "SessionLocal", lambda: fake_session)

    gen = database_module.get_db()
    session = next(gen)
    assert session is fake_session
    assert closed == []  # not closed yet -- the caller is still using it

    with pytest.raises(StopIteration):
        next(gen)
    assert closed == [True]


def test_get_db_closes_the_session_even_when_the_caller_raises(monkeypatch) -> None:
    # Mirrors how FastAPI tears down a generator dependency when the route
    # handler raises: it throws the exception into the generator, which
    # must still run its `finally` and close the session before propagating.
    closed = []

    class _FakeSession:
        def close(self) -> None:
            closed.append(True)

    fake_session = _FakeSession()
    monkeypatch.setattr(database_module, "SessionLocal", lambda: fake_session)

    gen = database_module.get_db()
    session = next(gen)
    assert session is fake_session

    with pytest.raises(RuntimeError, match="boom"):
        gen.throw(RuntimeError("boom"))
    assert closed == [True]
