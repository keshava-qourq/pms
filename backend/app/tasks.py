"""Background jobs run on the Celery/Redis queue (US-002, US-006, NFR-004, NFR-005).

`send_invitation_email` is enqueued by `POST /invitations` so the request
does not wait on SendGrid. `notify_task_created` and `notify_task_updated`
are enqueued by `POST /projects/{id}/tasks` and `PATCH /tasks/{id}`
respectively, so a member saving a task never waits on Slack or SendGrid
(NFR-004). All three jobs retry with backoff on any failure
(`autoretry_for`, NFR-005).

Idempotency: each outbound side effect (one Slack post, one email) is only
sent once a Redis key recording it has succeeded is set. The key is checked
*before* sending and only written *after* a send succeeds, so a run that
raises (and is retried, or redelivered after `task_acks_late` because a
worker crashed mid-run) tries again, while a replay of a run that already
completed finds the key set and skips the send -- the job is safe to run
twice either way. For `notify_task_updated` the key also folds in the task's
`updated_at` and the changed fields, so a genuinely new update to the same
task is still notified even though an earlier update on that task was.
"""

import os

from celery.utils.log import get_task_logger

from app.celery_app import REDIS_URL, celery_app
from app.database import SessionLocal
from app.models import Invitation, Task, User

logger = get_task_logger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
INVITE_FROM_EMAIL = os.getenv("INVITE_FROM_EMAIL", "noreply@example.com")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

_NOTIFY_TTL_SECONDS = 60 * 60 * 24  # a day is plenty to absorb a worker crash + redelivery
_redis_client = None


def enqueue_notification(task, *args) -> None:
    """Enqueue `task(*args)` without letting a broker hiccup fail the save.

    POST /projects/{id}/tasks and PATCH /tasks/{id} must return their
    response without waiting for -- or failing because of -- Slack or email
    (NFR-004): a Redis broker that is briefly unreachable at enqueue time
    degrades to a logged no-op rather than a 500 on the save path.
    """
    try:
        task.delay(*args)
    except Exception:
        logger.warning("Could not enqueue %s; the broker may be unavailable", task.name)


def _get_redis():
    global _redis_client
    if _redis_client is None:
        import redis

        _redis_client = redis.from_url(REDIS_URL)
    return _redis_client


def _already_notified(key: str) -> bool:
    """True once `key` has been recorded by a prior, successful send.

    Redis being briefly unreachable degrades to "not yet notified" (send
    again) rather than raising: a missed dedup is a harmless duplicate, a
    raised exception here would wrongly block every notification.
    """
    try:
        return bool(_get_redis().get(key))
    except Exception:
        logger.warning("Redis unavailable for notification dedup; proceeding without a dedup guard")
        return False


def _mark_notified(key: str) -> None:
    try:
        _get_redis().set(key, "1", ex=_NOTIFY_TTL_SECONDS)
    except Exception:
        logger.warning("Redis unavailable for notification dedup; could not record %s", key)


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


def _send_task_email(to_email: str, subject: str, body: str) -> None:
    """Raises on failure so the Celery retry policy kicks in.

    A missing SENDGRID_API_KEY is a logged no-op, not a failure: the save
    path must never 500 because notification config is absent (NFR-004).
    """
    if not SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set; skipping task notification email to %s", to_email)
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


def _send_via_slack(text: str) -> None:
    """Raises on failure so the Celery retry policy kicks in.

    A missing SLACK_WEBHOOK_URL is a logged no-op, not a failure (NFR-004).
    """
    if not SLACK_WEBHOOK_URL:
        logger.warning("SLACK_WEBHOOK_URL not set; skipping Slack notification")
        return

    import httpx

    response = httpx.post(SLACK_WEBHOOK_URL, json={"text": text}, timeout=5.0)
    if response.status_code >= 300:
        raise RuntimeError(f"Slack webhook returned status {response.status_code}")


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


@celery_app.task(
    bind=True,
    name="app.tasks.notify_task_created",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5,
)
def notify_task_created(self, task_id: str) -> None:
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if task is None:
            return

        slack_key = f"notif:task-created:slack:{task_id}"
        if not _already_notified(slack_key):
            _send_via_slack(f"New task created: {task.title}")
            _mark_notified(slack_key)

        if task.assignee_id:
            assignee = db.get(User, task.assignee_id)
            if assignee is not None:
                email_key = f"notif:task-created:email:{task_id}"
                if not _already_notified(email_key):
                    _send_task_email(
                        assignee.email,
                        subject=f"New task assigned: {task.title}",
                        body=f"You've been assigned a new task: {task.title}",
                    )
                    _mark_notified(email_key)
    finally:
        db.close()


@celery_app.task(
    bind=True,
    name="app.tasks.notify_task_updated",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5,
)
def notify_task_updated(self, task_id: str, changed_fields: list[str]) -> None:
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if task is None:
            return

        event = f"{task.updated_at.isoformat()}:{','.join(sorted(changed_fields))}"
        fields_text = ", ".join(sorted(changed_fields)) or "details"

        slack_key = f"notif:task-updated:slack:{task_id}:{event}"
        if not _already_notified(slack_key):
            _send_via_slack(f"Task updated: {task.title} ({fields_text})")
            _mark_notified(slack_key)

        if task.assignee_id:
            assignee = db.get(User, task.assignee_id)
            if assignee is not None:
                email_key = f"notif:task-updated:email:{task_id}:{event}"
                if not _already_notified(email_key):
                    _send_task_email(
                        assignee.email,
                        subject=f"Task updated: {task.title}",
                        body=f"Your task '{task.title}' was updated ({fields_text}).",
                    )
                    _mark_notified(email_key)
    finally:
        db.close()
