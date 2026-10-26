"""Pydantic request and response models.

One pair per entity in the approved data model, plus the placeholder every
generated route returns until it has been implemented.
"""

from datetime import datetime

from pydantic import BaseModel


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
