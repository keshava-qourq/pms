"""Bootstrap accounts, seeded once at startup from the platform's own env vars.

The platform always sets `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`
on a deployed API; this seeds that account as the workspace's first admin.
It also sets `SMOKE_TEST_EMAIL` / `SMOKE_TEST_PASSWORD` for one ordinary
member a smoke test can sign in as. Both pairs are optional -- unset (local
runs, the test suite) means seed nothing -- and each insert is idempotent:
a user is only created when no user with that email already exists, so this
is safe to run on every startup, not just the first.
"""

import os

from sqlalchemy.orm import Session

from app.models import User
from app.security import hash_password


def _seed_user_once(db: Session, email: str, password: str, *, is_admin: bool) -> None:
    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        return
    db.add(User(email=email, password_hash=hash_password(password), is_admin=is_admin))
    db.commit()


def seed_bootstrap_accounts(db: Session) -> None:
    """Create the first admin and the smoke-test member, each only when its
    pair of env vars is set and no user with that email exists yet."""
    admin_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL")
    admin_password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD")
    if admin_email and admin_password:
        _seed_user_once(db, admin_email, admin_password, is_admin=True)

    smoke_email = os.getenv("SMOKE_TEST_EMAIL")
    smoke_password = os.getenv("SMOKE_TEST_PASSWORD")
    if smoke_email and smoke_password:
        _seed_user_once(db, smoke_email, smoke_password, is_admin=False)
