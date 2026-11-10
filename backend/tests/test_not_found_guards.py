"""Unit tests for the 404 guards on the plain project and task routes.

GET/PATCH /projects/{id}, GET/POST /projects/{id}/tasks and GET/PATCH
/tasks/{id} all resolve the path id (`_get_project_or_404` /
`_get_task_or_404` in app/routers/backend.py) before doing anything else:
an id that names no row is a 404, not a validation error or a silently
empty result. The comment/checklist/label 404 guards are already covered
in tests/integration/test_task_details.py; this file covers the plain
project and task lookups that file does not touch.
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


def test_get_unknown_project_returns_404(db_session: Session) -> None:
    member = _make_member(db_session)
    response = client.get(f"/projects/{uuid.uuid4()}", headers=_auth(member))
    assert response.status_code == 404


def test_patch_unknown_project_returns_404(db_session: Session) -> None:
    member = _make_member(db_session)
    response = client.patch(
        f"/projects/{uuid.uuid4()}", json={"name": "New name"}, headers=_auth(member)
    )
    assert response.status_code == 404


def test_list_tasks_for_unknown_project_returns_404(db_session: Session) -> None:
    member = _make_member(db_session)
    response = client.get(f"/projects/{uuid.uuid4()}/tasks", headers=_auth(member))
    assert response.status_code == 404


def test_create_task_for_unknown_project_returns_404(db_session: Session) -> None:
    member = _make_member(db_session)
    response = client.post(
        f"/projects/{uuid.uuid4()}/tasks", json={"title": "Orphan"}, headers=_auth(member)
    )
    assert response.status_code == 404


def test_get_unknown_task_returns_404(db_session: Session) -> None:
    member = _make_member(db_session)
    response = client.get(f"/tasks/{uuid.uuid4()}", headers=_auth(member))
    assert response.status_code == 404


def test_patch_unknown_task_returns_404(db_session: Session) -> None:
    member = _make_member(db_session)
    response = client.patch(
        f"/tasks/{uuid.uuid4()}", json={"title": "Ghost"}, headers=_auth(member)
    )
    assert response.status_code == 404
