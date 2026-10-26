"""Stub routes for the `backend` API Service component.

The approved architecture gives this one component every path in the API
spec (`docs/sdlc/architecture/api/openapi.yaml`), so this is the one router
`routers/__init__.py` promises -- "one router per architecture component that
owns endpoints, one route per endpoint the API spec declares." Each route
returns `StubResponse`, the typed placeholder `schemas.py` defines, until the
development sprint replaces it with real behaviour, one ticket at a time.

NFR-001 (every endpoint except login and accept-invite requires a signed-in
user) is wired structurally: protected routes carry the `bearer_scheme`
dependency below, so the OpenAPI document already shows which routes need a
token. It does not verify the token yet -- that needs real users, which is
feature work. NFR-002 (admin-only invites) is noted on `/invitations` but, for
the same reason, not enforced here.
"""

from fastapi import APIRouter, Depends, Response, status
from fastapi.security import HTTPBearer

from app.schemas import StubResponse

# `auto_error=False`: a stub route has no real token to check yet. Declaring
# the dependency only makes FastAPI record the bearer requirement in the
# OpenAPI document, so it already matches NFR-001.
bearer_scheme = HTTPBearer(auto_error=False)
_auth = [Depends(bearer_scheme)]

router = APIRouter()


def _stub(endpoint: str) -> StubResponse:
    return StubResponse(endpoint=endpoint)


# ---- auth ------------------------------------------------------------------
@router.post("/auth/login", response_model=StubResponse, tags=["auth"])
async def login() -> StubResponse:
    """{email, password} -> {access_token, user}. No auth."""
    return _stub("POST /auth/login")


@router.post("/auth/accept-invite", response_model=StubResponse, tags=["auth"])
async def accept_invite() -> StubResponse:
    """{token, password, name} -> {user}. No auth."""
    return _stub("POST /auth/accept-invite")


@router.get("/auth/me", response_model=StubResponse, dependencies=_auth, tags=["auth"])
async def me() -> StubResponse:
    """-> {user}. JWT required."""
    return _stub("GET /auth/me")


# ---- invitations -------------------------------------------------------------
@router.post("/invitations", response_model=StubResponse, dependencies=_auth, tags=["invitations"])
async def create_invitation() -> StubResponse:
    """{email} -> {invitation}. JWT required, admin only (NFR-002)."""
    return _stub("POST /invitations")


# ---- projects ----------------------------------------------------------------
@router.get("/projects", response_model=StubResponse, dependencies=_auth, tags=["projects"])
async def list_projects() -> StubResponse:
    """-> [{project, task_total, task_complete}]. JWT required."""
    return _stub("GET /projects")


@router.post("/projects", response_model=StubResponse, dependencies=_auth, tags=["projects"])
async def create_project() -> StubResponse:
    """{name, description?} -> {project}. JWT required."""
    return _stub("POST /projects")


@router.get("/projects/{id}", response_model=StubResponse, dependencies=_auth, tags=["projects"])
async def get_project(id: str) -> StubResponse:
    """-> {project}. JWT required."""
    return _stub(f"GET /projects/{id}")


@router.patch("/projects/{id}", response_model=StubResponse, dependencies=_auth, tags=["projects"])
async def update_project(id: str) -> StubResponse:
    """{name?, description?} -> {project}. JWT required."""
    return _stub(f"PATCH /projects/{id}")


@router.get(
    "/projects/{id}/tasks", response_model=StubResponse, dependencies=_auth, tags=["projects"]
)
async def list_project_tasks(id: str) -> StubResponse:
    """-> [{task}]. JWT required."""
    return _stub(f"GET /projects/{id}/tasks")


@router.post(
    "/projects/{id}/tasks", response_model=StubResponse, dependencies=_auth, tags=["projects"]
)
async def create_task(id: str) -> StubResponse:
    """{title, description?, owner_id?, due_date?, status?} -> {task}.

    JWT required. Enqueues an outbound notification once implemented
    (US-006) -- see `app/celery_app.py` for the shared Celery instance.
    """
    return _stub(f"POST /projects/{id}/tasks")


# ---- tasks --------------------------------------------------------------------
@router.get("/tasks/{id}", response_model=StubResponse, dependencies=_auth, tags=["tasks"])
async def get_task(id: str) -> StubResponse:
    """-> {task, comments, checklist, labels}. JWT required."""
    return _stub(f"GET /tasks/{id}")


@router.patch("/tasks/{id}", response_model=StubResponse, dependencies=_auth, tags=["tasks"])
async def update_task(id: str) -> StubResponse:
    """{status?, owner_id?, due_date?, title?, description?} -> {task}.

    JWT required. Enqueues an outbound notification once implemented
    (US-007).
    """
    return _stub(f"PATCH /tasks/{id}")


@router.get("/tasks/{id}/comments", response_model=StubResponse, dependencies=_auth, tags=["tasks"])
async def list_comments(id: str) -> StubResponse:
    """-> [{comment}]. JWT required."""
    return _stub(f"GET /tasks/{id}/comments")


@router.post(
    "/tasks/{id}/comments", response_model=StubResponse, dependencies=_auth, tags=["tasks"]
)
async def create_comment(id: str) -> StubResponse:
    """{body} -> {comment}. JWT required."""
    return _stub(f"POST /tasks/{id}/comments")


@router.post(
    "/tasks/{id}/checklist", response_model=StubResponse, dependencies=_auth, tags=["tasks"]
)
async def add_checklist_item(id: str) -> StubResponse:
    """{title} -> {checklist_item}. JWT required."""
    return _stub(f"POST /tasks/{id}/checklist")


@router.patch("/checklist/{id}", response_model=StubResponse, dependencies=_auth, tags=["tasks"])
async def toggle_checklist_item(id: str) -> StubResponse:
    """{is_complete} -> {checklist_item}. JWT required."""
    return _stub(f"PATCH /checklist/{id}")


# ---- labels -------------------------------------------------------------------
@router.get("/labels", response_model=StubResponse, dependencies=_auth, tags=["labels"])
async def list_labels() -> StubResponse:
    """-> [{label}]. JWT required."""
    return _stub("GET /labels")


@router.post("/tasks/{id}/labels", response_model=StubResponse, dependencies=_auth, tags=["labels"])
async def apply_label(id: str) -> StubResponse:
    """{label_id} -> {task_labels}. JWT required."""
    return _stub(f"POST /tasks/{id}/labels")


@router.delete(
    "/tasks/{id}/labels/{label_id}",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=_auth,
    tags=["labels"],
)
async def remove_label(id: str, label_id: str) -> Response:
    """204, no body. JWT required."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- notifications --------------------------------------------------------------
@router.get(
    "/notifications", response_model=StubResponse, dependencies=_auth, tags=["notifications"]
)
async def list_notifications() -> StubResponse:
    """-> [{notification}]. JWT required."""
    return _stub("GET /notifications")
