# Product Requirements

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
## Summary

### SCOPE-001 · approved · source: requirements:scope

PMS v2 is a lightweight MVP project management tool for an internal team of up to ~25 users managing a few dozen active projects. Scope covers sign-in, projects, tasks, Kanban/list views, comments, checklists, and labels.

Delivery scope: lightweight. Requirements version: 2. Capabilities in scope: team member sign-in (email/password only, no SSO), projects to organize work, tasks with owners/due dates/statuses, Kanban board view, task list view, task comments, checklists/subtasks, labels, projects overview dashboard. Out of scope (explicitly excluded, not to be designed or built): native iOS/Android mobile apps; two-way sync with external systems such as Jira, GitHub, calendars, or file storage.

**Related:** US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008, US-009, US-010, US-011, US-012

### TECH-STACK-001 · approved · source: requirements:tech-stack

Product owner approved an exact technology stack: FastAPI 0.115 backend, AWS cloud, PostgreSQL 16 database, React 19 frontend. Instruction is to design against exactly these, no substitutions.

Backend: FastAPI 0.115 -- chosen for straightforward project/task storage, flat 'everyone can edit everything' access with a basic admin tier, and one-way webhook/email fan-out, plus automatic API docs. Cloud: AWS -- managed PostgreSQL, S3 for task file attachments, and app hosting in one vendor; scales down for 25 users and up as the company grows. Database: PostgreSQL 16 -- models relational data (projects, tasks, owners, due dates, comments, checklists, labels, timeline dependencies) and activity history; comfortably sized for a few dozen projects / 25 users. Frontend: React 19 -- supports three interchangeable views (Kanban, list, Gantt/timeline) with drag-and-drop, inline comments, checklists, live updates, single codebase for desktop/mobile browsers (responsive web only, no native apps).

**Related:** US-001, US-004, US-006, US-008, US-009

- ⚠ Conflict: this stack's rationale describes S3 for 'task file attachments' and PostgreSQL modeling 'timeline dependencies between tasks' and 'activity history', but the requirements explicitly scope file attachments, Gantt/timeline dependencies, and activity history OUT of this MVP (see EPIC-003 and EPIC-005 assumptions). Needs reconciliation: either the tech rationale is written for the broader future vision rather than this MVP, or scope is understated.
- ⚠ Backend rationale states it 'fans updates out to Slack and email', but no user story in this requirements set describes task/project update notifications to Slack or email (only US-002 admin-invite email is covered). Gap: notification-trigger requirements are undocumented.

### SERVICES-001 · approved · source: requirements:services

Product owner approved four runtime services: Amazon S3 for file storage, SendGrid for email, Redis as a background queue, and Slack via incoming webhook for chat updates.

File storage: Amazon S3 (saas; env AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET) -- for task file attachments, kept out of the database. Email: SendGrid (saas; env SENDGRID_API_KEY) -- sends email notifications and admin invites. Queue: Redis (container redis:7-alpine, used as a queue) -- backgrounds Slack/email side-effects so saving a task isn't blocked, with retry if Slack/email is briefly down. Chat: Slack (custom; env SLACK_WEBHOOK_URL) -- pushes updates to the team's Slack channel via incoming webhook. Full required API key/env list: AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, REDIS_URL, S3_BUCKET, SENDGRID_API_KEY, SLACK_WEBHOOK_URL.

**Related:** US-002, US-010

- ⚠ Conflict: S3 file storage is justified by 'task file attachments', which the requirements (EPIC-003, EPIC-005) explicitly defer out of this MVP scope. No in-scope user story currently requires file upload/storage.
- ⚠ No user story describes what triggers a Slack message or an email notification (beyond the admin invite email in US-002) -- the 'fan out updates' behavior implied by this service and the backend rationale is undocumented at the requirement level.
- ⚠ 'Admin tier' for invite-only privilege is referenced in tech rationale but no requirement defines whether admins have any other special capability beyond inviting (see US-003 gap).

### EPIC-001 · draft · source: requirements:EPIC-001

Authentication and Team Membership: internal team members sign in; an administrator invites new members by email. Access is flat -- every signed-in member can see and edit all projects/tasks, with the admin distinguished only by invite capability.

Assumption surfaced during requirements gathering: authentication is email/password with admin-invites by email; no SSO/SAML in v1. Company operates in a single region with no special regulatory/data-residency requirements for general-industry internal tooling. Covers US-001 (sign in), US-002 (admin invites), US-003 (flat/equal access), and US-013 (monochrome theme for sign-in/invite screens).

