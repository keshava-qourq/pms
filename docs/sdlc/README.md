# PMS — SDLC Documentation

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start overview -->
project management system

**Documentation version:** v5
<!-- sdlc:auto:end overview -->

## Contents

<!-- sdlc:auto:start contents -->
| Document | State |
|---|---|
| [Requirements](requirements/README.md) | v1 approved |
| [Architecture](architecture/README.md) | 13 entries |
| [Development](development/README.md) | 7 entries |
| [Testing](testing/README.md) | 1 entry |
| [Deployment](deployment/README.md) | 1 entry |
| [Maintenance](maintenance/README.md) | 1 entry |
| [Data model](architecture/data-model.md) | generated |
| [API (OpenAPI)](architecture/api/openapi.yaml) | generated |
| [Decisions (ADRs)](architecture/adr/README.md) | 4 decisions |
| [Sprint plan](development/sprint-plan.md) | 3 sprints |
| [Developer guide](development/developer-guide.md) | generated |
| [API reference](development/api-reference.md) | 21 routes |
| [Test report](testing/test-report.md) | not run yet |
| [Tests](testing/test-cases.md) | 109 tests |
| [Deployment guide](deployment/deployment-guide.md) | not deployed yet |
| [Runbook](deployment/runbook.md) | not deployed yet |
| [Release notes](deployment/release-notes.md) | 0 releases |
| [Traceability matrix](traceability-matrix.md) | 12 requirements |
| [Changelog](CHANGELOG.md) | 5 versions |
<!-- sdlc:auto:end contents -->

## Open gaps

<!-- sdlc:auto:start open-gaps -->
### Requirements

- How the very first administrator account is created/designated is not specified anywhere in the input.
- NFR-008 is an accepted risk (no per-project privacy/roles) -- should be revisited if the team grows or starts handling sensitive data.
- Feature is based on an assumption rather than explicit product-owner confirmation -- worth validating before build.
- NFR-009 is an accepted risk with no regulatory/compliance controls built in -- should be revisited if the company expands into regulated markets or regions.
- No user story or acceptance criteria define which events trigger notifications, what content they contain, or how in-app notifications are presented to the user -- only the background-queuing/retry behavior is specified.
- Discrepancy: S3 file storage is approved as a runtime need justified by 'tasks support file attachments,' but EPIC-003's assumption explicitly defers file attachments to a later version -- clarify whether S3 is needed for this release or only provisioned ahead of a future version.
- No architecture-phase output exists yet to confirm how this approved stack will be realized (service boundaries, data model, deployment topology).

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
