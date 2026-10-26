# Product Requirements

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
## Summary

### US-001 · approved · source: requirements:US-001

Registered team members sign in with email and password to reach the projects overview; unauthenticated access to project/task pages redirects to sign-in.

Critical priority. AC-001: correct email+password authenticates and lands on the projects overview. AC-002: wrong credentials show an invalid-credentials error and the user stays signed out. AC-003: unauthenticated direct access to any project or task page redirects to the sign-in page. NFR-001 reinforces that project/task pages are only reachable when signed in. Assumption stated in input: email/password only, no SSO/SAML in v1.

**Related:** EPIC-001, NFR-001

### US-002 · approved · source: requirements:US-002

Administrators invite new team members by email; the invite function is hidden from non-admins and duplicate invites are blocked.

High priority. AC-004: admin enters a colleague's email, invitation is recorded, invitee can set a password to create an account. AC-005: a non-admin member cannot see/use the invite function. AC-006: inviting an email that already belongs to a member is blocked with a message that the member already exists. NFR-002 restricts invitations to administrators and requires duplicate-account prevention.

**Related:** EPIC-001, NFR-002

- ⚠ How the very first administrator account is created/designated is not specified anywhere in the input.

### US-003 · approved · source: requirements:US-003

Every signed-in member can view and edit every project and task regardless of who created it; no per-project roles or privacy exist beyond admin invite rights.

High priority. AC-007: any signed-in member sees every project in the workspace in the projects overview. AC-008: editing a task or project not created by the member still saves, because access is flat and equal. NFR-008 explicitly flags this flat-access model as an accepted privacy risk.

**Related:** EPIC-001, NFR-008

- ⚠ NFR-008 is an accepted risk (no per-project privacy/roles) -- should be revisited if the team grows or starts handling sensitive data.

### US-004 · approved · source: requirements:US-004

Members create and edit projects with a name and description; a name is required to create one.

Critical priority. AC-009: creating a project with a name saves it and shows it in the projects overview for the whole team. AC-010: submitting without a name is rejected and the member is prompted to supply one. AC-011: editing an existing project's name or description saves and shows the updated details to all team members.

**Related:** EPIC-002

### US-005 · approved · source: requirements:US-005

A projects overview dashboard lists all projects with a progress summary, lets members navigate into a project, and shows an empty state when none exist.

High priority. AC-012: dashboard shows each project with name and task progress (e.g. number of tasks and how many are complete). AC-013: selecting a project opens that project's tasks. AC-014: with no projects created, an empty state invites the member to create the first one.

**Related:** EPIC-002, US-004

### US-006 · approved · source: requirements:US-006

Members create tasks within a project with a title, and can assign an owner, due date, and status; a title is required.

Critical priority. AC-015: a task with a title is added to the project and appears in its task views. AC-016: owner, due date, and status are assigned at creation or edit time and saved/shown on the task. AC-017: submitting without a title is rejected with a prompt. Assumption stated in input: MVP task attributes are limited to owner/due date/status -- dependencies, milestones, attachments, and activity history from the broader vision are deferred to a later version.

**Related:** EPIC-003

### US-007 · approved · source: requirements:US-007

Members update a task's status, owner, or due date as work progresses, with changes reflected consistently across every view.

High priority. AC-018: changing status saves the new status and reflects it consistently across all views. AC-019: reassigning the owner or changing the due date saves and is visible to all team members. NFR-007 requires that a change made in one view (board or list) is reflected consistently in the other.

**Related:** EPIC-003, NFR-007, US-008, US-009

### US-008 · approved · source: requirements:US-008

A Kanban board groups a project's tasks into columns by status, and dragging a card to another column updates that task's status.

Critical priority. AC-020: each task appears as a card in the column matching its current status. AC-021: moving a card to a different column updates the task's status and the change persists. Shares the same underlying task data as the list view per NFR-007.

**Related:** EPIC-004, NFR-007, US-009

### US-009 · approved · source: requirements:US-009

A task list view shows each task in a compact row with title, owner, due date, and status, staying in sync with the Kanban board.

High priority. AC-022: each task row shows title, owner, due date, and status. AC-023: updating a task in the list view is reflected on the Kanban board because both views share the same underlying tasks (NFR-007).

**Related:** EPIC-004, NFR-007, US-008

### US-010 · approved · source: requirements:US-010

Members post comments on a task, shown with author name and timestamp in chronological order; empty comments are rejected.

High priority. AC-024: a posted comment is saved and shown with the author's name and timestamp to everyone viewing the task. AC-025: comments display in chronological order. AC-026: submitting an empty comment saves nothing and prompts the member to enter text.

**Related:** EPIC-005

### US-011 · approved · source: requirements:US-011

