"""Integration tests for US-015: monochrome theme for task creation and
editing screens.

The theme itself is a frontend concern; these tests cover the Task API data
the create/edit form controls render with the new black-and-white palette
(AC-035) and the validation guard behind the legibility check (AC-036):
owner, due date and status must round-trip correctly for the form controls
under inspection, and a missing title must be rejected without creating a
task so the "required field" validation message in the e2e check has
something real to show.
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
    assert response.status_code in (200, 201), response.text
    return response.json()


def test_tc009_owner_due_date_and_status_are_correctly_saved_and_returned(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    owner = _make_member(db_session, "Bob")
    project = _create_project(member)

    create = client.post(
        f"/projects/{project['id']}/tasks",
        json={"title": "Design Review"},
        headers=_auth(member),
    )
    assert create.status_code == 201, create.text
    task = create.json()
    assert task["title"] == "Design Review"

    patch = client.patch(
        f"/tasks/{task['id']}",
        json={
            "owner_id": owner["user"].id,
            "due_date": "2026-12-05",
            "status": "in_progress",
        },
        headers=_auth(member),
    )
    assert patch.status_code == 200, patch.text
    patched = patch.json()
    assert patched["owner_id"] == owner["user"].id
    assert patched["due_date"] == "2026-12-05"
    assert patched["status"] == "in_progress"

    detail = client.get(f"/tasks/{task['id']}", headers=_auth(member))
    assert detail.status_code == 200, detail.text
    detail_body = detail.json()
    detail_task = detail_body.get("task", detail_body)
    assert detail_task["owner_id"] == owner["user"].id
    assert detail_task["due_date"] == "2026-12-05"
    assert detail_task["status"] == "in_progress"


def test_tc011_creating_a_task_without_a_title_is_rejected(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)

    before = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))
    assert before.status_code == 200, before.text
    before_list = before.json()

    response = client.post(
        f"/projects/{project['id']}/tasks", json={"title": ""}, headers=_auth(member)
    )
    assert response.status_code == 422, response.text

    after = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))
    assert after.status_code == 200, after.text
    assert after.json() == before_list
