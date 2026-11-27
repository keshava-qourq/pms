# Sprint Plan

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start sprints -->
## Sprint 1: Sprint 1

Stand up authentication, invitations, and flat equal-access permissions

Capacity: 20 points · Committed: 19

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-001 | Story | Sign in with email and password | 8 | backend-agent | — |
| ↳ US-001-T1 | Task | Implement POST /auth/login and GET /auth/me with credential verification | — | backend-agent | — |
| ↳ US-001-T2 | Task | Add session/token issuance and validation middleware | — | backend-agent | — |
| ↳ US-001-T3 | Task | Build sign-in form and authenticated route guard | — | frontend-agent | — |
| US-002 | Story | Admin invites team members by email | 8 | backend-agent | US-001 |
| ↳ US-002-T1 | Task | Implement POST /invitations with admin-only authorization and duplicate-email check | — | backend-agent | — |
| ↳ US-002-T2 | Task | Implement POST /auth/accept-invite account creation flow | — | backend-agent | — |
| ↳ US-002-T3 | Task | Wire invite email delivery through Redis queue and SendGrid | — | integration-agent | — |
| US-003 | Story | Equal access to all projects and tasks | 3 | backend-agent | US-001 |

## Sprint 2: Sprint 2

Deliver project management, the projects dashboard, and task creation/editing

Capacity: 20 points · Committed: 20

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-013 | Story | Monochrome theme for sign-in and invite screens | 2 | frontend-agent | US-001, US-002 |
| US-004 | Story | Create and manage a project | 5 | backend-agent | US-001 |
| US-005 | Story | Projects overview dashboard | 5 | frontend-agent | US-004 |
| US-006 | Story | Create a task with owner, due date, and status | 5 | backend-agent | US-004 |
| US-007 | Story | Update task status and details | 3 | backend-agent | US-006 |

## Sprint 3: Sprint 3

Ship interchangeable Kanban/list task views plus comments, checklists, and labels

Capacity: 20 points · Committed: 20

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-008 | Story | Kanban board view of tasks | 8 | frontend-agent | US-006, US-007 |
| ↳ US-008-T1 | Task | Build Kanban board grouped into status columns | — | frontend-agent | — |
| ↳ US-008-T2 | Task | Implement drag-and-drop status updates calling PATCH /tasks/{id} | — | frontend-agent | — |
| ↳ US-008-T3 | Task | Keep board state in sync with shared task data | — | frontend-agent | — |
| US-009 | Story | Task list view | 3 | frontend-agent | US-006 |
| US-010 | Story | Comment on a task | 3 | backend-agent | US-006 |
| US-011 | Story | Checklists and subtasks on a task | 3 | backend-agent | US-006 |
| US-012 | Story | Labels on a task | 3 | backend-agent | US-006 |

## Sprint 4: Sprint 4

Apply the monochrome theme across all screens, remove redundant sign-in copy, and verify with a visual/accessibility QA pass

Capacity: 20 points · Committed: 11

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-018 | Story | Remove descriptive paragraph from sign-in form | 1 | frontend-agent | US-013 |
| US-014 | Story | Monochrome theme for projects dashboard and project screens | 3 | frontend-agent | US-004, US-005 |
| US-015 | Story | Monochrome theme for task creation and editing screens | 2 | frontend-agent | US-006, US-007 |
| US-016 | Story | Monochrome theme and status distinction for the Kanban board | 3 | frontend-agent | US-008 |
| US-017 | Story | Visual regression and accessibility check for the new monochrome theme | 2 | qa-agent | US-013, US-014, US-015, US-016, US-018 |

## Unscheduled

_Nothing unscheduled._
<!-- sdlc:auto:end sprints -->
