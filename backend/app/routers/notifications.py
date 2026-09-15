from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app import notification_store
from app.dependencies import get_current_user, require_admin
from app.models import Notification, NotificationCreateRequest, User, UserRole

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[Notification])
def list_notifications(user: User = Depends(get_current_user)) -> list[Notification]:
    """Returns real-time notifications, shift reassignments, and alerts
    for the current user (nurses see their clinical tasks, admins see all)."""
    return notification_store.get_notifications_for_user(user)


@router.post("/acknowledge/{notif_id}", response_model=Notification)
def acknowledge_notification(
    notif_id: str,
    user: User = Depends(get_current_user),
) -> Notification:
    """Nurses/staff can acknowledge task reassignments or surge alerts."""
    notif = notification_store.acknowledge_notification(notif_id, user.id, user.name)
    if notif is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    return notif


@router.post("/dispatch", response_model=Notification)
def dispatch_notification(
    request: NotificationCreateRequest,
    user: User = Depends(require_admin),
) -> Notification:
    """Admin-only: dispatch a new shift task or unit reassignment to nurses."""
    return notification_store.add_notification(
        title=request.title,
        message=request.message,
        target_role=request.target_role,
        target_user_id=request.target_user_id,
        from_department=request.from_department,
        to_department=request.to_department,
        action_type=request.action_type,
        created_by=f"Admin ({user.name})",
    )
