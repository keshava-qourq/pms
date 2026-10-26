"""Create a member with a known password, for tests and local sign-in.

Running this module (`python -m app.seed`) is idempotent: it only inserts the
demo member if that email does not already exist, so it is safe to run again
against a database that already has it.
"""

import os

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.security import hash_password

SEED_EMAIL = os.getenv("SEED_USER_EMAIL", "demo@example.com")
SEED_PASSWORD = os.getenv("SEED_USER_PASSWORD", "password123")
SEED_NAME = "Demo Member"


def seed_demo_user(db: Session) -> User:
    """Create (or return the existing) demo member with a known password."""
    existing = db.query(User).filter(User.email == SEED_EMAIL).first()
    if existing is not None:
        return existing

    user = User(
        email=SEED_EMAIL,
        password_hash=hash_password(SEED_PASSWORD),
        name=SEED_NAME,
        is_admin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


if __name__ == "__main__":
    session = SessionLocal()
    try:
        member = seed_demo_user(session)
        print(f"Seeded member: {member.email} (password: {SEED_PASSWORD})")
    finally:
        session.close()
