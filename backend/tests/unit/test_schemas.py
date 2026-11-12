"""Unit tests for `app/schemas.py` -- one model at a time, no DB, no HTTP.

This ticket carries no acceptance criteria of its own: it asks for unit
tests of the Pydantic request/response models themselves. Every model here
is built in memory and inspected directly or driven to raise
`pydantic.ValidationError`; nothing imports `TestClient` or the `client`
fixture, and nothing touches the database -- the models that reference a
"real" record (`UserOut`, `ProjectOut`, ...) are exercised with a small
in-memory stand-in object plus `from_attributes`, not an ORM row.

Focus: the blank/whitespace validators each `*Create`/`*Update` model adds
on top of Pydantic's own type checking (these are the only behaviour this
module adds; everything else is declarative shape), the `Literal` status
constraints on `TaskCreate`/`TaskUpdate`, defaults (`StubResponse`,
`LoginResponse.token_type`, `TaskOut`'s empty-list/zero defaults), optional
fields genuinely being optional, and that `from_attributes` lets every
`*Out` model build straight from an object with matching attributes -- the
shape every ORM row passed to `model_validate` actually has.
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
    """A plain object standing in for an ORM row: attributes only, no ORM."""

    def __init__(self, **attrs):
        for key, value in attrs.items():
            setattr(self, key, value)


# ---------------------------------------------------------------------------
# StubResponse
# ---------------------------------------------------------------------------


def test_stub_response_defaults_status_and_detail_when_only_endpoint_is_given() -> None:
    stub = StubResponse(endpoint="GET /widgets")
    assert stub.endpoint == "GET /widgets"
    assert stub.status == "not_implemented"
    assert stub.detail == "Scaffolded from the approved API spec; no behaviour yet."


def test_stub_response_requires_endpoint() -> None:
    with pytest.raises(ValidationError):
        StubResponse()


# ---------------------------------------------------------------------------
# LoginRequest / LoginResponse / UserOut
# ---------------------------------------------------------------------------


def test_login_request_requires_both_email_and_password() -> None:
    with pytest.raises(ValidationError):
        LoginRequest(email="member@example.com")
    with pytest.raises(ValidationError):
        LoginRequest(password="secret")


def test_user_out_builds_from_an_arbitrary_object_via_from_attributes() -> None:
    row = _Row(id="u1", email="member@example.com", name=None, is_admin=True)
    user_out = UserOut.model_validate(row)
    assert user_out.id == "u1"
    assert user_out.name is None
    assert user_out.is_admin is True


def test_login_response_defaults_token_type_to_bearer_and_nests_the_user() -> None:
    user = UserOut(id="u1", email="member@example.com", is_admin=False)
    response = LoginResponse(access_token="a-token", user=user)
    assert response.token_type == "bearer"
    assert response.user.email == "member@example.com"


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------


def test_invitation_create_requires_email() -> None:
    with pytest.raises(ValidationError):
        InvitationCreate()


def test_invitation_out_builds_from_an_arbitrary_object_via_from_attributes() -> None:
    row = _Row(
        id="inv1",
        email="invitee@example.com",
        status="pending",
        invited_by="u1",
        expires_at=datetime(2026, 12, 1),
        created_at=datetime(2026, 11, 1),
    )
    invitation_out = InvitationOut.model_validate(row)
    assert invitation_out.status == "pending"
    assert invitation_out.invited_by == "u1"


def test_accept_invite_request_name_is_optional() -> None:
    accept = AcceptInviteRequest(token="tok", password="pw")
    assert accept.name is None
    accept_named = AcceptInviteRequest(token="tok", password="pw", name="New Member")
    assert accept_named.name == "New Member"


# ---------------------------------------------------------------------------
# ProjectCreate / ProjectUpdate blank-name validators
# ---------------------------------------------------------------------------


def test_project_create_accepts_a_real_name_with_no_description() -> None:
    project = ProjectCreate(name="Launch Plan")
    assert project.name == "Launch Plan"
    assert project.description is None


@pytest.mark.parametrize("blank", ["", "   ", "\t\n"])
def test_project_create_rejects_a_blank_or_whitespace_only_name(blank: str) -> None:
    with pytest.raises(ValidationError):
        ProjectCreate(name=blank)


def test_project_update_allows_name_to_be_omitted_entirely() -> None:
    update = ProjectUpdate(description="New description")
    assert update.name is None


@pytest.mark.parametrize("blank", ["", "   "])
def test_project_update_rejects_a_blank_name_when_one_is_given(blank: str) -> None:
    with pytest.raises(ValidationError):
        ProjectUpdate(name=blank)


def test_project_out_builds_from_an_arbitrary_object_via_from_attributes() -> None:
    row = _Row(
        id="p1",
        name="A project",
        description=None,
        status="active",
        created_by="u1",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 2),
    )
    project_out = ProjectOut.model_validate(row)
    assert project_out.status == "active"
    assert project_out.description is None


def test_project_summary_bundles_a_project_with_its_task_counts() -> None:
    project = ProjectOut(
        id="p1",
        name="A project",
        status="active",
        created_by="u1",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 2),
    )
    summary = ProjectSummary(project=project, task_total=3, task_complete=1)
    assert summary.task_total == 3
    assert summary.task_complete == 1


# ---------------------------------------------------------------------------
# TaskCreate / TaskUpdate: blank-title validator, status Literal, due_date
# ---------------------------------------------------------------------------


def test_task_create_requires_only_title_and_defaults_the_rest_to_none() -> None:
    task = TaskCreate(title="Write the report")
    assert task.description is None
    assert task.status is None
    assert task.owner_id is None
    assert task.due_date is None


@pytest.mark.parametrize("blank", ["", "   "])
def test_task_create_rejects_a_blank_or_whitespace_only_title(blank: str) -> None:
    with pytest.raises(ValidationError):
        TaskCreate(title=blank)


@pytest.mark.parametrize("status", ["todo", "in_progress", "done"])
def test_task_create_accepts_each_allowed_status(status: str) -> None:
    task = TaskCreate(title="A task", status=status)
    assert task.status == status


def test_task_create_rejects_a_status_outside_the_allowed_literal() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(title="A task", status="archived")


def test_task_create_parses_an_iso_date_string_for_due_date() -> None:
    task = TaskCreate(title="A task", due_date="2026-12-25")
    assert task.due_date == date(2026, 12, 25)


def test_task_update_title_is_optional_but_rejects_blank_when_given() -> None:
    update = TaskUpdate(status="done")
    assert update.title is None
    with pytest.raises(ValidationError):
        TaskUpdate(title="   ")


def test_task_update_rejects_a_status_outside_the_allowed_literal() -> None:
    with pytest.raises(ValidationError):
        TaskUpdate(status="blocked")


# ---------------------------------------------------------------------------
# TaskOut: nested defaults and forward-ref rebuild (model_rebuild)
# ---------------------------------------------------------------------------


def test_task_out_defaults_comments_checklist_labels_and_counts_when_omitted() -> None:
    task_out = TaskOut(
        id="t1",
        project_id="p1",
        title="A task",
        status="todo",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )
    assert task_out.comments == []
    assert task_out.checklist == []
    assert task_out.labels == []
    assert task_out.checklist_total == 0
    assert task_out.checklist_complete == 0


def test_task_out_accepts_nested_comment_checklist_and_label_payloads() -> None:
    # Exercises the forward references (`CommentOut`, `ChecklistItemOut`,
    # `LabelOut`) that `TaskOut.model_rebuild()` resolves at import time --
    # if the rebuild were missing or wrong this would raise instead.
    task_out = TaskOut(
        id="t1",
        project_id="p1",
        title="A task",
        status="todo",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
        comments=[
            {
                "id": "c1",
                "task_id": "t1",
                "author_id": "u1",
                "body": "Hello",
                "created_at": datetime(2026, 1, 1),
            }
        ],
        checklist=[
            {"id": "ci1", "task_id": "t1", "title": "Step", "is_complete": False, "position": 0}
        ],
        labels=[{"id": "l1", "name": "Urgent"}],
    )
    assert task_out.comments[0].body == "Hello"
    assert task_out.checklist[0].title == "Step"
    assert task_out.labels[0].name == "Urgent"


def test_task_out_builds_from_an_arbitrary_object_via_from_attributes() -> None:
    row = _Row(
        id="t1",
        project_id="p1",
        title="A task",
        description=None,
        status="todo",
        owner_id=None,
        due_date=None,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
        comments=[],
        checklist=[],
        labels=[],
        checklist_total=0,
        checklist_complete=0,
    )
    task_out = TaskOut.model_validate(row)
    assert task_out.id == "t1"
    assert task_out.comments == []


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("blank", ["", "   "])
def test_comment_create_rejects_a_blank_or_whitespace_only_body(blank: str) -> None:
    with pytest.raises(ValidationError):
        CommentCreate(body=blank)


def test_comment_create_accepts_a_real_body() -> None:
    comment = CommentCreate(body="Looks good to me")
    assert comment.body == "Looks good to me"


def test_comment_out_author_name_is_optional() -> None:
    # AC-024: the author's display name rides along on the comment, but a
    # comment whose author row cannot be resolved must still validate.
    comment_out = CommentOut(
        id="c1",
        task_id="t1",
        author_id="u1",
        body="Hello",
        created_at=datetime(2026, 1, 1),
    )
    assert comment_out.author_name is None


# ---------------------------------------------------------------------------
# Checklist items
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("blank", ["", "   "])
def test_checklist_item_create_rejects_a_blank_or_whitespace_only_title(blank: str) -> None:
    with pytest.raises(ValidationError):
        ChecklistItemCreate(title=blank)


def test_checklist_item_update_requires_is_complete() -> None:
    with pytest.raises(ValidationError):
        ChecklistItemUpdate()
    update = ChecklistItemUpdate(is_complete=True)
    assert update.is_complete is True


def test_checklist_item_out_builds_from_an_arbitrary_object_via_from_attributes() -> None:
    row = _Row(id="ci1", task_id="t1", title="Step", is_complete=False, position=2)
    item_out = ChecklistItemOut.model_validate(row)
    assert item_out.position == 2
    assert item_out.is_complete is False


# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------


def test_label_attach_requires_label_id() -> None:
    with pytest.raises(ValidationError):
        LabelAttach()
    attach = LabelAttach(label_id="l1")
    assert attach.label_id == "l1"


def test_label_out_color_is_optional() -> None:
    label_out = LabelOut(id="l1", name="Urgent")
    assert label_out.color is None
    row = _Row(id="l2", name="Backend", color="#00FF00")
    label_out_from_row = LabelOut.model_validate(row)
    assert label_out_from_row.color == "#00FF00"
