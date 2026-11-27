# API Reference

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start endpoints -->
| Method | Path | Handler | Source | Summary |
|---|---|---|---|---|
| POST | /auth/accept-invite | accept_invite | `backend/app/routers/backend.py:190` | — |
| POST | /auth/login | login | `backend/app/routers/backend.py:177` | {email, password} -> {access_token, token_type, user}. No auth (AC-001, AC-002). |
| GET | /auth/me | me | `backend/app/routers/backend.py:226` | -> {id, email, name, is_admin}. JWT required. |
| PATCH | /checklist/{id} | toggle_checklist_item | `backend/app/routers/backend.py:574` | — |
| GET | /health | health | `backend/app/main.py:66` | Liveness probe, and the only route here that is not a stub. |
| POST | /invitations | create_invitation | `backend/app/routers/backend.py:233` | — |
| GET | /labels | list_labels | `backend/app/routers/backend.py:598` | — |
| GET | /notifications | list_notifications | `backend/app/routers/backend.py:660` | — |
| GET | /projects | list_projects | `backend/app/routers/backend.py:287` | — |
| POST | /projects | create_project | `backend/app/routers/backend.py:315` | — |
| GET | /projects/{id} | get_project | `backend/app/routers/backend.py:342` | — |
| PATCH | /projects/{id} | update_project | `backend/app/routers/backend.py:353` | — |
| GET | /projects/{id}/tasks | list_project_tasks | `backend/app/routers/backend.py:378` | — |
| POST | /projects/{id}/tasks | create_task | `backend/app/routers/backend.py:390` | — |
| GET | /tasks/{id} | get_task | `backend/app/routers/backend.py:427` | — |
| PATCH | /tasks/{id} | update_task | `backend/app/routers/backend.py:452` | — |
| POST | /tasks/{id}/checklist | add_checklist_item | `backend/app/routers/backend.py:543` | — |
| GET | /tasks/{id}/comments | list_comments | `backend/app/routers/backend.py:500` | — |
| POST | /tasks/{id}/comments | create_comment | `backend/app/routers/backend.py:514` | — |
| POST | /tasks/{id}/labels | apply_label | `backend/app/routers/backend.py:608` | — |
| DELETE | /tasks/{id}/labels/{label_id} | remove_label | `backend/app/routers/backend.py:636` | — |
<!-- sdlc:auto:end endpoints -->

<!-- sdlc:auto:start drift -->
_Code matches the designed API._
<!-- sdlc:auto:end drift -->

<!-- sdlc:auto:start source -->
Generated from commit `7e9854c`
<!-- sdlc:auto:end source -->
