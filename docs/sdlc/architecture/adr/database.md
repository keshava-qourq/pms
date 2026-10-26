<!-- sdlc:auto:start adr -->
# ADR-0003: Use PostgreSQL 16 for Database

Status: Proposed  
Date: 2026-10-26

## Context and Problem Statement

Which Database technology does the project use? Decided in architecture v1.

## Considered Options

- PostgreSQL 16
- MySQL
- SQLite

## Decision Outcome

Chosen option: PostgreSQL 16, because The highly relational model — projects to tasks, tasks to comments, checklists, and the many-to-many labels — maps naturally to PostgreSQL 16, which is comfortably within capacity for a few dozen projects and 25 users.

## Consequences

Relational constraints add migration discipline (Alembic), a worthwhile trade for referential integrity.
<!-- sdlc:auto:end adr -->