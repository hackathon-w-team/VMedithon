from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app import user_store
from app.auth import create_access_token, verify_password
from app.dependencies import get_current_user, require_admin
from app.models import (
    LoginRequest,
    PublicUser,
    RegisterRequest,
    SetRoleRequest,
    TokenResponse,
    User,
    UserRole,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=PublicUser)
def register(request: RegisterRequest) -> PublicUser:
    if user_store.get_user_by_email(request.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    if request.requested_role == UserRole.ADMIN:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Admin accounts can't be self-registered — ask an existing admin to grant that role",
        )

    user = user_store.create_user(request.name, request.email, request.password, role=request.requested_role)
    return user.public()


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest) -> TokenResponse:
    user = user_store.get_user_by_email(request.email)
    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, user=user.public())


@router.get("/me", response_model=PublicUser)
def me(user: User = Depends(get_current_user)) -> PublicUser:
    return user.public()


@router.get("/pending", response_model=list[PublicUser])
def list_pending(_: User = Depends(require_admin)) -> list[PublicUser]:
    return [u.public() for u in user_store.get_all_users() if u.status.value == "pending"]


@router.get("/users", response_model=list[PublicUser])
def list_users(_: User = Depends(require_admin)) -> list[PublicUser]:
    return [u.public() for u in user_store.get_all_users()]


@router.post("/approve/{user_id}", response_model=PublicUser)
def approve(user_id: str, _: User = Depends(require_admin)) -> PublicUser:
    user = user_store.approve_user(user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user.public()


@router.post("/role/{user_id}", response_model=PublicUser)
def change_role(user_id: str, request: SetRoleRequest, _: User = Depends(require_admin)) -> PublicUser:
    """Admin-only: (re)assign a user's role — e.g. promote an approved
    account to 'data_entry' so they can start feeding live ward numbers,
    or revoke that access later by moving them back to 'staff'."""
    target_user = user_store.get_user_by_id(user_id)
    if target_user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if target_user.email.lower() == "admin@hospital.demo" and request.role != UserRole.ADMIN:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot change the role of the primary Demo Admin account",
        )

    user = user_store.set_role(user_id, request.role)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user.public()
