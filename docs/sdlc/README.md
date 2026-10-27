# PMS — SDLC Documentation

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start overview -->
project management system

**Documentation version:** v6
<!-- sdlc:auto:end overview -->

## Contents

<!-- sdlc:auto:start contents -->
| Document | State |
|---|---|
| [Requirements](requirements/README.md) | v2 approved |
| [Architecture](architecture/README.md) | 13 entries |
| [Development](development/README.md) | 7 entries |
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
| [Tests](testing/test-cases.md) | 109 tests |
| [Deployment guide](deployment/deployment-guide.md) | not deployed yet |
| [Runbook](deployment/runbook.md) | not deployed yet |
| [Release notes](deployment/release-notes.md) | 0 releases |
| [Traceability matrix](traceability-matrix.md) | 17 requirements |
| [Changelog](CHANGELOG.md) | 6 versions |
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

- Requirements phase descriptions for US-001 through US-012 were not included in this input, so this architecture's entries could not be confidently linked to specific requirement IDs.
- No approval date was provided for this architecture version.
- No endpoint for uploading/retrieving task attachments is listed, and no detail on attachment access control, size limits, or lifecycle was provided — attachment flow appears provisioned at the infrastructure level but not yet specified at the API level.
- No endpoints for deleting projects, deleting tasks, deleting comments, removing checklist items, or marking in-app notifications as read were specified.

### Development

- Same commit hash is shared with US-004; confirm whether both stories were genuinely delivered in a single combined commit or if this is a reporting duplication.
- Same commit hash is shared with US-006; confirm whether both stories were delivered together or if this is a reporting duplication.
- No delivery status, commit, or progress is recorded for US-001, US-002, or US-003 despite the development run being marked 'completed' -- status of this work is unknown and should be confirmed with the development agent/run log.
- No delivery status, commit, or progress is recorded for US-008, US-009, US-010, US-011, or US-012 despite the development run being marked 'completed' -- status of this work is unknown and should be confirmed with the development agent/run log.

### Testing

- Testing phase has not started -- no test plans or results have been recorded.

### Deployment

- No deployment recorded yet.

### Maintenance

- No maintenance-phase activity -- application has not been deployed yet.
<!-- sdlc:auto:end open-gaps -->
