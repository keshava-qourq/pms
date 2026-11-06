# PMS — SDLC Documentation

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start overview -->
project management system

**Documentation version:** v11
<!-- sdlc:auto:end overview -->

## Contents

<!-- sdlc:auto:start contents -->
| Document | State |
|---|---|
| [Requirements](requirements/README.md) | v3 approved |
| [Architecture](architecture/README.md) | 7 entries |
| [Development](development/README.md) | 6 entries |
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
| [Tests](testing/test-cases.md) | 128 tests |
| [Deployment guide](deployment/deployment-guide.md) | not deployed yet |
| [Runbook](deployment/runbook.md) | not deployed yet |
| [Release notes](deployment/release-notes.md) | 0 releases |
| [Traceability matrix](traceability-matrix.md) | 18 requirements |
| [Changelog](CHANGELOG.md) | 11 versions |
<!-- sdlc:auto:end contents -->

## Open gaps

<!-- sdlc:auto:start open-gaps -->
### Requirements

- Conflict: the React 19 rationale cites a 'Gantt/timeline with dependencies' view as part of the product's core value, but EPIC-004's stated assumption explicitly excludes the timeline/Gantt view with dependencies and milestones from this MVP scope. Needs product-owner clarification on which is authoritative.
- Conflict: the PostgreSQL rationale cites modeling 'activity history reliably' as a driver, but EPIC-003's assumption explicitly defers activity history to a later version. Flagging discrepancy rather than resolving it.
- Conflict: the AWS/S3 rationale states 'Tasks support file attachments' and justifies S3 for 'task file attachments', but EPIC-003's assumption explicitly excludes file attachments from this MVP scope. Needs clarification on whether attachments are in or out for this release.
- No user story or acceptance criterion specifies which events trigger a Slack message or an email notification (e.g. task created, status changed, comment posted, assignment changed). The services section describes the integration exists but not its triggering rules -- needs a requirement or AC before design/build.
- S3 file-attachment service is approved for runtime, but as noted under REQ-TECH-001, EPIC-003 explicitly places file attachments out of MVP scope -- open conflict on whether this service is actually needed for this release.
- No industry or domain-specific compliance skill was named for this project, so no regulatory traceability was applicable beyond the general single-region/no-special-requirements assumption stated in the input.
- No story covers password reset / forgot-password flow, account lockout, or session expiry -- not addressed anywhere in this requirement set.
- Assumption stated but not independently confirmed: single-region operation with no special regulatory/data-residency requirements (carried from EPIC-001 context, not a specific AC).
- No explicit limit or archiving/deletion behavior for projects is described -- only creation and editing are covered.
- The set of valid task statuses (e.g. names, order, count of workflow stages) is never enumerated in any US or AC -- needed before board columns/list values can be built.
- As flagged under REQ-TECH-001, this epic's deferral of file attachments and activity history conflicts with the AWS/PostgreSQL rationale that assumes these features exist -- unresolved discrepancy.
- As flagged under REQ-TECH-001, the React 19 stack rationale cites the Gantt/timeline view as a core driver while this epic explicitly excludes it from MVP -- unresolved discrepancy to confirm with product owner.
- US-017 describes QA verification intent but no test results or execution records exist yet in the input; this entry documents only the requirement/AC, not actual test outcomes.
- Comments, checklists, and labels are flagged in the input itself as assumed rather than explicitly confirmed by the product owner -- recommend confirming before/at design handoff.
- No AC specifies comment editing or deletion, checklist item deletion/reordering, or label creation/management (e.g. who defines the label set, color/text, max count) -- left unspecified.

### Architecture

- The input is for Revision 2 only; Revision 1 content is not included here, so earlier rationale/approvals for the pre-restyle architecture are not available to cross-check.
- No specific visual-regression/E2E test library has been named — it is only 'recommended', so tooling choice for US-017 is still open.
- S3 object store is provisioned for task file attachments, but no attachment entity appears in the data model and no attachment upload/download endpoint is listed — traceability between this component and a concrete requirement/entity/endpoint is incomplete.
- Critical paths 2 (create task and notify) and the base sign-in mechanics are not explicitly tied to a requirement id in this input, so related_ids could not be completed beyond the monochrome-specific US-013/US-016 callouts.
- No entity for file attachments despite S3 being provisioned specifically for task file attachments — this mismatch should be confirmed/resolved.
- No endpoint for uploading/retrieving task file attachments, despite the S3 object_store component existing for that purpose.

### Development

- Sprint 4 lists no distinct backlog items in this input beyond the goal statement - unclear which specific stories/tasks are scoped to it.
- Subtasks US-008-T1/T2/T3 have no individual delivery status recorded; only the parent story US-008 is marked delivered.

### Testing

- Testing phase has not started -- no test plans or results have been recorded.

### Deployment

- No deployment recorded yet.

### Maintenance

- No maintenance-phase activity -- application has not been deployed yet.
<!-- sdlc:auto:end open-gaps -->
