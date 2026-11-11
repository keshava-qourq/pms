"""Unit tests for `app.routers.backend` (no acceptance criteria of its own).

Every route in this module is already exercised end-to-end through
`TestClient` in `backend/tests/integration/`. This file instead calls the
module's route coroutines and private helpers directly -- no `client`
fixture, no `TestClient` -- against the real, migrated database (see
`conftest.py`), one function at a time: the small `_get_*_or_404`,
`_task_labels`, `_comment_out`, `_build_task_out`, `_validate_owner_id`,
`_as_aware_utc` and `_ensure_default_labels` helpers, plus the route
coroutines themselves called with hand-built request models and `User`
rows, so the business logic (flat access with no ownership check, 404/422/
409 guards, notification enqueueing, idempotent label attach/detach) is
proven without going through FastAPI's routing or dependency-injection
machinery. This ticket carries no acceptance criteria, so tests are named
after the behaviour they cover rather than an AC id.

Every row created here is deleted again before the test returns: the
database is shared with every other test in this suite (same convention as
`tests/unit/test_models.py`).
"""

import asyncio
import uuid
from datetime import UTC, datetime

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
    create_comment,
    create_invitation,
    create_project,
    create_task,
    get_project,
    get_task,
    list_comments,
    list_labels,
    list_notifications,
    list_project_tasks,
    list_projects,
    login,
    me,
    remove_label,
    require_admin,
    toggle_checklist_item,
    update_project,
    update_task,
)
from app.schemas import (
    AcceptInviteRequest,
    ChecklistItemCreate,
    ChecklistItemUpdate,
    CommentCreate,
    InvitationCreate,
    LabelAttach,
    LoginRequest,
    ProjectCreate,
    ProjectUpdate,
    TaskCreate,
    TaskUpdate,
)
from app.security import hash_password

# ---------------------------------------------------------------------------
# fixtures-by-hand (same pattern as tests/unit/test_models.py)
# ---------------------------------------------------------------------------


def _run(coro):
    return asyncio.run(coro)


def _unique_email(prefix: str = "backend-unit") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@example.com"


