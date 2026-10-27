# Sprint Plan

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start sprints -->
## Sprint 1: Sprint 1

Deliver core authentication and admin invite flow with flat, equal access controls.

Capacity: 20 points · Committed: 19

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-001 | Story | Sign in with email and password | 8 | backend-agent | — |
| US-002 | Story | Admin invites team members by email | 8 | backend-agent | US-001 |
| US-003 | Story | Equal access to all projects and tasks | 3 | backend-agent | US-001 |

## Sprint 2: Sprint 2

Deliver project management, project dashboard, task creation and status workflow, and start the monochrome restyle.

Capacity: 20 points · Committed: 20

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-013 | Story | Monochrome theme for sign-in and invite screens | 2 | frontend-agent | US-001, US-002 |
| US-004 | Story | Create and manage a project | 5 | backend-agent | US-001 |
| US-005 | Story | Projects overview dashboard | 5 | frontend-agent | US-004 |
| US-006 | Story | Create a task with owner, due date, and status | 5 | backend-agent | US-004 |
| US-007 | Story | Update task status and details | 3 | backend-agent | US-006 |

## Sprint 3: Sprint 3

Deliver the Kanban board and task list views plus task collaboration: comments, checklists and labels.

Capacity: 20 points · Committed: 20

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-008 | Story | Kanban board view of tasks | 8 | frontend-agent | US-006, US-007 |
| ↳ US-008-T1 | Task | Implement Kanban columns grouped by task status | — | frontend-agent | — |
| ↳ US-008-T2 | Task | Implement drag-and-drop status update | — | frontend-agent | — |
| ↳ US-008-T3 | Task | Sync board state with other task views | — | frontend-agent | — |
| US-009 | Story | Task list view | 3 | frontend-agent | US-006 |
| US-010 | Story | Comment on a task | 3 | backend-agent | US-006 |
| US-011 | Story | Checklists and subtasks on a task | 3 | backend-agent | US-006 |
| US-012 | Story | Labels on a task | 3 | backend-agent | US-006 |

## Sprint 4: Sprint 4

Complete the monochrome theme rollout across remaining screens and verify with visual regression and accessibility QA.

Capacity: 20 points · Committed: 10

| Key | Type | Title | Points | Role | Depends on |
|---|---|---|---|---|---|
| US-014 | Story | Monochrome theme for projects dashboard and project screens | 3 | frontend-agent | US-004, US-005 |
| US-015 | Story | Monochrome theme for task creation and editing screens | 2 | frontend-agent | US-006, US-007 |
| US-016 | Story | Monochrome theme and status distinction for the Kanban board | 3 | frontend-agent | US-008 |
| US-017 | Story | Visual regression and accessibility check for the new monochrome theme | 2 | qa-agent | US-013, US-014, US-015, US-016 |

## Unscheduled

_Nothing unscheduled._
<!-- sdlc:auto:end sprints -->
