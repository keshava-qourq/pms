# Product Requirements

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start narrative -->
## Summary

### REQ-TECH-001 · approved · source: requirements:technology_stack

Product owner approved a fixed stack: FastAPI 0.115 backend, AWS cloud, PostgreSQL 16 database, React 19 frontend. Rationale ties each choice to flat-access CRUD, one-way Slack/email fan-out, relational task data, and the three interchangeable task views (board/list/timeline) with drag-and-drop.

- Backend: FastAPI 0.115 -- chosen for straightforward storage of projects/tasks, flat 'everyone can edit everything' rule with a basic admin tier, one-way webhook/email fan-out, and automatic API docs.
- Cloud: AWS -- single vendor providing managed PostgreSQL, S3 for attachments, and app hosting; sized for 25 users, scales as company grows.
- Database: PostgreSQL 16 -- chosen because projects/tasks/owners/due dates/comments/checklists/labels and 'timeline dependencies between tasks' are highly relational, and to reliably model 'activity history'.
- Frontend: React 19 -- chosen because the product's value is three interchangeable views (Kanban, list, Gantt/timeline with dependencies) plus drag-and-drop, inline comments, checklists, live updates, and one responsive-web codebase.
Design instruction: build against exactly these versions, do not substitute.

**Related:** US-001, US-004, US-006, US-008, US-009

- ⚠ Conflict: the React 19 rationale cites a 'Gantt/timeline with dependencies' view as part of the product's core value, but EPIC-004's stated assumption explicitly excludes the timeline/Gantt view with dependencies and milestones from this MVP scope. Needs product-owner clarification on which is authoritative.
- ⚠ Conflict: the PostgreSQL rationale cites modeling 'activity history reliably' as a driver, but EPIC-003's assumption explicitly defers activity history to a later version. Flagging discrepancy rather than resolving it.
- ⚠ Conflict: the AWS/S3 rationale states 'Tasks support file attachments' and justifies S3 for 'task file attachments', but EPIC-003's assumption explicitly excludes file attachments from this MVP scope. Needs clarification on whether attachments are in or out for this release.

### REQ-SERVICES-001 · approved · source: requirements:runtime_services

Product owner approved four runtime services: Amazon S3 (file storage), SendGrid (email), Redis (queue), and Slack (chat webhook), each with named required env vars.

- Amazon S3 (saas): env AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET -- for task file attachments, kept out of the database.
- SendGrid (saas): env SENDGRID_API_KEY -- sends email notifications and admin invites (ties to US-002 invite flow).
- Redis (container redis:7-alpine, used as a queue): no dedicated env var named beyond REDIS_URL (listed separately in API keys) -- queues outbound Slack/email side-effects so they don't block task saves, with retry on outage.
- Slack (custom): env SLACK_WEBHOOK_URL -- pushes updates to a team channel via incoming webhook.
Full required API key/env list: AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, REDIS_URL, S3_BUCKET, SENDGRID_API_KEY, SLACK_WEBHOOK_URL.

**Related:** US-001, US-002, US-010

- ⚠ No user story or acceptance criterion specifies which events trigger a Slack message or an email notification (e.g. task created, status changed, comment posted, assignment changed). The services section describes the integration exists but not its triggering rules -- needs a requirement or AC before design/build.
- ⚠ S3 file-attachment service is approved for runtime, but as noted under REQ-TECH-001, EPIC-003 explicitly places file attachments out of MVP scope -- open conflict on whether this service is actually needed for this release.

### REQ-SCOPE-001 · draft · source: requirements:scope

Delivery scope is 'lightweight', requirements are at version 3. In-scope capabilities and explicit out-of-scope exclusions are listed to bound the MVP.

In scope: team member sign-in, projects to organize work, tasks with owner/due date/status, Kanban board view, task list view, task comments, checklists/subtasks, labels, projects overview dashboard, email+password sign-in (no SSO in v1).
Out of scope -- explicitly not to be designed or built: native iOS/Android mobile apps; two-way sync with external systems (Jira, GitHub, calendars, file storage).
Sizing assumption: single small team, up to ~25 users, a few dozen active projects at a time.
Regulatory assumption: single region, no special regulatory or data-residency requirements for general-industry internal tooling (no industry/compliance skill named in this input).

- ⚠ No industry or domain-specific compliance skill was named for this project, so no regulatory traceability was applicable beyond the general single-region/no-special-requirements assumption stated in the input.

### EPIC-001 · draft · source: requirements:EPIC-001

Authentication is email/password only (no SSO in v1); admins invite members by email. Access is flat -- every signed-in member can see and edit all projects/tasks, with admin distinguished only by invite capability.

- US-001 (critical): sign in with email/password; correct credentials authenticate to projects overview (AC-001); wrong credentials show an invalid-credentials error (AC-002); unauthenticated direct access to project/task pages redirects to sign-in (AC-003).
- US-002 (high): admin invites a colleague by email, recording an invitation the invitee uses to set a password (AC-004); invite function is hidden from non-admins (AC-005); duplicate invite to an existing member's email is blocked with a message (AC-006).
- US-003 (high): any signed-in member sees every project regardless of creator (AC-007) and can edit any project/task they didn't create, since there is no per-project privacy or roles beyond admin (AC-008).
- US-013 (low): sign-in and invite screens restyled to a black/white/greyscale-only theme; error states must be distinguishable by contrast/typography, not color (AC-031, AC-032).
- US-018 (low): removes the descriptive paragraph about email/password and equal access from the sign-in form, with no layout or functional regression (AC-042, AC-043, AC-044).

