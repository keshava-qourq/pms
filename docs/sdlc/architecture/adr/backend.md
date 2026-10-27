<!-- sdlc:auto:start adr -->
# ADR-0002: Use FastAPI 0.115 for Backend

Status: Accepted  
Date: 2026-10-27

## Context and Problem Statement

Which Backend technology does the project use? Decided in architecture v1.

## Considered Options

- FastAPI 0.115
- Flask
- Django REST Framework

## Decision Outcome

Chosen option: FastAPI 0.115, because FastAPI 0.115 cleanly serves the project/task CRUD, enforces JWT auth on all pages, and makes the one-way Slack webhook and email integrations easy to wire, with automatic OpenAPI docs for the team.

## Consequences

Async background work is pushed to a separate Celery worker rather than handled inline, which is the intended design for non-blocking notifications.
<!-- sdlc:auto:end adr -->