"""Unit tests for the label catalogue seeding and idempotent attach.

GET /labels seeds a default label catalogue the first time it is read
(`_ensure_default_labels` in app/routers/backend.py), and must not grow it
further on later reads. POST /tasks/{id}/labels is idempotent: attaching an
already-attached label is a no-op, not a duplicate row or a conflict. The
happy-path attach/detach flow and the 404 guards are already covered in
tests/integration/test_task_details.py; this file covers the seeding
behaviour and the repeat-attach no-op that file does not touch.
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.main import app
from app.models import Label, User
from app.routers.backend import DEFAULT_LABELS, _ensure_default_labels
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


def _create_task(member: dict, project_id: str) -> dict:
    response = client.post(
        f"/projects/{project_id}/tasks", json={"title": "A task"}, headers=_auth(member)
    )
    assert response.status_code == 201, response.text
    return response.json()


def _create_label(db_session: Session, name: str, color: str = "#123456") -> dict:
    label_id = str(uuid.uuid4())
    db_session.execute(
        text("INSERT INTO labels (id, name, color) VALUES (:id, :name, :color)"),
        {"id": label_id, "name": name, "color": color},
    )
    db_session.commit()
    return {"id": label_id, "name": name, "color": color}


def test_ensure_default_labels_seeds_once_and_a_second_call_adds_nothing(
    db_session: Session,
) -> None:
    before_count = db_session.query(Label).count()

    _ensure_default_labels(db_session)
    after_first = db_session.query(Label).count()

    if before_count == 0:
        # The table was empty: this call is the one that seeds it.
        names = {label.name for label in db_session.query(Label).all()}
        assert names == {name for name, _ in DEFAULT_LABELS}
        assert after_first == len(DEFAULT_LABELS)
    else:
        # Some row already existed (this suite's own fixtures, or another
        # test's direct insert): seeding must not run a second time.
        assert after_first == before_count

    _ensure_default_labels(db_session)
    after_second = db_session.query(Label).count()
    assert after_second == after_first, "reading the label catalogue twice must not duplicate it"


def test_get_labels_returns_a_stable_non_empty_catalogue_on_repeated_reads(
    db_session: Session,
) -> None:
    member = _make_member(db_session)

    first = client.get("/labels", headers=_auth(member))
    second = client.get("/labels", headers=_auth(member))

    assert first.status_code == 200
    assert second.status_code == 200
    first_body = first.json()
    assert first_body, "GET /labels must return a non-empty catalogue"
    for label in first_body:
        assert {"id", "name"}.issubset(label.keys())
    assert len(second.json()) == len(first_body)


def test_attaching_an_already_attached_label_is_a_noop(db_session: Session) -> None:
    member = _make_member(db_session)
    project = _create_project(member)
    task = _create_task(member, project["id"])
    label = _create_label(db_session, name=f"Dup-{uuid.uuid4().hex[:6]}")

    first = client.post(
        f"/tasks/{task['id']}/labels", json={"label_id": label["id"]}, headers=_auth(member)
    )
    assert first.status_code == 200, first.text

    second = client.post(
        f"/tasks/{task['id']}/labels", json={"label_id": label["id"]}, headers=_auth(member)
    )
    assert second.status_code == 200, second.text

    detail = client.get(f"/tasks/{task['id']}", headers=_auth(member)).json()
    matching = [entry for entry in detail["labels"] if entry["id"] == label["id"]]
    assert len(matching) == 1, "attaching the same label twice must not duplicate it"
