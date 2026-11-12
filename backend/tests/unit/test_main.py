"""Unit tests for `app.main` (the FastAPI entrypoint).

This ticket carries no acceptance criteria of its own, so these tests pin
the contract the module's code and comments promise:

* `app` is a `FastAPI` instance with the title, description and version the
  module declares.
* CORS is permissive on methods/headers and allows credentials, and its
  allowed origins come from `ALLOWED_ORIGINS` (comma separated) when that
  environment variable is set, and fall back to the two local Vite dev
  origins when it is not -- the whole point of the comment above the
  middleware: "point ALLOWED_ORIGINS at the real thing and nothing else has
  to change".
* The `backend` router's routes are mounted on `app` (every path/method the
  API spec declares reaches this app, not just the router object), and
  `/health` is registered directly, not as part of that router.
* `health()` returns `{"status": "ok", "services": configured_services()}`,
  read fresh on every call rather than cached at import time.

No `client` fixture, no `TestClient`: these call `app.main`'s own objects
and functions directly. The two env-var CORS tests reload the module under
a patched `ALLOWED_ORIGINS` (restoring it afterwards) because the allowed
origins list, like `DATABASE_URL` in `app.database`, is computed once, at
import time, from `os.getenv`.
"""

import asyncio
import importlib
import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

import app.main as main_module
from app.main import health
from app.routers import backend as backend_router
from app.services import configured_services

# Captured once, before any test touches the environment, so reload-based
# tests can put the module back exactly as every other test file expects it.
_REAL_ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS")


def _restore_real_module() -> None:
    if _REAL_ALLOWED_ORIGINS is None:
        os.environ.pop("ALLOWED_ORIGINS", None)
    else:
        os.environ["ALLOWED_ORIGINS"] = _REAL_ALLOWED_ORIGINS
    importlib.reload(main_module)


def _cors_kwargs(app: FastAPI) -> dict:
    for middleware in app.user_middleware:
        if middleware.cls is CORSMiddleware:
            return dict(middleware.kwargs)
    raise AssertionError("CORSMiddleware is not registered on the app")


def test_app_is_a_fastapi_instance_with_the_declared_metadata() -> None:
    assert isinstance(main_module.app, FastAPI)
    assert main_module.app.title == "PMS"
    assert main_module.app.description == "project management system"
    assert main_module.app.version == "0.1.0"


def test_cors_allows_credentials_any_method_and_any_header() -> None:
    kwargs = _cors_kwargs(main_module.app)
    assert kwargs["allow_credentials"] is True
    assert kwargs["allow_methods"] == ["*"]
    assert kwargs["allow_headers"] == ["*"]


def test_allowed_origins_defaults_to_the_local_vite_dev_origins_when_unset(
    monkeypatch,
) -> None:
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    try:
        reloaded = importlib.reload(main_module)
        kwargs = _cors_kwargs(reloaded.app)
        assert kwargs["allow_origins"] == ["http://localhost:5173", "http://127.0.0.1:5173"]
    finally:
        _restore_real_module()


def test_allowed_origins_reads_the_comma_separated_environment_variable_when_set(
    monkeypatch,
) -> None:
    monkeypatch.setenv(
        "ALLOWED_ORIGINS", " https://app.example.com , https://other.example.com "
    )
    try:
        reloaded = importlib.reload(main_module)
        kwargs = _cors_kwargs(reloaded.app)
        # Stripped of surrounding whitespace, in order, and the dev origins
        # are not appended once a real value is configured.
        assert kwargs["allow_origins"] == [
            "https://app.example.com",
            "https://other.example.com",
        ]
    finally:
        _restore_real_module()


def test_allowed_origins_ignores_blank_entries_in_the_environment_variable(
    monkeypatch,
) -> None:
    # A trailing comma, or an otherwise-empty ALLOWED_ORIGINS, must not
    # produce a blank-string entry that would never match a real Origin
    # header -- and must not silently fall back to the dev origins either.
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.example.com,,")
    try:
        reloaded = importlib.reload(main_module)
        kwargs = _cors_kwargs(reloaded.app)
        assert kwargs["allow_origins"] == ["https://app.example.com"]
    finally:
        _restore_real_module()


def test_an_allowed_origins_value_of_only_whitespace_falls_back_to_dev_origins(
    monkeypatch,
) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", " , ")
    try:
        reloaded = importlib.reload(main_module)
        kwargs = _cors_kwargs(reloaded.app)
        assert kwargs["allow_origins"] == ["http://localhost:5173", "http://127.0.0.1:5173"]
    finally:
        _restore_real_module()


def test_backend_router_routes_are_mounted_on_the_app() -> None:
    # Every path the `backend` router declares must be reachable from `app`
    # itself (what a request actually hits), not just present on the
    # router object before it is included.
    app_paths = {route.path for route in main_module.app.routes}
    router_paths = {route.path for route in backend_router.router.routes}
    assert router_paths, "the backend router registered no routes to compare against"
    assert router_paths.issubset(app_paths)


def test_health_is_registered_directly_and_not_through_the_backend_router() -> None:
    router_paths = {route.path for route in backend_router.router.routes}
    assert "/health" not in router_paths

    app_health_routes = [route for route in main_module.app.routes if route.path == "/health"]
    assert len(app_health_routes) == 1
    assert app_health_routes[0].methods == {"GET"}


def test_health_returns_ok_status_and_the_configured_services() -> None:
    result = asyncio.run(health())
    assert result == {"status": "ok", "services": configured_services()}


def test_health_reads_service_configuration_fresh_on_every_call(monkeypatch) -> None:
    # Pins that `health()` calls `configured_services()` at request time
    # rather than reading a value captured once at import time: flipping
    # DATABASE_URL must change the very next call's result.
    monkeypatch.delenv("DATABASE_URL", raising=False)
    without_database = asyncio.run(health())
    assert without_database["services"]["database"] is False

    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://unit-test-host/unit_test_db")
    with_database = asyncio.run(health())
    assert with_database["services"]["database"] is True
