<!-- sdlc:auto:start adr -->
# ADR-0001: Use React 19 for Frontend

Status: Accepted  
Date: 2026-10-27

## Context and Problem Statement

Which Frontend technology does the project use? Decided in architecture v1.

## Considered Options

- React 19
- Vue
- Svelte

## Decision Outcome

Chosen option: React 19, because React 19 drives the three state-heavy, live-updating screens (Kanban, list, task detail) from one responsive codebase, with drag-and-drop and inline editing, delivered via the scaffolded Next.js app. The monochrome restyle (US-013..US-017) is handled with shared CSS/design tokens over this same React component tree, so status and errors are conveyed by shading, borders, typography and contrast rather than color.

## Consequences

Rich client state needs deliberate management; we use React Query to keep board and list in sync. Removing color as a status cue requires care so monochrome shading/borders stay accessible, verified by the US-017 visual-regression and contrast pass.
<!-- sdlc:auto:end adr -->