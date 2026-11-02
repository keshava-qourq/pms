"""Integration tests for comments, checklist items and labels (US-010-4).

POST/GET /tasks/{id}/comments, POST /tasks/{id}/checklist, PATCH
/checklist/{id}, GET /labels, POST /tasks/{id}/labels and
DELETE /tasks/{id}/labels/{label_id} per docs/sdlc/architecture/data-model.md
and api/openapi.yaml. Labels have no create endpoint in the spec, so tests
seed rows directly into the `labels` table with raw SQL rather than
inventing an ORM shortcut the app does not expose.
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text
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


def _create_label(db_session: Session, name: str = "Bug", color: str = "#ff0000") -> dict:
    label_id = str(uuid.uuid4())
    db_session.execute(
        text("INSERT INTO labels (id, name, color) VALUES (:id, :name, :color)"),
        {"id": label_id, "name": name, "color": color},
    )
    db_session.commit()
    return {"id": label_id, "name": name, "color": color}


def _task_detail(member: dict, task_id: str) -> dict:
    response = client.get(f"/tasks/{task_id}", headers=_auth(member))
    assert response.status_code == 200, response.text
    return response.json()


def _author_name(comment: dict, member: dict) -> str | None:
    if "author_name" in comment:
        return comment["author_name"]
    author = comment.get("author")
    if isinstance(author, dict):
        return author.get("name")
    return None


def _labels_from_detail(detail: dict) -> list:
    return detail.get("labels", [])


def _checklist_from_detail(detail: dict) -> list:
    return detail.get("checklist", [])


# ---- comments (AC-024, AC-025, AC-026) ------------------------------------


def test_ac024_comment_saved_and_visible_to_a_second_member_with_author_name_and_timestamp(
    db_session: Session,
) -> None:
    author = _make_member(db_session, "Author")
    other = _make_member(db_session, "Other")
    project = _create_project(author)
    task = _create_task(author, project["id"])

    response = client.post(
        f"/tasks/{task['id']}/comments", json={"body": "Looks good to me."}, headers=_auth(author)
    )
    assert response.status_code == 201, response.text
    created = response.json()
    assert created["body"] == "Looks good to me."
    assert created["author_id"] == author["user"].id
    assert created.get("created_at")
    assert _author_name(created, author) == "Author"

    listed = client.get(f"/tasks/{task['id']}/comments", headers=_auth(other))
    assert listed.status_code == 200
    comments = listed.json()
    match = next((c for c in comments if c["id"] == created["id"]), None)
    assert match is not None
    assert match["author_id"] == author["user"].id
    assert match.get("created_at")
    assert _author_name(match, author) == "Author"


def test_ac025_comments_are_returned_in_chronological_order(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])

    bodies = ["First comment", "Second comment", "Third comment"]
    for body in bodies:
        response = client.post(
            f"/tasks/{task['id']}/comments", json={"body": body}, headers=_auth(member)
        )
        assert response.status_code == 201, response.text

    listed = client.get(f"/tasks/{task['id']}/comments", headers=_auth(member))
    assert listed.status_code == 200
    comments = listed.json()
    our_comments = [c for c in comments if c["body"] in bodies]
    assert [c["body"] for c in our_comments] == bodies
    timestamps = [c["created_at"] for c in our_comments]
    assert timestamps == sorted(timestamps)


def test_ac026_empty_body_returns_422_and_creates_nothing(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])

    before = client.get(f"/tasks/{task['id']}/comments", headers=_auth(member)).json()

    response = client.post(
        f"/tasks/{task['id']}/comments", json={"body": ""}, headers=_auth(member)
    )

    assert response.status_code == 422, response.text
    after = client.get(f"/tasks/{task['id']}/comments", headers=_auth(member)).json()
    assert after == before


def test_ac026_whitespace_only_body_returns_422_and_creates_nothing(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])

    before = client.get(f"/tasks/{task['id']}/comments", headers=_auth(member)).json()

    response = client.post(
        f"/tasks/{task['id']}/comments", json={"body": "    "}, headers=_auth(member)
    )

    assert response.status_code == 422, response.text
    after = client.get(f"/tasks/{task['id']}/comments", headers=_auth(member)).json()
    assert after == before


# ---- checklist (AC-027, AC-028) -------------------------------------------


def test_ac027_new_checklist_item_is_incomplete(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])

    response = client.post(
        f"/tasks/{task['id']}/checklist", json={"title": "Write tests"}, headers=_auth(member)
    )

    assert response.status_code == 201, response.text
    item = response.json()
    assert item["title"] == "Write tests"
    assert item["is_complete"] is False


def test_ac028_toggle_persists_and_detail_reports_done_total_counts(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])

    item_a = client.post(
        f"/tasks/{task['id']}/checklist", json={"title": "First"}, headers=_auth(member)
    ).json()
    item_b = client.post(
        f"/tasks/{task['id']}/checklist", json={"title": "Second"}, headers=_auth(member)
    ).json()

    toggle = client.patch(
        f"/checklist/{item_a['id']}", json={"is_complete": True}, headers=_auth(member)
    )
    assert toggle.status_code == 200, toggle.text
    assert toggle.json()["is_complete"] is True

    # Persists across a fresh request.
    detail = _task_detail(member, task["id"])
    checklist = _checklist_from_detail(detail)
    by_id = {entry["id"]: entry for entry in checklist}
    assert by_id[item_a["id"]]["is_complete"] is True
    assert by_id[item_b["id"]]["is_complete"] is False

    total = len(checklist)
    done = sum(1 for entry in checklist if entry["is_complete"])
    assert total == 2
    assert done == 1


# ---- labels (AC-029, AC-030) ----------------------------------------------


def test_ac029_labels_attach_and_appear_in_task_detail_and_project_task_list(
    db_session: Session,
) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])
    label = _create_label(db_session, name=f"Urgent-{uuid.uuid4().hex[:6]}")

    response = client.post(
        f"/tasks/{task['id']}/labels", json={"label_id": label["id"]}, headers=_auth(member)
    )
    assert response.status_code in (200, 201), response.text

    detail = _task_detail(member, task["id"])
    label_ids = [entry.get("id") or entry.get("label_id") for entry in _labels_from_detail(detail)]
    assert label["id"] in label_ids

    listed = client.get(f"/projects/{project['id']}/tasks", headers=_auth(member))
    assert listed.status_code == 200
    listed_task = next(t for t in listed.json() if t["id"] == task["id"])
    listed_label_ids = [
        entry.get("id") or entry.get("label_id") for entry in listed_task.get("labels", [])
    ]
    assert label["id"] in listed_label_ids


def test_ac030_delete_label_removes_it_and_returns_204(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])
    label = _create_label(db_session, name=f"Removable-{uuid.uuid4().hex[:6]}")

    attach = client.post(
        f"/tasks/{task['id']}/labels", json={"label_id": label["id"]}, headers=_auth(member)
    )
    assert attach.status_code in (200, 201), attach.text

    response = client.delete(f"/tasks/{task['id']}/labels/{label['id']}", headers=_auth(member))
    assert response.status_code == 204
    assert response.content == b""

    detail = _task_detail(member, task["id"])
    label_ids = [entry.get("id") or entry.get("label_id") for entry in _labels_from_detail(detail)]
    assert label["id"] not in label_ids


# ---- auth and not-found guards ---------------------------------------------


def test_nfr001_comment_checklist_and_label_routes_require_a_token(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])
    item = client.post(
        f"/tasks/{task['id']}/checklist", json={"title": "Guarded"}, headers=_auth(member)
    ).json()
    label = _create_label(db_session, name=f"NoAuth-{uuid.uuid4().hex[:6]}")

    assert client.get(f"/tasks/{task['id']}/comments").status_code == 401
    assert client.post(f"/tasks/{task['id']}/comments", json={"body": "x"}).status_code == 401
    assert client.post(f"/tasks/{task['id']}/checklist", json={"title": "x"}).status_code == 401
    assert client.patch(f"/checklist/{item['id']}", json={"is_complete": True}).status_code == 401
    assert client.get("/labels").status_code == 401
    assert (
        client.post(f"/tasks/{task['id']}/labels", json={"label_id": label["id"]}).status_code
        == 401
    )
    assert client.delete(f"/tasks/{task['id']}/labels/{label['id']}").status_code == 401


def test_ac_unknown_task_id_returns_404_for_comments_and_checklist(db_session: Session) -> None:
    member = _make_member(db_session)
    unknown_task_id = str(uuid.uuid4())

    assert (
        client.get(f"/tasks/{unknown_task_id}/comments", headers=_auth(member)).status_code == 404
    )
    assert (
        client.post(
            f"/tasks/{unknown_task_id}/comments", json={"body": "x"}, headers=_auth(member)
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/tasks/{unknown_task_id}/checklist",
            json={"title": "x"},
            headers=_auth(member),
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/tasks/{unknown_task_id}/labels",
            json={"label_id": str(uuid.uuid4())},
            headers=_auth(member),
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/tasks/{unknown_task_id}/labels/{uuid.uuid4()}", headers=_auth(member)
        ).status_code
        == 404
    )


def test_ac_unknown_checklist_id_returns_404(db_session: Session) -> None:
    member = _make_member(db_session)
    response = client.patch(
        f"/checklist/{uuid.uuid4()}", json={"is_complete": True}, headers=_auth(member)
    )
    assert response.status_code == 404


def test_ac_unknown_label_id_returns_404(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])

    attach = client.post(
        f"/tasks/{task['id']}/labels",
        json={"label_id": str(uuid.uuid4())},
        headers=_auth(member),
    )
    assert attach.status_code == 404

    delete = client.delete(f"/tasks/{task['id']}/labels/{uuid.uuid4()}", headers=_auth(member))
    assert delete.status_code == 404
