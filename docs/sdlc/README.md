# PMS — SDLC Documentation

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start overview -->
project management system

**Documentation version:** v8
<!-- sdlc:auto:end overview -->

## Contents

<!-- sdlc:auto:start contents -->
| Document | State |
|---|---|
| [Requirements](requirements/README.md) | v2 approved |
| [Architecture](architecture/README.md) | 7 entries |
| [Development](development/README.md) | 10 entries |
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
| [Changelog](CHANGELOG.md) | 8 versions |
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

- Conflict: run status is 'completed' yet only 4 of 17 planned stories have ticket records -- unclear whether 'completed' refers to the whole plan or only to a partial run/sprint; needs confirmation from the source system.
- No ticket/commit data for US-001 (sign in), US-002 (admin invite), US-003 (equal access), or US-013 (monochrome theme for sign-in/invite) despite the run being reported as completed and these being first in sequence.
- No ticket/commit data for US-014 despite other Sprint 2 items being marked delivered.
- No ticket/commit data for US-008 and its subtasks, US-009, US-010, US-011, or US-012.
- No ticket/commit data for US-015, US-016, or US-017; the monochrome theme rollout and its QA verification cannot be confirmed as started or completed.

### Testing

- Testing phase has not started -- no test plans or results have been recorded.

### Deployment

- No deployment recorded yet.

### Maintenance

- No maintenance-phase activity -- application has not been deployed yet.
<!-- sdlc:auto:end open-gaps -->
