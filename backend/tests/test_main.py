"""Unit tests for backend/app/main.py: the FastAPI app wiring itself, not the
behaviour of any individual route (those belong to their own tickets/tests --
see test_health.py for /health and test_routes.py for the router's paths).

This ticket carries no acceptance criteria, so the tests below are derived
from the title ("Unit tests for backend/app/main.py") and what the module's
own docstring/code promises:

* app metadata (title/description/version) is set as written.
* the `backend` router is mounted on the app (so its routes are reachable at
  all -- the exhaustive per-path check lives in test_routes.py).
* CORS: `ALLOWED_ORIGINS` is read as a comma-separated list, whitespace
  around each entry is stripped, and when it is unset (or empty) the two
  hardcoded local dev origins are used instead. This is exactly the branch
  test_database.py and test_celery_app.py use the reload pattern for, since
  it is computed once at module import time.

ASSUMPTION: no acceptance criteria were given for this ticket, so the above
is inferred from main.py's own comments rather than from a numbered AC.
"""

import importlib
import os

import pytest
from fastapi.testclient import TestClient

import app.main as main_module


@pytest.fixture
def reloaded_main(monkeypatch: pytest.MonkeyPatch):
    """Reload app.main under a patched ALLOWED_ORIGINS, then put it back.

    Yields the freshly-imported module so the test can build a TestClient
    against the app instance that was built under that env var, and inspect
    the CORS origins that were computed at import time.
    """
    original = os.environ.get("ALLOWED_ORIGINS")
    try:
        yield main_module
    finally:
        if original is None:
            monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        else:
            monkeypatch.setenv("ALLOWED_ORIGINS", original)
        importlib.reload(main_module)


def test_app_metadata_is_set() -> None:
    assert main_module.app.title == "PMS"
    assert main_module.app.description == "project management system"
    assert main_module.app.version == "0.1.0"


def test_the_backend_router_is_mounted() -> None:
    paths = {route.path for route in main_module.app.routes}
    # Spot-check one route the `backend` router owns; the exhaustive list of
    # every API-spec path belongs to test_routes.py.
    assert "/projects" in paths


def test_default_dev_origins_are_allowed_when_allowed_origins_is_unset(
    monkeypatch: pytest.MonkeyPatch, reloaded_main
) -> None:
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    reloaded = importlib.reload(reloaded_main)

    client = TestClient(reloaded.app)
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})

    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_an_origin_not_in_the_default_dev_list_is_rejected_when_unset(
    monkeypatch: pytest.MonkeyPatch, reloaded_main
) -> None:
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    reloaded = importlib.reload(reloaded_main)

    client = TestClient(reloaded.app)
    response = client.get("/health", headers={"Origin": "https://not-allowed.example"})

    assert "access-control-allow-origin" not in response.headers


def test_allowed_origins_env_var_is_read_as_a_comma_separated_list(
    monkeypatch: pytest.MonkeyPatch, reloaded_main
) -> None:
    monkeypatch.setenv(
        "ALLOWED_ORIGINS", "https://app.example.com,https://admin.example.com"
    )
    reloaded = importlib.reload(reloaded_main)

    client = TestClient(reloaded.app)

    first = client.get("/health", headers={"Origin": "https://app.example.com"})
    second = client.get("/health", headers={"Origin": "https://admin.example.com"})

    assert first.headers["access-control-allow-origin"] == "https://app.example.com"
    assert second.headers["access-control-allow-origin"] == "https://admin.example.com"


def test_setting_allowed_origins_stops_the_default_dev_origins_from_being_allowed(
    monkeypatch: pytest.MonkeyPatch, reloaded_main
) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.example.com")
    reloaded = importlib.reload(reloaded_main)

    client = TestClient(reloaded.app)
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})

    assert "access-control-allow-origin" not in response.headers


def test_whitespace_around_entries_in_allowed_origins_is_stripped(
    monkeypatch: pytest.MonkeyPatch, reloaded_main
) -> None:
    monkeypatch.setenv(
        "ALLOWED_ORIGINS", " https://app.example.com ,  https://admin.example.com "
    )
    reloaded = importlib.reload(reloaded_main)

    assert reloaded._allowed_origins == [
        "https://app.example.com",
        "https://admin.example.com",
    ]


def test_blank_entries_from_a_trailing_comma_are_dropped(
    monkeypatch: pytest.MonkeyPatch, reloaded_main
) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.example.com,,")
    reloaded = importlib.reload(reloaded_main)

    assert reloaded._allowed_origins == ["https://app.example.com"]


def test_empty_allowed_origins_env_var_falls_back_to_dev_origins(
    monkeypatch: pytest.MonkeyPatch, reloaded_main
) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "")
    reloaded = importlib.reload(reloaded_main)

    client = TestClient(reloaded.app)
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})

    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
