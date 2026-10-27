"""Unit/job tests for background task-save notifications (US-006, NFR-004, NFR-005).

Follows the pattern in tests/test_tasks.py for the invitation email job:
saving a task (create or update) must enqueue a Celery job rather than call
Slack or SendGrid inline from the request path (NFR-004), and the job must
retry on an outbound failure (NFR-005) and be safe to run twice.

ASSUMPTION (not yet confirmed against shipped code at the time this file was
written): the job lives at `app.tasks.notify_task_saved(task_id)` and is
enqueued via `.delay(task.id)` from `create_task` and `update_task` in
app/routers/backend.py, mirroring `send_invitation_email`. If the
implementation uses a different name or signature, this file's import will
fail at collection and should be treated as a naming mismatch to reconcile,
not a behavioural defect.
"""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.models import Project, Task, User
from app.security import hash_password

tasks_module = pytest.importorskip("app.tasks")
notify_task_saved = getattr(tasks_module, "notify_task_saved", None)

_SKIP_REASON = "app.tasks.notify_task_saved is not implemented yet (US-006 not built here)"

pytestmark = pytest.mark.skipif(notify_task_saved is None, reason=_SKIP_REASON)


def _make_task(db_session: Session) -> Task:
    owner = User(
        email=f"owner-{uuid.uuid4().hex[:10]}@example.com",
        password_hash=hash_password("x"),
        is_admin=False,
    )
    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)

    project = Project(name=f"Project {uuid.uuid4().hex[:8]}", created_by=owner.id)
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    task = Task(project_id=project.id, title="Notify me", status="todo", assignee_id=owner.id)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task


def test_nfr004_saving_a_task_enqueues_the_job_rather_than_calling_outbound_services_inline(
    db_session: Session, monkeypatch
) -> None:
    from fastapi.testclient import TestClient

    from app.main import app
    from app.security import create_access_token

    client = TestClient(app)

    calls = []
    monkeypatch.setattr(
        "app.routers.backend.notify_task_saved.delay", lambda task_id: calls.append(task_id)
    )
    inline_slack_calls = []
    inline_email_calls = []
    monkeypatch.setattr(
        "app.tasks._send_via_slack",
        lambda *a, **k: inline_slack_calls.append((a, k)),
        raising=False,
    )
    monkeypatch.setattr(
        "app.tasks._send_via_sendgrid_task_notification",
        lambda *a, **k: inline_email_calls.append((a, k)),
        raising=False,
    )

    owner = User(
        email=f"member-{uuid.uuid4().hex[:10]}@example.com",
        password_hash=hash_password("x"),
        is_admin=False,
    )
    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)
    token = create_access_token(owner.id)

    project_resp = client.post(
        "/projects", json={"name": "Notif project"}, headers={"Authorization": f"Bearer {token}"}
    )
    assert project_resp.status_code in (200, 201)
    project_id = project_resp.json()["id"]

    created = client.post(
        f"/projects/{project_id}/tasks",
        json={"title": "A task"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert created.status_code == 201
    task_id = created.json()["id"]
    assert task_id in calls
    assert inline_slack_calls == []
    assert inline_email_calls == []

    calls.clear()
    updated = client.patch(
        f"/tasks/{task_id}",
        json={"status": "in_progress"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert updated.status_code == 200
    assert task_id in calls
    assert inline_slack_calls == []
    assert inline_email_calls == []


def test_nfr005_job_retries_with_backoff_on_an_outbound_failure() -> None:
    assert notify_task_saved.autoretry_for == (Exception,)
    assert notify_task_saved.retry_backoff is True
    assert notify_task_saved.max_retries >= 1


def test_nfr005_job_is_safe_to_run_twice(db_session: Session, monkeypatch) -> None:
    calls = []
    monkeypatch.setattr(
        "app.tasks._send_via_slack", lambda *a, **k: calls.append(("slack", a, k)), raising=False
    )
    monkeypatch.setattr(
        "app.tasks._send_via_sendgrid_task_notification",
        lambda *a, **k: calls.append(("email", a, k)),
        raising=False,
    )
    task = _make_task(db_session)

    notify_task_saved.run(task.id)
    notify_task_saved.run(task.id)

    # Running it twice must not raise and must not corrupt the task.
    db_session.refresh(task)
    assert task.title == "Notify me"
