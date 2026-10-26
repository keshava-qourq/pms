"""Routes for the `backend` API Service component.

The approved architecture gives this one component every path in the API
spec (`docs/sdlc/architecture/api/openapi.yaml`). Auth (US-001) is
implemented: `POST /auth/login` and `GET /auth/me` are real, and every other
route -- except `/health`, `/auth/login` and `/auth/accept-invite` -- is
guarded by the shared `get_current_user` dependency (NFR-001). Everything
else here is still the typed `StubResponse` placeholder until its own ticket
implements it.
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, LoginResponse, StubResponse, UserOut
from app.security import create_access_token, verify_password

# Applied to every route except /health, /auth/login and /auth/accept-invite.
_auth = [Depends(get_current_user)]

router = APIRouter()


def _stub(endpoint: str) -> StubResponse:
    return StubResponse(endpoint=endpoint)


# ---- auth ------------------------------------------------------------------
@router.post("/auth/login", response_model=LoginResponse, tags=["auth"])
async def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:  # noqa: B008
    """{email, password} -> {access_token, token_type, user}. No auth (AC-001, AC-002)."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(user.id)
    return LoginResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/auth/accept-invite", response_model=StubResponse, tags=["auth"])
async def accept_invite() -> StubResponse:
    """{token, password, name} -> {user}. No auth."""
    return _stub("POST /auth/accept-invite")


@router.get("/auth/me", response_model=UserOut, tags=["auth"])
async def me(current_user: User = Depends(get_current_user)) -> UserOut:  # noqa: B008
    """-> {id, email, name, is_admin}. JWT required."""
    return UserOut.model_validate(current_user)


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