**Related:** US-001, US-002, US-003, US-013

- ⚠ No regulated industry or compliance domain was named for this project, so no regulatory traceability obligations apply per the stated assumption -- confirm this remains true before architecture/design.

### EPIC-002 · draft · source: requirements:EPIC-002

Projects: work is organized into projects containing tasks; a projects overview dashboard gives an at-a-glance view of the few dozen active projects for the ~25-person team.

Covers US-004 (create/manage project), US-005 (projects overview dashboard), and US-014 (monochrome theme for dashboard and project create/edit screens). System is explicitly sized for up to ~25 users and a few dozen active projects.

**Related:** US-004, US-005, US-014

### EPIC-003 · draft · source: requirements:EPIC-003

Tasks: each project contains tasks with an owner, due date, and status that moves through a workflow -- the shared unit of work the team collaborates on.

Assumption surfaced during requirements gathering: at Lightweight MVP scope, a task's core attributes are owner, due date, and status only. Timeline/Gantt views, task dependencies, milestones, file attachments, and activity history discussed in the broader product vision are explicitly deferred to a later version. Covers US-006 (create task), US-007 (update task status/details), and US-015 (monochrome theme for task create/edit screens).

**Related:** US-006, US-007, US-015

- ⚠ Deferred-to-later items (timeline/Gantt, dependencies, milestones, file attachments, activity history) are explicitly out of this MVP -- see conflict noted in TECH-STACK-001/SERVICES-001 regarding S3 attachments and PostgreSQL dependency/activity-history rationale being written against the broader (not MVP) scope.

### EPIC-004 · draft · source: requirements:EPIC-004

Task Views: the same tasks can be viewed interchangeably as a Kanban board or a task list; changes in one view reflect in the other because both operate over the same underlying tasks.

Assumption surfaced during requirements gathering: the timeline/Gantt view with dependencies and milestones from the broader vision is beyond this Lightweight MVP and not included. Covers US-008 (Kanban board), US-009 (task list), US-016 (monochrome theme + status distinction for Kanban), and US-017 (visual regression/accessibility QA check across all delivered screens).

**Related:** US-008, US-009, US-016, US-017

### EPIC-005 · draft · source: requirements:EPIC-005

Task Collaboration: team members collaborate in context on individual tasks through comments, checklists/subtasks, and labels.

Assumption surfaced during requirements gathering: comments, checklists/subtasks, and labels are assumed standard collaboration features rather than explicitly confirmed by the product owner. File attachments and a full activity history, also mentioned in the broader vision, are beyond Lightweight MVP scope and not included in this version. Covers US-010 (comments), US-011 (checklists/subtasks), US-012 (labels).

**Related:** US-010, US-011, US-012

- ⚠ Comments/checklists/labels are flagged as assumed rather than explicitly confirmed -- recommend product-owner sign-off before architecture locks these in.
- ⚠ File attachments and activity history are deferred here, reinforcing the conflict with the approved tech stack/services rationale (S3 for attachments, PostgreSQL for activity history) documented in TECH-STACK-001/SERVICES-001.

### US-001 · draft · source: requirements:US-001

Team members sign in with email and password to securely access the team's projects and tasks. Critical priority.

AC-001: correct email+password on sign-in submit authenticates the user and routes to the projects overview. AC-002: non-matching email/password shows an 'invalid credentials' error, no sign-in. AC-003: unauthenticated direct access to any project/task page redirects to sign-in.

**Related:** EPIC-001

### US-002 · draft · source: requirements:US-002

An administrator invites new team members by email so colleagues can join and collaborate. High priority.

AC-004: admin enters a colleague's email and sends an invite; invitation is recorded, invitee can set a password to create an account. AC-005: non-admin signed-in members do not see the invite-member function. AC-006: inviting an email that already belongs to an existing member is prevented, admin is informed of the duplicate.

**Related:** EPIC-001, US-001

### US-003 · draft · source: requirements:US-003

Every signed-in team member can see and edit every project and task -- access is flat and equal with no per-project privacy or roles beyond basic admin functions. High priority.

AC-007: any signed-in member sees every project in the workspace regardless of creator, on the projects overview. AC-008: any signed-in member can edit a task/project they did not create, and the change saves, because access is flat with no per-project restrictions beyond basic admin functions.

**Related:** EPIC-001, US-001, US-002

