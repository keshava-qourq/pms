<!-- sdlc:auto:start adr -->
# ADR-0001: Use React 19 for Frontend

Status: Accepted  
Date: 2026-10-26

## Context and Problem Statement

Which Frontend technology does the project use? Decided in architecture v1.

## Considered Options

- React 19
- Vue
- Svelte

## Decision Outcome

Chosen option: React 19, because React 19 drives the three state-heavy, live-updating screens (Kanban, list, task detail) from one responsive codebase, with drag-and-drop and inline editing. Delivered via the scaffolded Next.js app for routing and SSR of static assets.

## Consequences

Rich client state needs deliberate management; we use React Query to keep board and list in sync (NFR-007).
<!-- sdlc:auto:end adr -->