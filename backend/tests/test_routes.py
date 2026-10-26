"""The stub routes the `backend` component's router registers.

This does not test behaviour -- every handler returns the same typed
placeholder -- it tests that the scaffold's structure matches the approved
API spec: every path and method in
`docs/sdlc/architecture/api/openapi.yaml` is actually wired up and callable,
so a development ticket can replace one stub at a time without first
discovering the route was never registered.
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


def test_a_public_stub_route_needs_no_token() -> None:
    response = client.post("/auth/login", json={})
    assert response.status_code == 200
    assert response.json()["endpoint"] == "POST /auth/login"


def test_a_protected_stub_route_is_callable_without_enforcing_auth_yet() -> None:
    # No Authorization header: the stub records the requirement in the OpenAPI
    # document (see app/routers/backend.py) but does not enforce it, since
    # enforcing it needs real users -- that is feature work for later.
    response = client.get("/projects")
    assert response.status_code == 200
    assert response.json()["endpoint"] == "GET /projects"


def test_delete_label_returns_no_content() -> None:
    response = client.delete("/tasks/t-1/labels/l-1")
    assert response.status_code == 204
    assert response.content == b""
