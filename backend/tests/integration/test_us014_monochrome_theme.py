"""Integration tests for US-014: monochrome theme for projects dashboard and
project screens.

The theme itself is a frontend concern; these tests cover the Projects API
data the dashboard and the create/edit forms render with the new palette
(AC-033, AC-034): project cards and progress indicators need task counts,
the empty state needs an empty list, and the forms need creation, validation
and edit behaviour to stay correct under the new styling.
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


def _list_projects(member: dict):
    response = client.get("/projects", headers=_auth(member))
    assert response.status_code == 200
    return response.json()


def test_tc026_projects_list_supplies_data_for_dashboard_rendering(
    db_session: Session,
) -> None:
    member = _make_member(db_session)

    create = client.post("/projects", json={"name": "Marketing Launch"}, headers=_auth(member))
    assert create.status_code == 201, create.text
    project = create.json()

    task_ids = []
    for _ in range(5):
        task_response = client.post(
            f"/projects/{project['id']}/tasks",
            json={"title": "A task"},
            headers=_auth(member),
        )
        assert task_response.status_code == 201, task_response.text
        task_ids.append(task_response.json()["id"])

    for task_id in task_ids[:2]:
        done_patch = client.patch(
            f"/tasks/{task_id}", json={"status": "done"}, headers=_auth(member)
        )
        assert done_patch.status_code == 200, done_patch.text

    response = client.get("/projects", headers=_auth(member))

    assert response.status_code == 200, response.text
    listed = response.json()
    summary = next((row for row in listed if row["project"]["id"] == project["id"]), None)
    assert summary is not None
    assert summary["project"]["name"] == "Marketing Launch"
    assert summary["task_total"] == 5
    assert summary["task_complete"] == 2


def test_tc028_projects_list_returns_empty_result_supporting_empty_state(
    db_session: Session,
) -> None:
    member = _make_member(db_session)

    response = client.get("/projects", headers=_auth(member))

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_tc030_create_project_with_a_valid_name_succeeds(db_session: Session) -> None:
    member = _make_member(db_session)

    response = client.post(
        "/projects", json={"name": "Design System Refresh"}, headers=_auth(member)
    )

    assert response.status_code == 201, response.text
    project = response.json()
    assert project["name"] == "Design System Refresh"

    listed = _list_projects(member)
    assert any(row["project"]["id"] == project["id"] for row in listed)


def test_tc031_create_project_without_a_name_is_rejected(db_session: Session) -> None:
    member = _make_member(db_session)
    before = _list_projects(member)

    response = client.post("/projects", json={"name": ""}, headers=_auth(member))

    assert response.status_code == 422, response.text
    body = response.json()
    assert "name" in str(body).lower()

    after = _list_projects(member)
    assert len(after) == len(before)


def test_tc034_edit_project_description_succeeds(db_session: Session) -> None:
    member = _make_member(db_session)
    create = client.post("/projects", json={"name": "Design System Refresh"}, headers=_auth(member))
    assert create.status_code == 201, create.text
    project = create.json()

    patch = client.patch(
        f"/projects/{project['id']}",
        json={"description": "Updated for Q4 planning"},
        headers=_auth(member),
    )

    assert patch.status_code == 200, patch.text
    body = patch.json()
    assert body["description"] == "Updated for Q4 planning"

    reread = client.get(f"/projects/{project['id']}", headers=_auth(member))
    assert reread.status_code == 200, reread.text
    assert reread.json()["description"] == "Updated for Q4 planning"
