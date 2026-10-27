# API Reference

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start endpoints -->
| Method | Path | Handler | Source | Summary |
|---|---|---|---|---|
| POST | /auth/accept-invite | accept_invite | `backend/app/routers/backend.py:103` | — |
| POST | /auth/login | login | `backend/app/routers/backend.py:90` | {email, password} -> {access_token, token_type, user}. No auth (AC-001, AC-002). |
| GET | /auth/me | me | `backend/app/routers/backend.py:139` | -> {id, email, name, is_admin}. JWT required. |
| PATCH | /checklist/{id} | toggle_checklist_item | `backend/app/routers/backend.py:393` | {is_complete} -> {checklist_item}. JWT required. |
| GET | /health | health | `backend/app/main.py:44` | Liveness probe, and the only route here that is not a stub. |
| POST | /invitations | create_invitation | `backend/app/routers/backend.py:146` | — |
| GET | /labels | list_labels | `backend/app/routers/backend.py:400` | -> [{label}]. JWT required. |
| GET | /notifications | list_notifications | `backend/app/routers/backend.py:425` | -> [{notification}]. JWT required. |
| GET | /projects | list_projects | `backend/app/routers/backend.py:200` | — |
| POST | /projects | create_project | `backend/app/routers/backend.py:228` | — |
| GET | /projects/{id} | get_project | `backend/app/routers/backend.py:251` | — |
| PATCH | /projects/{id} | update_project | `backend/app/routers/backend.py:262` | — |
| GET | /projects/{id}/tasks | list_project_tasks | `backend/app/routers/backend.py:286` | — |
| POST | /projects/{id}/tasks | create_task | `backend/app/routers/backend.py:298` | — |
| GET | /tasks/{id} | get_task | `backend/app/routers/backend.py:331` | — |
| PATCH | /tasks/{id} | update_task | `backend/app/routers/backend.py:342` | — |
| POST | /tasks/{id}/checklist | add_checklist_item | `backend/app/routers/backend.py:385` | {title} -> {checklist_item}. JWT required. |
| GET | /tasks/{id}/comments | list_comments | `backend/app/routers/backend.py:371` | -> [{comment}]. JWT required. |
| POST | /tasks/{id}/comments | create_comment | `backend/app/routers/backend.py:377` | {body} -> {comment}. JWT required. |
| POST | /tasks/{id}/labels | apply_label | `backend/app/routers/backend.py:406` | {label_id} -> {task_labels}. JWT required. |
| DELETE | /tasks/{id}/labels/{label_id} | remove_label | `backend/app/routers/backend.py:412` | 204, no body. JWT required. |
<!-- sdlc:auto:end endpoints -->

<!-- sdlc:auto:start drift -->
_Code matches the designed API._
<!-- sdlc:auto:end drift -->

<!-- sdlc:auto:start source -->
Generated from commit `f355d1a`
<!-- sdlc:auto:end source -->
