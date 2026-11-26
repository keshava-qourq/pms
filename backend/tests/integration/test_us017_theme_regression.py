"""Integration tests for US-017: visual regression and accessibility check for the
new monochrome theme.

These tests do not check pixels or rendering: they confirm that the data each
delivered screen depends on loads correctly (TC-014) and that the core functional
flows behind sign-in, project creation, task creation and status change still
behave exactly as before the theme restyle (TC-015).
"""


def test_tc014_screen_data_loads_without_error(auth_client):
    """TC-014: underlying data for each restyled screen loads without error."""

    # Preconditions: a project with a task, a comment, a checklist item and a label.
    project_resp = auth_client.post(
        "/projects", json={"name": "Theme Regression Project"}
    )
    assert project_resp.status_code == 201
    project = project_resp.json()
    project_id = project["id"]

    task_resp = auth_client.post(
        f"/projects/{project_id}/tasks",
        json={"title": "Theme Regression Task"},
    )
    assert task_resp.status_code == 201
    task = task_resp.json()
    task_id = task["id"]

    comment_resp = auth_client.post(
        f"/tasks/{task_id}/comments",
        json={"body": "Looks fine in the monochrome theme"},
    )
    assert comment_resp.status_code == 201

    checklist_resp = auth_client.post(
        f"/tasks/{task_id}/checklist",
        json={"text": "Check contrast on mobile width"},
    )
    assert checklist_resp.status_code == 201

    label_resp = auth_client.post(
        "/labels",
        json={"name": "Theme QA", "color": "#000000"},
    )
    assert label_resp.status_code == 201
    label = label_resp.json()

    attach_label_resp = auth_client.patch(
        f"/tasks/{task_id}",
        json={"labelIds": [label["id"]]},
    )
    assert attach_label_resp.status_code == 200

    # Step 1: GET /projects -> data for the Projects overview screen.
    projects_resp = auth_client.get("/projects")
    assert projects_resp.status_code == 200
    projects = projects_resp.json()
    assert any(p["id"] == project_id for p in projects)

    # Step 2: GET /projects/{id} -> data for the Project workspace screen.
    project_detail_resp = auth_client.get(f"/projects/{project_id}")
    assert project_detail_resp.status_code == 200
    assert project_detail_resp.json()["id"] == project_id

    # Step 3: GET /projects/{id}/tasks -> data for the Kanban board.
    tasks_resp = auth_client.get(f"/projects/{project_id}/tasks")
    assert tasks_resp.status_code == 200
    tasks = tasks_resp.json()
    assert any(t["id"] == task_id for t in tasks)

    # Step 4: GET /tasks/{id} -> data for the Task detail screen, with comments,
    # checklist and labels.
    task_detail_resp = auth_client.get(f"/tasks/{task_id}")
    assert task_detail_resp.status_code == 200
    task_detail = task_detail_resp.json()
    assert task_detail["id"] == task_id
    assert len(task_detail.get("comments", [])) >= 1
    assert len(task_detail.get("checklist", [])) >= 1
    assert len(task_detail.get("labels", [])) >= 1

    # Step 5: GET /labels -> data used to render labels on Task detail and board/list.
    labels_resp = auth_client.get("/labels")
    assert labels_resp.status_code == 200
    labels = labels_resp.json()
    assert any(l["id"] == label["id"] for l in labels)


def test_tc015_core_flows_work_after_restyle(client):
    """TC-015: sign-in, create project, create task and status change (drag)
    still work after the restyle."""

    email = "alice@example.com"
    password = "Alice123!"

    # Precondition: a registered team member account exists with known
    # email and password.
    register_resp = client.post(
        "/auth/register",
        json={"name": "Alice", "email": email, "password": password},
    )
    assert register_resp.status_code in (200, 201)

    # Step 1: POST /auth/login -> sign-in behaves unchanged.
    login_resp = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    assert token

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: POST /projects -> project creation behaves unchanged.
    project_resp = client.post(
        "/projects",
        json={"name": "Regression Project"},
        headers=headers,
    )
    assert project_resp.status_code == 201
    project = project_resp.json()
    project_id = project["id"]
    assert project["name"] == "Regression Project"

    # Step 3: POST /projects/{id}/tasks -> task creation behaves unchanged.
    task_resp = client.post(
        f"/projects/{project_id}/tasks",
        json={"title": "Verify Drag"},
        headers=headers,
    )
    assert task_resp.status_code == 201
    task = task_resp.json()
    task_id = task["id"]
    assert task["title"] == "Verify Drag"

    # Step 4: PATCH /tasks/{id} -> status change (equivalent to dragging a
    # card) behaves unchanged.
    status_resp = client.patch(
        f"/tasks/{task_id}",
        json={"status": "In Progress"},
        headers=headers,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "In Progress"
