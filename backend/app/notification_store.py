"""
In-memory store for nurse shift alerts, task dispatches, and hospital broadcasts.
In production, this would be backed by a PostgreSQL / MongoDB collection with WebSockets/SSE.
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone

from app.models import DepartmentId, Notification, User, UserRole

_notifications: list[Notification] = []
_MAX_NOTIFICATIONS = 200


def _seed() -> None:
    _notifications.extend([
        Notification(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            title="⚡ Urgent Triage Shift Reassignment",
            message="You are reassigned to Emergency Intake (Triage Bay 2) to assist with acute surge caseload. Expected duration: 4 hours.",
            target_role=UserRole.NURSE,
            from_department=DepartmentId.RADIOLOGY,
            to_department=DepartmentId.EMERGENCY,
            action_type="reassignment",
            status="unread",
            created_by="AI Optimizer / Admin",
        ),
        Notification(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            title="🛏 Surge Bed Activation Alert",
            message="General Ward has opened 4 step-down beds. Please coordinate transfer of stablized observation patients out of ICU.",
            target_role=UserRole.NURSE,
            from_department=DepartmentId.ICU,
            to_department=DepartmentId.GENERAL_WARD,
            action_type="surge",
            status="unread",
            created_by="Demo Admin",
        ),
    ])


_seed()


def get_all_notifications() -> list[Notification]:
    return list(_notifications)


def get_notifications_for_user(user: User) -> list[Notification]:
    """Returns notifications applicable to the given user or their role."""
    results: list[Notification] = []
    for n in _notifications:
        if user.role == UserRole.ADMIN:
            results.append(n)
        elif n.target_user_id and n.target_user_id == user.id:
            results.append(n)
        elif n.target_role == user.role or n.target_role == UserRole.STAFF:
            results.append(n)
    return results


def add_notification(
    title: str,
    message: str,
    target_role: UserRole = UserRole.NURSE,
    target_user_id: str | None = None,
    from_department: DepartmentId | None = None,
    to_department: DepartmentId | None = None,
    action_type: str = "reassignment",
    created_by: str = "Admin",
) -> Notification:
    notif = Notification(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        title=title,
        message=message,
        target_role=target_role,
        target_user_id=target_user_id,
        from_department=from_department,
        to_department=to_department,
        action_type=action_type,
        status="unread",
        created_by=created_by,
    )
    _notifications.insert(0, notif)
    del _notifications[_MAX_NOTIFICATIONS:]
    return notif


def acknowledge_notification(notif_id: str, user_id: str, user_name: str) -> Notification | None:
    for n in _notifications:
        if n.id == notif_id:
            n.status = "acknowledged"
            n.acknowledged_by = f"{user_name} ({user_id})"
            n.acknowledged_at = datetime.now(timezone.utc).isoformat()
            return n
    return None
