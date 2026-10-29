# PMS — SDLC Documentation

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start overview -->
project management system

**Documentation version:** v9
<!-- sdlc:auto:end overview -->

## Contents

<!-- sdlc:auto:start contents -->
| Document | State |
|---|---|
| [Requirements](requirements/README.md) | v2 approved |
| [Architecture](architecture/README.md) | 7 entries |
| [Development](development/README.md) | 3 entries |
| [Testing](testing/README.md) | 1 entry |
| [Deployment](deployment/README.md) | 1 entry |
| [Maintenance](maintenance/README.md) | 1 entry |
| [Data model](architecture/data-model.md) | generated |
| [API (OpenAPI)](architecture/api/openapi.yaml) | generated |
| [Decisions (ADRs)](architecture/adr/README.md) | 4 decisions |
| [Sprint plan](development/sprint-plan.md) | 4 sprints |
| [Developer guide](development/developer-guide.md) | generated |
| [API reference](development/api-reference.md) | 21 routes |
| [Test report](testing/test-report.md) | not run yet |
| [Tests](testing/test-cases.md) | 110 tests |
| [Deployment guide](deployment/deployment-guide.md) | not deployed yet |
| [Runbook](deployment/runbook.md) | not deployed yet |
| [Release notes](deployment/release-notes.md) | 0 releases |
| [Traceability matrix](traceability-matrix.md) | 17 requirements |
| [Changelog](CHANGELOG.md) | 9 versions |
<!-- sdlc:auto:end contents -->

## Open gaps

<!-- sdlc:auto:start open-gaps -->
### Requirements

- Conflict: this stack's rationale describes S3 for 'task file attachments' and PostgreSQL modeling 'timeline dependencies between tasks' and 'activity history', but the requirements explicitly scope file attachments, Gantt/timeline dependencies, and activity history OUT of this MVP (see EPIC-003 and EPIC-005 assumptions). Needs reconciliation: either the tech rationale is written for the broader future vision rather than this MVP, or scope is understated.
- Backend rationale states it 'fans updates out to Slack and email', but no user story in this requirements set describes task/project update notifications to Slack or email (only US-002 admin-invite email is covered). Gap: notification-trigger requirements are undocumented.
- Conflict: S3 file storage is justified by 'task file attachments', which the requirements (EPIC-003, EPIC-005) explicitly defer out of this MVP scope. No in-scope user story currently requires file upload/storage.
- No user story describes what triggers a Slack message or an email notification (beyond the admin invite email in US-002) -- the 'fan out updates' behavior implied by this service and the backend rationale is undocumented at the requirement level.
- 'Admin tier' for invite-only privilege is referenced in tech rationale but no requirement defines whether admins have any other special capability beyond inviting (see US-003 gap).
- No regulated industry or compliance domain was named for this project, so no regulatory traceability obligations apply per the stated assumption -- confirm this remains true before architecture/design.
- Deferred-to-later items (timeline/Gantt, dependencies, milestones, file attachments, activity history) are explicitly out of this MVP -- see conflict noted in TECH-STACK-001/SERVICES-001 regarding S3 attachments and PostgreSQL dependency/activity-history rationale being written against the broader (not MVP) scope.
- Comments/checklists/labels are flagged as assumed rather than explicitly confirmed -- recommend product-owner sign-off before architecture locks these in.
- File attachments and activity history are deferred here, reinforcing the conflict with the approved tech stack/services rationale (S3 for attachments, PostgreSQL for activity history) documented in TECH-STACK-001/SERVICES-001.
- Admin's distinguishing power is stated only as 'invite new members' (US-002); no other admin-only capability is defined anywhere in this input -- confirm whether admin has any other function before architecture defines roles/permissions.
- This is a verification/testing-oriented story defined at requirements time; actual execution and results belong to the testing phase, which has not started -- no test results exist yet to confirm AC-040/AC-041.

### Architecture

- The input is for Revision 2 only; Revision 1 content is not included here, so earlier rationale/approvals for the pre-restyle architecture are not available to cross-check.
- No specific visual-regression/E2E test library has been named — it is only 'recommended', so tooling choice for US-017 is still open.
- S3 object store is provisioned for task file attachments, but no attachment entity appears in the data model and no attachment upload/download endpoint is listed — traceability between this component and a concrete requirement/entity/endpoint is incomplete.
- Critical paths 2 (create task and notify) and the base sign-in mechanics are not explicitly tied to a requirement id in this input, so related_ids could not be completed beyond the monochrome-specific US-013/US-016 callouts.
- No entity for file attachments despite S3 being provisioned specifically for task file attachments — this mismatch should be confirmed/resolved.
- No endpoint for uploading/retrieving task file attachments, despite the S3 object_store component existing for that purpose.

### Development

- Plan input lists sprints and backlog items separately with no explicit field assigning each story/subtask to a specific sprint; sprint-level scope beyond the stated goal text cannot be documented with certainty.
- US-008-T1, US-008-T2, US-008-T3 have no point estimates recorded.
- EPIC-001 through EPIC-005 have no point values or assigned role (epics are unassigned by role in the input).
- No date recorded for the delivery/commit.
- No test or review evidence included alongside the delivery record.
- Discrepancy: run status of 'completed' conflicts with delivery evidence covering only 1 of 17 planned stories -- unclear whether other tickets were actually delivered but omitted from input, or whether the 'completed' status is inaccurate/premature.
- No commit or status records for US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008 (+ subtasks), US-009, US-010, US-011, US-012, US-014, US-015, US-016, US-017.
- Cannot determine which sprints (1-4) are actually finished given the missing per-ticket data and absence of explicit sprint-to-item mapping in the plan.

### Testing

- Testing phase has not started -- no test plans or results have been recorded.

### Deployment

- No deployment recorded yet.

### Maintenance

- No maintenance-phase activity -- application has not been deployed yet.
<!-- sdlc:auto:end open-gaps -->
