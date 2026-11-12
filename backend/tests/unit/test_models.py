"""Unit tests for `app.models` (the SQLAlchemy models themselves).

This ticket carries no acceptance criteria of its own, so tests pin the
contract the module's docstring and column definitions promise: generated
primary keys, the defaults each table's migration bakes in via
`server_default` (mirrored here by the Python-side `default=`), nullability,
uniqueness and foreign-key constraints, and that `__all__` really exports
every model plus `Base`.

Every test works through `db_session` (a real `SessionLocal` against the
project's own Postgres, per ENVIRONMENT.md and `tests/conftest.py`) and a
model class directly -- no `client` fixture, no `TestClient`, no HTTP. Rows
each test creates are cleaned up in a `finally` block so one test's data
never leaks into another; a test that forces an `IntegrityError` rolls the
session back immediately after so the session stays usable for its own
cleanup and for whatever runs next.

Assumption: since Postgres (not SQLite) backs these tests, foreign-key
constraints declared in the Alembic migrations are actually enforced by the
database, so the foreign-key tests below can rely on a real
`IntegrityError` rather than silently-accepted orphan rows.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Session

from app.models import (
    Base,
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


def _make_user(db_session: Session, **overrides) -> User:
    kwargs = {
        "email": f"user-{uuid.uuid4().hex[:10]}@example.com",
        "password_hash": hash_password("x"),
        "name": "A User",
        "is_admin": False,
    }
    kwargs.update(overrides)
    user = User(**kwargs)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_project(db_session: Session, created_by: str, **overrides) -> Project:
    kwargs = {"name": f"Project {uuid.uuid4().hex[:8]}", "created_by": created_by}
    kwargs.update(overrides)
    project = Project(**kwargs)
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


def _make_task(db_session: Session, project_id: str, **overrides) -> Task:
    kwargs = {"project_id": project_id, "title": f"Task {uuid.uuid4().hex[:8]}"}
    kwargs.update(overrides)
    task = Task(**kwargs)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


def test_user_id_defaults_to_a_generated_uuid_when_not_given(db_session: Session) -> None:
    user = _make_user(db_session)
    try:
        assert user.id
        # Must parse as a UUID string -- the default is `str(uuid.uuid4())`.
        uuid.UUID(user.id)
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_user_is_admin_defaults_to_false_when_not_given(db_session: Session) -> None:
    user = User(
        email=f"member-{uuid.uuid4().hex[:10]}@example.com",
        password_hash=hash_password("x"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    try:
        assert user.is_admin is False
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_user_created_at_defaults_to_now_utc(db_session: Session) -> None:
    before = datetime.now(UTC)
    user = _make_user(db_session)
    after = datetime.now(UTC)
    try:
        assert user.created_at is not None
        assert before - timedelta(seconds=5) <= user.created_at <= after + timedelta(seconds=5)
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_user_name_is_nullable(db_session: Session) -> None:
    user = _make_user(db_session, name=None)
    try:
        assert user.name is None
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_user_email_unique_constraint_raises_integrity_error_on_duplicate(
    db_session: Session,
) -> None:
    email = f"dupe-{uuid.uuid4().hex[:10]}@example.com"
    first = _make_user(db_session, email=email)
    try:
        second = User(email=email, password_hash=hash_password("y"))
        db_session.add(second)
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(User, first.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# Invitation
# ---------------------------------------------------------------------------


def test_invitation_status_defaults_to_pending(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    invitation = Invitation(
        email=f"invitee-{uuid.uuid4().hex[:10]}@example.com",
        token=uuid.uuid4().hex,
        invited_by=admin.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    try:
        assert invitation.status == "pending"
    finally:
        db_session.delete(db_session.get(Invitation, invitation.id))
        db_session.delete(db_session.get(User, admin.id))
        db_session.commit()


def test_invitation_created_at_defaults_to_now_utc(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    before = datetime.now(UTC)
    invitation = Invitation(
        email=f"invitee-{uuid.uuid4().hex[:10]}@example.com",
        token=uuid.uuid4().hex,
        invited_by=admin.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    after = datetime.now(UTC)
    lower = before - timedelta(seconds=5)
    upper = after + timedelta(seconds=5)
    try:
        assert lower <= invitation.created_at <= upper
    finally:
        db_session.delete(db_session.get(Invitation, invitation.id))
        db_session.delete(db_session.get(User, admin.id))
        db_session.commit()


def test_invitation_token_unique_constraint_raises_integrity_error_on_duplicate(
    db_session: Session,
) -> None:
    admin = _make_user(db_session, is_admin=True)
    token = uuid.uuid4().hex
    first = Invitation(
        email=f"first-{uuid.uuid4().hex[:8]}@example.com",
        token=token,
        invited_by=admin.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(first)
    db_session.commit()
    db_session.refresh(first)
    try:
        second = Invitation(
            email=f"second-{uuid.uuid4().hex[:8]}@example.com",
            token=token,
            invited_by=admin.id,
            expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        db_session.add(second)
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(Invitation, first.id))
        db_session.delete(db_session.get(User, admin.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------


def test_project_status_defaults_to_active(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    try:
        assert project.status == "active"
    finally:
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_project_created_at_and_updated_at_default_to_now_utc(db_session: Session) -> None:
    owner = _make_user(db_session)
    before = datetime.now(UTC)
    project = _make_project(db_session, created_by=owner.id)
    after = datetime.now(UTC)
    try:
        assert before - timedelta(seconds=5) <= project.created_at <= after + timedelta(seconds=5)
        assert before - timedelta(seconds=5) <= project.updated_at <= after + timedelta(seconds=5)
    finally:
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_project_description_is_nullable(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id, description=None)
    try:
        assert project.description is None
    finally:
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------


def test_task_status_defaults_to_todo(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    try:
        assert task.status == "todo"
    finally:
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_task_owner_id_and_due_date_default_to_none(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    try:
        assert task.owner_id is None
        assert task.due_date is None
    finally:
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_task_owner_id_and_due_date_are_settable(db_session: Session) -> None:
    # US-006: `owner_id`/`due_date` replaced `assignee_id` on the same
    # column, so both must round-trip through a real save and reload.
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    due = date(2026, 12, 1)
    task = _make_task(db_session, project_id=project.id, owner_id=owner.id, due_date=due)
    try:
        db_session.refresh(task)
        assert task.owner_id == owner.id
        assert task.due_date == due
    finally:
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_task_requires_an_existing_project_foreign_key(db_session: Session) -> None:
    task = Task(project_id=str(uuid.uuid4()), title="Orphan task")
    db_session.add(task)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------


def test_comment_created_at_defaults_to_now_utc(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    before = datetime.now(UTC)
    comment = Comment(task_id=task.id, author_id=owner.id, body="A comment")
    db_session.add(comment)
    db_session.commit()
    db_session.refresh(comment)
    after = datetime.now(UTC)
    try:
        assert before - timedelta(seconds=5) <= comment.created_at <= after + timedelta(seconds=5)
    finally:
        db_session.delete(db_session.get(Comment, comment.id))
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_comment_requires_an_existing_task_foreign_key(db_session: Session) -> None:
    owner = _make_user(db_session)
    comment = Comment(task_id=str(uuid.uuid4()), author_id=owner.id, body="Orphan comment")
    db_session.add(comment)
    try:
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_comment_requires_an_existing_author_foreign_key(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    comment = Comment(task_id=task.id, author_id=str(uuid.uuid4()), body="Orphan author")
    db_session.add(comment)
    try:
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# ChecklistItem
# ---------------------------------------------------------------------------


def test_checklist_item_is_complete_and_position_default(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    item = ChecklistItem(task_id=task.id, title="Step one")
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    try:
        assert item.is_complete is False
        assert item.position == 0
    finally:
        db_session.delete(db_session.get(ChecklistItem, item.id))
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_checklist_item_requires_an_existing_task_foreign_key(db_session: Session) -> None:
    item = ChecklistItem(task_id=str(uuid.uuid4()), title="Orphan step")
    db_session.add(item)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ---------------------------------------------------------------------------
# Label / TaskLabel
# ---------------------------------------------------------------------------


def test_label_color_is_nullable(db_session: Session) -> None:
    label = Label(name=f"label-{uuid.uuid4().hex[:8]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    try:
        assert label.color is None
    finally:
        db_session.delete(db_session.get(Label, label.id))
        db_session.commit()


def test_label_name_unique_constraint_raises_integrity_error_on_duplicate(
    db_session: Session,
) -> None:
    name = f"label-{uuid.uuid4().hex[:8]}"
    first = Label(name=name)
    db_session.add(first)
    db_session.commit()
    db_session.refresh(first)
    try:
        second = Label(name=name)
        db_session.add(second)
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(Label, first.id))
        db_session.commit()


def test_task_label_links_a_task_to_a_label(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    label = Label(name=f"label-{uuid.uuid4().hex[:8]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)

    link = TaskLabel(task_id=task.id, label_id=label.id)
    db_session.add(link)
    db_session.commit()
    try:
        fetched = db_session.get(TaskLabel, (task.id, label.id))
        assert fetched is not None
        assert fetched.task_id == task.id
        assert fetched.label_id == label.id
    finally:
        db_session.delete(db_session.get(TaskLabel, (task.id, label.id)))
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(Label, label.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_task_label_composite_primary_key_rejects_a_duplicate_pairing(
    db_session: Session,
) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    label = Label(name=f"label-{uuid.uuid4().hex[:8]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)

    db_session.add(TaskLabel(task_id=task.id, label_id=label.id))
    db_session.commit()
    try:
        db_session.add(TaskLabel(task_id=task.id, label_id=label.id))
        with pytest.raises(IntegrityError):
            db_session.commit()
    finally:
        db_session.rollback()
        db_session.delete(db_session.get(TaskLabel, (task.id, label.id)))
        db_session.delete(db_session.get(Task, task.id))
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(Label, label.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# Module shape
# ---------------------------------------------------------------------------


def test_all_exports_base_and_every_model_class() -> None:
    import app.models as models_module

    expected = {
        "Base",
        "ChecklistItem",
        "Comment",
        "Invitation",
        "Label",
        "Project",
        "Task",
        "TaskLabel",
        "User",
    }
    assert set(models_module.__all__) == expected
    for name in expected:
        assert hasattr(models_module, name)


def test_base_is_the_shared_declarative_base_every_model_registers_on() -> None:
    assert issubclass(Base, DeclarativeBase)
    for model in (User, Invitation, Project, Task, Comment, ChecklistItem, Label, TaskLabel):
        assert issubclass(model, Base)
    for table_name in (
        "users",
        "invitations",
        "projects",
        "tasks",
        "comments",
        "checklist_items",
        "labels",
        "task_labels",
    ):
        assert table_name in Base.metadata.tables
