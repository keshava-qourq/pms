"""Background jobs run on the Celery/Redis queue (US-002, US-006, US-007,
NFR-004, NFR-005).

`send_invitation_email` is enqueued by `POST /invitations` so the request
does not wait on SendGrid. `notify_task_saved` is enqueued by
`POST /projects/{id}/tasks` and `PATCH /tasks/{id}` so a task save does not
wait on Slack or SendGrid either. Both retry with backoff on any failure
(`autoretry_for`) and are safe to run twice: neither mutates the row it
reads (no account, invitation or task state changes as a side effect), so a
redelivered or duplicated run only resends the same outbound message.
"""

import os

from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import Invitation, Task, User

logger = get_task_logger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
INVITE_FROM_EMAIL = os.getenv("INVITE_FROM_EMAIL", "noreply@example.com")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")


def _send_via_sendgrid(to_email: str, token: str) -> None:
    """Raises on failure so the Celery retry policy kicks in."""
    if not SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set; skipping invite email to %s", to_email)
        return

    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    accept_url = f"{APP_BASE_URL}/accept-invite?token={token}"
    message = Mail(
        from_email=INVITE_FROM_EMAIL,
        to_emails=to_email,
        subject="You're invited",
        plain_text_content=f"You've been invited. Accept your invite: {accept_url}",
    )
    client = SendGridAPIClient(SENDGRID_API_KEY)
    response = client.send(message)
    if response.status_code >= 300:
        raise RuntimeError(f"SendGrid returned status {response.status_code}")


@celery_app.task(
    bind=True,
    name="app.tasks.send_invitation_email",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5,
)
def send_invitation_email(self, invitation_id: str) -> None:
    db = SessionLocal()
    try:
        invitation = db.get(Invitation, invitation_id)
        if invitation is None or invitation.status != "pending":
            # Nothing left to send: already accepted (or gone) by the time
            # this run -- or a retried redelivery -- executed.
            return
        _send_via_sendgrid(invitation.email, invitation.token)
    finally:
        db.close()


def _send_via_slack(message: str) -> None:
    """Raises on failure so the Celery retry policy kicks in."""
    if not SLACK_WEBHOOK_URL:
        logger.warning("SLACK_WEBHOOK_URL not set; skipping Slack notification")
        return

    import httpx

    response = httpx.post(SLACK_WEBHOOK_URL, json={"text": message}, timeout=10)
    if response.status_code >= 300:
        raise RuntimeError(f"Slack webhook returned status {response.status_code}")


def _send_via_sendgrid_task_notification(to_email: str, subject: str, body: str) -> None:
    """Raises on failure so the Celery retry policy kicks in."""
    if not SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set; skipping task email to %s", to_email)
        return

    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    message = Mail(
        from_email=INVITE_FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        plain_text_content=body,
    )
    client = SendGridAPIClient(SENDGRID_API_KEY)
    response = client.send(message)
    if response.status_code >= 300:
        raise RuntimeError(f"SendGrid returned status {response.status_code}")


@celery_app.task(
    bind=True,
    name="app.tasks.notify_task_saved",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5,
)
def notify_task_saved(self, task_id: str) -> None:
    """Posts a Slack message and, if the task has an owner, emails them.

    Read-only against the database (only ever reads the task and its
    owner), so running it again for the same `task_id` -- a Celery
    redelivery, or a second genuine save -- just resends the same message.
    """
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if task is None:
            return

        message = f'Task "{task.title}" was saved (status: {task.status}).'
        _send_via_slack(message)

        if task.assignee_id:
            owner = db.get(User, task.assignee_id)
            if owner is not None:
                _send_via_sendgrid_task_notification(
                    owner.email,
                    subject=f"Task updated: {task.title}",
                    body=f'The task "{task.title}" was saved with status "{task.status}".',
                )
    finally:
        db.close()
