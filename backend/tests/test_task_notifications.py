"""Unit tests for the task-save notification enqueue (US-006, NFR-004).

`POST /projects/{id}/tasks` and `PATCH /tasks/{id}` must enqueue
`notify_task_created` / `notify_task_updated` (app/tasks.py) through
`enqueue_notification` rather than calling Slack/SendGrid inline, so saving
a task never waits on -- or fails because of -- the notification jobs or a
briefly unreachable broker. The jobs themselves (dedup, retry policy) are
covered in tests/test_tasks.py's sibling for invitations and in
app/tasks.py's own docstring; this file is about the router's side of the
contract: what gets enqueued, with what arguments, and that a broker
failure at enqueue time degrades gracefully instead of failing the save.
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import User
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


def _create_project(member: dict) -> dict:
    response = client.post(
        "/projects", json={"name": f"Project {uuid.uuid4().hex[:8]}"}, headers=_auth(member)
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_nfr004_creating_a_task_enqueues_notify_task_created(
    db_session: Session, monkeypatch
) -> None:
    calls = []
    monkeypatch.setattr(
        "app.routers.backend.notify_task_created.delay", lambda task_id: calls.append(task_id)
    )
    member = _make_member(db_session)
    project = _create_project(member)

    response = client.post(
        f"/projects/{project['id']}/tasks", json={"title": "A task"}, headers=_auth(member)
    )

    assert response.status_code == 201, response.text
    assert calls == [response.json()["id"]]


def test_nfr004_updating_a_task_with_changes_enqueues_notify_task_updated_with_changed_fields(
    db_session: Session, monkeypatch
) -> None:
    calls = []
    monkeypatch.setattr(
        "app.routers.backend.notify_task_updated.delay",
        lambda task_id, changed_fields: calls.append((task_id, changed_fields)),
    )
    member = _make_member(db_session)
    project = _create_project(member)
    task = client.post(
        f"/projects/{project['id']}/tasks", json={"title": "Original"}, headers=_auth(member)
    ).json()

    response = client.patch(
        f"/tasks/{task['id']}",
        json={"title": "Updated", "status": "in_progress"},
        headers=_auth(member),
    )

    assert response.status_code == 200, response.text
    assert len(calls) == 1
    notified_task_id, changed_fields = calls[0]
    assert notified_task_id == task["id"]
    assert set(changed_fields) == {"title", "status"}


def test_updating_a_task_with_no_actual_changes_does_not_enqueue_a_notification(
    db_session: Session, monkeypatch
) -> None:
    calls = []
    monkeypatch.setattr(
        "app.routers.backend.notify_task_updated.delay",
        lambda *args: calls.append(args),
    )
    member = _make_member(db_session)
    project = _create_project(member)
    task = client.post(
        f"/projects/{project['id']}/tasks",
        json={"title": "Same", "status": "todo"},
        headers=_auth(member),
    ).json()

    # Submitting the values the task already holds changes nothing, so
    # there is nothing worth notifying anyone about.
    response = client.patch(
        f"/tasks/{task['id']}",
        json={"title": "Same", "status": "todo"},
        headers=_auth(member),
    )

    assert response.status_code == 200, response.text
    assert calls == []


def test_nfr004_a_broker_failure_at_enqueue_does_not_fail_the_task_save(
    db_session: Session, monkeypatch
) -> None:
    def _boom(*_args, **_kwargs):
        raise RuntimeError("broker unreachable")

    monkeypatch.setattr("app.routers.backend.notify_task_created.delay", _boom)
    member = _make_member(db_session)
    project = _create_project(member)

    response = client.post(
        f"/projects/{project['id']}/tasks", json={"title": "Still saves"}, headers=_auth(member)
    )

    assert response.status_code == 201, response.text

    listed = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))
    assert any(t["title"] == "Still saves" for t in listed.json())


def test_nfr004_a_broker_failure_at_enqueue_does_not_fail_a_task_update(
    db_session: Session, monkeypatch
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = client.post(
        f"/projects/{project['id']}/tasks", json={"title": "Original"}, headers=_auth(member)
    ).json()

    def _boom(*_args, **_kwargs):
        raise RuntimeError("broker unreachable")

    monkeypatch.setattr("app.routers.backend.notify_task_updated.delay", _boom)

    response = client.patch(
        f"/tasks/{task['id']}", json={"status": "done"}, headers=_auth(member)
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "done"
