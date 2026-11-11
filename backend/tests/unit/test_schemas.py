"""Unit tests for `app.schemas` (no acceptance criteria of its own).

Each Pydantic model is built directly -- no `client` fixture, no
`TestClient` -- so these prove exactly what `schemas.py` promises: a field
that is required versus one that is optional with the right default, a
`@field_validator` that rejects a blank string, a `Literal` that rejects a
status outside its three values, and `Config.from_attributes = True`
letting the `*Out` models be built from an ORM-style object (the shape every
router in `app/routers/backend.py` relies on when it returns
`ProjectOut.model_validate(project)`-style objects). This ticket carries no
acceptance criteria, so tests are named after the behaviour they cover
rather than an AC id.
"""

from datetime import date, datetime

import pytest
from pydantic import ValidationError

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


class _Row:
    """A bare object standing in for a SQLAlchemy model instance.

    `from_attributes = True` reads fields off arbitrary attributes, not off
    a dict, so these tests build plain objects rather than passing a dict
    straight to the constructor -- that would pass even without the config
    enabled, and would prove nothing about it.
    """

    def __init__(self, **attrs):
        for key, value in attrs.items():
            setattr(self, key, value)


# ---------------------------------------------------------------------------
# StubResponse
# ---------------------------------------------------------------------------


def test_stub_response_defaults_status_and_detail() -> None:
    stub = StubResponse(endpoint="GET /widgets")
    assert stub.status == "not_implemented"
    assert stub.detail == "Scaffolded from the approved API spec; no behaviour yet."


def test_stub_response_requires_endpoint() -> None:
    with pytest.raises(ValidationError):
        StubResponse()


# ---------------------------------------------------------------------------
# LoginRequest / LoginResponse / UserOut
# ---------------------------------------------------------------------------


def test_login_request_requires_email_and_password() -> None:
    with pytest.raises(ValidationError):
        LoginRequest(email="only@example.com")


def test_login_request_accepts_email_and_password() -> None:
    login = LoginRequest(email="a@example.com", password="secret")
    assert login.email == "a@example.com"
    assert login.password == "secret"


def test_user_out_builds_from_an_orm_style_object_via_from_attributes() -> None:
    row = _Row(id="u-1", email="a@example.com", name="Ada", is_admin=True)
    user = UserOut.model_validate(row)
    assert user.id == "u-1"
    assert user.is_admin is True


def test_user_out_name_is_optional_and_defaults_to_none() -> None:
    user = UserOut(id="u-1", email="a@example.com", is_admin=False)
    assert user.name is None


def test_login_response_defaults_token_type_to_bearer() -> None:
    user = UserOut(id="u-1", email="a@example.com", is_admin=False)
    response = LoginResponse(access_token="a-token", user=user)
    assert response.token_type == "bearer"


# ---------------------------------------------------------------------------
# InvitationCreate / InvitationOut / AcceptInviteRequest
# ---------------------------------------------------------------------------


def test_invitation_create_requires_email() -> None:
    with pytest.raises(ValidationError):
        InvitationCreate()


def test_invitation_out_builds_from_an_orm_style_object() -> None:
    row = _Row(
        id="i-1",
        email="invitee@example.com",
        status="pending",
        invited_by="u-1",
        expires_at=datetime(2026, 12, 1),
        created_at=datetime(2026, 11, 1),
    )
    invitation = InvitationOut.model_validate(row)
    assert invitation.status == "pending"
    assert invitation.expires_at == datetime(2026, 12, 1)


def test_accept_invite_request_name_is_optional() -> None:
    accept = AcceptInviteRequest(token="tok", password="pw")
    assert accept.name is None


def test_accept_invite_request_requires_token_and_password() -> None:
    with pytest.raises(ValidationError):
        AcceptInviteRequest(password="pw")


# ---------------------------------------------------------------------------
# ProjectCreate / ProjectUpdate (blank-name validator)
# ---------------------------------------------------------------------------


def test_project_create_description_defaults_to_none() -> None:
    project = ProjectCreate(name="Launch plan")
    assert project.description is None


def test_project_create_rejects_a_blank_name() -> None:
    with pytest.raises(ValidationError):
        ProjectCreate(name="   ")


def test_project_create_rejects_an_empty_name() -> None:
    with pytest.raises(ValidationError):
        ProjectCreate(name="")


def test_project_create_requires_name() -> None:
    with pytest.raises(ValidationError):
        ProjectCreate()


def test_project_update_allows_every_field_to_be_omitted() -> None:
    update = ProjectUpdate()
    assert update.name is None
    assert update.description is None


