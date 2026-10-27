"""Integration tests for GET/POST /projects and GET/PATCH /projects/{id} (US-004).

Projects are workspace-wide: any signed-in member sees and edits any
project (AC-007/008 are covered in tests/test_flat_access.py). This file
covers creation, validation and the overview's task counts (AC-009 through
AC-011) plus NFR-003 (a few dozen projects list without pagination errors).
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import Project, User
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


def test_post_project_returns_201_and_appears_in_get_for_another_member(
    db_session: Session,
) -> None:
    creator = _make_member(db_session, "Creator")
    viewer = _make_member(db_session, "Viewer")
    name = f"New Project {uuid.uuid4().hex[:8]}"

    create = client.post("/projects", json={"name": name}, headers=_auth(creator))
    assert create.status_code == 201, create.text
    project = create.json()
    assert project["name"] == name

    listed = _list_projects(viewer)
    summary = next((row for row in listed if row["project"]["id"] == project["id"]), None)
    assert summary is not None
    assert summary["task_total"] == 0
    assert summary["task_complete"] == 0

    # Add tasks via direct DB access isn't needed here: task counting is
    # already exercised by creating tasks through the real endpoint so the
    # projects overview's counts reflect real writes, not fixtures.
    task_create = client.post(
        f"/projects/{project['id']}/tasks", json={"title": "A task"}, headers=_auth(creator)
    )
    assert task_create.status_code == 201, task_create.text
    task = task_create.json()

    done_patch = client.patch(
        f"/tasks/{task['id']}", json={"status": "done"}, headers=_auth(creator)
    )
    assert done_patch.status_code == 200, done_patch.text

    listed_after = _list_projects(viewer)
    summary_after = next(
        (row for row in listed_after if row["project"]["id"] == project["id"]), None
    )
    assert summary_after is not None
    assert summary_after["task_total"] == 1
    assert summary_after["task_complete"] == 1


def test_ac010_missing_name_returns_422_and_creates_nothing(db_session: Session) -> None:
    member = _make_member(db_session)
    before = len(_list_projects(member))

    response = client.post("/projects", json={}, headers=_auth(member))

    assert response.status_code == 422
    assert len(_list_projects(member)) == before


def test_ac010_empty_name_returns_422_and_creates_nothing(db_session: Session) -> None:
    member = _make_member(db_session)
    before = len(_list_projects(member))

    response = client.post("/projects", json={"name": ""}, headers=_auth(member))

    assert response.status_code == 422
    assert len(_list_projects(member)) == before


def test_ac010_whitespace_only_name_returns_422_and_creates_nothing(db_session: Session) -> None:
    member = _make_member(db_session)
    before = len(_list_projects(member))

    response = client.post("/projects", json={"name": "   "}, headers=_auth(member))

    assert response.status_code == 422
    assert len(_list_projects(member)) == before


def test_ac011_patch_name_and_description_persist_and_visible_to_another_member(
    db_session: Session,
) -> None:
    owner = _make_member(db_session, "Owner")
    other = _make_member(db_session, "Other")
    create = client.post(
        "/projects", json={"name": f"Original {uuid.uuid4().hex[:8]}"}, headers=_auth(owner)
    )
    project = create.json()

    new_name = f"Renamed {uuid.uuid4().hex[:8]}"
    new_description = "An updated description visible to everyone."
    patch = client.patch(
        f"/projects/{project['id']}",
        json={"name": new_name, "description": new_description},
        headers=_auth(owner),
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()["name"] == new_name
    assert patch.json()["description"] == new_description

    reread = client.get(f"/projects/{project['id']}", headers=_auth(other))
    assert reread.status_code == 200
    body = reread.json()
    assert body["name"] == new_name
    assert body["description"] == new_description


def test_ac011_blank_name_patch_returns_422_and_leaves_record_unchanged(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    original_name = f"Keep Me {uuid.uuid4().hex[:8]}"
    create = client.post("/projects", json={"name": original_name}, headers=_auth(member))
    project = create.json()

    patch = client.patch(
        f"/projects/{project['id']}", json={"name": "   "}, headers=_auth(member)
    )
    assert patch.status_code == 422, patch.text

    reread = client.get(f"/projects/{project['id']}", headers=_auth(member)).json()
    assert reread["name"] == original_name


def test_nfr003_a_few_dozen_projects_list_in_a_single_get_request(db_session: Session) -> None:
    member = _make_member(db_session)
    for _ in range(30):
        resp = client.post(
            "/projects", json={"name": f"Bulk {uuid.uuid4().hex[:10]}"}, headers=_auth(member)
        )
        assert resp.status_code == 201

    response = client.get("/projects", headers=_auth(member))

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 30
