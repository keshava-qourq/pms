"""Unit tests for `app/routers/backend.py` -- one function at a time.

This ticket carries no acceptance criteria of its own: it asks for unit
tests of the module the router implements. The endpoints themselves already
have integration coverage (`tests/integration/*`, `tests/test_flat_access.py`,
`tests/test_tasks.py`) that drives them through `TestClient`. These tests
never import `TestClient` or the `client` fixture; every handler and helper
is called directly -- async handlers via `asyncio.run(...)`, exactly like
`tests/unit/test_main.py` calls `health()` -- with a real `db_session`
(ENVIRONMENT.md: the project's own Postgres) and hand-built request models
and `User` rows. The focus is the logic a route-level test cannot see
cleanly: the private `_*` helpers, `require_admin`'s guard condition, the
exact arguments each handler enqueues a background job with, and that an
unchanged PATCH enqueues nothing at all.

ASSUMPTION: `_ensure_default_labels` is tested against a mocked session
(MagicMock), not the real one, because the real `labels` table is shared,
unreset state across the whole suite (other test files seed rows into it
directly) -- asserting "empty" or "non-empty" against it would be order
dependent. The mock lets the two branches of that function be pinned
without assuming anything about what else has run first.
"""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import ChecklistItem, Comment, Invitation, Label, Project, Task, TaskLabel, User
from app.routers.backend import (
    DEFAULT_LABELS,
    _as_aware_utc,
    _build_task_out,
    _comment_out,
    _ensure_default_labels,
    _get_checklist_item_or_404,
    _get_label_or_404,
    _get_project_or_404,
    _get_task_or_404,
    _task_labels,
    _validate_owner_id,
    accept_invite,
    add_checklist_item,
    apply_label,
    create_invitation,
    create_project,
    create_task,
    list_labels,
    list_notifications,
    list_projects,
    login,
    me,
    remove_label,
    require_admin,
    update_task,
)
from app.schemas import (
    AcceptInviteRequest,
    ChecklistItemCreate,
    InvitationCreate,
    LabelAttach,
    LoginRequest,
    ProjectCreate,
    TaskCreate,
    TaskUpdate,
)
from app.security import hash_password


