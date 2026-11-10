"""Unit tests for backend/app/schemas.py.

This ticket carries no acceptance criteria, so the tests below are named for
the behaviour the module itself promises: the required/optional shape of each
request model, the `field_validator`s that reject a blank string, the
`Literal` constraint on task status, the `from_attributes` config that lets a
response model build from an ORM instance rather than only a dict, and the
`TaskOut.model_rebuild()` call that resolves the forward references to
`CommentOut`/`ChecklistItemOut`/`LabelOut`. These are exercised directly
against pydantic -- no database, no router, no client -- which is what makes
them unit tests rather than the integration tests under tests/integration/
that already cover the routes built on top of these models.

Assumption: "unit tests for schemas.py" means tests of the models' own
validation and serialization behaviour, not of any particular router's use of
them.
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

# --- StubResponse -----------------------------------------------------------


def test_stub_response_defaults_status_and_detail_and_requires_endpoint() -> None:
    stub = StubResponse(endpoint="GET /projects")

    assert stub.status == "not_implemented"
    assert stub.detail == "Scaffolded from the approved API spec; no behaviour yet."

    with pytest.raises(ValidationError):
        StubResponse()


# --- Auth --------------------------------------------------------------


def test_login_request_requires_email_and_password() -> None:
    request = LoginRequest(email="a@example.com", password="secret")
    assert request.email == "a@example.com"
    assert request.password == "secret"

    with pytest.raises(ValidationError):
        LoginRequest(email="a@example.com")
    with pytest.raises(ValidationError):
        LoginRequest(password="secret")


def test_user_out_name_is_optional_and_is_admin_required() -> None:
    user = UserOut(id="u1", email="a@example.com", is_admin=False)
    assert user.name is None

    with pytest.raises(ValidationError):
        UserOut(id="u1", email="a@example.com")


def test_user_out_builds_from_an_object_with_matching_attributes() -> None:
    class FakeUser:
        id = "u1"
        email = "a@example.com"
        name = "Ada"
        is_admin = True

    user = UserOut.model_validate(FakeUser())
    assert user.id == "u1"
    assert user.name == "Ada"
    assert user.is_admin is True


def test_login_response_defaults_token_type_to_bearer() -> None:
    response = LoginResponse(
        access_token="jwt-token",
        user=UserOut(id="u1", email="a@example.com", is_admin=False),
    )
    assert response.token_type == "bearer"


def test_accept_invite_request_name_is_optional() -> None:
    request = AcceptInviteRequest(token="tok", password="secret")
    assert request.name is None

    request = AcceptInviteRequest(token="tok", password="secret", name="Ada")
    assert request.name == "Ada"


# --- Invitations ------------------------------------------------------------


def test_invitation_create_requires_email() -> None:
    assert InvitationCreate(email="a@example.com").email == "a@example.com"
    with pytest.raises(ValidationError):
        InvitationCreate()


def test_invitation_out_requires_all_its_fields() -> None:
    invitation = InvitationOut(
        id="i1",
        email="a@example.com",
        status="pending",
        invited_by="u1",
        expires_at=datetime(2026, 1, 1),
        created_at=datetime(2025, 1, 1),
    )
    assert invitation.status == "pending"

    with pytest.raises(ValidationError):
        InvitationOut(
            id="i1",
            email="a@example.com",
            status="pending",
            invited_by="u1",
            created_at=datetime(2025, 1, 1),
        )


# --- Projects ---------------------------------------------------------------


def test_project_create_rejects_a_blank_or_whitespace_only_name() -> None:
    assert ProjectCreate(name="Launch").name == "Launch"

    with pytest.raises(ValidationError):
        ProjectCreate(name="")
    with pytest.raises(ValidationError):
        ProjectCreate(name="   ")


def test_project_create_description_is_optional() -> None:
    project = ProjectCreate(name="Launch")
    assert project.description is None


def test_project_update_allows_all_fields_omitted_but_rejects_blank_name() -> None:
    update = ProjectUpdate()
    assert update.name is None
    assert update.description is None

    with pytest.raises(ValidationError):
        ProjectUpdate(name="   ")

    # A name that is present and non-blank still passes.
    assert ProjectUpdate(name="Renamed").name == "Renamed"


def test_project_out_builds_from_attributes() -> None:
    class FakeProject:
        id = "p1"
        name = "Launch"
        description = None
        status = "active"
        created_by = "u1"
        created_at = datetime(2025, 1, 1)
        updated_at = datetime(2025, 1, 2)

    project = ProjectOut.model_validate(FakeProject())
    assert project.status == "active"


def test_project_summary_bundles_a_project_with_task_counts() -> None:
    project = ProjectOut(
        id="p1",
        name="Launch",
        status="active",
        created_by="u1",
        created_at=datetime(2025, 1, 1),
        updated_at=datetime(2025, 1, 2),
    )
    summary = ProjectSummary(project=project, task_total=4, task_complete=1)
    assert summary.task_total == 4
    assert summary.task_complete == 1


# --- Tasks -------------------------------------------------------------


def test_task_create_rejects_a_blank_title() -> None:
    assert TaskCreate(title="Write tests").title == "Write tests"

    with pytest.raises(ValidationError):
        TaskCreate(title="")
    with pytest.raises(ValidationError):
        TaskCreate(title="   ")


def test_task_create_restricts_status_to_the_known_literal_values() -> None:
    assert TaskCreate(title="A task", status="in_progress").status == "in_progress"

    with pytest.raises(ValidationError):
        TaskCreate(title="A task", status="bogus")


def test_task_create_accepts_an_iso_due_date() -> None:
    task = TaskCreate(title="A task", due_date="2026-03-01")
    assert task.due_date == date(2026, 3, 1)


def test_task_update_allows_every_field_to_be_omitted() -> None:
    update = TaskUpdate()
    assert update.title is None
    assert update.status is None
    assert update.owner_id is None
    assert update.due_date is None

    with pytest.raises(ValidationError):
        TaskUpdate(title="   ")

    with pytest.raises(ValidationError):
        TaskUpdate(status="bogus")


def test_task_out_defaults_nested_collections_to_empty_and_counts_to_zero() -> None:
    task = TaskOut(
        id="t1",
        project_id="p1",
        title="A task",
        status="todo",
        created_at=datetime(2025, 1, 1),
        updated_at=datetime(2025, 1, 2),
    )
    assert task.comments == []
    assert task.checklist == []
    assert task.labels == []
    assert task.checklist_total == 0
    assert task.checklist_complete == 0


def test_task_out_forward_references_were_resolved_by_model_rebuild() -> None:
    # If TaskOut.model_rebuild() had not been called, or the forward refs did
    # not resolve, building a TaskOut with nested comment/checklist/label
    # payloads would raise instead of validating them into real objects.
    task = TaskOut(
        id="t1",
        project_id="p1",
        title="A task",
        status="todo",
        created_at=datetime(2025, 1, 1),
        updated_at=datetime(2025, 1, 2),
        comments=[
            {
                "id": "c1",
                "task_id": "t1",
                "author_id": "u1",
                "body": "hi",
                "created_at": datetime(2025, 1, 1),
            }
        ],
        checklist=[
            {
                "id": "ci1",
                "task_id": "t1",
                "title": "step 1",
                "is_complete": False,
                "position": 0,
            }
        ],
        labels=[{"id": "l1", "name": "bug"}],
    )

    assert isinstance(task.comments[0], CommentOut)
    assert isinstance(task.checklist[0], ChecklistItemOut)
    assert isinstance(task.labels[0], LabelOut)
    assert task.comments[0].body == "hi"


# --- Comments ----------------------------------------------------------


def test_comment_create_rejects_a_blank_body() -> None:
    assert CommentCreate(body="Looks good").body == "Looks good"

    with pytest.raises(ValidationError):
        CommentCreate(body="")
    with pytest.raises(ValidationError):
        CommentCreate(body="   ")


def test_comment_out_author_name_is_optional() -> None:
    comment = CommentOut(
        id="c1",
        task_id="t1",
        author_id="u1",
        body="hi",
        created_at=datetime(2025, 1, 1),
    )
    assert comment.author_name is None


# --- Checklist items ------------------------------------------------------


def test_checklist_item_create_rejects_a_blank_title() -> None:
    assert ChecklistItemCreate(title="Step 1").title == "Step 1"

    with pytest.raises(ValidationError):
        ChecklistItemCreate(title="")
    with pytest.raises(ValidationError):
        ChecklistItemCreate(title="   ")


def test_checklist_item_update_requires_is_complete() -> None:
    assert ChecklistItemUpdate(is_complete=True).is_complete is True
    with pytest.raises(ValidationError):
        ChecklistItemUpdate()


# --- Labels --------------------------------------------------------------


def test_label_attach_requires_label_id() -> None:
    assert LabelAttach(label_id="l1").label_id == "l1"
    with pytest.raises(ValidationError):
        LabelAttach()


def test_label_out_color_is_optional() -> None:
    label = LabelOut(id="l1", name="bug")
    assert label.color is None
