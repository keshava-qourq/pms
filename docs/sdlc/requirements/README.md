# Product Requirements

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
## Summary

### REQ-TECHSTACK · approved · source: requirements:technology-stack

Technology stack approved by the product owner (requirements v3): FastAPI 0.115 backend, AWS cloud, PostgreSQL 16 database, React 19 frontend.

- Backend: FastAPI 0.115 -- lean, fast Python framework; handles simple 'everyone can edit everything' rule with a basic admin tier; easy one-way Slack webhook/email integrations; automatic API docs.
- Cloud: AWS -- managed PostgreSQL, S3 for attachments, and compute in one vendor for a single internal team; scales down affordably for 25 users, stays dependable as the company grows.
- Database: PostgreSQL 16 -- models relational data (projects, tasks, owners, due dates, comments, checklists, labels, task dependencies/timeline) and activity history reliably; far inside its comfort zone at a few dozen projects / 25 users.
- Frontend: React 19 -- drives three interchangeable live-updating views (Kanban, list, Gantt/timeline) plus drag-and-drop, inline comments and checklists from one responsive codebase for desktop and mobile browsers.

### REQ-SERVICES · approved · source: requirements:services

Approved runtime services: Amazon S3 for attachments, SendGrid for email, Redis as an outbound job queue, and Slack via incoming webhook.

- File storage: Amazon S3 (saas; env AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET) -- task file attachments belong in object storage, not the database, to keep uploads cheap and the app fast.
- Email: SendGrid (saas; env SENDGRID_API_KEY) -- delivers email notifications and admin invites reliably with a single API key.
- Queue: Redis as a queue (container redis:7-alpine) -- outbound Slack/email side-effects shouldn't block a task save; lightweight queue sends in background and retries on Slack/email outages.
- Chat: Slack (custom; env SLACK_WEBHOOK_URL) -- updates pushed to the team's Slack channel via incoming webhook.
Full API key list required: AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, REDIS_URL, S3_BUCKET, SENDGRID_API_KEY, SLACK_WEBHOOK_URL.

### REQ-SCOPE · approved · source: requirements:scope

Lightweight MVP scope: in-scope capabilities cover sign-in, projects, tasks, two task views, collaboration and a dashboard; explicitly excludes native mobile apps and two-way external sync.

In scope: Team member sign-in (email/password, no SSO in v1); Projects to organize work; Tasks with owners, due dates and statuses; Kanban board view; Task list view; Task comments; Checklists/subtasks; Labels on tasks; Projects overview dashboard.
Out of scope -- do not design or build: Native iOS/Android mobile apps; Two-way sync with external systems such as Jira, GitHub, calendars, or file storage.

### REQ-AUTH · approved · source: requirements:scope

Email/password sign-in for internal team members; no SSO/SAML in v1.

Team members sign in with email and password to access the team's projects and tasks. No single sign-on or SAML integration is included in this version.

**Related:** EPIC-001

### REQ-PROJECTS · approved · source: requirements:scope

Projects organize related tasks for the team.

Capability: Projects to organize work -- team members create and manage projects that group related tasks.

**Related:** EPIC-002

### REQ-TASKS · approved · source: requirements:scope

Tasks carry an owner, a due date and a status that tracks progress.

Capability: Tasks with owners, due dates, and statuses -- the core unit of work the team tracks and assigns within a project.

**Related:** EPIC-003

### REQ-VIEWS · approved · source: requirements:scope

Tasks can be viewed interchangeably as a Kanban board or a flat list.

Capabilities: Kanban board view of tasks (grouped by status, drag-and-drop); Task list view (tabular, scannable). Both operate over the same underlying tasks.

**Related:** EPIC-004

### REQ-COLLAB · approved · source: requirements:scope

Team members discuss and organize tasks via comments, checklists/subtasks, and labels.

Capabilities: Task comments; Checklists/subtasks on tasks; Labels on tasks -- in-context collaboration features on individual tasks.

**Related:** EPIC-005

### REQ-DASHBOARD · approved · source: requirements:scope

A projects overview dashboard gives an at-a-glance view of active work.

Capability: Projects overview dashboard -- lists all projects for quick navigation and status scanning.

**Related:** EPIC-002
<!-- sdlc:auto:end narrative -->

<!-- sdlc:auto:start summary -->
**Requirements version:** v3  
**Delivery scope:** lightweight  
**Approved:** 2026-11-06

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

### US-018: Remove descriptive paragraph from sign-in form

**Priority:** low

> As a team member, I want the sign-in screen to no longer show the explanatory paragraph about email/password and equal access, so that the sign-in form is cleaner and free of redundant descriptive copy.

| ID | Given | When | Then |
|---|---|---|---|
| AC-042 | the sign-in page is open | the page renders | the paragraph containing 'Email and password. Every signed-in member sees and edits every project in the workspace.' is no longer displayed |
| AC-043 | the sign-in page is open | the paragraph is removed | the sign-in form layout (email field, password field, submit button, error state) remains correctly spaced and functional with no visual regression |
| AC-044 | a user enters valid or invalid credentials | they submit the sign-in form after the paragraph is removed | sign-in success and error behaviours work exactly as before, confirming no functional regression |

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
