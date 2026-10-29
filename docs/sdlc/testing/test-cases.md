# Tests

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start summary -->
110 tests · Passed 90 · Failed 0 · Skipped 3 · Not run 17

Acceptance criteria covered: 19/41 · passing: 4/41
<!-- sdlc:auto:end summary -->

<!-- sdlc:auto:start tests -->
## Sprint 1

### US-001: Sign in with email and password

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| — | test_ac_public_auth_login_route_needs_no_token | Unit | Passed | `backend/tests/test_routes.py` |
| — | test_delete_label_returns_unauthorized_without_a_token | Unit | Passed | `backend/tests/test_routes.py` |
| — | test_every_api_spec_path_is_registered | Unit | Passed | `backend/tests/test_routes.py` |
| — | test_nfr001_a_protected_stub_route_requires_a_token | Unit | Passed | `backend/tests/test_routes.py` |
| — | test_ac_expired_jwt_is_rejected | Unit | Passed | `backend/tests/test_security.py` |
| — | test_ac_jwt_round_trip_with_pyjwt | Unit | Passed | `backend/tests/test_security.py` |
| — | test_ac_malformed_jwt_is_rejected | Unit | Passed | `backend/tests/test_security.py` |
| — | test_ac_passwords_are_stored_only_as_passlib_hashes | Unit | Passed | `backend/tests/test_security.py` |
| — | test_ac_wrong_password_does_not_verify | Unit | Passed | `backend/tests/test_security.py` |
| AC-003 | App > [AC-003][NFR-001] redirects an unauthenticated visit to /project, /task, /team to /sign-in | Unit | Passed | `frontend/src/App.test.tsx` |
| AC-003 | App > [AC-003][NFR-001] redirects an unauthenticated visit to /projects to /sign-in | Unit | Passed | `frontend/src/App.test.tsx` |
| — | App > renders a screen inside the app shell and shows its menu when signed in | Unit | Passed | `frontend/src/App.test.tsx` |
| — | apiFetch > attaches the stored JWT as the Authorization bearer | Unit | Passed | `frontend/src/lib/api.test.ts` |
| — | apiFetch > does not clear an (absent) session on a 401 from /auth/login itself | Unit | Passed | `frontend/src/lib/api.test.ts` |
| — | apiFetch > on a 401 response clears the session | Unit | Passed | `frontend/src/lib/api.test.ts` |
| AC-001 | SignIn > [AC-001] submits email and password to POST /auth/login, stores the session and lands on projects | Unit | Passed | `frontend/src/screens/SignIn.test.tsx` |
| AC-002 | SignIn > [AC-002] shows the invalid-credentials error on 401, stays on the page and stores no token | Unit | Passed | `frontend/src/screens/SignIn.test.tsx` |
| AC-003 | SignIn > [AC-003] after signing in via a redirect, lands back on the originally requested page | Unit | Passed | `frontend/src/screens/SignIn.test.tsx` |
| — | SignIn > removes the seeded demo-credentials hint | Unit | Passed | `frontend/src/screens/SignIn.test.tsx` |
| AC-001 | test_ac001_login_with_correct_credentials_returns_token_and_user | Integration | Passed | `backend/tests/integration/test_auth.py` |
| AC-002 | test_ac002_login_with_unknown_email_is_rejected | Integration | Passed | `backend/tests/integration/test_auth.py` |
| AC-002 | test_ac002_login_with_wrong_password_is_rejected | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_ac_me_rejects_expired_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_ac_me_rejects_malformed_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_ac_me_rejects_missing_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_ac_me_returns_signed_in_member_for_valid_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_nfr001_accept_invite_route_needs_no_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_nfr001_health_route_needs_no_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_nfr001_login_route_needs_no_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_nfr001_protected_route_accepts_a_valid_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| — | test_nfr001_protected_route_requires_a_valid_token | Integration | Passed | `backend/tests/integration/test_auth.py` |
| AC-001 | [AC-001] a seeded member signs in and lands on the projects overview | E2E | Not run yet | `frontend/e2e/auth.spec.ts` |
| AC-002 | [AC-002] wrong credentials show the invalid-credentials error and the user stays on /sign-in | E2E | Not run yet | `frontend/e2e/auth.spec.ts` |
| AC-003 | [AC-003] navigating directly to /projects while signed out redirects to /sign-in | E2E | Not run yet | `frontend/e2e/auth.spec.ts` |
| AC-003 | [AC-003] navigating directly to /task while signed out redirects to /sign-in | E2E | Not run yet | `frontend/e2e/auth.spec.ts` |

