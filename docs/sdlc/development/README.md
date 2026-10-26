# Development

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
### EPIC-001 · approved · source: plan:EPIC-001

Epic covering authentication and team membership: sign-in, admin invitations, and equal workspace access.

Epic EPIC-001 groups stories US-001 (sign in with email/password), US-002 (admin invites team members by email), and US-003 (equal access to all projects and tasks). No points or role assigned at the epic level; work is broken into the three child stories below. This epic is the stated focus of Sprint 1.

**Related:** US-001, US-002, US-003

- ⚠ No implementation/completion status reported for this epic or its child stories.

### EPIC-002 · approved · source: plan:EPIC-002

Epic covering project management: creating/managing projects and viewing them in an overview dashboard.

Epic EPIC-002 groups stories US-004 (create and manage a project) and US-005 (projects overview dashboard). No points or role assigned at the epic level. Part of Sprint 2's stated deliverables.

**Related:** US-004, US-005

- ⚠ No implementation/completion status reported for this epic or its child stories.

### EPIC-003 · approved · source: plan:EPIC-003

Epic covering core task management: creating tasks and updating their status/details.

Epic EPIC-003 groups stories US-006 (create a task with owner, due date, status) and US-007 (update task status and details). No points or role assigned at the epic level. Part of Sprint 2's stated deliverables.

**Related:** US-006, US-007

- ⚠ No implementation/completion status reported for this epic or its child stories.

### EPIC-004 · approved · source: plan:EPIC-004

Epic covering alternate task views: Kanban board and list view.

Epic EPIC-004 groups stories US-008 (Kanban board view of tasks) and US-009 (task list view). No points or role assigned at the epic level. Stated focus of Sprint 3 alongside EPIC-005.

**Related:** US-008, US-009

- ⚠ No implementation/completion status reported for this epic or its child stories.

### EPIC-005 · approved · source: plan:EPIC-005

Epic covering task collaboration features: comments, checklists/subtasks, and labels.

Epic EPIC-005 groups stories US-010 (comment on a task), US-011 (checklists and subtasks on a task), and US-012 (labels on a task). No points or role assigned at the epic level. Stated focus of Sprint 3 alongside EPIC-004.

**Related:** US-010, US-011, US-012

- ⚠ No implementation/completion status reported for this epic or its child stories.

### DEV-SPRINT-1 · approved · source: plan:Sprint 1

Sprint 1 plan: stand up authentication, admin invites, and flat equal-access to the workspace.

Sprint 1 (capacity 20 points) goal: 'Stand up authentication: sign-in, admin invites, and flat equal-access to the workspace.' Based on this goal description, Sprint 1 is understood to cover EPIC-001 and its stories: US-001 (8 pts, backend-agent) with tasks US-001-T1 (login endpoint and session/token issuance, backend-agent), US-001-T2 (protected-route redirect for unauthenticated access, frontend-agent), and US-001-T3 (sign-in page UI, frontend-agent); US-002 (8 pts, backend-agent) with tasks US-002-T1 (invitation endpoint with admin/duplicate-email checks, backend-agent), US-002-T2 (accept-invite and account creation flow, backend-agent), US-002-T3 (send invite email via SendGrid through the notification worker, integration-agent), and US-002-T4 (invite-member and accept-invite UI, frontend-agent); and US-003 (3 pts, backend-agent, equal access to all projects and tasks). Total story points referenced: 19 against a capacity of 20.

**Related:** EPIC-001, US-001, US-002, US-003

- ⚠ Sprint-to-item mapping is inferred from the sprint goal text; the item list does not explicitly tag each item with a sprint number.
- ⚠ No development execution status (progress, completion, review, test results) reported for Sprint 1 items.

### DEV-SPRINT-2 · approved · source: plan:Sprint 2

Sprint 2 plan: deliver project and task management, including project CRUD, projects dashboard, and task creation/updates.

Sprint 2 (capacity 20 points) goal: 'Deliver project and task management: project CRUD, projects overview dashboard, task creation and task updates.' Based on this goal description, Sprint 2 is understood to cover: US-004 (5 pts, backend-agent, create and manage a project); US-005 (5 pts, frontend-agent, projects overview dashboard); US-006 (5 pts, backend-agent, create a task with owner, due date, and status); and US-007 (3 pts, backend-agent, update task status and details). Total story points referenced: 18 against a capacity of 20.

**Related:** EPIC-002, EPIC-003, US-004, US-005, US-006, US-007

- ⚠ Sprint-to-item mapping is inferred from the sprint goal text; the item list does not explicitly tag each item with a sprint number.
- ⚠ No development execution status (progress, completion, review, test results) reported for Sprint 2 items.

### DEV-SPRINT-3 · approved · source: plan:Sprint 3

Sprint 3 plan: deliver task views (Kanban, list) and collaboration features (comments, checklists, labels).

Sprint 3 (capacity 20 points) goal: 'Deliver task views and collaboration: Kanban board, list view, comments, checklists, and labels.' Based on this goal description, Sprint 3 is understood to cover: US-008 (8 pts, frontend-agent, Kanban board view of tasks); US-009 (3 pts, frontend-agent, task list view); US-010 (3 pts, backend-agent, comment on a task); US-011 (3 pts, backend-agent, checklists and subtasks on a task); and US-012 (3 pts, backend-agent, labels on a task). Total story points referenced: 20, matching the capacity exactly.

