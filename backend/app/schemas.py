"""Pydantic request and response models.

One pair per entity in the approved data model
(`docs/sdlc/architecture/data-model.md`), matching the shapes
`docs/sdlc/architecture/api/openapi.yaml` declares -- in particular, a task's
owner is `owner_id` on the wire (the frontend and the approved spec agree on
that name) even though the ORM attribute behind it is `Task.assignee_id`
(see the comment on that column in `app/models.py`).
"""

from datetime import date, datetime

from pydantic import BaseModel

TASK_STATUSES = {"todo", "in_progress", "done"}


class LoginRequest(BaseModel):
    """{email, password} as POST /auth/login expects."""

    email: str
    password: str


class UserOut(BaseModel):
    """The member profile returned by /auth/login and /auth/me."""

    id: str
    email: str
    name: str | None = None
    is_admin: bool

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """What POST /auth/login (and accept-invite) returns on success."""

    access_token: str
    token_type: str = "bearer"
    user: UserOut


class InvitationCreate(BaseModel):
    """{email} as POST /invitations expects."""

    email: str


class InvitationOut(BaseModel):
    """The invitation record returned by POST /invitations."""

    id: str
    email: str
    status: str
    invited_by: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AcceptInviteRequest(BaseModel):
    """{token, password, name?} as POST /auth/accept-invite expects."""

    token: str
    password: str
    name: str | None = None


class ProjectCreate(BaseModel):
    """{name, description?} as POST /projects expects."""

    name: str
    description: str | None = None


class ProjectUpdate(BaseModel):
    """{name?, description?} as PATCH /projects/{id} expects."""

    name: str | None = None
    description: str | None = None


class ProjectOut(BaseModel):
    """The project record returned by the /projects routes."""

    id: str
    name: str
    description: str | None = None
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectSummary(BaseModel):
    """What GET /projects returns: a project plus its task counts."""

    project: ProjectOut
    task_total: int
    task_complete: int


class LabelOut(BaseModel):
    """A label, as returned by GET /labels and embedded on a task."""

    id: str
    name: str
    color: str | None = None

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    """{title, description?, owner_id?, due_date?, status?} as
    POST /projects/{id}/tasks expects."""

    title: str
    description: str | None = None
    owner_id: str | None = None
    due_date: date | None = None
    status: str | None = None


class TaskUpdate(BaseModel):
    """{title?, description?, owner_id?, due_date?, status?} as
    PATCH /tasks/{id} expects."""

    title: str | None = None
    description: str | None = None
    owner_id: str | None = None
    due_date: date | None = None
    status: str | None = None


class TaskOut(BaseModel):
    """The task record returned by the /tasks and /projects/{id}/tasks routes.

    Built explicitly by the router (never `.model_validate(task)`) because
    the wire field is `owner_id` while the ORM attribute behind it is
    `Task.assignee_id`, and because `labels` is not a column on `tasks` at
    all -- it is filled in from the `task_labels` join.
    """

    id: str
    project_id: str
    title: str
    description: str | None = None
    owner_id: str | None = None
    due_date: date | None = None
    status: str
    labels: list[LabelOut] = []
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    """{body} as POST /tasks/{id}/comments expects."""

    body: str


class CommentOut(BaseModel):
    """A comment, as returned by the /tasks/{id}/comments routes.

    `author_name` is not a column on `comments`; the router fills it in from
    the author's `User` row so a second member can see who wrote it without
    a separate lookup.
    """

    id: str
    task_id: str
    author_id: str
    author_name: str | None = None
    body: str
    created_at: datetime


class ChecklistItemCreate(BaseModel):
    """{title} as POST /tasks/{id}/checklist expects."""

    title: str


class ChecklistItemUpdate(BaseModel):
    """{is_complete} as PATCH /checklist/{id} expects."""

    is_complete: bool


class ChecklistItemOut(BaseModel):
    """The checklist item record returned by the checklist routes."""

    id: str
    task_id: str
    title: str
    is_complete: bool
    position: int

    class Config:
        from_attributes = True


class TaskLabelCreate(BaseModel):
    """{label_id} as POST /tasks/{id}/labels expects."""

    label_id: str


class TaskLabelOut(BaseModel):
    """The `task_labels` association row POST /tasks/{id}/labels returns."""

    task_id: str
    label_id: str


class TaskDetailOut(BaseModel):
    """What GET /tasks/{id} returns: the task with its comments, checklist
    and labels, per the approved spec."""

    task: TaskOut
    comments: list[CommentOut]
    checklist: list[ChecklistItemOut]
    labels: list[LabelOut]


class NotificationOut(BaseModel):
    """An in-app notification, as returned by GET /notifications."""

    id: str
    user_id: str
    type: str
    payload: dict
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True