### US-002: Admin invites team members by email

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| — | test_nfr004_job_sends_for_a_pending_invitation | Unit | Passed | `backend/tests/test_tasks.py` |
| — | test_nfr005_job_is_a_no_op_once_the_invitation_is_no_longer_pending | Unit | Passed | `backend/tests/test_tasks.py` |
| — | test_nfr005_job_is_safe_to_run_twice | Unit | Passed | `backend/tests/test_tasks.py` |
| — | test_nfr005_job_retries_with_backoff_on_sendgrid_failure | Unit | Passed | `backend/tests/test_tasks.py` |
| AC-004 | AcceptInvite > [AC-004] reads the token from the URL, posts to /auth/accept-invite, stores the session and lands on projects | Unit | Passed | `frontend/src/screens/AcceptInvite.test.tsx` |
| — | AcceptInvite > removes seeded sample invite data | Unit | Passed | `frontend/src/screens/AcceptInvite.test.tsx` |
| — | AcceptInvite > shows an error instead of a form when there is no token in the URL | Unit | Passed | `frontend/src/screens/AcceptInvite.test.tsx` |
| — | AcceptInvite > shows an error instead of success for an expired or invalid token | Unit | Passed | `frontend/src/screens/AcceptInvite.test.tsx` |
| AC-004 | Team > [AC-004] shows the invite form for an administrator, sends POST /invitations and shows the recorded invitation | Unit | Passed | `frontend/src/screens/Team.test.tsx` |
| AC-005 | Team > [AC-005] does not render the invite form or any invite entry point for a non-administrator | Unit | Passed | `frontend/src/screens/Team.test.tsx` |
| AC-006 | Team > [AC-006] shows a not-permitted message on a 403 from POST /invitations | Unit | Passed | `frontend/src/screens/Team.test.tsx` |
| AC-006 | Team > [AC-006] shows an already-exists message on a 409 from POST /invitations | Unit | Passed | `frontend/src/screens/Team.test.tsx` |
| — | Team > removes seeded sample invitation data | Unit | Passed | `frontend/src/screens/Team.test.tsx` |
| AC-004 | test_ac004_accept_invite_with_already_used_token_returns_400 | Integration | Passed | `backend/tests/integration/test_invitations.py` |
| AC-004 | test_ac004_accept_invite_with_expired_token_returns_400 | Integration | Passed | `backend/tests/integration/test_invitations.py` |
| AC-004 | test_ac004_accept_invite_with_invalid_token_returns_400 | Integration | Passed | `backend/tests/integration/test_invitations.py` |
| AC-004 | test_ac004_accept_invite_with_valid_token_creates_account_and_signs_in | Integration | Passed | `backend/tests/integration/test_invitations.py` |
| AC-004 | test_ac004_admin_creates_invitation_and_gets_201 | Integration | Passed | `backend/tests/integration/test_invitations.py` |
| AC-005 | test_ac005_non_admin_is_forbidden_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_invitations.py` |
| AC-006 | test_ac006_inviting_an_existing_member_returns_409_and_creates_no_invitation | Integration | Passed | `backend/tests/integration/test_invitations.py` |
| AC-004 | [AC-004] an admin sends an invite and sees it recorded | E2E | Not run yet | `frontend/e2e/invitations.spec.ts` |
| AC-004 | [AC-004] the invitee opens the invite link, sets a password and reaches the projects overview | E2E | Not run yet | `frontend/e2e/invitations.spec.ts` |
| AC-005 | [AC-005] a non-admin member sees no invite control anywhere on the Team screen | E2E | Not run yet | `frontend/e2e/invitations.spec.ts` |

### US-003: Equal access to all projects and tasks

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-007 | test_ac007_project_created_by_member_a_is_returned_by_get_projects_for_member_b | Unit | Passed | `backend/tests/test_flat_access.py` |
| AC-008 | test_ac008_member_b_patches_as_project_and_task_and_changes_persist_on_reread | Unit | Passed | `backend/tests/test_flat_access.py` |
| — | test_nfr001_get_project_tasks_returns_401_without_a_jwt | Unit | Passed | `backend/tests/test_flat_access.py` |
| — | test_nfr001_get_projects_returns_401_without_a_jwt | Unit | Passed | `backend/tests/test_flat_access.py` |
| — | test_nfr001_get_task_returns_401_without_a_jwt | Unit | Passed | `backend/tests/test_flat_access.py` |
| — | test_nfr003_a_few_dozen_projects_list_in_a_single_request_without_pagination_errors | Unit | Passed | `backend/tests/test_flat_access.py` |
| AC-008 | Project screen > [AC-008] edits a project the signed-in member did not create: saving sends PATCH /projects/{id} and the change is reflected after cache invalidation | Unit | Passed | `frontend/src/screens/Project.test.tsx` |
| AC-008 | Project screen > [AC-008] edits a task from a project the signed-in member did not create: changing status sends PATCH /tasks/{id} and the change is reflected after cache invalidation | Unit | Passed | `frontend/src/screens/Project.test.tsx` |
| — | Project screen > does not hide or disable editing based on who created the project or task | Unit | Passed | `frontend/src/screens/Project.test.tsx` |
| — | Project screen > shows a loading state, then loads GET /projects/{id} and GET /projects/{id}/tasks and renders the tasks | Unit | Passed | `frontend/src/screens/Project.test.tsx` |
| — | Project screen > shows an empty-board state when the project has no tasks | Unit | Passed | `frontend/src/screens/Project.test.tsx` |
| AC-007 | Projects screen > [AC-007] shows a loading state, then every project from GET /projects for any signed-in member; no seeded sample data | Unit | Passed | `frontend/src/screens/Projects.test.tsx` |
| — | Projects screen > does not hide or disable a project based on who created it, and records the selected project before navigating | Unit | Passed | `frontend/src/screens/Projects.test.tsx` |
| — | Projects screen > posts to POST /projects on create and refreshes the list from the server cache | Unit | Passed | `frontend/src/screens/Projects.test.tsx` |
| — | Projects screen > shows an empty state when GET /projects returns none | Unit | Passed | `frontend/src/screens/Projects.test.tsx` |
| AC-007 | [AC-007] a signed-in member sees a project created by another member in the overview | E2E | Not run yet | `frontend/e2e/projects.spec.ts` |
| AC-008 | [AC-008] a member opens a project they did not create, edits a task, and the change is visible after reload | E2E | Not run yet | `frontend/e2e/projects.spec.ts` |
| AC-010 | [AC-010] submitting the new-project form with a blank name shows an inline prompt and creates nothing | E2E | Not run yet | `frontend/e2e/projects.spec.ts` |
| AC-012, AC-013 | [AC-012][AC-013] the dashboard lists a project's name and task progress, and selecting it opens its tasks | E2E | Not run yet | `frontend/e2e/projects.spec.ts` |
| AC-014 | [AC-014] with no projects in the workspace, the empty state invites creating the first project | E2E | Not run yet | `frontend/e2e/projects.spec.ts` |
| — | [NFR-006] the projects overview renders usably at a 375px mobile viewport | E2E | Not run yet | `frontend/e2e/projects.spec.ts` |

## Sprint 2

### US-013: Monochrome theme for sign-in and invite screens

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-032 | [AC-032] the invalid-credentials error is distinguishable from the idle state without colour, and stays achromatic | E2E | Not run yet | `frontend/e2e/monochrome.spec.ts` |

### US-004: Create and manage a project

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-010 | test_ac010_empty_name_returns_422_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_projects.py` |
| AC-010 | test_ac010_missing_name_returns_422_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_projects.py` |
| AC-010 | test_ac010_whitespace_only_name_returns_422_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_projects.py` |
| AC-011 | test_ac011_blank_name_patch_returns_422_and_leaves_record_unchanged | Integration | Passed | `backend/tests/integration/test_projects.py` |
| AC-011 | test_ac011_patch_name_and_description_persist_and_visible_to_another_member | Integration | Passed | `backend/tests/integration/test_projects.py` |
| — | test_nfr003_a_few_dozen_projects_list_in_a_single_get_request | Integration | Passed | `backend/tests/integration/test_projects.py` |
| — | test_post_project_returns_201_and_appears_in_get_for_another_member | Integration | Passed | `backend/tests/integration/test_projects.py` |

