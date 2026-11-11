"""Unit tests for `app.models` (no acceptance criteria of its own).

Each model is exercised directly through `db_session` against the real,
migrated schema (see `conftest.py`) -- no `client` fixture, no `TestClient`.
These tests prove what the module docstring promises: a python-side default
(a uuid4 id, a `created_at`, a `status`), a column that is optional versus
one the database will reject when missing, and a constraint (uniqueness, a
foreign key, a composite primary key) that the migrations in
`backend/alembic/versions/` actually put in place. This ticket carries no
acceptance criteria, so tests are named after the behaviour they cover
rather than an AC id.

Every row created here is deleted again before the test returns: the
database is shared with every other test in this suite.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import (
    ChecklistItem,
    Comment,
    Invitation,
    Label,
    Project,
    Task,
    TaskLabel,
    User,
)
from app.security import hash_password


def _unique_email(prefix: str = "model-test") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@example.com"


def _make_invitation(**overrides) -> Invitation:
    defaults = {
        "email": _unique_email("invite"),
        "token": uuid.uuid4().hex,
        "invited_by": str(uuid.uuid4()),
        "expires_at": datetime.now(UTC) + timedelta(days=7),
    }
    defaults.update(overrides)
    return Invitation(**defaults)


def _make_project(**overrides) -> Project:
    defaults = {"name": "Test Project", "created_by": str(uuid.uuid4())}
    defaults.update(overrides)
    return Project(**defaults)


# ---------------------------------------------------------------------------
# table names (sanity: every model maps to the table its migration created)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("model", "table_name"),
    [
        (User, "users"),
        (Invitation, "invitations"),
        (Project, "projects"),
        (Task, "tasks"),
        (Comment, "comments"),
        (ChecklistItem, "checklist_items"),
        (Label, "labels"),
        (TaskLabel, "task_labels"),
    ],
)
def test_model_maps_to_the_expected_table_name(model, table_name) -> None:
    assert model.__tablename__ == table_name


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


def test_user_id_defaults_to_a_distinct_uuid4_string(db_session) -> None:
    one = User(email=_unique_email(), password_hash=hash_password("x"))
    other = User(email=_unique_email(), password_hash=hash_password("x"))
    db_session.add_all([one, other])
    db_session.commit()
    try:
        assert uuid.UUID(one.id).version == 4
        assert uuid.UUID(other.id).version == 4
        assert one.id != other.id
    finally:
        db_session.delete(one)
        db_session.delete(other)
        db_session.commit()


def test_user_is_admin_defaults_to_false(db_session) -> None:
    user = User(email=_unique_email(), password_hash=hash_password("x"))
    db_session.add(user)
    db_session.commit()
    try:
        assert user.is_admin is False
    finally:
        db_session.delete(user)
        db_session.commit()


def test_user_created_at_defaults_to_now_in_utc(db_session) -> None:
    before = datetime.now(UTC)
    user = User(email=_unique_email(), password_hash=hash_password("x"))
    db_session.add(user)
    db_session.commit()
    try:
        after = datetime.now(UTC)
        assert before <= user.created_at <= after
    finally:
        db_session.delete(user)
        db_session.commit()


def test_user_email_must_be_unique(db_session) -> None:
    email = _unique_email()
    first = User(email=email, password_hash=hash_password("x"))
    db_session.add(first)
    db_session.commit()

    second = User(email=email, password_hash=hash_password("y"))
    db_session.add(second)
    try:
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(User, first.id))
        db_session.commit()


def test_user_password_hash_is_required(db_session) -> None:
    user = User(email=_unique_email(), password_hash=None)
    db_session.add(user)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ---------------------------------------------------------------------------
# Invitation
# ---------------------------------------------------------------------------


def test_invitation_status_defaults_to_pending(db_session) -> None:
    invitation = _make_invitation()
    db_session.add(invitation)
    db_session.commit()
    try:
        assert invitation.status == "pending"
    finally:
        db_session.delete(invitation)
        db_session.commit()


def test_invitation_token_must_be_unique(db_session) -> None:
    token = uuid.uuid4().hex
    first = _make_invitation(token=token)
    db_session.add(first)
    db_session.commit()

    second = _make_invitation(token=token)
    db_session.add(second)
    try:
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(Invitation, first.id))
        db_session.commit()


def test_invitation_expires_at_is_required(db_session) -> None:
    invitation = _make_invitation(expires_at=None)
    db_session.add(invitation)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_only_one_pending_invitation_per_email(db_session) -> None:
    # A migration-level partial unique index (status = 'pending') backs the
    # module docstring's "invite a new member by email" flow: re-inviting an
    # address that already has a pending invite must fail at the database,
    # not just in application code, so a stale invite can never shadow a
    # fresh one.
    email = _unique_email("invite")
    first = _make_invitation(email=email)
    db_session.add(first)
    db_session.commit()

    second = _make_invitation(email=email)
    db_session.add(second)
    try:
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(Invitation, first.id))
        db_session.commit()


def test_a_second_invitation_to_the_same_email_is_fine_once_the_first_is_no_longer_pending(
    db_session,
) -> None:
    email = _unique_email("invite")
    accepted = _make_invitation(email=email, status="accepted")
    db_session.add(accepted)
    db_session.commit()

    new_invite = _make_invitation(email=email)
    db_session.add(new_invite)
    db_session.commit()
    try:
        assert new_invite.status == "pending"
    finally:
        db_session.delete(accepted)
        db_session.delete(new_invite)
        db_session.commit()


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------


def test_project_status_defaults_to_active(db_session) -> None:
    project = _make_project()
    db_session.add(project)
    db_session.commit()
    try:
        assert project.status == "active"
    finally:
        db_session.delete(project)
        db_session.commit()


def test_project_created_by_is_required(db_session) -> None:
    project = Project(name="No owner", created_by=None)
    db_session.add(project)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------


def test_task_status_defaults_to_todo_and_owner_due_date_are_optional(db_session) -> None:
    project = _make_project()
    db_session.add(project)
    db_session.commit()
    task = Task(project_id=project.id, title="Do a thing")
    db_session.add(task)
    db_session.commit()
    try:
        assert task.status == "todo"
        assert task.owner_id is None
        assert task.due_date is None
    finally:
        db_session.delete(task)
        db_session.delete(project)
        db_session.commit()


def test_task_owner_id_and_due_date_round_trip(db_session) -> None:
    # US-006: owner_id/due_date were migrated onto tasks (from the original
    # assignee_id column) rather than added as a second table, so a task can
    # carry both at once and read them back unchanged.
    project = _make_project()
    db_session.add(project)
    db_session.commit()
    owner_id = str(uuid.uuid4())
    due = date(2026, 12, 1)
    task = Task(project_id=project.id, title="Owned task", owner_id=owner_id, due_date=due)
    db_session.add(task)
    db_session.commit()
    db_session.expire_all()
    fetched = db_session.get(Task, task.id)
    try:
        assert fetched.owner_id == owner_id
        assert fetched.due_date == due
    finally:
        db_session.delete(fetched)
        db_session.delete(project)
        db_session.commit()


def test_task_project_id_must_reference_an_existing_project(db_session) -> None:
    task = Task(project_id=str(uuid.uuid4()), title="Orphan task")
    db_session.add(task)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_task_title_is_required(db_session) -> None:
    project = _make_project()
    db_session.add(project)
    db_session.commit()
    try:
        task = Task(project_id=project.id, title=None)
        db_session.add(task)
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()
    finally:
        db_session.delete(db_session.get(Project, project.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------


def test_comment_requires_an_existing_task_and_author(db_session) -> None:
    user = User(email=_unique_email(), password_hash=hash_password("x"))
    db_session.add(user)
    db_session.commit()
    try:
        comment = Comment(task_id=str(uuid.uuid4()), author_id=user.id, body="hi")
        db_session.add(comment)
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_comment_body_is_required(db_session) -> None:
    project = _make_project()
    db_session.add(project)
    db_session.commit()
    task = Task(project_id=project.id, title="Commented-on task")
    db_session.add(task)
    db_session.commit()
    user = User(email=_unique_email(), password_hash=hash_password("x"))
    db_session.add(user)
    db_session.commit()
    try:
        comment = Comment(task_id=task.id, author_id=user.id, body=None)
        db_session.add(comment)
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# ChecklistItem
# ---------------------------------------------------------------------------


def test_checklist_item_defaults_incomplete_at_position_zero(db_session) -> None:
    project = _make_project()
    db_session.add(project)
    db_session.commit()
    task = Task(project_id=project.id, title="Checklist host")
    db_session.add(task)
    db_session.commit()
    item = ChecklistItem(task_id=task.id, title="Step one")
    db_session.add(item)
    db_session.commit()
    try:
        assert item.is_complete is False
        assert item.position == 0
    finally:
        db_session.delete(item)
        db_session.delete(task)
        db_session.delete(project)
        db_session.commit()


def test_checklist_item_requires_an_existing_task(db_session) -> None:
    item = ChecklistItem(task_id=str(uuid.uuid4()), title="Orphan step")
    db_session.add(item)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ---------------------------------------------------------------------------
# Label
# ---------------------------------------------------------------------------


def test_label_name_must_be_unique(db_session) -> None:
    name = f"label-{uuid.uuid4().hex[:10]}"
    first = Label(name=name)
    db_session.add(first)
    db_session.commit()

    second = Label(name=name)
    db_session.add(second)
    try:
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(Label, first.id))
        db_session.commit()


def test_label_color_is_optional(db_session) -> None:
    label = Label(name=f"label-{uuid.uuid4().hex[:10]}")
    db_session.add(label)
    db_session.commit()
    try:
        assert label.color is None
    finally:
        db_session.delete(label)
        db_session.commit()


# ---------------------------------------------------------------------------
# TaskLabel
# ---------------------------------------------------------------------------


def test_task_label_composite_primary_key_rejects_duplicates(db_session) -> None:
    project = _make_project()
    db_session.add(project)
    db_session.commit()
    task = Task(project_id=project.id, title="Labelled task")
    label = Label(name=f"label-{uuid.uuid4().hex[:10]}")
    db_session.add_all([task, label])
    db_session.commit()

    link = TaskLabel(task_id=task.id, label_id=label.id)
    db_session.add(link)
    db_session.commit()

    duplicate = TaskLabel(task_id=task.id, label_id=label.id)
    db_session.add(duplicate)
    try:
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.query(TaskLabel).filter_by(task_id=task.id, label_id=label.id).delete()
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Label, label.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.commit()


def test_task_label_requires_an_existing_task_and_label(db_session) -> None:
    link = TaskLabel(task_id=str(uuid.uuid4()), label_id=str(uuid.uuid4()))
    db_session.add(link)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
