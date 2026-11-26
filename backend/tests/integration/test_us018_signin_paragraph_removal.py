"""Integration tests for US-018: remove descriptive paragraph from sign-in form.

The paragraph removal is a front-end-only change. These tests confirm the
authentication API behind the sign-in form (login, session lookup, and the
validation/error contract the form's error state relies on) keeps working
exactly as before, for both the happy path and the error paths.
"""

import secrets


def test_tc018_auth_session_endpoint_confirms_user_identity_after_sign_in(client):
    """TC-018: login then GET /auth/me confirms the full auth flow still works."""

    email = "alice@example.com"
    password = secrets.token_urlsafe(16)

    # Precondition: a registered user exists with this email and password.
    register_resp = client.post(
        "/auth/register",
        json={"name": "Alice", "email": email, "password": password},
    )
    assert register_resp.status_code in (200, 201)

    # Step 1: POST /auth/login -> 200 with a JWT token.
    login_resp = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    assert token

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: GET /auth/me -> 200, shows the signed-in user's email.
    me_resp = client.get("/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email


def test_tc020_login_validation_error_returned_correctly_for_missing_password(client):
    """TC-020: POST /auth/login without a password returns a validation error."""

    # Step 1: call POST /auth/login with only an email, no password.
    login_resp = client.post(
        "/auth/login",
        json={"email": "alice@example.com"},
    )

    # Expected: a validation error indicating the password is required.
    assert login_resp.status_code == 422
    body = login_resp.json()
    assert "password" in str(body).lower()


def test_tc023_login_succeeds_with_valid_credentials(client):
    """TC-023: login with correct credentials returns 200 and a JWT token."""

    email = "bob@example.com"
    password = secrets.token_urlsafe(16)

    # Precondition: a registered user exists with this email and password.
    register_resp = client.post(
        "/auth/register",
        json={"name": "Bob", "email": email, "password": password},
    )
    assert register_resp.status_code in (200, 201)

    # Step 1: POST /auth/login with valid credentials -> 200 with a JWT token.
    login_resp = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["token"]


def test_tc024_login_fails_with_invalid_credentials(client):
    """TC-024: login with an incorrect password returns 401."""

    email = "carol@example.com"
    password = secrets.token_urlsafe(16)
    wrong_password = secrets.token_urlsafe(16)

    # Precondition: a registered user exists with this email and password.
    register_resp = client.post(
        "/auth/register",
        json={"name": "Carol", "email": email, "password": password},
    )
    assert register_resp.status_code in (200, 201)

    # Step 1: POST /auth/login with an incorrect password -> 401, invalid
    # credentials.
    login_resp = client.post(
        "/auth/login",
        json={"email": email, "password": wrong_password},
    )
    assert login_resp.status_code == 401
    body = login_resp.json()
    assert "credential" in str(body).lower() or "invalid" in str(body).lower()
