# Traceability Matrix

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start legend -->
Built from recorded links, not written by a model: requirement key → plan item (`source_stable_key`) → development ticket (`stable_key`) → the ticket's test steps → the last live deployment that started after the work finished. **AC tests** counts the story's acceptance criteria that have a test case, and those whose test cases all passed in the latest finished E2E run.
<!-- sdlc:auto:end legend -->

<!-- sdlc:auto:start matrix -->
| Requirement | Epic | Title | Plan items | Sprint | Design | Code | Commits | Ticket | Tests | AC tests | Deployed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| US-001 | EPIC-001 | Sign in with email and password | US-001, US-001-T1, US-001-T2, US-001-T3 | 1 | GET /auth/me, POST /auth/login, backend, database, frontend, users | — | — | not started | not run | 0/3 tested · 0/3 passing | — |
| US-002 | EPIC-001 | Admin invites team members by email | US-002, US-002-T1, US-002-T2, US-002-T3, US-002-T4 | 1 | POST /auth/accept-invite, POST /invitations, backend, frontend, invitations, users, worker | — | — | not started | not run | 0/3 tested · 0/3 passing | — |
| US-003 | EPIC-001 | Equal access to all projects and tasks | US-003 | 1 | GET /projects, GET /projects/{id}/tasks, PATCH /tasks/{id}, backend, projects, tasks, users | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-004 | EPIC-002 | Create and manage a project | US-004 | 2 | GET /projects/{id}, PATCH /projects/{id}, POST /projects, backend, database, frontend, projects | — | — | not started | not run | 0/3 tested · 0/3 passing | — |
| US-005 | EPIC-002 | Projects overview dashboard | US-005 | 2 | GET /projects, backend, frontend, projects, tasks | — | — | not started | not run | 0/3 tested · 0/3 passing | — |
| US-006 | EPIC-003 | Create a task with owner, due date, and status | US-006 | 2 | GET /projects/{id}/tasks, POST /projects/{id}/tasks, backend, database, frontend, projects, tasks, users | — | — | not started | not run | 0/3 tested · 0/3 passing | — |
| US-007 | EPIC-003 | Update task status and details | US-007 | 2 | GET /tasks/{id}, PATCH /tasks/{id}, backend, frontend, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-008 | EPIC-004 | Kanban board view of tasks | US-008 | 3 | GET /projects/{id}/tasks, PATCH /tasks/{id}, backend, frontend, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-009 | EPIC-004 | Task list view | US-009 | 3 | GET /projects/{id}/tasks, frontend, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-010 | EPIC-005 | Comment on a task | US-010 | 3 | GET /tasks/{id}/comments, POST /tasks/{id}/comments, backend, comments, frontend, tasks | — | — | not started | not run | 0/3 tested · 0/3 passing | — |
| US-011 | EPIC-005 | Checklists and subtasks on a task | US-011 | 3 | PATCH /checklist/{id}, POST /tasks/{id}/checklist, backend, checklist_items, frontend, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
| US-012 | EPIC-005 | Labels on a task | US-012 | 3 | DELETE /tasks/{id}/labels/{label_id}, GET /labels, POST /tasks/{id}/labels, backend, frontend, labels, task_labels, tasks | — | — | not started | not run | 0/2 tested · 0/2 passing | — |
<!-- sdlc:auto:end matrix -->
