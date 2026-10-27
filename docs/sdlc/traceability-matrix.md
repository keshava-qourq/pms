# Traceability Matrix

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start legend -->
Built from recorded links, not written by a model: requirement key → plan item (`source_stable_key`) → development ticket (`stable_key`) → the ticket's test steps → the last live deployment that started after the work finished. **AC tests** counts the story's acceptance criteria that have a test case, and those whose test cases all passed in the latest finished E2E run.
<!-- sdlc:auto:end legend -->

<!-- sdlc:auto:start matrix -->
| Requirement | Epic | Title | Plan items | Sprint | Design | Code | Commits | Ticket | Tests | AC tests | Deployed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| US-001 | EPIC-001 | Sign in with email and password | US-001 | 1 | GET /auth/me, POST /auth/login, backend, database, frontend, users | backend/alembic.ini, backend/alembic/env.py, backend/alembic/script.py.mako, backend/alembic/versions/0001_create_users_table.py, backend/app/auth.py +20 more | 30524b9 | delivered | not run | 3/3 tested · 0/3 passing | — |
| US-002 | EPIC-001 | Admin invites team members by email | US-002 | 1 | POST /auth/accept-invite, POST /invitations, backend, database, frontend, invitations, users, worker | backend/alembic/versions/0002_create_invitations_table.py, backend/app/models.py, backend/app/routers/backend.py, backend/app/schemas.py, backend/app/tasks.py +8 more | ccd24e7 | delivered | not run | 3/3 tested · 1/3 passing | — |
| US-003 | EPIC-001 | Equal access to all projects and tasks | US-003 | 1 | GET /projects, PATCH /projects/{id}, PATCH /tasks/{id}, backend, database, projects, tasks, users | backend/alembic/versions/0003_create_projects_and_tasks_tables.py, backend/app/models.py, backend/app/routers/backend.py, backend/app/schemas.py, backend/tests/test_flat_access.py +9 more | 952fec2 | delivered | not run | 2/2 tested · 0/2 passing | — |
| US-013 | EPIC-001 | Monochrome theme for sign-in and invite screens | US-013 | 2 | frontend | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-004 | EPIC-002 | Create and manage a project | US-004 | 2 | GET /projects/{id}, PATCH /projects/{id}, POST /projects, backend, database, frontend, projects | backend/app/schemas.py, backend/tests/integration/test_projects.py, frontend/e2e/projects.spec.ts | cbdff9b | delivered | not run | 2/3 tested · 1/3 passing | — |
| US-005 | EPIC-002 | Projects overview dashboard | US-005 | 2 | GET /projects, backend, frontend, projects, tasks | — | cbdff9b | delivered | not run | 3/3 tested · 0/3 passing | — |
| US-014 | EPIC-002 | Monochrome theme for projects dashboard and project screens | US-014 | 4 | frontend | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-006 | EPIC-003 | Create a task with owner, due date, and status | US-006 | 2 | GET /projects/{id}/tasks, POST /projects/{id}/tasks, backend, database, frontend, projects, tasks, users | backend/alembic/versions/0004_add_owner_due_date_to_tasks.py, backend/app/models.py, backend/app/routers/backend.py, backend/app/schemas.py, backend/app/tasks.py +8 more | 8ddb1f5 | delivered | not run | 3/3 tested · 1/3 passing | — |
| US-007 | EPIC-003 | Update task status and details | US-007 | 2 | GET /tasks/{id}, PATCH /tasks/{id}, backend, database, tasks | — | 8ddb1f5 | delivered | not run | 2/2 tested · 1/2 passing | — |
| US-015 | EPIC-003 | Monochrome theme for task creation and editing screens | US-015 | 4 | frontend | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-008 | EPIC-004 | Kanban board view of tasks | US-008, US-008-T1, US-008-T2, US-008-T3 | 3 | GET /projects/{id}/tasks, PATCH /tasks/{id}, backend, frontend, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-009 | EPIC-004 | Task list view | US-009 | 3 | GET /projects/{id}/tasks, backend, frontend, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-016 | EPIC-004 | Monochrome theme and status distinction for the Kanban board | US-016 | 4 | frontend, tasks | — | — | not started | not run | 0/3 tested · 0/3 passing | — |
| US-017 | EPIC-004 | Visual regression and accessibility check for the new monochrome theme | US-017 | 4 | frontend | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-010 | EPIC-005 | Comment on a task | US-010 | 3 | GET /tasks/{id}/comments, POST /tasks/{id}/comments, backend, comments, database, frontend, tasks, users | — | — | not started | not run | 0/3 tested · 0/3 passing | — |
| US-011 | EPIC-005 | Checklists and subtasks on a task | US-011 | 3 | PATCH /checklist/{id}, POST /tasks/{id}/checklist, backend, checklist_items, database, frontend, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-012 | EPIC-005 | Labels on a task | US-012 | 3 | DELETE /tasks/{id}/labels/{label_id}, GET /labels, POST /tasks/{id}/labels, backend, database, frontend, labels, task_labels, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
<!-- sdlc:auto:end matrix -->
