"""Integration tests for GET /notifications.

This endpoint reads the `notifications` table that `app/models.py` declares
(`Notification`) but that, until migration `0007_create_notifications_table`
was added, had no Alembic migration backing it: on a real (non-SQLite)
deployment the table would not exist and every call here would fail with a
database error rather than a clean empty list. `tests/conftest.py`'s
session-scoped `_migrated_schema` fixture applies every migration, including
0007, before any test runs -- so these tests also stand as the end-to-end
check that the table migration 0007 added is actually reachable through the
API it was added for.

No code path in this codebase currently inserts a row into `notifications`
(`app/tasks.py`'s `notify_task_saved` only posts outbound Slack/SendGrid
messages -- see the module docstring there), so rows are seeded directly via
the `Notification` model here, the same way `tests/integration/
test_task_details.py` seeds `labels` directly since there is no endpoint
that creates one either.
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import Notification, User
from app.security import create_access_token, hash_password

client = TestClient(app)


def _make_member(db_session: Session, name: str = "Member") -> dict:
    email = f"{name.lower()}-{uuid.uuid4().hex[:10]}@example.com"
    user = User(email=email, password_hash=hash_password("x"), name=name, is_admin=False)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return {"user": user, "token": create_access_token(user.id)}


def _auth(member: dict) -> dict:
    return {"Authorization": f"Bearer {member['token']}"}


def _add_notification(
    db_session: Session, user_id: str, notif_type: str = "task_saved", **payload
) -> Notification:
    notification = Notification(user_id=user_id, type=notif_type, payload=payload, read=False)
    db_session.add(notification)
    db_session.commit()
    db_session.refresh(notification)
    return notification


def test_get_notifications_requires_a_token() -> None:
    response = client.get("/notifications")
    assert response.status_code == 401


def test_get_notifications_returns_empty_list_for_a_member_with_none(db_session: Session) -> None:
    member = _make_member(db_session)

    response = client.get("/notifications", headers=_auth(member))

    assert response.status_code == 200
    assert response.json() == []


def test_get_notifications_returns_only_the_signed_in_members_own_rows(
    db_session: Session,
) -> None:
    member = _make_member(db_session, "Mine")
    other = _make_member(db_session, "NotMine")
    mine = _add_notification(db_session, member["user"].id, task_id="t-1")
    _add_notification(db_session, other["user"].id, task_id="t-2")

    response = client.get("/notifications", headers=_auth(member))

    assert response.status_code == 200
    body = response.json()
    ids = [n["id"] for n in body]
    assert mine.id in ids
    assert len(body) == 1
    assert body[0]["user_id"] == member["user"].id
    assert body[0]["payload"] == {"task_id": "t-1"}
    assert body[0]["read"] is False


def test_get_notifications_are_returned_newest_first(db_session: Session) -> None:
    member = _make_member(db_session)
    first = _add_notification(db_session, member["user"].id, task_id="first")
    second = _add_notification(db_session, member["user"].id, task_id="second")

    response = client.get("/notifications", headers=_auth(member))

    assert response.status_code == 200
    ids = [n["id"] for n in response.json()]
    # Both of ours are present, with the more recently created one first.
    assert ids.index(second.id) < ids.index(first.id)