**Related:** US-001, US-002, US-003, US-013, US-018

- ⚠ No story covers password reset / forgot-password flow, account lockout, or session expiry -- not addressed anywhere in this requirement set.
- ⚠ Assumption stated but not independently confirmed: single-region operation with no special regulatory/data-residency requirements (carried from EPIC-001 context, not a specific AC).

### EPIC-002 · draft · source: requirements:EPIC-002

Projects organize tasks; any member can create/edit a project, and a dashboard gives an at-a-glance overview of all active projects with progress summaries.

- US-004 (critical): creating a project requires a name, saved and visible to the whole team (AC-009); missing name blocks creation with a prompt (AC-010); editing name/description updates are shown to all members (AC-011).
- US-005 (high): dashboard lists each project with name and task progress summary, e.g. counts complete/total (AC-012); selecting a project navigates to its tasks (AC-013); empty state invites creating the first project when none exist (AC-014).
- US-014 (low): dashboard and project create/edit screens restyled to black/white/greyscale theme, including cards, progress indicators, empty state, form fields and validation messages (AC-033, AC-034).

**Related:** US-004, US-005, US-014

- ⚠ No explicit limit or archiving/deletion behavior for projects is described -- only creation and editing are covered.

### EPIC-003 · draft · source: requirements:EPIC-003

Tasks carry an owner, due date, and status as their core attributes in this MVP. Dependencies, milestones, timeline/Gantt, attachments and activity history are explicitly deferred to a later version per the stated assumption.

- US-006 (critical): creating a task needs a title to be added to a project and appear in its views (AC-015); owner, due date and status can be set together and are saved/shown (AC-016); missing title blocks creation with a prompt (AC-017).
- US-007 (high): status changes persist and show consistently across views (AC-018); reassigning owner or changing due date is saved and visible to all members (AC-019).
- US-015 (low): task create/edit screens restyled to black/white/greyscale theme for owner/due-date/status controls, keeping validation messages legible (AC-035, AC-036).
Stated assumption: at MVP scope the task's core attributes are owner, due date, status only; Gantt/timeline, dependencies, milestones, file attachments, and activity history are deferred.

**Related:** US-006, US-007, US-015

- ⚠ The set of valid task statuses (e.g. names, order, count of workflow stages) is never enumerated in any US or AC -- needed before board columns/list values can be built.
- ⚠ As flagged under REQ-TECH-001, this epic's deferral of file attachments and activity history conflicts with the AWS/PostgreSQL rationale that assumes these features exist -- unresolved discrepancy.

### EPIC-004 · draft · source: requirements:EPIC-004

Tasks are viewable interchangeably as a Kanban board (grouped by status, drag-and-drop) and as a list (tabular, showing owner/due date/status), both reflecting the same underlying data. A Gantt/timeline view is explicitly out of MVP scope.

- US-008 (critical): Kanban board groups task cards into columns matching status (AC-020); dragging a card to another column updates and persists its status (AC-021).
- US-009 (high): list view shows title, owner, due date, status per row (AC-022); edits made in list view reflect on the board because both share the same tasks (AC-023).
- US-016 (medium): Kanban restyled to black/white/greyscale while columns/cards must remain distinguishable via shading, borders or labels (not color) (AC-037, AC-038); status changes after a drag still persist and show visually under the new theme (AC-039).
- US-017 (medium, QA): visual regression and accessibility check across all delivered screens (sign-in, invite, dashboard, project, task create/edit, Kanban) at desktop and mobile widths for contrast/readability/layout (AC-040), and a full functional regression pass of sign-in, create project, create task, drag-a-card flows (AC-041).
Stated assumption: timeline/Gantt view with dependencies and milestones is beyond this MVP scope.

**Related:** US-008, US-009, US-016, US-017

- ⚠ As flagged under REQ-TECH-001, the React 19 stack rationale cites the Gantt/timeline view as a core driver while this epic explicitly excludes it from MVP -- unresolved discrepancy to confirm with product owner.
- ⚠ US-017 describes QA verification intent but no test results or execution records exist yet in the input; this entry documents only the requirement/AC, not actual test outcomes.

### EPIC-005 · draft · source: requirements:EPIC-005

Team members collaborate on individual tasks via comments, checklists/subtasks, and labels. Noted as assumed standard features rather than explicitly confirmed by the product owner; file attachments and full activity history are out of MVP scope.

- US-010 (high): posting a comment saves it with author name and timestamp, visible to all viewers (AC-024); existing comments show in chronological order (AC-025); empty comment submission is blocked with a prompt (AC-026).
- US-011 (medium): adding a checklist item/subtask appears incomplete by default (AC-027); marking an item complete saves state and the task shows a done/total count (AC-028).
- US-012 (medium): adding one or more labels to a task saves and displays them in both board and list views (AC-029); removing a label removes it from display (AC-030).
Stated assumption: comments, checklists/subtasks, and labels are assumed standard collaboration features rather than explicitly confirmed by the product owner.

**Related:** US-010, US-011, US-012

- ⚠ Comments, checklists, and labels are flagged in the input itself as assumed rather than explicitly confirmed by the product owner -- recommend confirming before/at design handoff.
- ⚠ No AC specifies comment editing or deletion, checklist item deletion/reordering, or label creation/management (e.g. who defines the label set, color/text, max count) -- left unspecified.
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
