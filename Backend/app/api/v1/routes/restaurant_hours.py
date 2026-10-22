from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db

from app.schemas.restaurant_hours import (
    WeeklyScheduleInput,
    SpecialHoursInput,
    PauseOrdersInput,
    RestaurantAvailabilityResponse,
)
from app.services.restaurant_hours import (
    get_weekly_schedule,
    replace_weekly_schedule,
    list_special_hours,
    create_special_hours,
    update_special_hours,
    delete_special_hours,
    get_order_settings,
    pause_orders,
    resume_orders,
    get_restaurant_availability,
)

# Change this import to match the location used by your existing APIs.
from app.services.restaurant import get_owner_restaurant
from app.services.websocket_manager import websocket_manager

router = APIRouter(
    prefix="/restaurants/hours",
    tags=["Restaurant Hours"],
)


def _restaurant_id(db: Session, owner):
    restaurant = get_owner_restaurant(db=db, owner_id=owner.id)
    return restaurant.id


def _broadcast_availability_change(db: Session, restaurant_id: UUID):
    try:
        avail = get_restaurant_availability(db, restaurant_id)
        websocket_manager.broadcast_to_restaurant_sync(
            str(restaurant_id),
            {
                "event": "AVAILABILITY_CHANGED",
                "restaurant_id": str(restaurant_id),
                "availability": {
                    "is_operating_now": avail.get("is_operating_now"),
                    "is_ordering_now": avail.get("is_ordering_now"),
                    "is_paused": avail.get("is_paused"),
                    "is_accepting_orders": avail.get("is_accepting_orders"),
                    "status": avail.get("status"),
                    "reason": avail.get("reason"),
                    "paused_until": avail.get("paused_until").isoformat() if avail.get("paused_until") else None,
                    "next_change_at": avail.get("next_change_at").isoformat() if avail.get("next_change_at") else None,
                },
            },
        )
    except Exception as e:
        print(f"Error broadcasting availability change: {e}")


@router.get("/availability", response_model=RestaurantAvailabilityResponse)
def read_availability(
    as_of: datetime | None = None,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    return get_restaurant_availability(db, restaurant_id, as_of=as_of)


@router.get("/weekly")
def read_weekly_hours(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    return get_weekly_schedule(db, restaurant_id)


@router.put("/weekly")
def save_weekly_hours(
    payload: WeeklyScheduleInput,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    result = replace_weekly_schedule(db, restaurant_id, payload)
    _broadcast_availability_change(db, restaurant_id)
    return result



@router.get("/special-dates")
def read_special_hours(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    return list_special_hours(db, restaurant_id)


@router.post(
    "/special-dates",
    status_code=status.HTTP_201_CREATED,
)
def add_special_hours(
    payload: SpecialHoursInput,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    special_id = create_special_hours(db, restaurant_id, payload)
    _broadcast_availability_change(db, restaurant_id)
    return {"id": special_id, "message": "Special schedule created"}


@router.put("/special-dates/{special_hours_id}")
def edit_special_hours(
    special_hours_id: UUID,
    payload: SpecialHoursInput,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    updated_id = update_special_hours(
        db, restaurant_id, special_hours_id, payload
    )
    _broadcast_availability_change(db, restaurant_id)
    return {"id": updated_id, "message": "Special schedule updated"}


@router.delete("/special-dates/{special_hours_id}")
def remove_special_hours(
    special_hours_id: UUID,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    result = delete_special_hours(db, restaurant_id, special_hours_id)
    _broadcast_availability_change(db, restaurant_id)
    return result


@router.get("/order-settings")
def read_order_settings(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    settings = get_order_settings(db, restaurant_id)
    return {
        "is_paused": settings.is_paused,
        "pause_reason": settings.pause_reason,
        "paused_until": settings.paused_until,
    }


@router.put("/order-settings/pause")
def pause_online_orders(
    payload: PauseOrdersInput,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    settings = pause_orders(
        db,
        restaurant_id,
        payload.reason,
        payload.paused_until,
    )
    _broadcast_availability_change(db, restaurant_id)
    return {
        "is_paused": settings.is_paused,
        "pause_reason": settings.pause_reason,
        "paused_until": settings.paused_until,
    }


@router.put("/order-settings/resume")
def resume_online_orders(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant_id = _restaurant_id(db, owner)
    settings = resume_orders(db, restaurant_id)
    _broadcast_availability_change(db, restaurant_id)
    return {
        "is_paused": settings.is_paused,
        "pause_reason": settings.pause_reason,
        "paused_until": settings.paused_until,
    }