# Developer Guide

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start status -->
_Up to date._
<!-- sdlc:auto:end status -->

<!-- sdlc:auto:start source -->
Generated from commit `ebda5c7` · model `claude-sonnet-5`
<!-- sdlc:auto:end source -->

<!-- sdlc:auto:start overview -->
PMS is a generated project-management-system codebase produced by the Quorq AI SDLC platform, split into two independently run apps in one repo. The frontend is a Vite + React 19 single-page app containing the approved, reviewed screens, currently rendering seeded sample data rather than live API calls. The backend is a FastAPI 0.115 service scaffolded from an API spec that had no approved architecture at generation time, so it exposes only a `/health` liveness route plus typed stub endpoints, backed by SQLAlchemy models (none yet defined) and SQLite by default, with Postgres and Redis available via docker-compose for when the real architecture lands.
<!-- sdlc:auto:end overview -->

<!-- sdlc:auto:start prerequisites -->
- Node.js (for Vite 6 / React 19 / TypeScript 5.6 toolchain)
- npm
- Python 3.12
- pip
- Docker and Docker Compose (optional, for Postgres/Redis services)
<!-- sdlc:auto:end prerequisites -->

<!-- sdlc:auto:start setup -->
1. git clone the repository and cd into it
2. cp .env.example .env (and fill in values as needed)
3. cd backend && pip install -r requirements.txt
4. cd frontend && npm install
5. (optional) from the repo root, docker compose up -d to start Postgres and Redis for the architecture packages
<!-- sdlc:auto:end setup -->

<!-- sdlc:auto:start run -->
| Name | Command | Description |
|---|---|---|
| backend dev | `cd backend && uvicorn app.main:app --reload` | Runs the FastAPI service locally with auto-reload; serves /health and creates SQLite tables (app.db) on startup. |
| frontend dev | `cd frontend && npm run dev` | Starts the Vite dev server for the React SPA (seeded sample data, no live API wiring yet). |
| frontend build | `cd frontend && npm run build` | Bundles the app with Vite; does not typecheck. |
| frontend preview | `cd frontend && npm run preview` | Serves the production build locally. |
| docker compose | `docker compose up -d` | Starts the postgres:16-alpine and redis:7-alpine services defined for the approved architecture. |
<!-- sdlc:auto:end run -->

<!-- sdlc:auto:start structure -->
| Path | Purpose |
|---|---|
| `backend/` | FastAPI service: app package, Dockerfile, requirements, pytest/ruff config. |
| `backend/app/` | Application code: main.py (entrypoint/CORS/startup), database.py (engine/session), models.py (SQLAlchemy models, empty scaffold), schemas.py (Pydantic schemas/StubResponse), services.py, routers/ (one router per architecture component). |
| `backend/tests/` | Pytest test suite (currently test_health.py). |
| `frontend/` | Vite + React SPA: config files, package.json, e2e tests, src/. |
| `frontend/src/` | App source: lib/ (api client, UI/icon vocabulary, navigation), main.tsx entrypoint, index.css (brand tokens). |
| `frontend/e2e/` | Playwright acceptance test specs run against a built/served app or E2E_BASE_URL. |
| `.quorq/` | Quorq platform metadata (handoff.json) for the generation pipeline. |
<!-- sdlc:auto:end structure -->

<!-- sdlc:auto:start conventions -->
- Backend routers: one router per architecture component that owns endpoints, imported under app/routers/.
- Unimplemented backend routes return a typed StubResponse (schemas.py) rather than raising, keeping the OpenAPI doc complete before handlers exist.
- SQLAlchemy models all inherit app.database.Base; models.py is imported in main.py before Base.metadata.create_all runs.
- Backend reads configuration from environment variables with safe local defaults: DATABASE_URL (defaults to sqlite:///./app.db) and ALLOWED_ORIGINS (defaults to localhost:5173 dev origins).
- Frontend uses the '@/' path alias for src/ (configured in both vite.config.ts and tsconfig.json).
- Frontend API access is centralized in src/lib/api.ts (apiFetch), reading VITE_API_BASE_URL / VITE_API_SECRET_KEY at build time; screens do not yet call it.
- Frontend component tests live beside the code they cover and are scoped to src/**/*.{test,spec}.{ts,tsx}, separate from Playwright specs in e2e/.
<!-- sdlc:auto:end conventions -->

<!-- sdlc:auto:start testing -->
| Name | Command | Description |
|---|---|---|
| backend test | `cd backend && pytest` | Runs the pytest suite (pythonpath=. configured in pytest.ini) against backend/tests. |
| backend lint | `cd backend && ruff check .` | Lints the backend Python code. |
| backend format | `cd backend && ruff format .` | Formats the backend Python code. |
| frontend unit test | `cd frontend && npm test` | Runs Vitest component tests (vitest run --passWithNoTests) in jsdom. |
| frontend lint | `cd frontend && npm run lint` | Runs ESLint over the frontend app; this gate must stay green per the platform. |
| frontend typecheck | `cd frontend && npm run typecheck` | Runs tsc --noEmit; not enforced by npm run build. |
| frontend e2e install | `cd frontend && npm run test:e2e:install` | Installs the Chromium browser Playwright needs. |
| frontend e2e | `cd frontend && npm run test:e2e` | Runs Playwright specs from e2e/; without E2E_BASE_URL it boots the backend (pip install + uvicorn) and the built/previewed frontend automatically. |
<!-- sdlc:auto:end testing -->

<!-- sdlc:auto:start troubleshooting -->
| Problem | Solution |
|---|---|
| Frontend calls to the backend are blocked by CORS | Set the ALLOWED_ORIGINS env var (comma-separated) on the backend to the frontend's real origin; it defaults to http://localhost:5173 and http://127.0.0.1:5173 only. |
| npm run build succeeds but tsc fails elsewhere | Run npm run typecheck (tsc --noEmit) separately, since npm run build does not typecheck and generated screens can have untyped state issues. |
| pytest run from an unexpected directory can't import app | Run pytest from backend/ so pytest.ini's pythonpath = . applies, or run it via `cd backend && pytest`. |
| Backend needs a real database instead of the default SQLite file | Set DATABASE_URL (e.g. to the docker-compose Postgres instance: postgresql://app:app@localhost:5432/app); no code changes are needed. |
| npm run test:e2e fails because no browser is installed | Run npm run test:e2e:install first to fetch Chromium for Playwright. |
<!-- sdlc:auto:end troubleshooting -->
