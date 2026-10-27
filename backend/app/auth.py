"""The shared dependency that guards every non-public route (NFR-001).

`get_current_user` verifies the bearer JWT's signature and expiry, loads the
member it names, and fails closed: a missing, malformed or expired token --
or a token for a user who no longer exists -- always raises 401 before a
protected handler runs.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
_INVALID_TOKEN = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> User:
    if credentials is None or not credentials.credentials:
        raise _UNAUTHORIZED

    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise _INVALID_TOKEN from exc

    user = db.get(User, user_id)
    if user is None:
        raise _INVALID_TOKEN
    return user