Members add checklist items or subtasks to a task and mark them done; the task shows a completed-of-total count.

Medium priority. AC-027: a new checklist item/subtask appears in an incomplete state. AC-028: marking an item complete saves that state and the task shows how many items are done out of the total. Input notes this feature is an assumed standard collaboration feature, not explicitly confirmed by the product owner.

**Related:** EPIC-005

- ⚠ Feature is based on an assumption rather than explicit product-owner confirmation -- worth validating before build.

### US-012 · approved · source: requirements:US-012

Members apply and remove labels on tasks to categorize them, visible on both the board and list views.

Medium priority. AC-029: adding one or more labels saves them and displays them on the task in both board and list views. AC-030: removing a label removes it from the task's display. Input notes this feature is an assumed standard collaboration feature, not explicitly confirmed by the product owner.

**Related:** EPIC-005

- ⚠ Feature is based on an assumption rather than explicit product-owner confirmation -- worth validating before build.

### NFR-SYS · approved · source: requirements:NFR-003,NFR-004,NFR-005,NFR-006,NFR-009

Cross-cutting, system-wide quality requirements covering scale, notification performance/reliability, browser compatibility, and an accepted compliance risk.

NFR-003 (scalability): sized for up to ~25 users and a few dozen active projects. NFR-004 (performance): Slack and email notifications are processed through a background queue so they never block a task save. NFR-005 (availability): Slack/email notifications are retried in the background if those services are briefly unavailable. NFR-006 (compatibility): delivered as a single responsive web app working on desktop and mobile browsers from one codebase. NFR-009 (compliance, accepted risk): no special data-residency or regulatory controls are built in, since the company operates in a single region as general-industry internal tooling.

**Related:** NFR-003, NFR-004, NFR-005, NFR-006, NFR-009

- ⚠ NFR-009 is an accepted risk with no regulatory/compliance controls built in -- should be revisited if the company expands into regulated markets or regions.

### NOTIF-GAP · draft · source: requirements:functional-summary(Notifications)

Functional requirements describe outbound Slack, email, and in-app notifications for task/project updates, but no user story or acceptance criteria define this behavior in detail.

The functional-requirements summary states the system 'pushes task and project updates one-way to the team's Slack channel and sends email notifications, and also provides in-app notifications,' with no two-way sync back from external systems. NFR-004 and NFR-005 govern only the queuing/retry mechanics of this behavior, not its triggers or content.

**Related:** NFR-004, NFR-005

- ⚠ No user story or acceptance criteria define which events trigger notifications, what content they contain, or how in-app notifications are presented to the user -- only the background-queuing/retry behavior is specified.

### TECH-STACK · approved · source: requirements:technology-stack-and-services

Product owner approved an exact technology stack and service set for this lightweight-scope build; substitutions are explicitly disallowed.

