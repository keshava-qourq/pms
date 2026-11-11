# Planning

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### EPIC-001 · approved · source: planning:EPIC-001

Authentication and Team Membership: internal members sign in and are invited by an administrator; access is flat and equal, with the admin distinguished only by invite rights.

Assumption surfaced: email/password auth with admin-invites by email, no SSO/SAML in v1; single region, no special regulatory/data-residency requirements for this general-industry internal tool.

**Related:** US-001, US-002, US-003, US-013, US-018

### EPIC-002 · approved · source: planning:EPIC-002

Projects: work is organized into projects containing tasks; a projects overview dashboard gives an at-a-glance view of the few dozen active projects.

System sized for a single small team of up to ~25 users managing a few dozen active projects at a time.

**Related:** US-004, US-005, US-014

### EPIC-003 · approved · source: planning:EPIC-003

Tasks: each project contains tasks with an owner, due date, and status moving work through the workflow.

Assumption surfaced: at Lightweight MVP scope, a task's core attributes are owner, due date, status. Timeline/Gantt views, dependencies, milestones, file attachments, and activity history are deferred beyond this MVP.

**Related:** US-006, US-007, US-015

### EPIC-004 · approved · source: planning:EPIC-004

Task Views: the same tasks can be viewed interchangeably as a Kanban board and a task list, kept in sync over shared task state.

Assumption surfaced: the timeline/Gantt view with dependencies and milestones from the broader vision is beyond the Lightweight MVP scope and not included in this version.

**Related:** US-008, US-009, US-016, US-017

### EPIC-005 · approved · source: planning:EPIC-005

Task Collaboration: team members collaborate in context on individual tasks through comments, checklists/subtasks, and labels.

Assumption surfaced: comments, checklists/subtasks, and labels are assumed standard collaboration features rather than explicitly confirmed. File attachments and full activity history are beyond the Lightweight MVP scope.

**Related:** US-010, US-011, US-012

### SPRINT-1 · approved · source: planning:plan:Sprint 1

Sprint 1 goal: deliver core authentication and admin invite flow with flat, equal access controls. Capacity 20.

Items (points): US-001 Sign in with email and password (8, backend-agent); US-002 Admin invites team members by email (8, backend-agent); US-003 Equal access to all projects and tasks (3, backend-agent). Note: the plan input lists items grouped by epic without explicit per-sprint tags; this assignment is inferred from the sprint goal text matching these stories' subject matter.

**Related:** EPIC-001, US-001, US-002, US-003

### SPRINT-2 · approved · source: planning:plan:Sprint 2

Sprint 2 goal: deliver project management, project dashboard, task creation and status workflow, and start the monochrome restyle. Capacity 20.

Items (points): US-004 Create and manage a project (5, backend-agent); US-005 Projects overview dashboard (5, frontend-agent); US-014 Monochrome theme for projects dashboard and project screens (3, frontend-agent); US-006 Create a task with owner, due date, and status (5, backend-agent); US-007 Update task status and details (3, backend-agent). Note: item-to-sprint mapping inferred from sprint goal text since the plan input does not explicitly tag items to sprints.

**Related:** EPIC-002, US-004, US-005, US-014, EPIC-003, US-006, US-007

### SPRINT-3 · approved · source: planning:plan:Sprint 3

Sprint 3 goal: deliver the Kanban board and task list views plus task collaboration: comments, checklists and labels. Capacity 20.

Items (points): US-008 Kanban board view of tasks (8, frontend-agent) with sub-tasks US-008-T1 Implement Kanban columns grouped by task status, US-008-T2 Implement drag-and-drop status update, US-008-T3 Sync board state with other task views; US-009 Task list view (3, frontend-agent); US-010 Comment on a task (3, backend-agent); US-011 Checklists and subtasks on a task (3, backend-agent); US-012 Labels on a task (3, backend-agent). Note: mapping inferred from sprint goal text; points sum to the full 20-point capacity, supporting this grouping.

**Related:** EPIC-004, US-008, US-008-T1, US-008-T2, US-008-T3, US-009, EPIC-005, US-010, US-011, US-012

### SPRINT-4 · approved · source: planning:plan:Sprint 4

Sprint 4 goal: complete the monochrome theme rollout across remaining screens and verify with visual regression and accessibility QA. Capacity 20.

Items (points): US-013 Monochrome theme for sign-in and invite screens (2, frontend-agent); US-015 Monochrome theme for task creation and editing screens (2, frontend-agent); US-016 Monochrome theme and status distinction for the Kanban board (3, frontend-agent); US-017 Visual regression and accessibility check for the new monochrome theme (2, qa-agent); US-018 Remove descriptive paragraph from sign-in form (1, frontend-agent). Note: item-to-sprint mapping inferred from sprint goal text covering the remaining, not-yet-assigned monochrome/QA stories.

**Related:** US-013, US-015, US-016, US-017, US-018
<!-- sdlc:auto:end narrative -->
