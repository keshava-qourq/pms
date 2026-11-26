"""Background jobs run on the Celery/Redis queue (US-002, NFR-004, NFR-005).

`send_invitation_email` is enqueued by `POST /invitations` so the request
does not wait on SendGrid. It retries with backoff on any failure
(`autoretry_for`) and is safe to run twice: it only reads the invitation and
sends mail, it never creates an account or changes invitation state, so a
redelivered or duplicated run cannot create a second account or flip the
invitation's status a second time. If the invitation has already moved past
`pending` (accepted, or re-sent and since accepted) by the time the job runs,
it is a no-op.
"""

import os

from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import Invitation

logger = get_task_logger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
INVITE_FROM_EMAIL = os.getenv("INVITE_FROM_EMAIL", "noreply@example.com")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")


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
