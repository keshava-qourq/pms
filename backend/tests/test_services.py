"""Unit tests for backend/app/services.py.

This ticket carries no acceptance criteria, so these tests are derived from
the title ("Unit tests for backend/app/services.py") and the module's own
docstring/code: it declares the fixed set of backing services this
deployment is configured to reach (`SERVICES`, a name -> env-var-name
mapping) and exposes `configured_services()`, which reports -- for each
service -- whether its env var is currently set to a non-empty value. This
is what `GET /health` (see app/main.py, covered by test_health.py) renders
as `{"status": "ok", "services": {...}}`.

monkeypatch is used throughout rather than mocking `os.getenv`, so these
tests exercise the real function against a real (if patched) environment,
the same way the running deployment's env vars would drive it.
"""

from app.services import SERVICES, configured_services


def test_services_maps_the_two_backing_services_to_their_env_vars() -> None:
    """The health check promises exactly `database` and `redis-queue`
    (see test_health.py); this is the mapping that backs that promise."""
    assert SERVICES == {
        "database": "DATABASE_URL",
        "redis-queue": "REDIS_URL",
    }


def test_configured_services_reports_every_declared_service() -> None:
    result = configured_services()

    assert set(result) == set(SERVICES)


def test_configured_services_is_true_when_the_env_var_is_set(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@example:5432/db")
    monkeypatch.setenv("REDIS_URL", "redis://example-broker:6379/0")

    result = configured_services()

    assert result["database"] is True
    assert result["redis-queue"] is True


def test_configured_services_is_false_when_the_env_var_is_unset(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)

    result = configured_services()

    assert result["database"] is False
    assert result["redis-queue"] is False


def test_configured_services_treats_an_empty_string_value_as_unset(monkeypatch) -> None:
    """An env var set to the empty string is still "not configured": a
    deployment that forgot to fill in a value should not read as healthy."""
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("REDIS_URL", "")

    result = configured_services()

    assert result["database"] is False
    assert result["redis-queue"] is False


def test_configured_services_reflects_each_service_independently(monkeypatch) -> None:
    """One service being configured does not mask another being unset."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@example:5432/db")
    monkeypatch.delenv("REDIS_URL", raising=False)

    result = configured_services()

    assert result["database"] is True
    assert result["redis-queue"] is False


def test_configured_services_returns_only_bool_values(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@example:5432/db")

    result = configured_services()

    assert all(isinstance(value, bool) for value in result.values())
