"""Routes for the `backend` API Service component.

The approved architecture gives this one component every path in the API
spec (`docs/sdlc/architecture/api/openapi.yaml`). Auth (US-001), invitations
(US-002), projects (US-003-1/US-004/US-005), tasks (US-003-2/US-006/US-007),
comments (US-010), checklists (US-011), labels (US-012) and in-app
notifications (US-006/US-007) are all implemented here. Projects and tasks
are workspace-wide (AC-007, AC-008): no owner filter or per-project role
narrows what a signed-in member can see or edit. Every route except
`/health`, `/auth/login` and `/auth/accept-invite` is guarded by the shared
`get_current_user` dependency (NFR-001); `/invitations` additionally
requires an admin (NFR-002).
"""

import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    ChecklistItem,
    Comment,
    Invitation,
    Label,
    Notification,
    Project,
    Task,
    TaskLabel,
    User,
)
from app.schemas import (
    TASK_STATUSES,
    AcceptInviteRequest,
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistItemUpdate,
    CommentCreate,
    CommentOut,
    InvitationCreate,
    InvitationOut,
    LabelOut,
    LoginRequest,
    LoginResponse,
    NotificationOut,
    ProjectCreate,
    ProjectOut,
    ProjectSummary,
    ProjectUpdate,
    TaskCreate,
    TaskDetailOut,
    TaskLabelCreate,
    TaskLabelOut,
    TaskOut,
    TaskUpdate,
    UserOut,
)
from app.security import create_access_token, hash_password, verify_password
from app.tasks import notify_task_saved, send_invitation_email

INVITATION_EXPIRY_DAYS = 7
TASK_COMPLETE_STATUS = "done"

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:  # noqa: B008
    """Guards /invitations only (NFR-002): any other authenticated member is 403."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


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


def _validate_owner_exists(db: Session, owner_id: str | None) -> None:
    """AC-016: an unknown owner id on create or patch is 422, task unchanged."""
    if owner_id is not None and db.get(User, owner_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown owner id",
        )


def _validate_title(title: str) -> str:
    """AC-036: a missing (empty or whitespace-only) title is 422, no task created."""
    if not title or not title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Title is required",
        )
    return title.strip()


def _validate_project_name(name: str) -> str:
    """AC-010/AC-011: a missing (empty or whitespace-only) project name is 422."""
    if not name or not name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Project name is required",
        )
    return name.strip()


def _validate_status(value: str | None) -> str:
    """AC-018: a status outside the board's known set is 422, task unchanged."""
    if value not in TASK_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Status must be one of {sorted(TASK_STATUSES)}",
        )
    return value


def _labels_for_task(db: Session, task_id: str) -> list[LabelOut]:
    labels = (
        db.query(Label)
        .join(TaskLabel, TaskLabel.label_id == Label.id)
        .filter(TaskLabel.task_id == task_id)
        .order_by(Label.name.asc())
        .all()
    )
    return [LabelOut.model_validate(label) for label in labels]


