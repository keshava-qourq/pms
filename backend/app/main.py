"""Application entrypoint.

Generated from the approved architecture: one router per component that owns
endpoints, one route per endpoint the API spec declares. See
`app/routers/backend.py` for the handlers themselves.
"""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.routers import backend as backend_router
from app.seed import seed_bootstrap_accounts
from app.services import configured_services


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Idempotent: creates the first admin and the smoke-test member only when
    their env vars are set and only if each email does not already exist. A
    bare `DATABASE_URL` with no migrations applied (e.g. a fresh `pytest` run
    against sqlite before `_migrated_schema` has run) has no `users` table
    yet; this is only meaningful once `alembic upgrade head` has run, which
    the Dockerfile's CMD already does before starting uvicorn.
    """
    db = SessionLocal()
    try:
        seed_bootstrap_accounts(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="PMS",
    description="project management system",
    version="0.1.0",
    lifespan=_lifespan,
)

# The SPA runs on a different origin than the API, so the browser refuses its calls
# unless that origin is allowed here. In development that is the Vite dev server; when
# deployed, the platform injects the frontend's real URL as ALLOWED_ORIGINS (comma
# separated). Point ALLOWED_ORIGINS at the real thing and nothing else has to change.
_dev_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins or _dev_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schema changes go through the Alembic migration in backend/alembic/versions/,
# not create_all: run `alembic upgrade head` (see backend/alembic.ini) before
# starting the app or the test suite.

app.include_router(backend_router.router)


@app.get("/health")
async def health() -> dict[str, object]:
    """Liveness probe, and the only route here that is not a stub."""
    return {"status": "ok", "services": configured_services()}
