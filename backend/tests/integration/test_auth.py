"""Integration tests for POST /auth/login, GET /auth/me and NFR-001 (US-001)."""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.security import JWT_ALGORITHM, JWT_SECRET_KEY, create_access_token

client = TestClient(app)


def test_ac001_login_with_correct_credentials_returns_token_and_user(seed_user) -> None:
    response = client.post(
        "/auth/login", json={"email": seed_user["email"], "password": seed_user["password"]}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]
    assert body["user"]["email"] == seed_user["email"]
    assert body["user"]["id"] == seed_user["user"].id
    assert body["user"]["is_admin"] is False

    # The returned token decodes to the same user (PyJWT, app secret).
    decoded = jwt.decode(body["access_token"], JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    assert decoded["sub"] == seed_user["user"].id


def test_ac002_login_with_unknown_email_is_rejected() -> None:
    response = client.post(
        "/auth/login", json={"email": "nobody@example.com", "password": "whatever"}
    )

    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_ac002_login_with_wrong_password_is_rejected(seed_user) -> None:
    response = client.post(
        "/auth/login", json={"email": seed_user["email"], "password": "not-the-password"}
    )

    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()
    # No credentials leak into a token.
    assert "access_token" not in response.json()


def test_ac_me_returns_signed_in_member_for_valid_token(seed_user) -> None:
    login = client.post(
        "/auth/login", json={"email": seed_user["email"], "password": seed_user["password"]}
    )
    token = login.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == seed_user["user"].id
    assert body["email"] == seed_user["email"]
    assert body["name"] == "Seed Member"
    assert body["is_admin"] is False


def test_ac_me_rejects_missing_token() -> None:
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_ac_me_rejects_malformed_token() -> None:
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_ac_me_rejects_expired_token(seed_user) -> None:
    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {
            "sub": seed_user["user"].id,
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})

    assert response.status_code == 401


def test_nfr001_protected_route_requires_a_valid_token() -> None:
    response = client.get("/projects")
    assert response.status_code == 401


def test_nfr001_protected_route_accepts_a_valid_token(seed_user) -> None:
    token = create_access_token(seed_user["user"].id)
    response = client.get("/projects", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_nfr001_login_route_needs_no_token() -> None:
    response = client.post("/auth/login", json={"email": "x@example.com", "password": "x"})
    assert response.status_code == 401  # reached the handler; not blocked by auth


def test_nfr001_accept_invite_route_needs_no_token() -> None:
    response = client.post("/auth/accept-invite", json={})
    assert response.status_code == 200


def test_nfr001_health_route_needs_no_token() -> None:
    response = client.get("/health")
    assert response.status_code == 200
