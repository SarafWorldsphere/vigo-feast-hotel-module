
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.services.notifications import (
    get_notification_restaurant,
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_owner=Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    restaurant_id = get_notification_restaurant(
        db,
        current_owner.owner_id,
    )

    return list_notifications(
        db=db,
        restaurant_id=restaurant_id,
        limit=limit,
        offset=offset,
    )


@router.get("/unread-count")
def get_unread_count(
    current_owner=Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    restaurant_id = get_notification_restaurant(
        db,
        current_owner.owner_id,
    )

    result = list_notifications(
        db=db,
        restaurant_id=restaurant_id,
        limit=1,
        offset=0,
    )

    return {"unread_count": result["unread_count"]}


@router.patch("/{notification_id}/read")
def read_notification(
    notification_id: int,
    current_owner=Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    restaurant_id = get_notification_restaurant(
        db,
        current_owner.owner_id,
    )

    notification = mark_notification_read(
        db=db,
        restaurant_id=restaurant_id,
        notification_id=notification_id,
    )

    return {
        "message": "Notification marked as read",
        "notification_id": notification.notification_id,
        "is_read": notification.is_read,
    }


@router.patch("/read-all")
def read_all_notifications(
    current_owner=Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    restaurant_id = get_notification_restaurant(
        db,
        current_owner.owner_id,
    )

    count = mark_all_notifications_read(
        db=db,
        restaurant_id=restaurant_id,
    )

    return {
        "message": "All notifications marked as read",
        "updated_count": count,
    }
