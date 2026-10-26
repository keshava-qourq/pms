# API Reference

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start endpoints -->
| Method | Path | Handler | Source | Summary |
|---|---|---|---|---|
| GET | /health | health | `backend/app/main.py:43` | Liveness probe, and the only route here that is not a stub. |
<!-- sdlc:auto:end endpoints -->

<!-- sdlc:auto:start drift -->
**Designed but missing:**

- DELETE /tasks/{id}/labels/{label_id}
- GET /auth/me
- GET /labels
- GET /notifications
- GET /projects
- GET /projects/{id}
- GET /projects/{id}/tasks
- GET /tasks/{id}
- GET /tasks/{id}/comments
- PATCH /checklist/{id}
- PATCH /projects/{id}
- PATCH /tasks/{id}
- POST /auth/accept-invite
- POST /auth/login
- POST /invitations
- POST /projects
- POST /projects/{id}/tasks
- POST /tasks/{id}/checklist
- POST /tasks/{id}/comments
- POST /tasks/{id}/labels
<!-- sdlc:auto:end drift -->

<!-- sdlc:auto:start source -->
Generated from commit `ebda5c7`
<!-- sdlc:auto:end source -->
