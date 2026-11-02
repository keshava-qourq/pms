"""Routes for the `backend` API Service component.

The approved architecture gives this one component every path in the API
spec (`docs/sdlc/architecture/api/openapi.yaml`). Auth (US-001) is
implemented: `POST /auth/login` and `GET /auth/me` are real. Invitations
(US-002) are implemented: `POST /invitations` and `POST /auth/accept-invite`.
Projects (US-003-1) are implemented: `GET/POST /projects` and
`GET/PATCH /projects/{id}` are workspace-wide -- no owner filter or
per-project role narrows what a signed-in member can see or edit (AC-007,
AC-008). Tasks (US-003-2) are implemented the same way:
`GET/POST /projects/{id}/tasks` and `GET/PATCH /tasks/{id}` are editable by
any signed-in member regardless of who created the task or its project
(AC-008). `POST /projects/{id}/tasks` and `PATCH /tasks/{id}` enqueue the
Slack/email notification jobs (US-006) via `enqueue_notification` rather than
calling out inline, so the save never waits on -- or fails because of --
Slack, SendGrid or even a briefly unreachable broker (NFR-004); see
`app/tasks.py` for the jobs themselves. Every other route -- except
`/health`, `/auth/login` and `/auth/accept-invite` -- is guarded by the
shared `get_current_user` dependency (NFR-001). Everything else here is
still the typed `StubResponse` placeholder until its own ticket implements
it.
"""

import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ChecklistItem, Comment, Invitation, Label, Project, Task, TaskLabel, User
from app.schemas import (
    AcceptInviteRequest,
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistItemUpdate,
    CommentCreate,
    CommentOut,
    InvitationCreate,
    InvitationOut,
    LabelAttach,
    LabelOut,
    LoginRequest,
    LoginResponse,
    ProjectCreate,
    ProjectOut,
    ProjectSummary,
    ProjectUpdate,
    StubResponse,
    TaskCreate,
    TaskOut,
    TaskUpdate,
    UserOut,
)
from app.security import create_access_token, hash_password, verify_password
from app.tasks import (
    enqueue_notification,
    notify_task_created,
    notify_task_updated,
    send_invitation_email,
)

INVITATION_EXPIRY_DAYS = 7
TASK_COMPLETE_STATUS = "done"