def _task_out(db: Session, task: Task) -> TaskOut:
    return TaskOut(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        owner_id=task.assignee_id,
        due_date=task.due_date,
        status=task.status,
        labels=_labels_for_task(db, task.id),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _comment_out(db: Session, comment: Comment, author: User | None = None) -> CommentOut:
    if author is None:
        author = db.get(User, comment.author_id)
    return CommentOut(
        id=comment.id,
        task_id=comment.task_id,
        author_id=comment.author_id,
        author_name=author.name if author else None,
        body=comment.body,
        created_at=comment.created_at,
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
    """{name, description?} -> {project}. JWT required; records created_by.

    AC-010: an empty or whitespace-only name is 422 and creates nothing.
    """
    name = _validate_project_name(payload.name)
    project = Project(
        name=name,
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
    the project (AC-008): there is no ownership check. AC-011: a blank name
    is 422 and leaves the record unchanged.
    """
    project = _get_project_or_404(db, id)
    if payload.name is not None:
        project.name = _validate_project_name(payload.name)
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
    return [_task_out(db, task) for task in tasks]


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
    """{title, description?, owner_id?, due_date?, status?} -> {task}, 201.

    JWT required, 404 for an unknown project. Enqueues `notify_task_saved`
    (US-006) once the task is committed.
    """
    _get_project_or_404(db, id)
    title = _validate_title(payload.title)
    _validate_owner_exists(db, payload.owner_id)
    task_status = _validate_status(payload.status) if payload.status is not None else "todo"
    task = Task(
        project_id=id,
        title=title,
        description=payload.description,
        status=task_status,
        assignee_id=payload.owner_id,
        due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    notify_task_saved.delay(task.id)
    return _task_out(db, task)


# ---- tasks --------------------------------------------------------------------
@router.get("/tasks/{id}", response_model=TaskDetailOut, tags=["tasks"])
async def get_task(
    id: str,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> TaskDetailOut:
    """-> {task, comments, checklist, labels}. JWT required, 404 for an unknown id."""
    task = _get_task_or_404(db, id)
    comments = (
        db.query(Comment).filter(Comment.task_id == id).order_by(Comment.created_at.asc()).all()
    )
    checklist = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.task_id == id)
        .order_by(ChecklistItem.position.asc())
        .all()
    )
    return TaskDetailOut(
        task=_task_out(db, task),
        comments=[_comment_out(db, comment) for comment in comments],
        checklist=[ChecklistItemOut.model_validate(item) for item in checklist],
        labels=_labels_for_task(db, id),
    )


@router.patch("/tasks/{id}", response_model=TaskOut, tags=["tasks"])
async def update_task(
    id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> TaskOut:
    """{title?, description?, owner_id?, due_date?, status?} -> {task}.

    JWT required. Any signed-in member may save edits, including one who did
    not create the task or its project (AC-008): there is no ownership
    check. Only a field explicitly present in the request body is touched --
    `{"owner_id": null}` clears the owner, an omitted `owner_id` leaves it as
    it was -- so validation (AC-016, AC-018) runs, and nothing is written,
    before any field changes. Enqueues `notify_task_saved` (US-007).
    """
    task = _get_task_or_404(db, id)
    fields = payload.model_dump(exclude_unset=True)

    if "owner_id" in fields:
        _validate_owner_exists(db, fields["owner_id"])
    if "status" in fields:
        # `status` is not nullable on the model, so an explicit null is just
        # as invalid as an unrecognised string -- _validate_status rejects
        # both, since None is never a member of TASK_STATUSES.
        _validate_status(fields["status"])
    if "title" in fields:
        fields["title"] = _validate_title(fields["title"])

    if "title" in fields:
        task.title = fields["title"]
    if "description" in fields:
        task.description = fields["description"]
    if "status" in fields:
        task.status = fields["status"]
    if "owner_id" in fields:
        task.assignee_id = fields["owner_id"]
    if "due_date" in fields:
        task.due_date = fields["due_date"]

    task.updated_at = datetime.now(UTC)
    db.add(task)
    db.commit()
    db.refresh(task)
    notify_task_saved.delay(task.id)
    return _task_out(db, task)


@router.get("/tasks/{id}/comments", response_model=list[CommentOut], tags=["tasks"])
async def list_comments(
    id: str,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> list[CommentOut]:
    """-> [{comment}]. JWT required, 404 for an unknown task. AC-025: chronological."""
    _get_task_or_404(db, id)
    comments = (
        db.query(Comment).filter(Comment.task_id == id).order_by(Comment.created_at.asc()).all()
    )
    return [_comment_out(db, comment) for comment in comments]


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
    """{body} -> {comment}. JWT required, 404 for an unknown task.

    AC-026: an empty or whitespace-only body is 422 and creates nothing.
    """
    _get_task_or_404(db, id)
    if not payload.body or not payload.body.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Comment body is required",
        )
    comment = Comment(task_id=id, author_id=current_user.id, body=payload.body.strip())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_out(db, comment, author=current_user)


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
    """{title} -> {checklist_item}. JWT required, 404 for an unknown task.

    AC-027: starts incomplete.
    """
    _get_task_or_404(db, id)
    title = payload.title.strip() if payload.title else ""
    if not title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Checklist item title is required",
        )
    position = db.query(func.count(ChecklistItem.id)).filter(ChecklistItem.task_id == id).scalar()
    item = ChecklistItem(task_id=id, title=title, is_complete=False, position=position or 0)
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
    """{is_complete} -> {checklist_item}. JWT required, 404 for an unknown item.

    AC-028: persists and is reflected in the task detail's done/total counts.
    """
    item = db.get(ChecklistItem, id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found"
        )
    item.is_complete = payload.is_complete
    db.add(item)
    db.commit()
    db.refresh(item)
    return ChecklistItemOut.model_validate(item)


# ---- labels -------------------------------------------------------------------
@router.get("/labels", response_model=list[LabelOut], tags=["labels"])
async def list_labels(
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> list[LabelOut]:
    """-> [{label}]. JWT required."""
    labels = db.query(Label).order_by(Label.name.asc()).all()
    return [LabelOut.model_validate(label) for label in labels]


@router.post(
    "/tasks/{id}/labels",
    response_model=TaskLabelOut,
    status_code=status.HTTP_201_CREATED,
    tags=["labels"],
)
async def apply_label(
    id: str,
    payload: TaskLabelCreate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> TaskLabelOut:
    """{label_id} -> {task_labels}. JWT required, 404 for an unknown task or label.

    AC-029: applying a label already on the task is a no-op, not a duplicate row.
    """
    _get_task_or_404(db, id)
    label = db.get(Label, payload.label_id)
    if label is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")

    existing = db.get(TaskLabel, (id, payload.label_id))
    if existing is None:
        db.add(TaskLabel(task_id=id, label_id=payload.label_id))
        db.commit()
    return TaskLabelOut(task_id=id, label_id=payload.label_id)


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
    _get_task_or_404(db, id)
    label = db.get(Label, label_id)
    if label is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")

    db.query(TaskLabel).filter(TaskLabel.task_id == id, TaskLabel.label_id == label_id).delete()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- notifications --------------------------------------------------------------
@router.get("/notifications", response_model=list[NotificationOut], tags=["notifications"])
async def list_notifications(
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> list[NotificationOut]:
    """-> [{notification}]. JWT required; only the signed-in member's own rows."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [NotificationOut.model_validate(n) for n in notifications]