def _make_user(db_session: Session, **overrides) -> User:
    kwargs = {
        "email": f"user-{uuid.uuid4().hex[:10]}@example.com",
        "password_hash": hash_password("correct-horse"),
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


def _delete_task_tree(db_session: Session, task_id: str) -> None:
    db_session.query(TaskLabel).filter(TaskLabel.task_id == task_id).delete()
    db_session.query(ChecklistItem).filter(ChecklistItem.task_id == task_id).delete()
    db_session.query(Comment).filter(Comment.task_id == task_id).delete()
    task = db_session.get(Task, task_id)
    if task is not None:
        db_session.delete(task)
    db_session.commit()


# ---------------------------------------------------------------------------
# _as_aware_utc
# ---------------------------------------------------------------------------


def test_as_aware_utc_returns_an_already_aware_value_unchanged() -> None:
    aware = datetime(2026, 1, 1, tzinfo=UTC)
    assert _as_aware_utc(aware) is aware


def test_as_aware_utc_attaches_utc_tzinfo_to_a_naive_value() -> None:
    naive = datetime(2026, 1, 1, 12, 0, 0)
    result = _as_aware_utc(naive)
    assert result.tzinfo is UTC
    assert result.replace(tzinfo=None) == naive


# ---------------------------------------------------------------------------
# _get_*_or_404 helpers
# ---------------------------------------------------------------------------


def test_get_project_or_404_returns_the_project_when_it_exists(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    try:
        found = _get_project_or_404(db_session, project.id)
        assert found.id == project.id
    finally:
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_get_project_or_404_raises_404_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _get_project_or_404(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 404


def test_get_task_or_404_returns_the_task_when_it_exists(db_session: Session) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project.id)
    try:
        found = _get_task_or_404(db_session, task.id)
        assert found.id == task.id
    finally:
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_get_task_or_404_raises_404_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _get_task_or_404(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 404


def test_get_checklist_item_or_404_raises_404_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _get_checklist_item_or_404(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 404


def test_get_label_or_404_raises_404_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _get_label_or_404(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# _task_labels / _comment_out / _build_task_out
# ---------------------------------------------------------------------------


def test_task_labels_returns_only_this_tasks_labels_in_alphabetical_order(
    db_session: Session,
) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project.id)
    zeta = Label(name=f"Zeta-{uuid.uuid4().hex[:6]}")
    alpha = Label(name=f"Alpha-{uuid.uuid4().hex[:6]}")
    db_session.add_all([zeta, alpha])
    db_session.commit()
    db_session.refresh(zeta)
    db_session.refresh(alpha)
    db_session.add_all(
        [
            TaskLabel(task_id=task.id, label_id=zeta.id),
            TaskLabel(task_id=task.id, label_id=alpha.id),
        ]
    )
    db_session.commit()
    try:
        labels = _task_labels(db_session, task.id)
        assert [label.name for label in labels] == sorted([zeta.name, alpha.name])
    finally:
        db_session.query(TaskLabel).filter(TaskLabel.task_id == task.id).delete()
        db_session.delete(db_session.get(Label, zeta.id))
        db_session.delete(db_session.get(Label, alpha.id))
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_comment_out_includes_the_authors_name(db_session: Session) -> None:
    owner = _make_user(db_session, name="Commenter Name")
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project.id)
    comment = Comment(task_id=task.id, author_id=owner.id, body="Hello")
    db_session.add(comment)
    db_session.commit()
    db_session.refresh(comment)
    try:
        out = _comment_out(db_session, comment)
        assert out.author_name == "Commenter Name"
        assert out.body == "Hello"
    finally:
        db_session.delete(db_session.get(Comment, comment.id))
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_comment_out_author_name_is_none_when_the_author_id_matches_no_user(
    db_session: Session,
) -> None:
    # Built in memory, never persisted: author_id names nobody in the table.
    comment = Comment(
        id=str(uuid.uuid4()),
        task_id=str(uuid.uuid4()),
        author_id=str(uuid.uuid4()),
        body="Orphaned",
        created_at=datetime.now(UTC),
    )
    out = _comment_out(db_session, comment)
    assert out.author_name is None


def test_build_task_out_aggregates_comments_checklist_and_labels_with_correct_counts(
    db_session: Session,
) -> None:
    owner = _make_user(db_session)
    project = _make_project(db_session, created_by=owner.id)
    task = _make_task(db_session, project.id)

    db_session.add(Comment(task_id=task.id, author_id=owner.id, body="First"))
    db_session.commit()
    db_session.add(Comment(task_id=task.id, author_id=owner.id, body="Second"))
    db_session.commit()

    done_item = ChecklistItem(task_id=task.id, title="Done step", is_complete=True, position=0)
    open_item = ChecklistItem(task_id=task.id, title="Open step", is_complete=False, position=1)
    db_session.add_all([done_item, open_item])
    db_session.commit()

    label = Label(name=f"Label-{uuid.uuid4().hex[:6]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    db_session.add(TaskLabel(task_id=task.id, label_id=label.id))
    db_session.commit()

    try:
        task_out = _build_task_out(db_session, task)
        assert [c.body for c in task_out.comments] == ["First", "Second"]
        assert task_out.checklist_total == 2
        assert task_out.checklist_complete == 1
        assert [label_out.id for label_out in task_out.labels] == [label.id]
    finally:
        db_session.query(TaskLabel).filter(TaskLabel.task_id == task.id).delete()
        db_session.delete(db_session.get(Label, label.id))
        db_session.query(ChecklistItem).filter(ChecklistItem.task_id == task.id).delete()
        db_session.query(Comment).filter(Comment.task_id == task.id).delete()
        db_session.commit()
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# _validate_owner_id (AC-016)
# ---------------------------------------------------------------------------


def test_validate_owner_id_is_a_no_op_when_owner_id_is_none(db_session: Session) -> None:
    _validate_owner_id(db_session, None)  # must not raise


def test_validate_owner_id_is_a_no_op_when_owner_id_names_a_real_member(
    db_session: Session,
) -> None:
    owner = _make_user(db_session)
    try:
        _validate_owner_id(db_session, owner.id)  # must not raise
    finally:
        db_session.delete(db_session.get(User, owner.id))
        db_session.commit()


def test_validate_owner_id_raises_422_for_an_unknown_owner_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _validate_owner_id(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# require_admin (NFR-002)
# ---------------------------------------------------------------------------


def test_require_admin_returns_the_user_when_they_are_an_admin() -> None:
    admin = User(email="admin@example.com", password_hash="x", is_admin=True)
    assert require_admin(current_user=admin) is admin


def test_require_admin_raises_403_when_the_user_is_not_an_admin() -> None:
    member = User(email="member@example.com", password_hash="x", is_admin=False)
    with pytest.raises(HTTPException) as exc_info:
        require_admin(current_user=member)
    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# _ensure_default_labels
# ---------------------------------------------------------------------------


def test_ensure_default_labels_seeds_the_default_catalogue_when_none_exist() -> None:
    fake_db = MagicMock()
    fake_db.query.return_value.first.return_value = None
    added: list[Label] = []
    fake_db.add.side_effect = added.append

    _ensure_default_labels(fake_db)

    assert [(label.name, label.color) for label in added] == DEFAULT_LABELS
    fake_db.commit.assert_called_once()


def test_ensure_default_labels_is_a_no_op_once_any_label_already_exists() -> None:
    fake_db = MagicMock()
    fake_db.query.return_value.first.return_value = Label(name="Already there")

    _ensure_default_labels(fake_db)

    fake_db.add.assert_not_called()
    fake_db.commit.assert_not_called()


# ---------------------------------------------------------------------------
# auth handlers: login, accept_invite, me
# ---------------------------------------------------------------------------


def test_login_returns_a_token_and_the_user_for_correct_credentials(
    db_session: Session,
) -> None:
    password = "correct-horse-battery-staple"
    user = _make_user(db_session, password_hash=hash_password(password))
    try:
        result = asyncio.run(login(LoginRequest(email=user.email, password=password), db_session))
        assert result.user.id == user.id
        assert result.access_token
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_login_raises_401_for_the_wrong_password(db_session: Session) -> None:
    user = _make_user(db_session, password_hash=hash_password("the-real-password"))
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(login(LoginRequest(email=user.email, password="wrong"), db_session))
        assert exc_info.value.status_code == 401
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_login_raises_401_for_an_unknown_email(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            login(LoginRequest(email="nobody-at-all@example.com", password="x"), db_session)
        )
    assert exc_info.value.status_code == 401


def test_me_returns_the_profile_of_the_user_passed_in(db_session: Session) -> None:
    user = _make_user(db_session, name="Me Myself")
    try:
        result = asyncio.run(me(user))
        assert result.id == user.id
        assert result.name == "Me Myself"
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_accept_invite_with_a_valid_token_creates_the_account_marks_it_accepted_and_signs_in(
    db_session: Session,
) -> None:
    admin = _make_user(db_session, is_admin=True)
    invitation = Invitation(
        email=f"invitee-{uuid.uuid4().hex[:10]}@example.com",
        token=uuid.uuid4().hex,
        status="pending",
        invited_by=admin.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)

    created_user_id = None
    try:
        result = asyncio.run(
            accept_invite(
                AcceptInviteRequest(token=invitation.token, password="new-pass", name="New Member"),
                db_session,
            )
        )
        created_user_id = result.user.id
        assert result.user.email == invitation.email
        assert result.access_token
        db_session.refresh(invitation)
        assert invitation.status == "accepted"
    finally:
        db_session.delete(db_session.get(Invitation, invitation.id))
        if created_user_id:
            db_session.delete(db_session.get(User, created_user_id))
        db_session.delete(db_session.get(User, admin.id))
        db_session.commit()


def test_accept_invite_raises_400_for_an_unknown_token(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(accept_invite(AcceptInviteRequest(token="nope", password="x"), db_session))
    assert exc_info.value.status_code == 400


def test_accept_invite_raises_400_for_an_expired_token(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    invitation = Invitation(
        email=f"invitee-{uuid.uuid4().hex[:10]}@example.com",
        token=uuid.uuid4().hex,
        status="pending",
        invited_by=admin.id,
        expires_at=datetime.now(UTC) - timedelta(days=1),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                accept_invite(AcceptInviteRequest(token=invitation.token, password="x"), db_session)
            )
        assert exc_info.value.status_code == 400
    finally:
        db_session.delete(db_session.get(Invitation, invitation.id))
        db_session.delete(db_session.get(User, admin.id))
        db_session.commit()


def test_accept_invite_raises_400_for_an_already_accepted_token(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    invitation = Invitation(
        email=f"invitee-{uuid.uuid4().hex[:10]}@example.com",
        token=uuid.uuid4().hex,
        status="accepted",
        invited_by=admin.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                accept_invite(AcceptInviteRequest(token=invitation.token, password="x"), db_session)
            )
        assert exc_info.value.status_code == 400
    finally:
        db_session.delete(db_session.get(Invitation, invitation.id))
        db_session.delete(db_session.get(User, admin.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# create_invitation (NFR-002, AC-004/005/006)
# ---------------------------------------------------------------------------


def test_create_invitation_creates_a_pending_invitation_and_enqueues_the_email(
    db_session: Session, monkeypatch
) -> None:
    admin = _make_user(db_session, is_admin=True)
    enqueued = []
    monkeypatch.setattr(
        "app.routers.backend.send_invitation_email.delay", lambda inv_id: enqueued.append(inv_id)
    )
    email = f"invitee-{uuid.uuid4().hex[:10]}@example.com"
    invitation_id = None
    try:
        before = datetime.now(UTC)
        result = asyncio.run(create_invitation(InvitationCreate(email=email), admin, db_session))
        after = datetime.now(UTC)
        invitation_id = result.id

        assert result.status == "pending"
        assert result.invited_by == admin.id
        assert enqueued == [result.id]
        expires_at = _as_aware_utc(result.expires_at)
        lower = before + timedelta(days=6, hours=23)
        upper = after + timedelta(days=7, hours=1)
        assert lower <= expires_at <= upper
    finally:
        if invitation_id:
            db_session.delete(db_session.get(Invitation, invitation_id))
        db_session.delete(db_session.get(User, admin.id))
        db_session.commit()


def test_create_invitation_raises_409_when_a_member_with_that_email_already_exists(
    db_session: Session,
) -> None:
    admin = _make_user(db_session, is_admin=True)
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(create_invitation(InvitationCreate(email=member.email), admin, db_session))
        assert exc_info.value.status_code == 409
    finally:
        db_session.delete(db_session.get(User, admin.id))
        db_session.delete(db_session.get(User, member.id))
        db_session.commit()


def test_create_invitation_raises_409_when_a_pending_invitation_already_exists(
    db_session: Session,
) -> None:
    admin = _make_user(db_session, is_admin=True)
    email = f"invitee-{uuid.uuid4().hex[:10]}@example.com"
    existing = Invitation(
        email=email,
        token=uuid.uuid4().hex,
        status="pending",
        invited_by=admin.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(existing)
    db_session.commit()
    db_session.refresh(existing)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(create_invitation(InvitationCreate(email=email), admin, db_session))
        assert exc_info.value.status_code == 409
    finally:
        db_session.delete(db_session.get(Invitation, existing.id))
        db_session.delete(db_session.get(User, admin.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# create_project / list_projects (AC-007)
# ---------------------------------------------------------------------------


def test_create_project_records_the_current_user_as_created_by(db_session: Session) -> None:
    user = _make_user(db_session)
    project_id = None
    try:
        result = asyncio.run(
            create_project(ProjectCreate(name="A project"), user, db_session)
        )
        project_id = result.id
        assert result.created_by == user.id
    finally:
        if project_id:
            db_session.delete(db_session.get(Project, project_id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_list_projects_reports_task_total_and_task_complete_per_project(
    db_session: Session,
) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    done_1 = _make_task(db_session, project.id, status="done")
    done_2 = _make_task(db_session, project.id, status="done")
    open_task = _make_task(db_session, project.id, status="todo")
    try:
        summaries = asyncio.run(list_projects(user, db_session))
        match = next(s for s in summaries if s.project.id == project.id)
        assert match.task_total == 3
        assert match.task_complete == 2
    finally:
        for task in (done_1, done_2, open_task):
            _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# create_task / update_task enqueue the right notification job (NFR-004, US-006)
# ---------------------------------------------------------------------------


def test_create_task_enqueues_notify_task_created_with_the_new_tasks_id(
    db_session: Session, monkeypatch
) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    calls = []
    monkeypatch.setattr(
        "app.routers.backend.enqueue_notification",
        lambda job, *args: calls.append((job.__name__ if hasattr(job, "__name__") else job, args)),
    )
    task_id = None
    try:
        result = asyncio.run(
            create_task(project.id, TaskCreate(title="A new task"), user, db_session)
        )
        task_id = result.id
        assert len(calls) == 1
        _, args = calls[0]
        assert args == (task_id,)
    finally:
        if task_id:
            _delete_task_tree(db_session, task_id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_update_task_enqueues_notify_task_updated_with_only_the_fields_that_changed(
    db_session: Session, monkeypatch
) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    task = _make_task(db_session, project.id, title="Original", status="todo")
    calls = []
    monkeypatch.setattr(
        "app.routers.backend.enqueue_notification",
        lambda job, *args: calls.append(args),
    )
    try:
        asyncio.run(
            update_task(task.id, TaskUpdate(status="in_progress"), user, db_session)
        )
        assert len(calls) == 1
        enqueued_task_id, changed_fields = calls[0]
        assert enqueued_task_id == task.id
        assert changed_fields == ["status"]
    finally:
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_update_task_does_not_enqueue_anything_when_no_field_actually_changes(
    db_session: Session, monkeypatch
) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    task = _make_task(db_session, project.id, title="Same title", status="todo")
    calls = []
    monkeypatch.setattr(
        "app.routers.backend.enqueue_notification", lambda job, *args: calls.append(args)
    )
    try:
        # Same title, same status: payload fields are set but equal to the
        # current values, so nothing in the task actually changes.
        asyncio.run(
            update_task(
                task.id, TaskUpdate(title="Same title", status="todo"), user, db_session
            )
        )
        assert calls == []
    finally:
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# add_checklist_item positions (AC-027)
# ---------------------------------------------------------------------------


def test_add_checklist_item_assigns_sequential_positions(db_session: Session) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    task = _make_task(db_session, project.id)
    try:
        first = asyncio.run(
            add_checklist_item(task.id, ChecklistItemCreate(title="First"), user, db_session)
        )
        second = asyncio.run(
            add_checklist_item(task.id, ChecklistItemCreate(title="Second"), user, db_session)
        )
        assert first.position == 0
        assert second.position == 1
    finally:
        db_session.query(ChecklistItem).filter(ChecklistItem.task_id == task.id).delete()
        db_session.commit()
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# apply_label / remove_label idempotency and 404s (AC-029, AC-030)
# ---------------------------------------------------------------------------


def test_apply_label_attaching_an_already_attached_label_is_a_no_op(
    db_session: Session,
) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    task = _make_task(db_session, project.id)
    label = Label(name=f"Dup-{uuid.uuid4().hex[:6]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    try:
        asyncio.run(apply_label(task.id, LabelAttach(label_id=label.id), user, db_session))
        asyncio.run(apply_label(task.id, LabelAttach(label_id=label.id), user, db_session))

        rows = (
            db_session.query(TaskLabel)
            .filter(TaskLabel.task_id == task.id, TaskLabel.label_id == label.id)
            .all()
        )
        assert len(rows) == 1
    finally:
        db_session.query(TaskLabel).filter(TaskLabel.task_id == task.id).delete()
        db_session.delete(db_session.get(Label, label.id))
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_apply_label_raises_404_for_an_unknown_task(db_session: Session) -> None:
    label = Label(name=f"Lone-{uuid.uuid4().hex[:6]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                apply_label(
                    str(uuid.uuid4()),
                    LabelAttach(label_id=label.id),
                    User(email="x@example.com", password_hash="x", is_admin=False),
                    db_session,
                )
            )
        assert exc_info.value.status_code == 404
    finally:
        db_session.delete(db_session.get(Label, label.id))
        db_session.commit()


def test_apply_label_raises_404_for_an_unknown_label(db_session: Session) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    task = _make_task(db_session, project.id)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                apply_label(task.id, LabelAttach(label_id=str(uuid.uuid4())), user, db_session)
            )
        assert exc_info.value.status_code == 404
    finally:
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_remove_label_removing_an_unattached_label_is_a_no_op_that_returns_204(
    db_session: Session,
) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    task = _make_task(db_session, project.id)
    label = Label(name=f"NeverAttached-{uuid.uuid4().hex[:6]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    try:
        response = asyncio.run(remove_label(task.id, label.id, user, db_session))
        assert response.status_code == 204
        assert db_session.get(TaskLabel, (task.id, label.id)) is None
    finally:
        db_session.delete(db_session.get(Label, label.id))
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_remove_label_raises_404_for_an_unknown_task(db_session: Session) -> None:
    user = _make_user(db_session)
    label = Label(name=f"Orphan-{uuid.uuid4().hex[:6]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(remove_label(str(uuid.uuid4()), label.id, user, db_session))
        assert exc_info.value.status_code == 404
    finally:
        db_session.delete(db_session.get(Label, label.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


def test_remove_label_raises_404_for_an_unknown_label(db_session: Session) -> None:
    user = _make_user(db_session)
    project = _make_project(db_session, created_by=user.id)
    task = _make_task(db_session, project.id)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(remove_label(task.id, str(uuid.uuid4()), user, db_session))
        assert exc_info.value.status_code == 404
    finally:
        _delete_task_tree(db_session, task.id)
        db_session.delete(db_session.get(Project, project.id))
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# list_labels seeds the default catalogue (through the real db)
# ---------------------------------------------------------------------------


def test_list_labels_includes_the_default_catalogue(db_session: Session) -> None:
    user = _make_user(db_session)
    try:
        labels = asyncio.run(list_labels(user, db_session))
        names = {label.name for label in labels}
        assert {name for name, _color in DEFAULT_LABELS}.issubset(names)
    finally:
        db_session.delete(db_session.get(User, user.id))
        db_session.commit()


# ---------------------------------------------------------------------------
# list_notifications stub
# ---------------------------------------------------------------------------


def test_list_notifications_returns_the_stub_response_for_its_own_endpoint() -> None:
    result = asyncio.run(list_notifications())
    assert result.endpoint == "GET /notifications"
    assert result.status == "not_implemented"
