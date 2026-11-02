# API Reference

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start endpoints -->
| Method | Path | Handler | Source | Summary |
|---|---|---|---|---|
| POST | /auth/accept-invite | accept_invite | `backend/app/routers/backend.py:186` | — |
| POST | /auth/login | login | `backend/app/routers/backend.py:173` | {email, password} -> {access_token, token_type, user}. No auth (AC-001, AC-002). |
| GET | /auth/me | me | `backend/app/routers/backend.py:222` | -> {id, email, name, is_admin}. JWT required. |
| PATCH | /checklist/{id} | toggle_checklist_item | `backend/app/routers/backend.py:542` | — |
| GET | /health | health | `backend/app/main.py:44` | Liveness probe, and the only route here that is not a stub. |
| POST | /invitations | create_invitation | `backend/app/routers/backend.py:229` | — |
| GET | /labels | list_labels | `backend/app/routers/backend.py:576` | — |
| GET | /notifications | list_notifications | `backend/app/routers/backend.py:634` | -> [{notification}]. JWT required. |
| GET | /projects | list_projects | `backend/app/routers/backend.py:283` | — |
| POST | /projects | create_project | `backend/app/routers/backend.py:311` | — |
| GET | /projects/{id} | get_project | `backend/app/routers/backend.py:334` | — |
| PATCH | /projects/{id} | update_project | `backend/app/routers/backend.py:345` | — |
| GET | /projects/{id}/tasks | list_project_tasks | `backend/app/routers/backend.py:369` | — |
| POST | /projects/{id}/tasks | create_task | `backend/app/routers/backend.py:386` | — |
| GET | /tasks/{id} | get_task | `backend/app/routers/backend.py:425` | — |
| PATCH | /tasks/{id} | update_task | `backend/app/routers/backend.py:437` | — |
| POST | /tasks/{id}/checklist | add_checklist_item | `backend/app/routers/backend.py:517` | — |
| GET | /tasks/{id}/comments | list_comments | `backend/app/routers/backend.py:481` | — |
| POST | /tasks/{id}/comments | create_comment | `backend/app/routers/backend.py:495` | — |
| POST | /tasks/{id}/labels | apply_label | `backend/app/routers/backend.py:588` | — |
| DELETE | /tasks/{id}/labels/{label_id} | remove_label | `backend/app/routers/backend.py:611` | — |
<!-- sdlc:auto:end endpoints -->

<!-- sdlc:auto:start drift -->
_Code matches the designed API._
<!-- sdlc:auto:end drift -->

<!-- sdlc:auto:start source -->
Generated from commit `a30708e`
<!-- sdlc:auto:end source -->