- ⚠ Admin's distinguishing power is stated only as 'invite new members' (US-002); no other admin-only capability is defined anywhere in this input -- confirm whether admin has any other function before architecture defines roles/permissions.

### US-004 · draft · source: requirements:US-004

A team member creates a project and edits its details to organize related tasks under one project. Critical priority.

AC-009: creating a project with a name saves it and it appears in the projects overview for the whole team. AC-010: submitting without a name blocks creation and prompts for a name. AC-011: editing name/description saves the update and shows it to all team members.

**Related:** EPIC-002

### US-005 · draft · source: requirements:US-005

A dashboard lists all projects with key status so the team can quickly see what's active and navigate in. High priority.

AC-012: dashboard shows each project with a summary (name, task progress e.g. count complete/total). AC-013: selecting a project navigates to that project's tasks. AC-014: with zero projects, an empty state invites the user to create the first project.

**Related:** EPIC-002, US-004

### US-006 · draft · source: requirements:US-006

A team member creates a task within a project and assigns an owner, due date, and status so responsibility and timing are clear. Critical priority.

AC-015: creating a task with a title adds it to the project and it appears in its task views. AC-016: assigning owner, due date, and status on create/edit saves and displays all three on the task. AC-017: submitting without a title blocks creation and prompts for a title.

**Related:** EPIC-003

### US-007 · draft · source: requirements:US-007

A team member changes a task's status, owner, or due date as work progresses so the task reflects current state. High priority.

AC-018: changing status to another valid status saves it and reflects consistently across all views. AC-019: reassigning owner or changing due date saves and is visible to all team members.

**Related:** EPIC-003, US-006

### US-008 · draft · source: requirements:US-008

A team member views a project's tasks as a Kanban board grouped by status, managing workflow by dragging cards between columns. Critical priority.

AC-020: tasks appear as cards in the column matching their status. AC-021: moving a card to a different status column updates and persists the task's status.

**Related:** EPIC-004, US-006, US-007

### US-009 · draft · source: requirements:US-009

A team member views a project's tasks as a list showing owner, due date, and status to scan/manage tasks in compact tabular form. High priority.

AC-022: list view shows each task in a row with title, owner, due date, status. AC-023: updating a task in list view reflects on the Kanban board because both views share the same underlying tasks.

**Related:** EPIC-004, US-008

### US-010 · draft · source: requirements:US-010

A team member posts comments on a task so the team can discuss the work in context. High priority.

AC-024: posting a comment saves it and shows it with author name and timestamp to all viewers. AC-025: existing comments display in chronological order. AC-026: submitting an empty comment is blocked and prompts for text.

**Related:** EPIC-005

### US-011 · draft · source: requirements:US-011

A team member adds checklist items or subtasks to a task and marks them done to break work into smaller steps and track progress. Medium priority.

AC-027: adding a checklist item/subtask shows it in an incomplete state. AC-028: marking an item complete saves the state and the task shows completed-count out of total.

**Related:** EPIC-005

### US-012 · draft · source: requirements:US-012

A team member applies labels to tasks to categorize and visually distinguish them. Medium priority.

AC-029: adding one or more labels saves them and displays them on the task in both board and list views. AC-030: removing a label removes it from display.

**Related:** EPIC-005

### US-013 · draft · source: requirements:US-013

The sign-in and invite screens are restyled to a black-and-white/greyscale theme for visual consistency with the new look. Low priority.

AC-031: sign-in page backgrounds, text, buttons, and error states use only black/white/greyscale tones, replacing the previous color palette. AC-032: the invalid-credentials error remains clearly distinguishable via contrast and typography alone, not color.

**Related:** EPIC-001, US-001, US-002

### US-014 · draft · source: requirements:US-014

The projects overview dashboard and project create/edit screens are restyled to the monochrome theme. Low priority.

AC-033: project cards, progress indicators, and empty state use only black/white/greyscale tones. AC-034: project create/edit form fields, buttons, and validation messages use the new monochrome palette.

**Related:** EPIC-002, US-004, US-005

### US-015 · draft · source: requirements:US-015

The task create and edit screens are restyled to the monochrome theme. Low priority.

AC-035: owner, due date, and status controls on task create/edit forms use only black/white/greyscale tones. AC-036: required-field validation messages remain clearly legible against the new monochrome background.

**Related:** EPIC-003, US-006, US-007

### US-016 · draft · source: requirements:US-016