**Related:** EPIC-004, EPIC-005, US-008, US-009, US-010, US-011, US-012

- ⚠ Sprint-to-item mapping is inferred from the sprint goal text; the item list does not explicitly tag each item with a sprint number.
- ⚠ No development execution status (progress, completion, review, test results) reported for Sprint 3 items.

### US-001 · approved · source: plan:US-001

Sign in with email and password, assigned to backend-agent, 8 points, planned for Sprint 1.

Story US-001 covers signing in with email and password. Broken into three tasks: US-001-T1 implement login endpoint and session/token issuance (backend-agent); US-001-T2 add protected-route redirect for unauthenticated access (frontend-agent); US-001-T3 build sign-in page UI (frontend-agent).

**Related:** EPIC-001, DEV-SPRINT-1

- ⚠ No implementation/completion status reported for US-001 or its tasks.

### US-002 · approved · source: plan:US-002

Admin invites team members by email, assigned to backend-agent, 8 points, planned for Sprint 1.

Story US-002 covers admin invitation of team members by email. Broken into four tasks: US-002-T1 implement invitation endpoint with admin and duplicate-email checks (backend-agent); US-002-T2 implement accept-invite and account creation flow (backend-agent); US-002-T3 send invite email via SendGrid through the notification worker (integration-agent); US-002-T4 build invite-member and accept-invite UI (frontend-agent).

**Related:** EPIC-001, DEV-SPRINT-1

- ⚠ No implementation/completion status reported for US-002 or its tasks.

### US-003 · approved · source: plan:US-003

Equal access to all projects and tasks for all team members, assigned to backend-agent, 3 points, planned for Sprint 1.

Story US-003 covers flat, equal access to all projects and tasks (no differentiated roles/permissions within the workspace). No subtasks listed.

**Related:** EPIC-001, DEV-SPRINT-1

- ⚠ No implementation/completion status reported for US-003.

### US-004 · approved · source: plan:US-004

Create and manage a project, assigned to backend-agent, 5 points, planned for Sprint 2.

Story US-004 covers project CRUD (create and manage a project). No subtasks listed in the plan.

**Related:** EPIC-002, DEV-SPRINT-2

- ⚠ No implementation/completion status reported for US-004.
- ⚠ No task-level breakdown provided for this story, unlike US-001/US-002.

### US-005 · approved · source: plan:US-005

Projects overview dashboard, assigned to frontend-agent, 5 points, planned for Sprint 2.

Story US-005 covers a dashboard presenting an overview of projects. No subtasks listed in the plan.

**Related:** EPIC-002, DEV-SPRINT-2

- ⚠ No implementation/completion status reported for US-005.
- ⚠ No task-level breakdown provided for this story.

### US-006 · approved · source: plan:US-006

Create a task with owner, due date, and status, assigned to backend-agent, 5 points, planned for Sprint 2.

Story US-006 covers task creation including setting an owner, due date, and status. No subtasks listed in the plan.

**Related:** EPIC-003, DEV-SPRINT-2

- ⚠ No implementation/completion status reported for US-006.
- ⚠ No task-level breakdown provided for this story.

### US-007 · approved · source: plan:US-007

Update task status and details, assigned to backend-agent, 3 points, planned for Sprint 2.

Story US-007 covers updating a task's status and other details. No subtasks listed in the plan.

**Related:** EPIC-003, DEV-SPRINT-2

- ⚠ No implementation/completion status reported for US-007.
- ⚠ No task-level breakdown provided for this story.

### US-008 · approved · source: plan:US-008

Kanban board view of tasks, assigned to frontend-agent, 8 points, planned for Sprint 3.

Story US-008 covers a Kanban board view for visualizing tasks. No subtasks listed in the plan.

**Related:** EPIC-004, DEV-SPRINT-3

- ⚠ No implementation/completion status reported for US-008.
- ⚠ No task-level breakdown provided for this story.

### US-009 · approved · source: plan:US-009

Task list view, assigned to frontend-agent, 3 points, planned for Sprint 3.

Story US-009 covers a list view for tasks. No subtasks listed in the plan.

**Related:** EPIC-004, DEV-SPRINT-3

- ⚠ No implementation/completion status reported for US-009.
- ⚠ No task-level breakdown provided for this story.

### US-010 · approved · source: plan:US-010

Comment on a task, assigned to backend-agent, 3 points, planned for Sprint 3.

Story US-010 covers adding comments to a task. No subtasks listed in the plan.

**Related:** EPIC-005, DEV-SPRINT-3

- ⚠ No implementation/completion status reported for US-010.
- ⚠ No task-level breakdown provided for this story.

### US-011 · approved · source: plan:US-011

Checklists and subtasks on a task, assigned to backend-agent, 3 points, planned for Sprint 3.

Story US-011 covers adding checklists and subtasks to a task. No subtasks listed in the plan.

**Related:** EPIC-005, DEV-SPRINT-3

- ⚠ No implementation/completion status reported for US-011.
- ⚠ No task-level breakdown provided for this story.

### US-012 · approved · source: plan:US-012

Labels on a task, assigned to backend-agent, 3 points, planned for Sprint 3.

Story US-012 covers adding labels to a task. No subtasks listed in the plan.

**Related:** EPIC-005, DEV-SPRINT-3

- ⚠ No implementation/completion status reported for US-012.
- ⚠ No task-level breakdown provided for this story.
<!-- sdlc:auto:end narrative -->
