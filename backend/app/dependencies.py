from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app import user_store
from app.auth import decode_access_token
from app.models import User, UserRole, UserStatus

_bearer = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")

    user = user_store.get_user_by_id(payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    if user.status != UserStatus.APPROVED:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your account is awaiting admin approval")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required for this action")
    return user


def require_data_editor(user: User = Depends(get_current_user)) -> User:
    """Admins and data-entry accounts can both push live operational
    numbers (beds, staff, patient counts). Structural changes
    (dependencies, resets, user management) stay admin-only — see the
    depends_on check in hospital_ops / the route handlers."""
    if user.role not in (UserRole.ADMIN, UserRole.DATA_ENTRY):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin or data-entry access required for this action")
    return user
