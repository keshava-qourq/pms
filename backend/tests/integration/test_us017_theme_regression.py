"""Integration tests for US-017: visual regression and accessibility check for the
new monochrome theme.

These tests do not check pixels or rendering: they confirm that the data each
delivered screen depends on loads correctly (TC-014) and that the core functional
flows behind sign-in, project creation, task creation and status change still
behave exactly as before the theme restyle (TC-015).
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.main import app
from app.models import User
from app.security import create_access_token, hash_password

client = TestClient(app)


def _make_member(db_session, name: str = "Member") -> dict:
    email = f"{name.lower()}-{uuid.uuid4().hex[:10]}@example.com"
    user = User(email=email, password_hash=hash_password("x"), name=name, is_admin=False)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return {"user": user, "token": create_access_token(user.id)}


def _auth(member: dict) -> dict:
    return {"Authorization": f"Bearer {member['token']}"}


def _create_label(db_session, name: str, color: str = "#000000") -> dict:
    # Labels have no create endpoint in the spec (only GET /labels is
    # defined), so this seeds the row directly, the same way
    # tests/integration/test_task_details.py does.
    label_id = str(uuid.uuid4())
    db_session.execute(
        text("INSERT INTO labels (id, name, color) VALUES (:id, :name, :color)"),
        {"id": label_id, "name": name, "color": color},
    )
    db_session.commit()
    return {"id": label_id, "name": name, "color": color}


def test_tc014_screen_data_loads_without_error(db_session: Session):
    """TC-014: underlying data for each restyled screen loads without error."""

    member = _make_member(db_session)

    # Preconditions: a project with a task, a comment, a checklist item and a label.
    project_resp = client.post(
        "/projects", json={"name": "Theme Regression Project"}, headers=_auth(member)
    )
    assert project_resp.status_code == 201
    project = project_resp.json()
    project_id = project["id"]

    task_resp = client.post(
        f"/projects/{project_id}/tasks",
        json={"title": "Theme Regression Task"},
        headers=_auth(member),
    )
    assert task_resp.status_code == 201
    task = task_resp.json()
    task_id = task["id"]

    comment_resp = client.post(
        f"/tasks/{task_id}/comments",
        json={"body": "Looks fine in the monochrome theme"},
        headers=_auth(member),
    )
    assert comment_resp.status_code == 201

    checklist_resp = client.post(
        f"/tasks/{task_id}/checklist",
        json={"title": "Check contrast on mobile width"},
        headers=_auth(member),
    )
    assert checklist_resp.status_code == 201

    label = _create_label(db_session, name=f"Theme QA {uuid.uuid4().hex[:6]}")

    attach_label_resp = client.post(
        f"/tasks/{task_id}/labels",
        json={"label_id": label["id"]},
        headers=_auth(member),
    )
    assert attach_label_resp.status_code in (200, 201)

    # Step 1: GET /projects -> data for the Projects overview screen.
    projects_resp = client.get("/projects", headers=_auth(member))
    assert projects_resp.status_code == 200
    projects = projects_resp.json()
    assert any(row.get("project", row).get("id") == project_id for row in projects)

    # Step 2: GET /projects/{id} -> data for the Project workspace screen.
    project_detail_resp = client.get(f"/projects/{project_id}", headers=_auth(member))
    assert project_detail_resp.status_code == 200
    assert project_detail_resp.json()["id"] == project_id

    # Step 3: GET /projects/{id}/tasks -> data for the Kanban board.
    tasks_resp = client.get(f"/projects/{project_id}/tasks", headers=_auth(member))
    assert tasks_resp.status_code == 200
    tasks = tasks_resp.json()
    assert any(t["id"] == task_id for t in tasks)

    # Step 4: GET /tasks/{id} -> data for the Task detail screen, with comments,
    # checklist and labels.
    task_detail_resp = client.get(f"/tasks/{task_id}", headers=_auth(member))
    assert task_detail_resp.status_code == 200
    task_detail_body = task_detail_resp.json()
    task_detail = task_detail_body.get("task", task_detail_body)
    assert task_detail["id"] == task_id
    assert len(task_detail_body.get("comments", [])) >= 1
    assert len(task_detail_body.get("checklist", [])) >= 1
    assert len(task_detail_body.get("labels", [])) >= 1

    # Step 5: GET /labels -> data used to render labels on Task detail and board/list.
    labels_resp = client.get("/labels", headers=_auth(member))
    assert labels_resp.status_code == 200
    labels = labels_resp.json()
    assert any(entry["id"] == label["id"] for entry in labels)


def test_tc015_core_flows_work_after_restyle(client):
    """TC-015: sign-in, create project, create task and status change (drag)
    still work after the restyle."""

    email = "alice@example.com"
    password = "Alice123!"

    # Precondition: a registered team member account exists with known
    # email and password.
    register_resp = client.post(
        "/auth/register",
        json={"name": "Alice", "email": email, "password": password},
    )
    assert register_resp.status_code in (200, 201)

    # Step 1: POST /auth/login -> sign-in behaves unchanged.
    login_resp = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    assert token

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: POST /projects -> project creation behaves unchanged.
    project_resp = client.post(
        "/projects",
        json={"name": "Regression Project"},
        headers=headers,
    )
    assert project_resp.status_code == 201
    project = project_resp.json()
    project_id = project["id"]
    assert project["name"] == "Regression Project"

    # Step 3: POST /projects/{id}/tasks -> task creation behaves unchanged.
    task_resp = client.post(
        f"/projects/{project_id}/tasks",
        json={"title": "Verify Drag"},
        headers=headers,
    )
    assert task_resp.status_code == 201
    task = task_resp.json()
    task_id = task["id"]
    assert task["title"] == "Verify Drag"

    # Step 4: PATCH /tasks/{id} -> status change (equivalent to dragging a
    # card) behaves unchanged.
    status_resp = client.patch(
        f"/tasks/{task_id}",
        json={"status": "In Progress"},
        headers=headers,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "In Progress"
