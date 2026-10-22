
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.restaurant_notifications import RestaurantNotification
from app.models.restaurant import Restaurant


NOTIFICATION_CONTENT = {
    "NEW_ORDER": (
        "New order received",
        "A new order needs your attention.",
        "ORDER",
    ),
    "DELIVERY_PARTNER_ASSIGNED": (
        "Delivery partner assigned",
        "A delivery partner has been assigned to an order.",
        "DELIVERY",
    ),
    "DELIVERY_PARTNER_ACCEPTED": (
        "Delivery partner accepted",
        "The delivery partner accepted the assignment.",
        "DELIVERY",
    ),
    "DELIVERY_PARTNER_ARRIVED": (
        "Delivery partner arrived",
        "The delivery partner arrived at the restaurant.",
        "DELIVERY",
    ),
    "ORDER_PICKED_UP": (
        "Order picked up",
        "The delivery partner picked up the order.",
        "ORDER",
    ),
    "DELIVERY_PARTNER_ARRIVED_CUSTOMER": (
        "Delivery partner arrived",
        "The delivery partner arrived at the customer.",
        "DELIVERY",
    ),
    "ORDER_DELIVERED": (
        "Order delivered",
        "The order was delivered successfully.",
        "ORDER",
    ),
    "DELIVERY_PARTNER_CANCELLED": (
        "Delivery partner cancelled",
        "The delivery partner cancelled the assignment.",
        "DELIVERY",
    ),
    "DELIVERY_PARTNER_REASSIGNED": (
        "Delivery partner reassigned",
        "A new delivery partner may be assigned.",
        "DELIVERY",
    ),
    "COMPLAINT_STATUS_CHANGED": (
        "Complaint status updated",
        "A complaint's status has changed.",
        "COMPLAINT",
    ),
}


def create_restaurant_notification(
    db: Session,
    restaurant_id: UUID,
    event_data: dict,
):
    event_type = event_data.get("event")
    content = NOTIFICATION_CONTENT.get(event_type)

    if content is None:
        return None

    title, default_message, entity_type = content

    if entity_type == "COMPLAINT":
        entity_id = event_data.get("complaint_id")
        status = event_data.get("status")
        message = (
            f"Complaint #{entity_id} status changed to {status}."
            if status
            else default_message
        )
    else:
        entity_id = event_data.get("order_id")
        message = (
            f"{default_message} Order #{entity_id}."
            if entity_id is not None
            else default_message
        )

    notification = RestaurantNotification(
        restaurant_id=restaurant_id,
        notification_type=event_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


def get_notification_restaurant(
    db: Session,
    owner_id,
) -> UUID:
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.owner_id == owner_id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )

    if restaurant is None:
        raise HTTPException(
            status_code=404,
            detail="Restaurant not found",
        )

    return restaurant.id


def list_notifications(
    db: Session,
    restaurant_id: UUID,
    limit: int = 20,
    offset: int = 0,
):
    query = db.query(RestaurantNotification).filter(
        RestaurantNotification.restaurant_id == restaurant_id
    )

    total = query.count()

    items = (
        query.order_by(
            RestaurantNotification.created_at.desc(),
            RestaurantNotification.notification_id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    unread_count = query.filter(
        RestaurantNotification.is_read.is_(False)
    ).count()

    return {
        "items": items,
        "total": total,
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset,
    }


def mark_notification_read(
    db: Session,
    restaurant_id: UUID,
    notification_id: int,
):
    notification = (
        db.query(RestaurantNotification)
        .filter(
            RestaurantNotification.notification_id == notification_id,
            RestaurantNotification.restaurant_id == restaurant_id,
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)

    return notification


def mark_all_notifications_read(
    db: Session,
    restaurant_id: UUID,
) -> int:
    notifications = (
        db.query(RestaurantNotification)
        .filter(
            RestaurantNotification.restaurant_id == restaurant_id,
            RestaurantNotification.is_read.is_(False),
        )
    )

    updated_count = notifications.update(
        {
            RestaurantNotification.is_read: True,
            RestaurantNotification.read_at: datetime.now(timezone.utc),
        },
        synchronize_session=False,
    )

    db.commit()

    return updated_count
