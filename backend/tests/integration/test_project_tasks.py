"""Integration tests for task creation and updates (US-006).

POST /projects/{id}/tasks, GET /projects/{id}/tasks, GET /tasks/{id} and
PATCH /tasks/{id} per the approved data model: a task has title,
description, owner_id, due_date and status (see
docs/sdlc/architecture/data-model.md and api/openapi.yaml). Members and
projects are seeded the same way tests/test_flat_access.py does: there is no
per-project membership, so any signed-in member may create or edit any task.
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import User
from app.security import create_access_token, hash_password

client = TestClient(app)

VALID_STATUSES = ["todo", "in_progress", "done"]


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
    response = client.post(
        f"/projects/{project_id}/tasks", json=payload, headers=_auth(member)
    )
    return response


def test_ac015_creating_a_task_with_a_title_appears_in_list_and_detail(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    title = f"Write the report {uuid.uuid4().hex[:8]}"

    create = _create_task(member, project["id"], title=title)
    assert create.status_code == 201, create.text
    task = create.json()
    assert task["title"] == title

    listed = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))
    assert listed.status_code == 200
    assert any(t["id"] == task["id"] and t["title"] == title for t in listed.json())

    detail = client.get(f"/tasks/{task['id']}", headers=_auth(member))
    assert detail.status_code == 200
    detail_body = detail.json()
    detail_task = detail_body.get("task", detail_body)
    assert detail_task["id"] == task["id"]
    assert detail_task["title"] == title


def test_ac016_owner_due_date_and_status_round_trip_on_create_and_patch(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    owner = _make_member(db_session, "Owner")
    project = _create_project(member)

    create = _create_task(
        member,
        project["id"],
        title="Round trip task",
        owner_id=owner["user"].id,
        due_date="2026-12-01",
        status="in_progress",
    )
    assert create.status_code == 201, create.text
    task = create.json()
    assert task["owner_id"] == owner["user"].id
    assert task["due_date"] == "2026-12-01"
    assert task["status"] == "in_progress"

    other_owner = _make_member(db_session, "OtherOwner")
    patch = client.patch(
        f"/tasks/{task['id']}",
        json={
            "owner_id": other_owner["user"].id,
            "due_date": "2026-12-15",
            "status": "done",
        },
        headers=_auth(member),
    )
    assert patch.status_code == 200, patch.text
    patched = patch.json()
    assert patched["owner_id"] == other_owner["user"].id
    assert patched["due_date"] == "2026-12-15"
    assert patched["status"] == "done"


def test_ac016_unknown_owner_id_on_create_returns_422_and_creates_nothing(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)

    response = _create_task(
        member, project["id"], title="Orphan owner", owner_id="not-a-real-user-id"
    )

    assert response.status_code == 422, response.text
    listed = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))
    assert listed.json() == []


def test_ac016_unknown_owner_id_on_patch_returns_422_and_leaves_task_unchanged(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"], title="Stays put").json()

    patch = client.patch(
        f"/tasks/{task['id']}", json={"owner_id": "not-a-real-user-id"}, headers=_auth(member)
    )
    assert patch.status_code == 422, patch.text

    reread = client.get(f"/tasks/{task['id']}", headers=_auth(member)).json()
    reread_task = reread.get("task", reread)
    assert reread_task["owner_id"] is None


def test_ac017_missing_title_returns_422_and_creates_no_task(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)

    response = client.post(
        f"/projects/{project['id']}/tasks", json={}, headers=_auth(member)
    )

    assert response.status_code == 422
    listed = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))
    assert listed.json() == []


def test_ac017_whitespace_only_title_returns_422_and_creates_no_task(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)

    response = _create_task(member, project["id"], title="    ")

    assert response.status_code == 422, response.text
    listed = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))
    assert listed.json() == []


def test_ac018_nfr007_patch_to_each_valid_status_persists_identically_in_detail_and_list(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"], title="Status walk").json()

    for target_status in VALID_STATUSES:
        patch = client.patch(
            f"/tasks/{task['id']}", json={"status": target_status}, headers=_auth(member)
        )
        assert patch.status_code == 200, patch.text
        assert patch.json()["status"] == target_status

        detail = client.get(f"/tasks/{task['id']}", headers=_auth(member)).json()
        detail_task = detail.get("task", detail)
        assert detail_task["status"] == target_status

        listed = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member)).json()
        listed_task = next(t for t in listed if t["id"] == task["id"])
        assert listed_task["status"] == target_status


def test_ac018_invalid_status_returns_422_and_leaves_task_unchanged(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"], title="Guarded", status="todo").json()

    patch = client.patch(
        f"/tasks/{task['id']}", json={"status": "not-a-real-status"}, headers=_auth(member)
    )
    assert patch.status_code == 422, patch.text

    reread = client.get(f"/tasks/{task['id']}", headers=_auth(member)).json()
    reread_task = reread.get("task", reread)
    assert reread_task["status"] == "todo"


def test_ac019_reassigning_owner_and_due_date_persists_and_is_visible_to_second_member(
    db_session: Session,
) -> None:
    member_a = _make_member(db_session, "MemberA")
    member_b = _make_member(db_session, "MemberB")
    new_owner = _make_member(db_session, "NewOwner")
    project = _create_project(member_a)
    task = _create_task(member_a, project["id"], title="Handoff").json()

    patch = client.patch(
        f"/tasks/{task['id']}",
        json={"owner_id": new_owner["user"].id, "due_date": "2026-11-20"},
        headers=_auth(member_a),
    )
    assert patch.status_code == 200, patch.text

    seen_by_b = client.get(f"/tasks/{task['id']}", headers=_auth(member_b)).json()
    seen_by_b_task = seen_by_b.get("task", seen_by_b)
    assert seen_by_b_task["owner_id"] == new_owner["user"].id
    assert seen_by_b_task["due_date"] == "2026-11-20"
