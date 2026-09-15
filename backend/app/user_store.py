"""
Holds users in memory for the demo, same pattern as `state_store.py`.

Seeded with one approved admin account so the app is usable immediately:
  email:    admin@hospital.demo
  password: admin123

Swap for a MongoDB `users` collection when this needs to persist across
restarts or across more than one process.
"""

from __future__ import annotations
import uuid

from app.auth import hash_password
from app.models import User, UserRole, UserStatus

_users: dict[str, User] = {}


def _seed() -> None:
    admin = User(
        id="usr-admin-001",
        name="Chief Medical Admin",
        email="admin@hospital.demo",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
    )
    nurse = User(
        id="usr-nurse-001",
        name="Nurse Sarah Jenkins (RN)",
        email="nurse@hospital.demo",
        password_hash=hash_password("nurse123"),
        role=UserRole.NURSE,
        status=UserStatus.APPROVED,
    )
    data_entry = User(
        id="usr-data-001",
        name="Ward Data Officer Mike",
        email="dataentry@hospital.demo",
        password_hash=hash_password("data123"),
        role=UserRole.DATA_ENTRY,
        status=UserStatus.APPROVED,
    )
    _users[admin.id] = admin
    _users[nurse.id] = nurse
    _users[data_entry.id] = data_entry


_seed()


def get_all_users() -> list[User]:
    return list(_users.values())


def get_user_by_email(email: str) -> User | None:
    email = email.lower().strip()
    for user in _users.values():
        if user.email.lower() == email:
            if user.email.lower() == "admin@hospital.demo":
                user.role = UserRole.ADMIN
                user.status = UserStatus.APPROVED
            return user
    return None


def get_user_by_id(user_id: str) -> User | None:
    user = _users.get(user_id)
    if user and user.email.lower() == "admin@hospital.demo":
        user.role = UserRole.ADMIN
        user.status = UserStatus.APPROVED
    return user


def create_user(name: str, email: str, password: str, role: UserRole = UserRole.NURSE) -> User:
    user = User(
        id=str(uuid.uuid4()),
        name=name.strip(),
        email=email.lower().strip(),
        password_hash=hash_password(password),
        role=role,
        status=UserStatus.PENDING,
    )
    _users[user.id] = user
    return user


def approve_user(user_id: str) -> User | None:
    user = _users.get(user_id)
    if user:
        user.status = UserStatus.APPROVED
    return user


def set_role(user_id: str, role: UserRole) -> User | None:
    user = _users.get(user_id)
    if user:
        if user.email.lower() == "admin@hospital.demo":
            user.role = UserRole.ADMIN
            user.status = UserStatus.APPROVED
        else:
            user.role = role
    return user
