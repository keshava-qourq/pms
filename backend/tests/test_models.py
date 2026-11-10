"""Unit tests for backend/app/models.py.

This ticket carries no acceptance criteria, so the tests below are named for
the behaviour the module's own docstring and column definitions promise: the
default a column gets when a caller does not set one, and the constraints
(uniqueness, not-null, foreign key, composite primary key) the Alembic
migrations in backend/alembic/versions/ declare for it. They run against the
real PostgreSQL the session-scoped fixture in tests/conftest.py migrates, not
a mock or an in-memory substitute, so a dropped `unique=True`, a foreign key
that stopped being declared, or a default that silently changed would turn a
test here red without needing a router or a service to go through.

Assumption: "unit tests for models.py" means tests of what the ORM mapping
itself guarantees -- defaults, nullability, uniqueness, foreign keys, the
composite key on `task_labels`, and the `__all__`/`__tablename__` surface --
not the request/response behaviour of the routes built on top of these
tables, which integration tests under tests/integration/ and the other
tests/test_*.py files already cover (test_flat_access.py, test_tasks.py,
tests/integration/test_invitations.py, etc.).
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import app.models as models_module
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
    defaults = {
        "email": f"user-{uuid.uuid4().hex[:10]}@example.com",
        "password_hash": hash_password("x"),
    }
    defaults.update(overrides)
    user = User(**defaults)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_project(db_session: Session, created_by: str, **overrides) -> Project:
    defaults = {"name": f"Project {uuid.uuid4().hex[:8]}", "created_by": created_by}
    defaults.update(overrides)
    project = Project(**defaults)
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


def _make_task(db_session: Session, project_id: str, **overrides) -> Task:
    defaults = {"project_id": project_id, "title": "A task"}
    defaults.update(overrides)
    task = Task(**defaults)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task


def _make_label(db_session: Session, **overrides) -> Label:
    defaults = {"name": f"label-{uuid.uuid4().hex[:8]}"}
    defaults.update(overrides)
    label = Label(**defaults)
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    return label


# --- module surface -------------------------------------------------------


def test_all_lists_base_and_every_mapped_model() -> None:
    exported = set(models_module.__all__)
    assert exported == {
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


def test_tablenames_match_the_tables_the_migrations_create() -> None:
    assert User.__tablename__ == "users"
    assert Invitation.__tablename__ == "invitations"
    assert Project.__tablename__ == "projects"
    assert Task.__tablename__ == "tasks"
    assert Comment.__tablename__ == "comments"
    assert ChecklistItem.__tablename__ == "checklist_items"
    assert Label.__tablename__ == "labels"
    assert TaskLabel.__tablename__ == "task_labels"
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


# --- primary keys -----------------------------------------------------


def test_primary_keys_default_to_distinct_uuid4_strings(db_session: Session) -> None:
    first = _make_user(db_session)
    second = _make_user(db_session)

    for user_id in (first.id, second.id):
        assert isinstance(user_id, str)
        # Raises ValueError if not a well-formed UUID.
        assert str(uuid.UUID(user_id)) == user_id

    assert first.id != second.id


# --- User ------------------------------------------------------------------


def test_user_is_admin_defaults_to_false_and_name_is_optional(db_session: Session) -> None:
    user = _make_user(db_session, name=None)

    assert user.is_admin is False
    assert user.name is None


def test_user_created_at_is_set_automatically_and_timezone_aware(db_session: Session) -> None:
    user = _make_user(db_session)

    assert user.created_at is not None
    assert user.created_at.tzinfo is not None


def test_user_email_uniqueness_is_enforced_at_the_database_level(db_session: Session) -> None:
    email = f"dup-{uuid.uuid4().hex[:10]}@example.com"
    _make_user(db_session, email=email)

    with pytest.raises(IntegrityError):
        _make_user(db_session, email=email)
    db_session.rollback()


# --- Invitation --------------------------------------------------------


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

    assert invitation.status == "pending"


def test_invitation_token_uniqueness_is_enforced(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    token = uuid.uuid4().hex
    expires_at = datetime.now(UTC) + timedelta(days=7)
    first = Invitation(
        email=f"invitee-{uuid.uuid4().hex[:10]}@example.com",
        token=token,
        invited_by=admin.id,
        expires_at=expires_at,
    )
    db_session.add(first)
    db_session.commit()

    second = Invitation(
        email=f"invitee-{uuid.uuid4().hex[:10]}@example.com",
        token=token,
        invited_by=admin.id,
        expires_at=expires_at,
    )
    db_session.add(second)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# --- Project -----------------------------------------------------------


def test_project_status_defaults_to_active_and_timestamps_are_set(db_session: Session) -> None:
    owner = _make_user(db_session)

    project = _make_project(db_session, created_by=owner.id)

    assert project.status == "active"
    assert project.description is None
    assert project.created_at is not None
    assert project.updated_at is not None


# --- Task ----------------------------------------------------------------


def test_task_status_defaults_to_todo_and_owner_and_due_date_are_optional(
    db_session: Session,
) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)

    task = _make_task(db_session, project_id=project.id)

    assert task.status == "todo"
    assert task.owner_id is None
    assert task.due_date is None
    assert task.description is None


def test_task_requires_an_existing_project_id(db_session: Session) -> None:
    task = Task(project_id=str(uuid.uuid4()), title="Orphaned task")
    db_session.add(task)

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# --- Comment -------------------------------------------------------------


def test_comment_requires_an_existing_task_and_author(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)

    comment = Comment(task_id=task.id, author_id=str(uuid.uuid4()), body="hi")
    db_session.add(comment)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    comment = Comment(task_id=str(uuid.uuid4()), author_id=owner.id, body="hi")
    db_session.add(comment)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_comment_persists_body_against_a_real_task_and_author(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)

    comment = Comment(task_id=task.id, author_id=owner.id, body="Looks good to me")
    db_session.add(comment)
    db_session.commit()
    db_session.refresh(comment)

    assert comment.id is not None
    assert comment.created_at is not None
    assert comment.body == "Looks good to me"


# --- ChecklistItem ---------------------------------------------------------


def test_checklist_item_defaults_is_complete_false_and_position_zero(
    db_session: Session,
) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)

    item = ChecklistItem(task_id=task.id, title="Write tests")
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)

    assert item.is_complete is False
    assert item.position == 0


# --- Label -----------------------------------------------------------------


def test_label_name_uniqueness_is_enforced(db_session: Session) -> None:
    name = f"priority-{uuid.uuid4().hex[:8]}"
    _make_label(db_session, name=name)

    with pytest.raises(IntegrityError):
        _make_label(db_session, name=name)
    db_session.rollback()


# --- TaskLabel ---------------------------------------------------------


def test_task_label_composite_primary_key_prevents_the_same_pair_twice(
    db_session: Session,
) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    label = _make_label(db_session)

    db_session.add(TaskLabel(task_id=task.id, label_id=label.id))
    db_session.commit()

    db_session.add(TaskLabel(task_id=task.id, label_id=label.id))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_task_label_requires_an_existing_task_and_label(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project_id=project.id)
    label = _make_label(db_session)

    db_session.add(TaskLabel(task_id=task.id, label_id=str(uuid.uuid4())))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(TaskLabel(task_id=str(uuid.uuid4()), label_id=label.id))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
