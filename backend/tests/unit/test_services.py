"""Unit tests for `app.services` (no acceptance criteria of its own).

`app.services` is a small, pure mapping module: `SERVICES` names which
environment variable addresses each backing service, and
`configured_services()` reports whether each of those variables is
currently set. These tests exercise the module directly -- no `client`
fixture, no `TestClient` -- by setting and clearing environment variables
with `monkeypatch`, so the result is proven rather than assumed. Tests are
named after the behaviour they cover rather than an AC id, since this
ticket carries none.
"""

from app.services import SERVICES, configured_services

# ---------------------------------------------------------------------------
# SERVICES: the mapping itself
# ---------------------------------------------------------------------------


def test_services_maps_database_to_database_url() -> None:
    assert SERVICES["database"] == "DATABASE_URL"


def test_services_maps_redis_queue_to_redis_url() -> None:
    assert SERVICES["redis-queue"] == "REDIS_URL"


def test_services_has_no_other_entries() -> None:
    # Pins the full set of known services: adding or removing one is a
    # deliberate change, not an accident this test should stay quiet about.
    assert set(SERVICES.keys()) == {"database", "redis-queue"}


# ---------------------------------------------------------------------------
# configured_services(): reads os.environ at call time
# ---------------------------------------------------------------------------


def test_configured_services_returns_true_for_every_variable_that_is_set(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://example-host:5432/example_db")
    monkeypatch.setenv("REDIS_URL", "redis://example-host:6379/0")

    result = configured_services()

    assert result == {"database": True, "redis-queue": True}


def test_configured_services_returns_false_for_every_variable_that_is_unset(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)

    result = configured_services()

    assert result == {"database": False, "redis-queue": False}


def test_configured_services_reports_each_service_independently(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://example-host:5432/example_db")
    monkeypatch.delenv("REDIS_URL", raising=False)

    result = configured_services()

    assert result["database"] is True
    assert result["redis-queue"] is False


def test_configured_services_treats_an_empty_string_as_unset(monkeypatch) -> None:
    # os.getenv("X") returns "" for an explicitly-empty variable, and
    # bool("") is False: an empty value must read as "not configured",
    # not as a truthy string.
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("REDIS_URL", "redis://example-host:6379/0")

    result = configured_services()

    assert result == {"database": False, "redis-queue": True}


def test_configured_services_returns_a_fresh_dict_each_call(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://example-host:5432/example_db")
    monkeypatch.setenv("REDIS_URL", "redis://example-host:6379/0")

    first = configured_services()
    first["database"] = False  # mutating the result must not affect later calls

    second = configured_services()

    assert second["database"] is True