### US-006: Create a task with owner, due date, and status

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| — | test_nfr004_saving_a_task_enqueues_the_job_rather_than_calling_outbound_services_inline | Unit | Skipped | `backend/tests/test_task_notifications.py` |
| — | test_nfr005_job_is_safe_to_run_twice | Unit | Skipped | `backend/tests/test_task_notifications.py` |
| — | test_nfr005_job_retries_with_backoff_on_an_outbound_failure | Unit | Skipped | `backend/tests/test_task_notifications.py` |
| AC-017 | Task screen > [AC-017] blocks saving a blank title with an inline message and sends no request | Unit | Passed | `frontend/src/screens/Task.test.tsx` |
| AC-018, AC-019 | Task screen > [AC-018/AC-019] changing status, owner and due date sends one PATCH /tasks/{id} with the new values, reflected after cache invalidation | Unit | Passed | `frontend/src/screens/Task.test.tsx` |
| — | Task screen > removes seeded sample task, owner and status data | Unit | Passed | `frontend/src/screens/Task.test.tsx` |
| — | Task screen > shows a 'no task selected' empty state when nothing was opened | Unit | Passed | `frontend/src/screens/Task.test.tsx` |
| — | Task screen > shows a loading state, then loads GET /tasks/{id} and renders the task | Unit | Passed | `frontend/src/screens/Task.test.tsx` |
| — | Task screen > shows an error state when the task fails to load | Unit | Passed | `frontend/src/screens/Task.test.tsx` |
| AC-015 | test_ac015_creating_a_task_with_a_title_appears_in_list_and_detail | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-016 | test_ac016_owner_due_date_and_status_round_trip_on_create_and_patch | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-016 | test_ac016_unknown_owner_id_on_create_returns_422_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-016 | test_ac016_unknown_owner_id_on_patch_returns_422_and_leaves_task_unchanged | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-017 | test_ac017_missing_title_returns_422_and_creates_no_task | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-017 | test_ac017_whitespace_only_title_returns_422_and_creates_no_task | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-018 | test_ac018_invalid_status_returns_422_and_leaves_task_unchanged | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-018 | test_ac018_nfr007_patch_to_each_valid_status_persists_identically_in_detail_and_list | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-019 | test_ac019_reassigning_owner_and_due_date_persists_and_is_visible_to_second_member | Integration | Passed | `backend/tests/integration/test_project_tasks.py` |
| AC-015, AC-016 | [AC-015][AC-016] creating a task with owner, due date and status shows it on the board | E2E | Not run yet | `frontend/e2e/tasks.spec.ts` |
| AC-018 | [AC-018][NFR-007] changing a task's status is reflected in both the board and the list view | E2E | Not run yet | `frontend/e2e/tasks.spec.ts` |

## Project setup

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| — | test_health_reports_ok | Unit | Passed | `backend/tests/test_health.py` |
| — | test_the_openapi_document_builds | Unit | Passed | `backend/tests/test_health.py` |
| — | the app loads | E2E | Not run yet | `frontend/e2e/example.spec.ts` |
<!-- sdlc:auto:end tests -->
