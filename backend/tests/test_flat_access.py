"""Flat-access tests (US-003): any signed-in member sees and edits any
project or task -- there is no per-project membership or ownership check.

Projects and tasks are created through the API itself (POST /projects,
POST /projects/{id}/tasks) rather than ORM models, since flat access is
exactly the behaviour of those endpoints under test. Two distinct members
are seeded directly in the database (same pattern as
tests/integration/test_invitations.py's `_make_admin`) so the cross-member
assertions are real rather than mocked.
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import User
from app.security import create_access_token, hash_password

client = TestClient(app)


def _make_member(db_session: Session, name: str) -> dict:
    email = f"{name.lower()}-{uuid.uuid4().hex[:10]}@example.com"
    user = User(email=email, password_hash=hash_password("x"), name=name, is_admin=False)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return {"user": user, "token": create_access_token(user.id)}


def _auth(member: dict) -> dict:
    return {"Authorization": f"Bearer {member['token']}"}


def _create_project(member: dict, name: str | None = None) -> dict:
    name = name or f"Project {uuid.uuid4().hex[:8]}"
    response = client.post("/projects", json={"name": name}, headers=_auth(member))
    assert response.status_code in (200, 201), response.text
    return response.json()


def _create_task(member: dict, project_id: str, title: str = "A task") -> dict:
    response = client.post(
        f"/projects/{project_id}/tasks", json={"title": title}, headers=_auth(member)
    )
    assert response.status_code in (200, 201), response.text
    return response.json()


def test_ac007_project_created_by_member_a_is_returned_by_get_projects_for_member_b(
    db_session: Session,
) -> None:
    member_a = _make_member(db_session, "MemberA")
    member_b = _make_member(db_session, "MemberB")
    project = _create_project(member_a)

    response = client.get("/projects", headers=_auth(member_b))

    assert response.status_code == 200
    body = response.json()
    project_ids = [row["project"]["id"] for row in body]
    assert project["id"] in project_ids


def test_ac008_member_b_patches_as_project_and_task_and_changes_persist_on_reread(
    db_session: Session,
) -> None:
    member_a = _make_member(db_session, "MemberA")
    member_b = _make_member(db_session, "MemberB")
    project = _create_project(member_a, name=f"Original name {uuid.uuid4().hex[:8]}")
    task = _create_task(member_a, project["id"], title="Original title")

    patch_project = client.patch(
        f"/projects/{project['id']}",
        json={"name": "Renamed by B"},
        headers=_auth(member_b),
    )
    assert patch_project.status_code == 200, patch_project.text

    patch_task = client.patch(
        f"/tasks/{task['id']}",
        json={"title": "Retitled by B", "status": "in_progress"},
        headers=_auth(member_b),
    )
    assert patch_task.status_code == 200, patch_task.text

    reread_project = client.get(f"/projects/{project['id']}", headers=_auth(member_a))
    assert reread_project.status_code == 200
    assert reread_project.json()["name"] == "Renamed by B"

    reread_task = client.get(f"/tasks/{task['id']}", headers=_auth(member_a))
    assert reread_task.status_code == 200
    task_body = reread_task.json()
    task_payload = task_body.get("task", task_body)
    assert task_payload["title"] == "Retitled by B"
    assert task_payload["status"] == "in_progress"


def test_nfr001_get_projects_returns_401_without_a_jwt() -> None:
    response = client.get("/projects")
    assert response.status_code == 401


def test_nfr001_get_project_tasks_returns_401_without_a_jwt() -> None:
    response = client.get("/projects/some-id/tasks")
    assert response.status_code == 401


def test_nfr001_get_task_returns_401_without_a_jwt() -> None:
    response = client.get("/tasks/some-id")
    assert response.status_code == 401


def test_nfr003_a_few_dozen_projects_list_in_a_single_request_without_pagination_errors(
    db_session: Session,
) -> None:
    member = _make_member(db_session, "Lister")
    created_count = 30
    for _ in range(created_count):
        _create_project(member)

    response = client.get("/projects", headers=_auth(member))

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= created_count
