"""Unit tests for `app/services.py` -- `configured_services` in isolation.

This ticket carries no acceptance criteria of its own (noted in the ticket
text), so these tests cover what the title and module docstring describe:
`configured_services()` reports, for each entry in `SERVICES`, whether its
named environment variable is currently set -- nothing more. They never
import `TestClient` or the `client` fixture and never touch the database;
`monkeypatch.setenv`/`delenv` isolates each case from whatever the real
sandbox environment happens to have set.

ASSUMPTION: the module's own `SERVICES` mapping is read directly rather
than hard-coded again here, so the tests keep covering "configured_services
agrees with SERVICES" even if a future ticket adds or renames an entry;
`test_services_maps_exactly_database_and_redis_queue` pins today's two
entries explicitly so a silent change to that set still fails a test.
"""

import app.services as services_module
from app.services import SERVICES, configured_services


def test_services_maps_exactly_database_and_redis_queue() -> None:
    assert SERVICES == {
        "database": "DATABASE_URL",
        "redis-queue": "REDIS_URL",
    }


def test_configured_services_reports_true_for_every_variable_that_is_set(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://example/db")
    monkeypatch.setenv("REDIS_URL", "redis://example:6379/0")

    result = configured_services()

    assert result == {"database": True, "redis-queue": True}


def test_configured_services_reports_false_for_every_variable_that_is_unset(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)

    result = configured_services()

    assert result == {"database": False, "redis-queue": False}


def test_configured_services_reports_each_variable_independently(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://example/db")
    monkeypatch.delenv("REDIS_URL", raising=False)

    result = configured_services()

    assert result == {"database": True, "redis-queue": False}


def test_configured_services_treats_an_empty_string_value_as_not_set(monkeypatch) -> None:
    # os.getenv("X") returns "" when a variable is set to the empty string; bool("")
    # is False, so an explicitly-blank variable must be reported the same as a
    # missing one rather than as configured.
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("REDIS_URL", "redis://example:6379/0")

    result = configured_services()

    assert result == {"database": False, "redis-queue": True}


def test_configured_services_returns_one_entry_per_name_in_services(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://example/db")
    monkeypatch.setenv("REDIS_URL", "redis://example:6379/0")

    result = configured_services()

    assert set(result.keys()) == set(services_module.SERVICES.keys())