# Applied to every route except /health, /auth/login and /auth/accept-invite.
_auth = [Depends(get_current_user)]

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:  # noqa: B008
    """Guards /invitations only (NFR-002): any other authenticated member is 403."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def _stub(endpoint: str) -> StubResponse:
    return StubResponse(endpoint=endpoint)


def _as_aware_utc(value: datetime) -> datetime:
    """SQLite drops tzinfo on round-trip even for `DateTime(timezone=True)`
    columns; Postgres does not. Normalise so expiry comparisons work on both."""
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _get_project_or_404(db: Session, id: str) -> Project:
    project = db.get(Project, id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _get_task_or_404(db: Session, id: str) -> Task:
    task = db.get(Task, id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def _get_checklist_item_or_404(db: Session, id: str) -> ChecklistItem:
    item = db.get(ChecklistItem, id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found"
        )
    return item


def _get_label_or_404(db: Session, id: str) -> Label:
    label = db.get(Label, id)
    if label is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    return label


def _task_labels(db: Session, task_id: str) -> list[LabelOut]:
    labels = (
        db.query(Label)
        .join(TaskLabel, TaskLabel.label_id == Label.id)
        .filter(TaskLabel.task_id == task_id)
        .order_by(Label.name.asc())
        .all()
    )
    return [LabelOut.model_validate(label) for label in labels]


def _comment_out(db: Session, comment: Comment) -> CommentOut:
    author = db.get(User, comment.author_id)
    return CommentOut(
        id=comment.id,
        task_id=comment.task_id,
        author_id=comment.author_id,
        author_name=author.name if author is not None else None,
        body=comment.body,
        created_at=comment.created_at,
    )


def _build_task_out(db: Session, task: Task) -> TaskOut:
    """The full task detail: flat task fields plus comments, checklist and labels."""
    comments = (
        db.query(Comment)
        .filter(Comment.task_id == task.id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    checklist = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.task_id == task.id)
        .order_by(ChecklistItem.position.asc())
        .all()
    )
    checklist_outs = [ChecklistItemOut.model_validate(item) for item in checklist]

    task_out = TaskOut.model_validate(task)
    task_out.comments = [_comment_out(db, c) for c in comments]
    task_out.checklist = checklist_outs
    task_out.labels = _task_labels(db, task.id)
    task_out.checklist_total = len(checklist_outs)
    task_out.checklist_complete = sum(1 for item in checklist_outs if item.is_complete)
    return task_out


def _validate_owner_id(db: Session, owner_id: str | None) -> None:
    """422 when `owner_id` is set but names no member (AC-016)."""
    if owner_id is not None and db.get(User, owner_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown owner_id",
        )


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


@router.post("/auth/accept-invite", response_model=LoginResponse, tags=["auth"])
async def accept_invite(
    payload: AcceptInviteRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> LoginResponse:
    """{token, password, name?} -> {access_token, user}. No auth (AC-004).

    An invalid, expired or already-used token is 400. Creates the member
    account and marks the invitation accepted in the same transaction.
    """
    invitation = db.query(Invitation).filter(Invitation.token == payload.token).first()
    if (
        invitation is None
        or invitation.status != "pending"
        or _as_aware_utc(invitation.expires_at) < datetime.now(UTC)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invitation"
        )

    user = User(
        email=invitation.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        is_admin=False,
    )
    invitation.status = "accepted"
    db.add(user)
    db.add(invitation)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return LoginResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/auth/me", response_model=UserOut, tags=["auth"])
async def me(current_user: User = Depends(get_current_user)) -> UserOut:  # noqa: B008
    """-> {id, email, name, is_admin}. JWT required."""
    return UserOut.model_validate(current_user)


# ---- invitations -------------------------------------------------------------
@router.post(
    "/invitations",
    response_model=InvitationOut,
    status_code=status.HTTP_201_CREATED,
    tags=["invitations"],
)
async def create_invitation(
    payload: InvitationCreate,
    current_user: User = Depends(require_admin),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> InvitationOut:
    """{email} -> {invitation}. JWT required, admin only (NFR-002, AC-004/005/006)."""
    existing_member = db.query(User).filter(User.email == payload.email).first()
    if existing_member is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A member with that email already exists",
        )

    existing_invite = (
        db.query(Invitation)
        .filter(Invitation.email == payload.email, Invitation.status == "pending")
        .first()
    )
    if existing_invite is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An invitation for that email is already pending",
        )

    invitation = Invitation(
        email=payload.email,
        token=secrets.token_urlsafe(32),
        status="pending",
        invited_by=current_user.id,
        expires_at=datetime.now(UTC) + timedelta(days=INVITATION_EXPIRY_DAYS),
    )
    db.add(invitation)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An invitation for that email is already pending",
        ) from exc
    db.refresh(invitation)

    send_invitation_email.delay(invitation.id)

    return InvitationOut.model_validate(invitation)


# ---- projects ----------------------------------------------------------------
@router.get("/projects", response_model=list[ProjectSummary], tags=["projects"])
async def list_projects(
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> list[ProjectSummary]:
    """-> [{project, task_total, task_complete}]. JWT required.

    Every project in the workspace, regardless of who created it (AC-007):
    no owner filter is applied.
    """
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    counts = dict(db.query(Task.project_id, func.count(Task.id)).group_by(Task.project_id).all())
    complete_counts = dict(
        db.query(Task.project_id, func.count(Task.id))
        .filter(Task.status == TASK_COMPLETE_STATUS)
        .group_by(Task.project_id)
        .all()
    )
    return [
        ProjectSummary(
            project=ProjectOut.model_validate(project),
            task_total=counts.get(project.id, 0),
            task_complete=complete_counts.get(project.id, 0),
        )
        for project in projects
    ]


@router.post(
    "/projects",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
    tags=["projects"],
)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ProjectOut:
    """{name, description?} -> {project}. JWT required; records created_by."""
    project = Project(
        name=payload.name,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectOut.model_validate(project)


@router.get("/projects/{id}", response_model=ProjectOut, tags=["projects"])
async def get_project(
    id: str,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ProjectOut:
    """-> {project}. JWT required; any signed-in member, 404 for an unknown id."""
    project = _get_project_or_404(db, id)
    return ProjectOut.model_validate(project)


@router.patch("/projects/{id}", response_model=ProjectOut, tags=["projects"])
async def update_project(
    id: str,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ProjectOut:
    """{name?, description?} -> {project}. JWT required.

    Any signed-in member may save edits, including one who did not create
    the project (AC-008): there is no ownership check.
    """
    project = _get_project_or_404(db, id)
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    project.updated_at = datetime.now(UTC)
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectOut.model_validate(project)


@router.get("/projects/{id}/tasks", response_model=list[TaskOut], tags=["projects"])
async def list_project_tasks(
    id: str,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> list[TaskOut]:
    """-> [{task}]. JWT required; any signed-in member, 404 for an unknown project."""
    _get_project_or_404(db, id)
    tasks = db.query(Task).filter(Task.project_id == id).order_by(Task.created_at.desc()).all()
    outs = []
    for task in tasks:
        task_out = TaskOut.model_validate(task)
        task_out.labels = _task_labels(db, task.id)
        outs.append(task_out)
    return outs


@router.post(
    "/projects/{id}/tasks",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
    tags=["projects"],
)
async def create_task(
    id: str,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> TaskOut:
    """{title, description?, status?, owner_id?, due_date?} -> {task}, 201.

    JWT required, 404 for an unknown project, 422 for an unknown owner_id
    (AC-016). Enqueues `notify_task_created` (US-006) rather than calling
    Slack/SendGrid inline, so the save returns without waiting on either, or
    failing because of them (NFR-004).
    """
    _get_project_or_404(db, id)
    _validate_owner_id(db, payload.owner_id)
    task = Task(
        project_id=id,
        title=payload.title,
        description=payload.description,
        status=payload.status or "todo",
        owner_id=payload.owner_id,
        due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    enqueue_notification(notify_task_created, task.id)

    return TaskOut.model_validate(task)


# ---- tasks --------------------------------------------------------------------
@router.get("/tasks/{id}", response_model=TaskOut, tags=["tasks"])
async def get_task(
    id: str,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> TaskOut:
    """-> {task, comments, checklist, labels}. JWT required; any signed-in
    member, 404 for an unknown id."""
    task = _get_task_or_404(db, id)
    return _build_task_out(db, task)


@router.patch("/tasks/{id}", response_model=TaskOut, tags=["tasks"])
async def update_task(
    id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> TaskOut:
    """{title?, description?, status?, owner_id?, due_date?} -> {task}.

    JWT required, 422 for an unknown owner_id (AC-016). Any signed-in member
    may save edits, including one who did not create the task or its
    project (AC-008): there is no ownership check. Enqueues
    `notify_task_updated` with the fields that actually changed (US-006),
    rather than calling Slack/SendGrid inline (NFR-004).
    """
    task = _get_task_or_404(db, id)
    _validate_owner_id(db, payload.owner_id)
    changed_fields: list[str] = []
    if payload.title is not None and payload.title != task.title:
        task.title = payload.title
        changed_fields.append("title")
    if payload.description is not None and payload.description != task.description:
        task.description = payload.description
        changed_fields.append("description")
    if payload.status is not None and payload.status != task.status:
        task.status = payload.status
        changed_fields.append("status")
    if payload.owner_id is not None and payload.owner_id != task.owner_id:
        task.owner_id = payload.owner_id
        changed_fields.append("owner_id")
    if payload.due_date is not None and payload.due_date != task.due_date:
        task.due_date = payload.due_date
        changed_fields.append("due_date")
    task.updated_at = datetime.now(UTC)
    db.add(task)
    db.commit()
    db.refresh(task)

    if changed_fields:
        enqueue_notification(notify_task_updated, task.id, changed_fields)

    return TaskOut.model_validate(task)


@router.get("/tasks/{id}/comments", response_model=list[CommentOut], tags=["tasks"])
async def list_comments(
    id: str,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> list[CommentOut]:
    """-> [{comment}]. JWT required, 404 for an unknown task; chronological (AC-024, AC-025)."""
    _get_task_or_404(db, id)
    comments = (
        db.query(Comment).filter(Comment.task_id == id).order_by(Comment.created_at.asc()).all()
    )
    return [_comment_out(db, c) for c in comments]


@router.post(
    "/tasks/{id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
async def create_comment(
    id: str,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> CommentOut:
    """{body} -> {comment}, 201. JWT required, 404 for an unknown task, 422 for a
    blank body (AC-024, AC-026). Attached to the current user, never a body-supplied id."""
    _get_task_or_404(db, id)
    comment = Comment(task_id=id, author_id=current_user.id, body=payload.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_out(db, comment)


@router.post(
    "/tasks/{id}/checklist",
    response_model=ChecklistItemOut,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
async def add_checklist_item(
    id: str,
    payload: ChecklistItemCreate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ChecklistItemOut:
    """{title} -> {checklist_item}, 201 with is_complete=false. JWT required,
    404 for an unknown task (AC-027)."""
    _get_task_or_404(db, id)
    next_position = (
        db.query(func.count(ChecklistItem.id)).filter(ChecklistItem.task_id == id).scalar() or 0
    )
    item = ChecklistItem(task_id=id, title=payload.title, is_complete=False, position=next_position)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ChecklistItemOut.model_validate(item)


@router.patch("/checklist/{id}", response_model=ChecklistItemOut, tags=["tasks"])
async def toggle_checklist_item(
    id: str,
    payload: ChecklistItemUpdate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ChecklistItemOut:
    """{is_complete} -> {checklist_item}. JWT required, 404 for an unknown item (AC-028)."""
    item = _get_checklist_item_or_404(db, id)
    item.is_complete = payload.is_complete
    db.add(item)
    db.commit()
    db.refresh(item)
    return ChecklistItemOut.model_validate(item)


DEFAULT_LABELS = [
    ("Bug", "#e03131"),
    ("Feature", "#2f9e44"),
    ("Chore", "#495057"),
    ("Urgent", "#e8590c"),
]


def _ensure_default_labels(db: Session) -> None:
    """Seed the workspace label catalogue once, the first time it is read."""
    if db.query(Label).first() is not None:
        return
    for name, color in DEFAULT_LABELS:
        db.add(Label(name=name, color=color))
    db.commit()


# ---- labels -------------------------------------------------------------------
@router.get("/labels", response_model=list[LabelOut], tags=["labels"])
async def list_labels(
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> list[LabelOut]:
    """-> [{id, name, color}]. JWT required; the workspace label catalogue,
    seeded with a default set the first time it is read."""
    _ensure_default_labels(db)
    labels = db.query(Label).order_by(Label.name.asc()).all()
    return [LabelOut.model_validate(label) for label in labels]


@router.post(
    "/tasks/{id}/labels",
    response_model=TaskOut,
    status_code=status.HTTP_200_OK,
    tags=["labels"],
)
async def apply_label(
    id: str,
    payload: LabelAttach,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> TaskOut:
    """{label_id} -> {task}. JWT required, 404 for an unknown task or label
    (AC-029). Idempotent: attaching an already-attached label is a no-op."""
    task = _get_task_or_404(db, id)
    _get_label_or_404(db, payload.label_id)
    existing = db.get(TaskLabel, (task.id, payload.label_id))
    if existing is None:
        db.add(TaskLabel(task_id=task.id, label_id=payload.label_id))
        db.commit()
    return _build_task_out(db, task)


@router.delete(
    "/tasks/{id}/labels/{label_id}",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["labels"],
)
async def remove_label(
    id: str,
    label_id: str,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    """204, no body. JWT required, 404 for an unknown task or label (AC-030)."""
    task = _get_task_or_404(db, id)
    _get_label_or_404(db, label_id)
    link = db.get(TaskLabel, (task.id, label_id))
    if link is not None:
        db.delete(link)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- notifications --------------------------------------------------------------
@router.get(
    "/notifications", response_model=StubResponse, dependencies=_auth, tags=["notifications"]
)
async def list_notifications() -> StubResponse:
    """-> [{notification}]. JWT required."""
    return _stub("GET /notifications")
