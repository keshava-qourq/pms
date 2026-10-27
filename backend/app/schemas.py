"""Pydantic request and response models.

One pair per entity in the approved data model, plus the placeholder every
generated route returns until it has been implemented.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator

TASK_STATUSES = ("todo", "in_progress", "done")


class StubResponse(BaseModel):
    """What a generated route returns until someone implements it.

    A stub that returns a typed body rather than raising keeps the service
    startable and its OpenAPI document complete, so the frontend can be built
    against the agreed shape while the handlers are still being written.
    """

    endpoint: str
    status: str = "not_implemented"
    detail: str = "Scaffolded from the approved API spec; no behaviour yet."


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

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("name must not be blank")
        return value


class ProjectUpdate(BaseModel):
    """{name?, description?} as PATCH /projects/{id} expects."""

    name: str | None = None
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("name must not be blank")
        return value


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


class TaskCreate(BaseModel):
    """{title, description?, status?, owner_id?, due_date?} as POST /projects/{id}/tasks expects."""

    title: str
    description: str | None = None
    status: Literal["todo", "in_progress", "done"] | None = None
    owner_id: str | None = None
    due_date: date | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("title must not be blank")
        return value


class TaskUpdate(BaseModel):
    """{title?, description?, status?, owner_id?, due_date?} as PATCH /tasks/{id} expects."""

    title: str | None = None
    description: str | None = None
    status: Literal["todo", "in_progress", "done"] | None = None
    owner_id: str | None = None
    due_date: date | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("title must not be blank")
        return value


class TaskOut(BaseModel):
    """The task record returned by the /tasks and /projects/{id}/tasks routes."""

    id: str
    project_id: str
    title: str
    description: str | None = None
    status: str
    owner_id: str | None = None
    due_date: date | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
