<!-- sdlc:auto:start adr -->
# ADR-0004: Use AWS for Cloud

Status: Proposed  
Date: 2026-10-26

## Context and Problem Statement

Which Cloud technology does the project use? Decided in architecture v1.

## Considered Options

- AWS
- GCP
- Azure

## Decision Outcome

Chosen option: AWS, because AWS provides managed RDS PostgreSQL, S3 for attachments and compute in one place, so a single internal team avoids stitching vendors together. It scales down affordably for 25 users.

## Consequences

Single-region only per NFR-009; no multi-region residency controls are built.
<!-- sdlc:auto:end adr -->