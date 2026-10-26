"""Integration tests for POST /invitations and POST /auth/accept-invite (US-002)."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import Invitation, User
from app.security import create_access_token, hash_password

client = TestClient(app)


def _make_admin(db_session: Session) -> dict:
    email = f"admin-{uuid.uuid4().hex[:10]}@example.com"
    user = User(email=email, password_hash=hash_password("x"), name="Admin", is_admin=True)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return {"user": user, "token": create_access_token(user.id)}


def _make_invitation(
    db_session: Session, email: str, status: str = "pending", expired: bool = False
) -> Invitation:
    admin = _make_admin(db_session)
    invitation = Invitation(
        email=email,
        token=uuid.uuid4().hex,
        status=status,
        invited_by=admin["user"].id,
        expires_at=datetime.now(UTC) + (timedelta(days=-1) if expired else timedelta(days=7)),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    return invitation


def test_ac004_admin_creates_invitation_and_gets_201(db_session: Session, monkeypatch) -> None:
    sent = []
    monkeypatch.setattr(
        "app.routers.backend.send_invitation_email.delay", lambda inv_id: sent.append(inv_id)
    )
    admin = _make_admin(db_session)
    email = f"invitee-{uuid.uuid4().hex[:10]}@example.com"

    response = client.post(
        "/invitations",
        json={"email": email},
        headers={"Authorization": f"Bearer {admin['token']}"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == email
    assert body["status"] == "pending"
    assert body["invited_by"] == admin["user"].id

    invitation = db_session.query(Invitation).filter(Invitation.email == email).first()
    assert invitation is not None
    assert sent == [invitation.id]


def test_ac005_non_admin_is_forbidden_and_creates_nothing(seed_user, db_session: Session) -> None:
    token = create_access_token(seed_user["user"].id)
    email = f"invitee-{uuid.uuid4().hex[:10]}@example.com"

    response = client.post(
        "/invitations",
        json={"email": email},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert db_session.query(Invitation).filter(Invitation.email == email).first() is None


def test_ac006_inviting_an_existing_member_returns_409_and_creates_no_invitation(
    seed_user, db_session: Session
) -> None:
    admin = _make_admin(db_session)

    response = client.post(
        "/invitations",
        json={"email": seed_user["email"]},
        headers={"Authorization": f"Bearer {admin['token']}"},
    )

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()
    assert (
        db_session.query(Invitation).filter(Invitation.email == seed_user["email"]).first() is None
    )
    assert db_session.query(User).filter(User.email == seed_user["email"]).count() == 1


def test_ac004_accept_invite_with_valid_token_creates_account_and_signs_in(
    db_session: Session,
) -> None:
    email = f"invitee-{uuid.uuid4().hex[:10]}@example.com"
    invitation = _make_invitation(db_session, email)

    response = client.post(
        "/auth/accept-invite",
        json={"token": invitation.token, "password": "new-password-123", "name": "New Member"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == email
    assert isinstance(body["access_token"], str) and body["access_token"]

    created = db_session.query(User).filter(User.email == email).first()
    assert created is not None
    db_session.refresh(invitation)
    assert invitation.status == "accepted"


def test_ac004_accept_invite_with_invalid_token_returns_400() -> None:
    response = client.post(
        "/auth/accept-invite", json={"token": "not-a-real-token", "password": "x"}
    )
    assert response.status_code == 400


def test_ac004_accept_invite_with_expired_token_returns_400(db_session: Session) -> None:
    email = f"invitee-{uuid.uuid4().hex[:10]}@example.com"
    invitation = _make_invitation(db_session, email, expired=True)

    response = client.post("/auth/accept-invite", json={"token": invitation.token, "password": "x"})

    assert response.status_code == 400


def test_ac004_accept_invite_with_already_used_token_returns_400(db_session: Session) -> None:
    email = f"invitee-{uuid.uuid4().hex[:10]}@example.com"
    invitation = _make_invitation(db_session, email, status="accepted")

    response = client.post("/auth/accept-invite", json={"token": invitation.token, "password": "x"})

    assert response.status_code == 400
