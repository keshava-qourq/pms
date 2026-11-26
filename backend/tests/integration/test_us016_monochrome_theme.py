"""Integration tests for US-016: monochrome theme and status distinction for
the Kanban board.

The monochrome rendering itself is a frontend concern; these tests cover the
Task API data the board relies on to place cards in the right column and to
tell columns apart without color: every task in a project's task list carries
its status value (AC-037), two tasks in different statuses are returned with
distinct, readable status text (AC-038), and a status change made the way a
board move would make it (PATCH /tasks/{id}) is saved and still correct when
the task is fetched again (AC-039).
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


def _create_task(member: dict, project_id: str, **overrides) -> dict:
    payload = {"title": "A task", **overrides}
    response = client.post(f"/projects/{project_id}/tasks", json=payload, headers=_auth(member))
    assert response.status_code == 201, response.text
    return response.json()


def test_tc001_task_list_returns_status_data_needed_for_monochrome_column_rendering(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)

    todo_task = _create_task(member, project["id"], title="Todo task", status="todo")
    in_progress_task = _create_task(
        member, project["id"], title="In progress task", status="in_progress"
    )
    done_task = _create_task(member, project["id"], title="Done task", status="done")

    response = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))

    assert response.status_code == 200, response.text
    listed = response.json()

    by_id = {t["id"]: t for t in listed}
    for task in (todo_task, in_progress_task, done_task):
        assert task["id"] in by_id
        assert "status" in by_id[task["id"]]

    assert by_id[todo_task["id"]]["status"] == "todo"
    assert by_id[in_progress_task["id"]]["status"] == "in_progress"
    assert by_id[done_task["id"]]["status"] == "done"


def test_tc003_task_statuses_are_returned_as_distinct_text_labels_for_column_differentiation(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)

    task_a = _create_task(member, project["id"], title="Task A", status="todo")
    task_b = _create_task(member, project["id"], title="Task B", status="done")

    response = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))

    assert response.status_code == 200, response.text
    listed = response.json()

    by_id = {t["id"]: t for t in listed}
    status_a = by_id[task_a["id"]]["status"]
    status_b = by_id[task_b["id"]]["status"]

    assert status_a == "todo"
    assert status_b == "done"
    assert status_a != status_b


def test_tc005_status_change_from_a_board_move_persists(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"], title="Movable card", status="todo")

    patch = client.patch(
        f"/tasks/{task['id']}", json={"status": "in_progress"}, headers=_auth(member)
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()["status"] == "in_progress"

    refetched = client.get(f"/tasks/{task['id']}", headers=_auth(member))
    assert refetched.status_code == 200, refetched.text
    refetched_body = refetched.json()
    refetched_task = refetched_body.get("task", refetched_body)
    assert refetched_task["status"] == "in_progress"
