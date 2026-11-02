# Development

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### DEV-PLAN-V1 · approved · source: plan:v1

Development plan version 1 is approved, organized into 4 sprints of 20-point capacity each, covering authentication, projects, tasks, task views, and task collaboration, plus a monochrome theme restyle running alongside feature work.

Plan status: approved, version 1.
- Sprint 1 (capacity 20): goal = deliver core authentication and admin invite flow with flat, equal access controls. Items: EPIC-001 Authentication and Team Membership; US-001 Sign in with email and password (8pts, backend-agent); US-002 Admin invites team members by email (8pts, backend-agent); US-003 Equal access to all projects and tasks (3pts, backend-agent); US-013 Monochrome theme for sign-in and invite screens (2pts, frontend-agent).
- Sprint 2 (capacity 20): goal = deliver project management, project dashboard, task creation and status workflow, and start the monochrome restyle. Items: EPIC-002 Projects; US-004 Create and manage a project (5pts, backend-agent); US-005 Projects overview dashboard (5pts, frontend-agent); US-014 Monochrome theme for projects dashboard and project screens (3pts, frontend-agent); EPIC-003 Tasks; US-006 Create a task with owner, due date, and status (5pts, backend-agent); US-007 Update task status and details (3pts, backend-agent); US-015 Monochrome theme for task creation/editing screens (2pts, frontend-agent).
- Sprint 3 (capacity 20): goal = deliver the Kanban board and task list views plus task collaboration (comments, checklists, labels). Items: EPIC-004 Task Views; US-008 Kanban board view of tasks (8pts, frontend-agent) with subtasks US-008-T1 (columns by status), US-008-T2 (drag-and-drop status update), US-008-T3 (sync board state with other task views); US-009 Task list view (3pts, frontend-agent); US-016 Monochrome theme and status distinction for the Kanban board (3pts, frontend-agent); US-017 Visual regression and accessibility check for the new monochrome theme (2pts, qa-agent); EPIC-005 Task Collaboration; US-010 Comment on a task (3pts, backend-agent); US-011 Checklists and subtasks on a task (3pts, backend-agent); US-012 Labels on a task (3pts, backend-agent).
- Sprint 4 (capacity 20): goal = complete the monochrome theme rollout across remaining screens and verify with visual regression and accessibility QA.

**Related:** US-001, US-002, US-003, US-013, US-004, US-005, US-014, US-006, US-007, US-015, US-008, US-009, US-016, US-017, US-010, US-011, US-012

- ⚠ Sprint 4 lists no distinct backlog items in this input beyond the goal statement - unclear which specific stories/tasks are scoped to it.

### DEV-US-008 · approved · source: dev:US-008

Kanban board view of tasks was delivered in this development run.

Ticket US-008 'Kanban board view of tasks' status=delivered, commit=282b981993cb62ceb1f76a4ddce8bf737a142825. Planned as an 8-point story under EPIC-004 (Task Views), assigned to frontend-agent, broken into subtasks: US-008-T1 (Kanban columns grouped by task status), US-008-T2 (drag-and-drop status update), US-008-T3 (sync board state with other task views). This ticket shares its delivery commit with US-009.

**Related:** US-008, US-008-T1, US-008-T2, US-008-T3, EPIC-004

- ⚠ Subtasks US-008-T1/T2/T3 have no individual delivery status recorded; only the parent story US-008 is marked delivered.

### DEV-US-009 · approved · source: dev:US-009

Task list view was delivered in this development run.

Ticket US-009 'Task list view' status=delivered, commit=282b981993cb62ceb1f76a4ddce8bf737a142825. Planned as a 3-point story under EPIC-004 (Task Views), assigned to frontend-agent, part of Sprint 3 scope. Shares its delivery commit with US-008.

**Related:** US-009, EPIC-004

### DEV-US-010 · approved · source: dev:US-010

Comment on a task was delivered in this development run.

Ticket US-010 'Comment on a task' status=delivered, commit=c6430a68d1e44c5506932ddff68eeb4e8c0fc7f1. Planned as a 3-point story under EPIC-005 (Task Collaboration), assigned to backend-agent, part of Sprint 3 scope. Shares its delivery commit with US-011 and US-012.

**Related:** US-010, EPIC-005

### DEV-US-011 · approved · source: dev:US-011

Checklists and subtasks on a task was delivered in this development run.

Ticket US-011 'Checklists and subtasks on a task' status=delivered, commit=c6430a68d1e44c5506932ddff68eeb4e8c0fc7f1. Planned as a 3-point story under EPIC-005 (Task Collaboration), assigned to backend-agent, part of Sprint 3 scope. Shares its delivery commit with US-010 and US-012.

**Related:** US-011, EPIC-005

### DEV-US-012 · approved · source: dev:US-012

Labels on a task was delivered in this development run.

Ticket US-012 'Labels on a task' status=delivered, commit=c6430a68d1e44c5506932ddff68eeb4e8c0fc7f1. Planned as a 3-point story under EPIC-005 (Task Collaboration), assigned to backend-agent, part of Sprint 3 scope. Shares its delivery commit with US-010 and US-011.

**Related:** US-012, EPIC-005
<!-- sdlc:auto:end narrative -->