def _make_user(db_session: Session, name: str = "Member", is_admin: bool = False) -> User:
    user = User(
        email=_unique_email(name), password_hash=hash_password("x"), name=name, is_admin=is_admin
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_project(db_session: Session, creator_id: str) -> Project:
    project = Project(name=f"Project {uuid.uuid4().hex[:8]}", created_by=creator_id)
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


def _delete(db_session: Session, *objects) -> None:
    """Re-fetch and delete each row; children-before-parents order is left to the caller."""
    for obj in objects:
        if obj is None:
            continue
        current = db_session.get(type(obj), obj.id)
        if current is not None:
            db_session.delete(current)
    db_session.commit()


def _delete_task_label(db_session: Session, task_id: str, label_id: str) -> None:
    db_session.query(TaskLabel).filter_by(task_id=task_id, label_id=label_id).delete()
    db_session.commit()


# ---------------------------------------------------------------------------
# require_admin (NFR-002)
# ---------------------------------------------------------------------------


def test_require_admin_returns_the_user_when_is_admin_is_true(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    try:
        assert require_admin(current_user=admin) is admin
    finally:
        _delete(db_session, admin)


def test_require_admin_raises_403_for_a_non_admin_user(db_session: Session) -> None:
    member = _make_user(db_session, is_admin=False)
    try:
        with pytest.raises(HTTPException) as exc_info:
            require_admin(current_user=member)
        assert exc_info.value.status_code == 403
    finally:
        _delete(db_session, member)


# ---------------------------------------------------------------------------
# _as_aware_utc
# ---------------------------------------------------------------------------


def test_as_aware_utc_tags_a_naive_datetime_with_utc() -> None:
    naive = datetime(2026, 1, 1, 12, 0, 0)
    result = _as_aware_utc(naive)
    assert result.tzinfo == UTC
    assert result.replace(tzinfo=None) == naive


def test_as_aware_utc_leaves_an_already_aware_datetime_unchanged() -> None:
    aware = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
    assert _as_aware_utc(aware) is aware


# ---------------------------------------------------------------------------
# _get_*_or_404 helpers
# ---------------------------------------------------------------------------


def test_get_project_or_404_returns_the_project_when_it_exists(db_session: Session) -> None:
    creator = _make_user(db_session)
    project = _make_project(db_session, creator.id)
    try:
        assert _get_project_or_404(db_session, project.id).id == project.id
    finally:
        _delete(db_session, project, creator)


def test_get_project_or_404_raises_404_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _get_project_or_404(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 404


def test_get_task_or_404_returns_the_task_when_it_exists(db_session: Session) -> None:
    creator = _make_user(db_session)
    project = _make_project(db_session, creator.id)
    task = _make_task(db_session, project.id)
    try:
        assert _get_task_or_404(db_session, task.id).id == task.id
    finally:
        _delete(db_session, task, project, creator)


def test_get_task_or_404_raises_404_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _get_task_or_404(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 404


def test_get_checklist_item_or_404_returns_the_item_when_it_exists(db_session: Session) -> None:
    creator = _make_user(db_session)
    project = _make_project(db_session, creator.id)
    task = _make_task(db_session, project.id)
    item = ChecklistItem(task_id=task.id, title="Step")
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    try:
        assert _get_checklist_item_or_404(db_session, item.id).id == item.id
    finally:
        _delete(db_session, item, task, project, creator)


def test_get_checklist_item_or_404_raises_404_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _get_checklist_item_or_404(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 404


def test_get_label_or_404_returns_the_label_when_it_exists(db_session: Session) -> None:
    label = Label(name=f"label-{uuid.uuid4().hex[:8]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    try:
        assert _get_label_or_404(db_session, label.id).id == label.id
    finally:
        _delete(db_session, label)


def test_get_label_or_404_raises_404_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _get_label_or_404(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# _task_labels
# ---------------------------------------------------------------------------


def test_task_labels_is_empty_for_a_task_with_no_labels_attached(db_session: Session) -> None:
    creator = _make_user(db_session)
    project = _make_project(db_session, creator.id)
    task = _make_task(db_session, project.id)
    try:
        assert _task_labels(db_session, task.id) == []
    finally:
        _delete(db_session, task, project, creator)


def test_task_labels_returns_attached_labels_sorted_by_name(db_session: Session) -> None:
    creator = _make_user(db_session)
    project = _make_project(db_session, creator.id)
    task = _make_task(db_session, project.id)
    zebra = Label(name=f"zebra-{uuid.uuid4().hex[:6]}")
    apple = Label(name=f"apple-{uuid.uuid4().hex[:6]}")
    db_session.add_all([zebra, apple])
    db_session.commit()
    db_session.refresh(zebra)
    db_session.refresh(apple)
    db_session.add_all(
        [
            TaskLabel(task_id=task.id, label_id=zebra.id),
            TaskLabel(task_id=task.id, label_id=apple.id),
        ]
    )
    db_session.commit()
    try:
        names = [label.name for label in _task_labels(db_session, task.id)]
        assert names == sorted(names)
        assert apple.name in names
        assert zebra.name in names
    finally:
        _delete_task_label(db_session, task.id, zebra.id)
        _delete_task_label(db_session, task.id, apple.id)
        _delete(db_session, zebra, apple, task, project, creator)


# ---------------------------------------------------------------------------
# _comment_out
# ---------------------------------------------------------------------------


def test_comment_out_includes_the_author_name_when_the_author_exists(db_session: Session) -> None:
    author = _make_user(db_session, name="Fergus")
    comment = Comment(
        id=str(uuid.uuid4()),
        task_id=str(uuid.uuid4()),
        author_id=author.id,
        body="Looks good.",
        created_at=datetime.now(UTC),
    )
    try:
        out = _comment_out(db_session, comment)
        assert out.author_id == author.id
        assert out.author_name == "Fergus"
        assert out.body == "Looks good."
    finally:
        _delete(db_session, author)


def test_comment_out_author_name_is_none_when_the_author_no_longer_exists(
    db_session: Session,
) -> None:
    comment = Comment(
        id=str(uuid.uuid4()),
        task_id=str(uuid.uuid4()),
        author_id=str(uuid.uuid4()),
        body="Orphaned comment.",
        created_at=datetime.now(UTC),
    )
    out = _comment_out(db_session, comment)
    assert out.author_name is None


# ---------------------------------------------------------------------------
# _build_task_out
# ---------------------------------------------------------------------------


def test_build_task_out_aggregates_comments_checklist_counts_and_labels(
    db_session: Session,
) -> None:
    creator = _make_user(db_session)
    project = _make_project(db_session, creator.id)
    task = _make_task(db_session, project.id, title="Aggregate me")
    # Explicit, strictly increasing timestamps: the two defaults could
    # otherwise be evaluated close enough together to tie, which would make
    # the chronological-order assertion below flaky rather than meaningful.
    first_comment = Comment(
        task_id=task.id,
        author_id=creator.id,
        body="first",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    second_comment = Comment(
        task_id=task.id,
        author_id=creator.id,
        body="second",
        created_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    db_session.add_all([first_comment, second_comment])
    done_item = ChecklistItem(task_id=task.id, title="done one", is_complete=True, position=0)
    open_item = ChecklistItem(task_id=task.id, title="open one", is_complete=False, position=1)
    db_session.add_all([done_item, open_item])
    label = Label(name=f"label-{uuid.uuid4().hex[:8]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    db_session.add(TaskLabel(task_id=task.id, label_id=label.id))
    db_session.commit()

    try:
        task_out = _build_task_out(db_session, task)
        assert [c.body for c in task_out.comments] == ["first", "second"]
        assert task_out.checklist_total == 2
        assert task_out.checklist_complete == 1
        assert [entry.name for entry in task_out.labels] == [label.name]
    finally:
        _delete_task_label(db_session, task.id, label.id)
        _delete(
            db_session,
            done_item,
            open_item,
            first_comment,
            second_comment,
            label,
            task,
            project,
            creator,
        )


# ---------------------------------------------------------------------------
# _validate_owner_id (AC-016)
# ---------------------------------------------------------------------------


def test_validate_owner_id_allows_none(db_session: Session) -> None:
    _validate_owner_id(db_session, None)  # must not raise


def test_validate_owner_id_allows_a_real_member(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        _validate_owner_id(db_session, member.id)  # must not raise
    finally:
        _delete(db_session, member)


def test_validate_owner_id_raises_422_for_an_unknown_id(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _validate_owner_id(db_session, str(uuid.uuid4()))
    assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# _ensure_default_labels
# ---------------------------------------------------------------------------


def test_ensure_default_labels_is_a_noop_once_any_label_exists(db_session: Session) -> None:
    # Deterministic regardless of what other tests have already seeded into
    # the shared label catalogue: adding one row first guarantees the table
    # is non-empty, which is exactly the branch that must be a no-op.
    marker = Label(name=f"marker-{uuid.uuid4().hex[:8]}")
    db_session.add(marker)
    db_session.commit()
    before = db_session.query(Label).count()
    try:
        _ensure_default_labels(db_session)
        assert db_session.query(Label).count() == before
    finally:
        _delete(db_session, marker)


def test_ensure_default_labels_seeds_the_default_catalogue_when_the_table_is_empty(
    db_session: Session,
) -> None:
    if db_session.query(Label).count() != 0:
        pytest.skip(
            "[KNOWN-LIMIT] the label catalogue is shared with every other test in this run "
            "and is already non-empty, so the empty-table branch cannot be observed here "
            "without truncating rows another test may depend on"
        )
    _ensure_default_labels(db_session)
    try:
        names = {label.name for label in db_session.query(Label).all()}
        assert {name for name, _ in DEFAULT_LABELS} <= names
    finally:
        for name, _ in DEFAULT_LABELS:
            row = db_session.query(Label).filter(Label.name == name).first()
            if row is not None:
                db_session.delete(row)
        db_session.commit()


# ---------------------------------------------------------------------------
# auth: login, accept_invite, me
# ---------------------------------------------------------------------------


def test_login_with_correct_credentials_returns_a_token_and_the_user(db_session: Session) -> None:
    email = _unique_email()
    password = "correct-horse-battery-staple"
    user = User(
        email=email, password_hash=hash_password(password), name="Logger Inn", is_admin=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    try:
        result = _run(login(LoginRequest(email=email, password=password), db_session))
        assert result.token_type == "bearer"
        assert isinstance(result.access_token, str) and result.access_token
        assert result.user.id == user.id
    finally:
        _delete(db_session, user)


def test_login_with_wrong_password_raises_401(db_session: Session) -> None:
    email = _unique_email()
    user = User(email=email, password_hash=hash_password("right-password"), is_admin=False)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(login(LoginRequest(email=email, password="wrong-password"), db_session))
        assert exc_info.value.status_code == 401
    finally:
        _delete(db_session, user)


def test_login_with_unknown_email_raises_401(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _run(login(LoginRequest(email=_unique_email(), password="whatever"), db_session))
    assert exc_info.value.status_code == 401


def test_accept_invite_with_a_valid_token_creates_the_account_and_marks_it_accepted(
    db_session: Session,
) -> None:
    admin = _make_user(db_session, is_admin=True)
    email = _unique_email("invitee")
    invitation = Invitation(
        email=email,
        token=uuid.uuid4().hex,
        invited_by=admin.id,
        expires_at=datetime.now(UTC).replace(year=2030),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    created_user = None
    try:
        result = _run(
            accept_invite(
                AcceptInviteRequest(
                    token=invitation.token, password="brand-new-pw", name="New One"
                ),
                db_session,
            )
        )
        assert result.user.email == email
        db_session.refresh(invitation)
        assert invitation.status == "accepted"
        created_user = db_session.query(User).filter(User.email == email).first()
        assert created_user is not None
    finally:
        _delete(db_session, invitation, created_user, admin)


def test_accept_invite_with_an_unknown_token_raises_400(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        _run(
            accept_invite(AcceptInviteRequest(token="not-a-real-token", password="x"), db_session)
        )
    assert exc_info.value.status_code == 400


def test_accept_invite_with_an_already_accepted_token_raises_400(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    invitation = Invitation(
        email=_unique_email("invitee"),
        token=uuid.uuid4().hex,
        status="accepted",
        invited_by=admin.id,
        expires_at=datetime.now(UTC).replace(year=2030),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                accept_invite(
                    AcceptInviteRequest(token=invitation.token, password="x"), db_session
                )
            )
        assert exc_info.value.status_code == 400
    finally:
        _delete(db_session, invitation, admin)


def test_accept_invite_with_an_expired_token_raises_400(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    invitation = Invitation(
        email=_unique_email("invitee"),
        token=uuid.uuid4().hex,
        invited_by=admin.id,
        expires_at=datetime.now(UTC).replace(year=2000),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                accept_invite(
                    AcceptInviteRequest(token=invitation.token, password="x"), db_session
                )
            )
        assert exc_info.value.status_code == 400
    finally:
        _delete(db_session, invitation, admin)


def test_me_returns_the_profile_of_the_current_user(db_session: Session) -> None:
    user = _make_user(db_session, name="Mirror", is_admin=True)
    try:
        result = _run(me(current_user=user))
        assert result.id == user.id
        assert result.email == user.email
        assert result.is_admin is True
    finally:
        _delete(db_session, user)


# ---------------------------------------------------------------------------
# invitations (NFR-002, AC-004/005/006)
# ---------------------------------------------------------------------------


def test_create_invitation_as_admin_returns_201_body_and_enqueues_the_email(
    db_session: Session, monkeypatch
) -> None:
    sent = []
    monkeypatch.setattr(
        "app.routers.backend.send_invitation_email.delay", lambda inv_id: sent.append(inv_id)
    )
    admin = _make_user(db_session, is_admin=True)
    email = _unique_email("invitee")
    invitation = None
    try:
        result = _run(create_invitation(InvitationCreate(email=email), admin, db_session))
        assert result.email == email
        assert result.status == "pending"
        assert result.invited_by == admin.id
        assert sent == [result.id]
        invitation = db_session.get(Invitation, result.id)
        assert invitation is not None
    finally:
        _delete(db_session, invitation, admin)


def test_create_invitation_for_an_existing_member_raises_409_and_creates_nothing(
    db_session: Session,
) -> None:
    admin = _make_user(db_session, is_admin=True)
    existing_member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                create_invitation(
                    InvitationCreate(email=existing_member.email), admin, db_session
                )
            )
        assert exc_info.value.status_code == 409
        assert (
            db_session.query(Invitation)
            .filter(Invitation.email == existing_member.email)
            .first()
            is None
        )
    finally:
        _delete(db_session, existing_member, admin)


def test_create_invitation_when_one_is_already_pending_raises_409(db_session: Session) -> None:
    admin = _make_user(db_session, is_admin=True)
    email = _unique_email("invitee")
    existing = Invitation(
        email=email,
        token=uuid.uuid4().hex,
        invited_by=admin.id,
        expires_at=datetime.now(UTC).replace(year=2030),
    )
    db_session.add(existing)
    db_session.commit()
    db_session.refresh(existing)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(create_invitation(InvitationCreate(email=email), admin, db_session))
        assert exc_info.value.status_code == 409
        assert db_session.query(Invitation).filter(Invitation.email == email).count() == 1
    finally:
        _delete(db_session, existing, admin)


# ---------------------------------------------------------------------------
# projects (AC-007, AC-008)
# ---------------------------------------------------------------------------


def test_list_projects_includes_a_project_created_by_a_different_member(
    db_session: Session,
) -> None:
    creator = _make_user(db_session, "Creator")
    viewer = _make_user(db_session, "Viewer")
    project = _make_project(db_session, creator.id)
    try:
        summaries = _run(list_projects(viewer, db_session))
        assert any(s.project.id == project.id for s in summaries)
    finally:
        _delete(db_session, project, creator, viewer)


def test_create_project_records_created_by_as_the_current_user(db_session: Session) -> None:
    creator = _make_user(db_session)
    project = None
    try:
        result = _run(create_project(ProjectCreate(name="A fresh project"), creator, db_session))
        assert result.created_by == creator.id
        project = db_session.get(Project, result.id)
        assert project is not None
    finally:
        _delete(db_session, project, creator)


def test_get_project_raises_404_for_an_unknown_id(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(get_project(str(uuid.uuid4()), member, db_session))
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, member)


def test_update_project_lets_a_non_creator_edit_it_and_only_touches_given_fields(
    db_session: Session,
) -> None:
    creator = _make_user(db_session, "Creator")
    other_member = _make_user(db_session, "OtherMember")
    project = _make_project(db_session, creator.id)
    original_description = project.description
    try:
        result = _run(
            update_project(
                project.id,
                ProjectUpdate(name="Renamed by someone else"),
                other_member,
                db_session,
            )
        )
        assert result.name == "Renamed by someone else"
        assert result.description == original_description
    finally:
        _delete(db_session, project, creator, other_member)


# ---------------------------------------------------------------------------
# tasks (US-003-2, US-006, NFR-004, AC-016)
# ---------------------------------------------------------------------------


def test_list_project_tasks_raises_404_for_an_unknown_project(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(list_project_tasks(str(uuid.uuid4()), member, db_session))
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, member)


def test_create_task_defaults_status_to_todo_and_enqueues_notify_task_created(
    db_session: Session, monkeypatch
) -> None:
    enqueued = []
    monkeypatch.setattr(
        "app.routers.backend.notify_task_created.delay", lambda task_id: enqueued.append(task_id)
    )
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = None
    try:
        result = _run(create_task(project.id, TaskCreate(title="New task"), member, db_session))
        assert result.status == "todo"
        assert result.project_id == project.id
        assert enqueued == [result.id]
        task = db_session.get(Task, result.id)
    finally:
        _delete(db_session, task, project, member)


def test_create_task_raises_404_for_an_unknown_project(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(create_task(str(uuid.uuid4()), TaskCreate(title="Orphan"), member, db_session))
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, member)


def test_create_task_raises_422_for_an_unknown_owner_id_and_creates_nothing(
    db_session: Session,
) -> None:
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                create_task(
                    project.id,
                    TaskCreate(title="Bad owner", owner_id=str(uuid.uuid4())),
                    member,
                    db_session,
                )
            )
        assert exc_info.value.status_code == 422
        assert db_session.query(Task).filter(Task.project_id == project.id).count() == 0
    finally:
        _delete(db_session, project, member)


def test_get_task_raises_404_for_an_unknown_id(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(get_task(str(uuid.uuid4()), member, db_session))
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, member)


def test_update_task_enqueues_notify_task_updated_only_when_a_field_actually_changes(
    db_session: Session, monkeypatch
) -> None:
    enqueued = []
    monkeypatch.setattr(
        "app.routers.backend.notify_task_updated.delay",
        lambda task_id, changed_fields: enqueued.append((task_id, changed_fields)),
    )
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = _make_task(db_session, project.id, title="Original", status="todo")
    try:
        # Re-sending the same status must not count as a change.
        unchanged = _run(update_task(task.id, TaskUpdate(status="todo"), member, db_session))
        assert unchanged.status == "todo"
        assert enqueued == []

        # An actual change must enqueue the job with that field named.
        changed = _run(
            update_task(task.id, TaskUpdate(status="in_progress"), member, db_session)
        )
        assert changed.status == "in_progress"
        assert len(enqueued) == 1
        assert enqueued[0][0] == task.id
        assert "status" in enqueued[0][1]
    finally:
        _delete(db_session, task, project, member)


def test_update_task_raises_422_for_an_unknown_owner_id_and_leaves_the_task_unchanged(
    db_session: Session,
) -> None:
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = _make_task(db_session, project.id, title="Keep me")
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                update_task(
                    task.id, TaskUpdate(owner_id=str(uuid.uuid4())), member, db_session
                )
            )
        assert exc_info.value.status_code == 422
        db_session.refresh(task)
        assert task.owner_id is None
    finally:
        _delete(db_session, task, project, member)


# ---------------------------------------------------------------------------
# comments (AC-024, AC-026)
# ---------------------------------------------------------------------------


def test_list_comments_raises_404_for_an_unknown_task(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(list_comments(str(uuid.uuid4()), member, db_session))
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, member)


def test_create_comment_attaches_the_current_user_as_author_not_a_payload_supplied_one(
    db_session: Session,
) -> None:
    author = _make_user(db_session, "RealAuthor")
    project = _make_project(db_session, author.id)
    task = _make_task(db_session, project.id)
    comment = None
    try:
        result = _run(
            create_comment(task.id, CommentCreate(body="Hello there"), author, db_session)
        )
        assert result.author_id == author.id
        assert result.author_name == "RealAuthor"
        comment = db_session.get(Comment, result.id)
        assert comment is not None
    finally:
        _delete(db_session, comment, task, project, author)


def test_create_comment_raises_404_for_an_unknown_task(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(create_comment(str(uuid.uuid4()), CommentCreate(body="x"), member, db_session))
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, member)


# ---------------------------------------------------------------------------
# checklist (AC-027, AC-028)
# ---------------------------------------------------------------------------


def test_add_checklist_item_assigns_sequentially_increasing_positions(db_session: Session) -> None:
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = _make_task(db_session, project.id)
    first = second = None
    try:
        first = _run(
            add_checklist_item(task.id, ChecklistItemCreate(title="Step one"), member, db_session)
        )
        second = _run(
            add_checklist_item(task.id, ChecklistItemCreate(title="Step two"), member, db_session)
        )
        assert first.is_complete is False
        assert first.position == 0
        assert second.position == 1
    finally:
        _delete(
            db_session,
            db_session.get(ChecklistItem, first.id) if first else None,
            db_session.get(ChecklistItem, second.id) if second else None,
            task,
            project,
            member,
        )


def test_add_checklist_item_raises_404_for_an_unknown_task(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                add_checklist_item(
                    str(uuid.uuid4()), ChecklistItemCreate(title="x"), member, db_session
                )
            )
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, member)


def test_toggle_checklist_item_flips_is_complete_in_both_directions(db_session: Session) -> None:
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = _make_task(db_session, project.id)
    item = ChecklistItem(task_id=task.id, title="Flip me")
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    try:
        completed = _run(
            toggle_checklist_item(
                item.id, ChecklistItemUpdate(is_complete=True), member, db_session
            )
        )
        assert completed.is_complete is True

        reopened = _run(
            toggle_checklist_item(
                item.id, ChecklistItemUpdate(is_complete=False), member, db_session
            )
        )
        assert reopened.is_complete is False
    finally:
        _delete(db_session, item, task, project, member)


def test_toggle_checklist_item_raises_404_for_an_unknown_id(db_session: Session) -> None:
    member = _make_user(db_session)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                toggle_checklist_item(
                    str(uuid.uuid4()), ChecklistItemUpdate(is_complete=True), member, db_session
                )
            )
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, member)


# ---------------------------------------------------------------------------
# labels (AC-029, AC-030)
# ---------------------------------------------------------------------------


def test_list_labels_returns_labels_sorted_by_name(db_session: Session) -> None:
    member = _make_user(db_session)
    zebra = Label(name=f"zzz-zebra-{uuid.uuid4().hex[:6]}")
    apple = Label(name=f"aaa-apple-{uuid.uuid4().hex[:6]}")
    db_session.add_all([zebra, apple])
    db_session.commit()
    db_session.refresh(zebra)
    db_session.refresh(apple)
    try:
        labels = _run(list_labels(member, db_session))
        our_names = [label.name for label in labels if label.name in (zebra.name, apple.name)]
        assert our_names == [apple.name, zebra.name]
    finally:
        _delete(db_session, zebra, apple, member)


def test_apply_label_is_idempotent_and_shows_up_in_the_returned_task(db_session: Session) -> None:
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = _make_task(db_session, project.id)
    label = Label(name=f"applied-{uuid.uuid4().hex[:8]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    try:
        first = _run(apply_label(task.id, LabelAttach(label_id=label.id), member, db_session))
        assert label.name in [entry.name for entry in first.labels]
        link_count = (
            db_session.query(TaskLabel).filter_by(task_id=task.id, label_id=label.id).count()
        )
        assert link_count == 1

        # Attaching the same label again must not create a duplicate row.
        _run(apply_label(task.id, LabelAttach(label_id=label.id), member, db_session))
        link_count_again = (
            db_session.query(TaskLabel).filter_by(task_id=task.id, label_id=label.id).count()
        )
        assert link_count_again == 1
    finally:
        _delete_task_label(db_session, task.id, label.id)
        _delete(db_session, label, task, project, member)


def test_apply_label_raises_404_for_an_unknown_task(db_session: Session) -> None:
    member = _make_user(db_session)
    label = Label(name=f"orphaned-{uuid.uuid4().hex[:8]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                apply_label(
                    str(uuid.uuid4()), LabelAttach(label_id=label.id), member, db_session
                )
            )
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, label, member)


def test_apply_label_raises_404_for_an_unknown_label(db_session: Session) -> None:
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = _make_task(db_session, project.id)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(
                apply_label(
                    task.id, LabelAttach(label_id=str(uuid.uuid4())), member, db_session
                )
            )
        assert exc_info.value.status_code == 404
    finally:
        _delete(db_session, task, project, member)


def test_remove_label_deletes_the_link_and_is_idempotent_when_called_again(
    db_session: Session,
) -> None:
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = _make_task(db_session, project.id)
    label = Label(name=f"removable-{uuid.uuid4().hex[:8]}")
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    db_session.add(TaskLabel(task_id=task.id, label_id=label.id))
    db_session.commit()
    try:
        response = _run(remove_label(task.id, label.id, member, db_session))
        assert response.status_code == 204
        link_count = (
            db_session.query(TaskLabel).filter_by(task_id=task.id, label_id=label.id).count()
        )
        assert link_count == 0

        # Removing an already-unattached label must still succeed, not 404 or 500.
        second_response = _run(remove_label(task.id, label.id, member, db_session))
        assert second_response.status_code == 204
    finally:
        _delete(db_session, label, task, project, member)


def test_remove_label_raises_404_for_an_unknown_task_or_label(db_session: Session) -> None:
    member = _make_user(db_session)
    project = _make_project(db_session, member.id)
    task = _make_task(db_session, project.id)
    try:
        with pytest.raises(HTTPException) as exc_info:
            _run(remove_label(str(uuid.uuid4()), str(uuid.uuid4()), member, db_session))
        assert exc_info.value.status_code == 404

        with pytest.raises(HTTPException) as exc_info_label:
            _run(remove_label(task.id, str(uuid.uuid4()), member, db_session))
        assert exc_info_label.value.status_code == 404
    finally:
        _delete(db_session, task, project, member)


# ---------------------------------------------------------------------------
# notifications (still the typed placeholder)
# ---------------------------------------------------------------------------


def test_list_notifications_returns_the_stub_response_for_its_own_endpoint() -> None:
    result = _run(list_notifications())
    assert result.endpoint == "GET /notifications"
    assert result.status == "not_implemented"