def test_project_update_rejects_a_blank_name_when_one_is_given() -> None:
    with pytest.raises(ValidationError):
        ProjectUpdate(name="   ")


def test_project_update_accepts_a_real_name() -> None:
    update = ProjectUpdate(name="Renamed")
    assert update.name == "Renamed"


def test_project_out_builds_from_an_orm_style_object() -> None:
    row = _Row(
        id="p-1",
        name="A project",
        description=None,
        status="active",
        created_by="u-1",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 2),
    )
    project = ProjectOut.model_validate(row)
    assert project.status == "active"
    assert project.description is None


def test_project_summary_bundles_project_and_task_counts() -> None:
    project = ProjectOut(
        id="p-1",
        name="A project",
        status="active",
        created_by="u-1",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )
    summary = ProjectSummary(project=project, task_total=4, task_complete=1)
    assert summary.task_total == 4
    assert summary.task_complete == 1


# ---------------------------------------------------------------------------
# TaskCreate / TaskUpdate (blank-title validator, status Literal)
# ---------------------------------------------------------------------------


def test_task_create_requires_only_title() -> None:
    task = TaskCreate(title="Do the thing")
    assert task.description is None
    assert task.status is None
    assert task.owner_id is None
    assert task.due_date is None


def test_task_create_rejects_a_blank_title() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(title="   ")


def test_task_create_rejects_a_status_outside_the_allowed_literal() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(title="A task", status="archived")


@pytest.mark.parametrize("status", ["todo", "in_progress", "done"])
def test_task_create_accepts_each_allowed_status(status: str) -> None:
    task = TaskCreate(title="A task", status=status)
    assert task.status == status


def test_task_create_parses_an_iso_due_date_string() -> None:
    task = TaskCreate(title="A task", due_date="2026-12-25")
    assert task.due_date == date(2026, 12, 25)


def test_task_update_allows_every_field_to_be_omitted() -> None:
    update = TaskUpdate()
    assert update.title is None
    assert update.status is None


def test_task_update_rejects_a_blank_title_when_one_is_given() -> None:
    with pytest.raises(ValidationError):
        TaskUpdate(title="   ")


def test_task_update_rejects_a_status_outside_the_allowed_literal() -> None:
    with pytest.raises(ValidationError):
        TaskUpdate(status="cancelled")


def test_task_out_builds_from_an_orm_style_object_with_nested_defaults() -> None:
    row = _Row(
        id="t-1",
        project_id="p-1",
        title="A task",
        description=None,
        status="todo",
        owner_id=None,
        due_date=None,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )
    task = TaskOut.model_validate(row)
    assert task.comments == []
    assert task.checklist == []
    assert task.labels == []
    assert task.checklist_total == 0
    assert task.checklist_complete == 0


# ---------------------------------------------------------------------------
# CommentCreate / CommentOut
# ---------------------------------------------------------------------------


def test_comment_create_rejects_a_blank_body() -> None:
    with pytest.raises(ValidationError):
        CommentCreate(body="   ")


def test_comment_create_accepts_a_real_body() -> None:
    comment = CommentCreate(body="Looks good to me.")
    assert comment.body == "Looks good to me."


def test_comment_out_author_name_defaults_to_none() -> None:
    comment = CommentOut(
        id="c-1",
        task_id="t-1",
        author_id="u-1",
        body="hi",
        created_at=datetime(2026, 1, 1),
    )
    assert comment.author_name is None


# ---------------------------------------------------------------------------
# ChecklistItemCreate / ChecklistItemUpdate / ChecklistItemOut
# ---------------------------------------------------------------------------


def test_checklist_item_create_rejects_a_blank_title() -> None:
    with pytest.raises(ValidationError):
        ChecklistItemCreate(title="")


def test_checklist_item_update_requires_is_complete() -> None:
    with pytest.raises(ValidationError):
        ChecklistItemUpdate()


def test_checklist_item_update_accepts_a_boolean() -> None:
    update = ChecklistItemUpdate(is_complete=True)
    assert update.is_complete is True


def test_checklist_item_out_builds_from_an_orm_style_object() -> None:
    row = _Row(id="ci-1", task_id="t-1", title="Step one", is_complete=False, position=0)
    item = ChecklistItemOut.model_validate(row)
    assert item.is_complete is False
    assert item.position == 0


# ---------------------------------------------------------------------------
# LabelAttach / LabelOut
# ---------------------------------------------------------------------------


def test_label_attach_requires_label_id() -> None:
    with pytest.raises(ValidationError):
        LabelAttach()


def test_label_out_color_is_optional() -> None:
    label = LabelOut(id="l-1", name="urgent")
    assert label.color is None
