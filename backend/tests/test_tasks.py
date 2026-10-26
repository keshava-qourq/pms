"""Unit tests for the invitation email Celery job (US-002, NFR-004, NFR-005)."""

import uuid
from datetime import UTC, datetime, timedelta

from app.models import Invitation, User
from app.security import hash_password
from app.tasks import send_invitation_email


def _make_invitation(db_session, status: str = "pending") -> Invitation:
    admin = User(
        email=f"admin-{uuid.uuid4().hex[:10]}@example.com",
        password_hash=hash_password("x"),
        is_admin=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    invitation = Invitation(
        email=f"invitee-{uuid.uuid4().hex[:10]}@example.com",
        token=uuid.uuid4().hex,
        status=status,
        invited_by=admin.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(invitation)
    db_session.commit()
    db_session.refresh(invitation)
    return invitation


def test_nfr004_job_sends_for_a_pending_invitation(db_session, monkeypatch) -> None:
    calls = []
    monkeypatch.setattr(
        "app.tasks._send_via_sendgrid", lambda email, token: calls.append((email, token))
    )
    invitation = _make_invitation(db_session)

    send_invitation_email.run(invitation.id)

    assert calls == [(invitation.email, invitation.token)]


def test_nfr005_job_is_a_no_op_once_the_invitation_is_no_longer_pending(
    db_session, monkeypatch
) -> None:
    calls = []
    monkeypatch.setattr(
        "app.tasks._send_via_sendgrid", lambda email, token: calls.append((email, token))
    )
    invitation = _make_invitation(db_session, status="accepted")

    send_invitation_email.run(invitation.id)

    assert calls == []


def test_nfr005_job_is_safe_to_run_twice(db_session, monkeypatch) -> None:
    calls = []
    monkeypatch.setattr(
        "app.tasks._send_via_sendgrid", lambda email, token: calls.append((email, token))
    )
    invitation = _make_invitation(db_session)

    send_invitation_email.run(invitation.id)
    send_invitation_email.run(invitation.id)

    # Sending twice is harmless (no account or invitation state is touched by
    # this job either time); it never raises and the invitation stays pending.
    assert len(calls) == 2
    db_session.refresh(invitation)
    assert invitation.status == "pending"


def test_nfr005_job_retries_with_backoff_on_sendgrid_failure() -> None:
    assert send_invitation_email.autoretry_for == (Exception,)
    assert send_invitation_email.retry_backoff is True
    assert send_invitation_email.max_retries == 5