The Kanban board is restyled to the monochrome theme while remaining able to distinguish status columns/cards apart without color. Medium priority.

AC-037: each column and card uses only black/white/greyscale tones. AC-038: two differently-statused columns remain distinguishable via shading, borders, or labels -- not color alone. AC-039: moving a card to a new status column visually reflects the new status in monochrome and the status change still persists as before.

**Related:** EPIC-004, US-008

### US-017 · draft · source: requirements:US-017

A QA engineer verifies the black-and-white theme across all delivered screens on desktop and mobile widths, confirming no contrast, readability, layout, or functional regressions. Medium priority.

AC-040: every delivered screen (sign-in, invite, dashboard, project, task create/edit, Kanban board) rendered in the monochrome theme at desktop and mobile widths meets readable contrast for text/interactive elements with no layout regressions. AC-041: core functional flows (sign-in, create project, create task, drag a card) all work exactly as before the theme change, confirming no functional regression.

**Related:** EPIC-001, EPIC-002, EPIC-003, EPIC-004, US-013, US-014, US-015, US-016

- ⚠ This is a verification/testing-oriented story defined at requirements time; actual execution and results belong to the testing phase, which has not started -- no test results exist yet to confirm AC-040/AC-041.
<!-- sdlc:auto:end narrative -->

<!-- sdlc:auto:start summary -->
**Requirements version:** v2  
**Delivery scope:** lightweight  
**Approved:** 2026-10-27

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

### US-013: Monochrome theme for sign-in and invite screens

**Priority:** low

> As a team member, I want the sign-in page to use the new black-and-white theme, so that my first experience of the app matches the new look consistently.

| ID | Given | When | Then |
|---|---|---|---|
| AC-031 | the sign-in page is open | the page renders | all backgrounds, text, buttons and error states use only black, white and greyscale tones instead of the previous color palette |
| AC-032 | the invalid-credentials error is shown | the page renders the error | the error is clearly distinguishable using contrast and typography alone, not color |

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

### US-014: Monochrome theme for projects dashboard and project screens

**Priority:** low

> As a team member, I want the projects overview dashboard and project create/edit screens to use the new black-and-white theme, so that project management screens match the new visual style.

| ID | Given | When | Then |
|---|---|---|---|
| AC-033 | the projects overview dashboard is open | the page renders | project cards, progress indicators and the empty state use only black, white and greyscale tones |
| AC-034 | the project create or edit form is open | the form renders | form fields, buttons and validation messages use the new monochrome palette instead of the previous colors |

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

### US-015: Monochrome theme for task creation and editing screens

**Priority:** low

> As a team member, I want the task create and edit screens to use the new black-and-white theme, so that task detail and form screens match the new visual style.

| ID | Given | When | Then |
|---|---|---|---|
| AC-035 | a task create or edit form is open | the form renders | owner, due date and status controls use only black, white and greyscale tones instead of the previous colors |
| AC-036 | a required field is missing on submit | the validation message is shown | the message remains clearly legible against the new monochrome background |

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

### US-016: Monochrome theme and status distinction for the Kanban board

**Priority:** medium

> As a team member, I want the Kanban board to use the new black-and-white theme while still letting me tell status columns and cards apart, so that I can keep managing workflow visually after the colors that previously marked status are removed.

| ID | Given | When | Then |
|---|---|---|---|
| AC-037 | a project with tasks in various statuses | I open the Kanban board | each column and card uses only black, white and greyscale tones |
| AC-038 | the Kanban board is rendered in the new theme | I look at two columns with different statuses | I can still distinguish them from each other using shading, borders or labels, not color alone |
| AC-039 | I move a task card to a different status column | the move completes | the card's new status is reflected visually in the monochrome theme and the status change persists as before |

### US-017: Visual regression and accessibility check for the new monochrome theme

**Priority:** medium

> As a QA engineer, I want to verify the black-and-white theme across all delivered screens on desktop and mobile widths, so that the restyle does not break contrast, readability or responsive layout.

| ID | Given | When | Then |
|---|---|---|---|
| AC-040 | each delivered screen (sign-in, invite, dashboard, project, task create/edit, Kanban board) | it is rendered in the new monochrome theme at desktop and mobile widths | text and interactive elements meet readable contrast against their background and no layout regressions are introduced |
| AC-041 | the restyled app | functional flows from the delivered stories are exercised (sign-in, create project, create task, drag a card) | all behaviours work exactly as before the theme change, confirming no functional regression |

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