Backend: FastAPI 0.115 (flat access model, admin tier, one-way Slack/email webhook integrations, auto-generated API docs). Cloud: AWS (managed PostgreSQL, S3, app hosting, all in one vendor for a single internal team of 25). Database: PostgreSQL 16 (models relational projects/tasks/owners/due dates/comments/checklists/labels). Frontend: React 19 (interchangeable Kanban/list/timeline views, drag-and-drop, inline comments/checklists, one codebase for desktop+mobile). Runtime services: Amazon S3 (saas; task file attachments; env AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET); SendGrid (saas; email notifications and admin invites; env SENDGRID_API_KEY); Redis (container redis:7-alpine; outbound queue for Slack/email so saves aren't blocked; env REDIS_URL); Slack (custom incoming webhook; env SLACK_WEBHOOK_URL). Out of scope: native iOS/Android apps; two-way sync with Jira, GitHub, calendars, or external file storage.

**Related:** EPIC-001, EPIC-002, EPIC-003, EPIC-004, EPIC-005

- ⚠ Discrepancy: S3 file storage is approved as a runtime need justified by 'tasks support file attachments,' but EPIC-003's assumption explicitly defers file attachments to a later version -- clarify whether S3 is needed for this release or only provisioned ahead of a future version.
- ⚠ No architecture-phase output exists yet to confirm how this approved stack will be realized (service boundaries, data model, deployment topology).
<!-- sdlc:auto:end narrative -->

<!-- sdlc:auto:start summary -->
**Requirements version:** v1  
**Delivery scope:** lightweight  
**Approved:** 2026-10-26

**Capabilities in scope:** Team member sign-in, Projects to organize work, Tasks with owners, due dates, and statuses, Kanban board view of tasks, Task list view, Task comments, Checklists / subtasks on tasks, Labels on tasks, Projects overview dashboard, Email and password sign-in (no SSO in the first version)

**Approved technology stack:**

| Layer | Choice | Rationale |
|---|---|---|
| backend | FastAPI | Your backend is mostly straightforward: store projects and tasks, enforce the simple 'everyone can edit everything' rule with a basic admin tier, and fan updates out to Slack and email. FastAPI is a lean, fast Python framework that handles this cleanly and makes the one-way webhook/email integrations easy to wire up, with automatic API documentation your developers can work against. |
| cloud | AWS | AWS gives you everything this tool needs in one place: a managed PostgreSQL database, S3 for the task file attachments, and somewhere to run the app — so your single internal team isn't stitching together multiple vendors. It scales down affordably for 25 users and stays dependable as the company grows. |
| database | PostgreSQL | Projects, tasks, owners, due dates, comments, checklists, labels and the timeline dependencies between tasks are all highly relational — one task links to many others. PostgreSQL models these relationships and the activity history reliably, and at a few dozen projects for 25 people it is far inside its comfort zone with room to grow for years. |
| frontend | React | Your product's whole value is three interchangeable views of the same tasks — Kanban board, list, and a Gantt/timeline with dependencies — plus drag-and-drop, inline comments and checklists. These are rich, interactive screens that update live, and React is built for exactly this kind of single-page, state-heavy interface. It also gives you one codebase that adapts to desktop and mobile browsers, matching your responsive-web-only decision. |
<!-- sdlc:auto:end summary -->

<!-- sdlc:auto:start epics -->
## EPIC-001: Authentication and Team Membership

Internal team members sign in to the tool and are invited by an administrator. Access is flat and equal: every signed-in member can see and edit all projects and tasks, with the admin distinguished only by the ability to invite new members.

Assumption (surfaced from the confirmed understanding): authentication is email/password with admin-invites by email; there is no SSO/SAML in the first version. The company operates in a single region with no special regulatory or data-residency requirements for general-industry internal tooling.

### US-001: Sign in with email and password

**Priority:** critical

> As a team member, I want to sign in with my email address and password, so that I can securely access the team's projects and tasks.

| ID | Given | When | Then |
|---|---|---|---|
| AC-001 | I am a registered team member on the sign-in page | I enter my correct email address and password and submit | I am authenticated and taken to the projects overview |
| AC-002 | I am on the sign-in page | I enter an email or password that does not match an account | I am not signed in and I see an error that the credentials are invalid |
| AC-003 | I am not signed in | I try to open any project or task page directly | I am redirected to the sign-in page |

### US-002: Admin invites team members by email

**Priority:** high

> As a administrator, I want to invite new team members by email, so that colleagues can join and start collaborating on projects.

| ID | Given | When | Then |
|---|---|---|---|
| AC-004 | I am signed in as an administrator | I enter a colleague's email address and send an invitation | an invitation is recorded for that email and the invitee can set a password to create their account |
| AC-005 | I am a signed-in member without administrator rights | I look for the invite-member function | the function is not available to me |
| AC-006 | an email address already belongs to an existing member | the administrator tries to invite that same email | the system prevents a duplicate account and informs the administrator the member already exists |

### US-003: Equal access to all projects and tasks

**Priority:** high

> As a team member, I want to see and edit every project and task in the tool, so that the whole team can collaborate without access barriers.

| ID | Given | When | Then |
|---|---|---|---|
| AC-007 | I am any signed-in team member | I open the projects overview | I can see every project in the workspace regardless of who created it |
| AC-008 | I am any signed-in team member viewing a project I did not create | I edit a task or project within it | my changes are saved, because access is flat and equal with no per-project privacy or roles beyond basic admin functions |

## EPIC-002: Projects

Work is organized into projects that contain tasks. Team members create and manage projects, and a projects overview dashboard gives the team an at-a-glance view of the few dozen active projects.

The system is sized for a single small team of up to ~25 users managing a few dozen active projects at a time.

### US-004: Create and manage a project

**Priority:** critical

> As a team member, I want to create a project and edit its details, so that I can organize related tasks under one project.

| ID | Given | When | Then |
|---|---|---|---|
| AC-009 | I am a signed-in team member | I create a project with a name | the project is saved and appears in the projects overview for the whole team |
| AC-010 | I try to create a project without a name | I submit the form | the project is not created and I am prompted to provide a name |
| AC-011 | an existing project | I edit its name or description | the updated details are saved and shown to all team members |

### US-005: Projects overview dashboard

**Priority:** high

> As a team member, I want a dashboard listing all projects with their key status, so that I can quickly see what work is active and navigate into it.

| ID | Given | When | Then |
|---|---|---|---|
| AC-012 | projects exist in the workspace | I open the projects overview dashboard | I see each project with a summary such as its name and task progress (e.g. number of tasks and how many are complete) |
| AC-013 | I am on the projects overview dashboard | I select a project | I am taken to that project's tasks |
| AC-014 | no projects have been created yet | I open the projects overview dashboard | I see an empty state inviting me to create the first project |

## EPIC-003: Tasks

Each project contains tasks. A task has an owner, a due date, and a status that moves it through the workflow. Tasks are the shared unit of work the team collaborates on.

Assumption (surfaced from the confirmed understanding): at the Lightweight MVP scope the task's core attributes are owner, due date, and status. Timeline/Gantt views, task dependencies, milestones, file attachments, and activity history that were discussed in the broader vision are not part of this MVP scope and are deferred to a later version.

### US-006: Create a task with owner, due date, and status

**Priority:** critical

> As a team member, I want to create a task within a project and assign an owner, due date, and status, so that responsibility and timing for the work are clear.

| ID | Given | When | Then |
|---|---|---|---|
| AC-015 | I am viewing a project | I create a task with a title | the task is added to the project and appears in its task views |
| AC-016 | I am creating or editing a task | I assign an owner from the team, set a due date, and choose a status | the owner, due date, and status are saved and shown on the task |
| AC-017 | I try to create a task without a title | I submit it | the task is not created and I am prompted to provide a title |

### US-007: Update task status and details

**Priority:** high

> As a team member, I want to change a task's status, owner, or due date as work progresses, so that the task always reflects the current state of the work.

| ID | Given | When | Then |
|---|---|---|---|
| AC-018 | an existing task | I change its status to another valid status | the new status is saved and reflected consistently across all views |
| AC-019 | an existing task | I reassign its owner or change its due date | the change is saved and visible to all team members |

## EPIC-004: Task Views

The same tasks can be viewed interchangeably as a Kanban board and as a task list. Changes made in one view are reflected in the other because both operate over the same underlying tasks.

Assumption (surfaced from the confirmed understanding): the timeline/Gantt view with dependencies and milestones from the broader vision is beyond the Lightweight MVP scope and is not included in this version.

### US-008: Kanban board view of tasks

**Priority:** critical

> As a team member, I want to view a project's tasks as a Kanban board grouped by status, so that I can visualize and manage workflow by dragging tasks between columns.

| ID | Given | When | Then |
|---|---|---|---|
| AC-020 | a project with tasks in various statuses | I open the Kanban board view | each task appears as a card in the column matching its status |
| AC-021 | I am viewing the Kanban board | I move a task card to a different status column | the task's status is updated and the change persists |

### US-009: Task list view

**Priority:** high

> As a team member, I want to view a project's tasks as a list showing owner, due date, and status, so that I can scan and manage tasks in a compact tabular form.

| ID | Given | When | Then |
|---|---|---|---|
| AC-022 | a project with tasks | I open the task list view | I see each task in a row with its title, owner, due date, and status |
| AC-023 | I am viewing the same project in both the list and the board | I update a task in the list view | the change is reflected on the Kanban board because both views share the same tasks |

## EPIC-005: Task Collaboration

Team members collaborate in context on individual tasks through comments, checklists/subtasks, and labels.

Assumption (surfaced from the confirmed understanding): comments, checklists/subtasks, and labels are assumed standard collaboration features rather than explicitly confirmed. File attachments and a full activity history, also mentioned in the broader vision, are beyond the Lightweight MVP scope and are not included in this version.

### US-010: Comment on a task

**Priority:** high

> As a team member, I want to post comments on a task, so that the team can discuss the work in context.

| ID | Given | When | Then |
|---|---|---|---|
| AC-024 | I am viewing a task | I post a comment | the comment is saved and shown with my name and a timestamp to all team members viewing the task |
| AC-025 | a task has existing comments | I open the task | I see the comments in chronological order |
| AC-026 | I try to post an empty comment | I submit it | no comment is saved and I am prompted to enter text |

### US-011: Checklists and subtasks on a task

**Priority:** medium

> As a team member, I want to add checklist items or subtasks to a task and mark them done, so that I can break work into smaller steps and track progress.

| ID | Given | When | Then |
|---|---|---|---|
| AC-027 | I am viewing a task | I add a checklist item or subtask | it appears in the task's checklist in an incomplete state |
| AC-028 | a task has checklist items | I mark an item complete | its completed state is saved and the task shows how many items are done out of the total |

### US-012: Labels on a task

**Priority:** medium

> As a team member, I want to apply labels to tasks, so that I can categorize and visually distinguish tasks.

| ID | Given | When | Then |
|---|---|---|---|
| AC-029 | I am viewing a task | I add one or more labels to it | the labels are saved and displayed on the task in both the board and list views |
| AC-030 | a task has a label | I remove that label | the label no longer appears on the task |
<!-- sdlc:auto:end epics -->
