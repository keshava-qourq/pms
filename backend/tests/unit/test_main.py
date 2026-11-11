"""Unit tests for `app.main` (no acceptance criteria of its own).

`app.main` is the entrypoint: it builds the `FastAPI` instance, configures
CORS from `ALLOWED_ORIGINS` (falling back to the Vite dev server origins),
mounts the `backend` router so every API-spec route is actually reachable,
and defines the one real route here, `/health`. These tests exercise the
module and its objects directly -- no `client` fixture, no `TestClient` --
per the ticket. Tests are named after the behaviour they cover rather than
an AC id, since this ticket carries none.
"""

import asyncio
import importlib
import os

from fastapi.middleware.cors import CORSMiddleware

import app.main as main_module
from app.main import app, health
from app.routers import backend as backend_router


def test_app_metadata() -> None:
    # The scaffold's module docstring describes this as the approved
    # architecture's entrypoint; its title/description/version are what a
    # client or the generated OpenAPI document identifies the service by.
    assert app.title == "PMS"
    assert app.description == "project management system"
    assert app.version == "0.1.0"


def test_backend_router_routes_are_mounted_on_the_app() -> None:
    # `app.include_router(backend_router.router)` has to actually attach
    # the same route objects the router built -- not a copy, not a subset --
    # or every path in the API spec would 404 despite the router defining it.
    assert len(backend_router.router.routes) > 0
    for route in backend_router.router.routes:
        assert route in app.routes


def test_health_route_is_registered_and_requires_no_auth_dependency() -> None:
    health_routes = [r for r in app.routes if getattr(r, "path", None) == "/health"]
    assert len(health_routes) == 1
    route = health_routes[0]
    assert "GET" in route.methods
    # Unlike every route the backend router mounts (NFR-001), /health carries
    # no Depends(get_current_user): a liveness probe must not need a token.
    assert route.dependant.dependencies == []


def test_health_handler_delegates_to_configured_services(monkeypatch) -> None:
    # Patch the exact name `health()` reads so this proves the handler calls
    # through to whatever `configured_services` currently is, rather than
    # computing its own notion of which services are configured.
    fake_services = {"made-up-service": True, "another-one": False}
    monkeypatch.setattr(main_module, "configured_services", lambda: fake_services)

    result = asyncio.run(main_module.health())

    assert result == {"status": "ok", "services": fake_services}


def test_health_handler_returns_ok_status_with_real_configured_services() -> None:
    result = asyncio.run(health())

    assert result["status"] == "ok"
    assert set(result["services"]) == {"database", "redis-queue"}
    assert all(isinstance(v, bool) for v in result["services"].values())


def test_cors_middleware_is_registered_with_credentials_and_wildcard_methods_and_headers() -> None:
    cors_entries = [m for m in app.user_middleware if m.cls is CORSMiddleware]
    assert len(cors_entries) == 1
    kwargs = cors_entries[0].kwargs
    assert kwargs["allow_credentials"] is True
    assert kwargs["allow_methods"] == ["*"]
    assert kwargs["allow_headers"] == ["*"]


def _cors_allow_origins(reloaded_module) -> list[str]:
    cors_entries = [m for m in reloaded_module.app.user_middleware if m.cls is CORSMiddleware]
    assert len(cors_entries) == 1
    return cors_entries[0].kwargs["allow_origins"]


def test_allowed_origins_default_to_the_vite_dev_servers_when_env_var_unset(monkeypatch) -> None:
    original = os.environ.get("ALLOWED_ORIGINS")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    try:
        reloaded = importlib.reload(main_module)
        assert _cors_allow_origins(reloaded) == [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    finally:
        if original is not None:
            monkeypatch.setenv("ALLOWED_ORIGINS", original)
        importlib.reload(main_module)


def test_allowed_origins_honours_a_single_configured_origin(monkeypatch) -> None:
    original = os.environ.get("ALLOWED_ORIGINS")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.example.com")
    try:
        reloaded = importlib.reload(main_module)
        assert _cors_allow_origins(reloaded) == ["https://app.example.com"]
    finally:
        if original is not None:
            monkeypatch.setenv("ALLOWED_ORIGINS", original)
        else:
            monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        importlib.reload(main_module)


def test_allowed_origins_parses_comma_separated_list_strips_whitespace_and_drops_blanks(
    monkeypatch,
) -> None:
    original = os.environ.get("ALLOWED_ORIGINS")
    monkeypatch.setenv(
        "ALLOWED_ORIGINS",
        " https://a.example.com, https://b.example.com ,, ",
    )
    try:
        reloaded = importlib.reload(main_module)
        assert _cors_allow_origins(reloaded) == [
            "https://a.example.com",
            "https://b.example.com",
        ]
    finally:
        if original is not None:
            monkeypatch.setenv("ALLOWED_ORIGINS", original)
        else:
            monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        importlib.reload(main_module)
