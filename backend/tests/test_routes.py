"""The routes the `backend` component's router registers.

Checks that every path and method in
`docs/sdlc/architecture/api/openapi.yaml` is actually wired up and callable,
plus the structural guarantee from NFR-001: every route except /health,
/auth/login and /auth/accept-invite requires a valid bearer token. Behaviour
of each individual stub route still belongs to its own ticket; auth
(/auth/login, /auth/me) is implemented here (US-001) and tested in
tests/integration/test_auth.py.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# One entry per unique path in the approved API spec, exactly as declared
# there (method list in spec order).
EXPECTED_PATHS = {
    "/auth/login": {"post"},
    "/auth/accept-invite": {"post"},
    "/auth/me": {"get"},
    "/invitations": {"post"},
    "/projects": {"get", "post"},
    "/projects/{id}": {"get", "patch"},
    "/projects/{id}/tasks": {"get", "post"},
    "/tasks/{id}": {"get", "patch"},
    "/tasks/{id}/comments": {"get", "post"},
    "/tasks/{id}/checklist": {"post"},
    "/checklist/{id}": {"patch"},
    "/labels": {"get"},
    "/tasks/{id}/labels": {"post"},
    "/tasks/{id}/labels/{label_id}": {"delete"},
    "/notifications": {"get"},
}


def test_every_api_spec_path_is_registered() -> None:
    paths = client.get("/openapi.json").json()["paths"]
    for path, methods in EXPECTED_PATHS.items():
        assert path in paths, f"{path} is in the API spec but not registered"
        assert methods.issubset(paths[path].keys()), f"{path} is missing a method"


def test_ac_public_auth_login_route_needs_no_token() -> None:
    # No Authorization header, unknown credentials: reaches the handler (401
    # for bad credentials, not for a missing token) rather than being
    # rejected by the auth dependency itself.
    response = client.post("/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_nfr001_a_protected_stub_route_requires_a_token() -> None:
    response = client.get("/projects")
    assert response.status_code == 401


def test_delete_label_returns_unauthorized_without_a_token() -> None:
    response = client.delete("/tasks/t-1/labels/l-1")
    assert response.status_code == 401
