# PMS — SDLC Documentation

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start overview -->
project management system

**Documentation version:** v1
<!-- sdlc:auto:end overview -->

## Contents

<!-- sdlc:auto:start contents -->
| Document | State |
|---|---|
| [Requirements](requirements/README.md) | v1 approved |
| [Architecture](architecture/README.md) | 1 entry |
| [Development](development/README.md) | 1 entry |
| [Testing](testing/README.md) | 1 entry |
| [Deployment](deployment/README.md) | 1 entry |
| [Maintenance](maintenance/README.md) | 1 entry |
| [Data model](architecture/data-model.md) | generated |
| [API (OpenAPI)](architecture/api/openapi.yaml) | generated |
| [Decisions (ADRs)](architecture/adr/README.md) | 4 decisions |
| [Sprint plan](development/sprint-plan.md) | not generated yet |
| [Developer guide](development/developer-guide.md) | generated |
| [API reference](development/api-reference.md) | 1 route |
| [Test report](testing/test-report.md) | not run yet |
| [Tests](testing/test-cases.md) | 0 tests |
| [Deployment guide](deployment/deployment-guide.md) | not deployed yet |
| [Runbook](deployment/runbook.md) | not deployed yet |
| [Release notes](deployment/release-notes.md) | 0 releases |
| [Traceability matrix](traceability-matrix.md) | 12 requirements |
| [Changelog](CHANGELOG.md) | 1 version |
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

- Architecture phase has not started or its output was not provided to this agent -- system design, data model, API contracts, and infrastructure diagrams are all missing.

### Development

- Development phase has not started -- no tickets, sprints, or code have been recorded.

### Testing

- Testing phase has not started -- no test plans or results have been recorded.

### Deployment

- No deployment recorded yet.

### Maintenance

- No maintenance-phase activity -- application has not been deployed yet.
<!-- sdlc:auto:end open-gaps -->
