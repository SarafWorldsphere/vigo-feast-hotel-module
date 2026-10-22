from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.restaurant_hours import RestaurantHours
from app.models.restaurant_special_hours import RestaurantSpecialHours
from app.models.restaurant_hour_slot import RestaurantHourSlot
from app.models.restaurant_order_settings import RestaurantOrderSettings

TIMEZONE = ZoneInfo("Asia/Kolkata")


def _save_slots(
    db: Session,
    *,
    weekly_hours_id: UUID | None = None,
    special_hours_id: UUID | None = None,
    slots: list,
):
    for slot in slots:
        db.add(
            RestaurantHourSlot(
                weekly_hours_id=weekly_hours_id,
                special_hours_id=special_hours_id,
                slot_type=slot.slot_type,
                start_time=slot.start_time,
                end_time=slot.end_time,
            )
        )


def _slot_response(slot):
    return {
        "id": slot.id,
        "slot_type": slot.slot_type,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
    }


def get_weekly_schedule(db: Session, restaurant_id: UUID):
    records = (
        db.query(RestaurantHours)
        .filter(RestaurantHours.restaurant_id == restaurant_id)
        .all()
    )
    by_day = {record.day_of_week: record for record in records}

    result = []
    for day in range(1, 8):
        record = by_day.get(day)

        if record is None:
            result.append({
                "id": None,
                "day_of_week": day,
                "is_closed": False,
                "slots": [],
            })
            continue

        slots = (
            db.query(RestaurantHourSlot)
            .filter(RestaurantHourSlot.weekly_hours_id == record.id)
            .order_by(RestaurantHourSlot.start_time)
            .all()
        )

        result.append({
            "id": record.id,
            "day_of_week": day,
            "is_closed": record.is_closed,
            "slots": [_slot_response(slot) for slot in slots],
        })

    return {"days": result}


def replace_weekly_schedule(
    db: Session,
    restaurant_id: UUID,
    payload,
):
    try:
        for day_input in payload.days:
            record = (
                db.query(RestaurantHours)
                .filter(
                    RestaurantHours.restaurant_id == restaurant_id,
                    RestaurantHours.day_of_week == day_input.day_of_week,
                )
                .first()
            )

            if record is None:
                record = RestaurantHours(
                    restaurant_id=restaurant_id,
                    day_of_week=day_input.day_of_week,
                    is_closed=day_input.is_closed,
                )
                db.add(record)
                db.flush()
            else:
                record.is_closed = day_input.is_closed

            # Replace all slots for this weekday.
            db.query(RestaurantHourSlot).filter(
                RestaurantHourSlot.weekly_hours_id == record.id
            ).delete(synchronize_session=False)

            if not day_input.is_closed:
                _save_slots(
                    db,
                    weekly_hours_id=record.id,
                    slots=day_input.slots,
                )

        db.commit()
    except Exception:
        db.rollback()
        raise

    return get_weekly_schedule(db, restaurant_id)


def list_special_hours(db: Session, restaurant_id: UUID):
    records = (
        db.query(RestaurantSpecialHours)
        .filter(RestaurantSpecialHours.restaurant_id == restaurant_id)
        .order_by(RestaurantSpecialHours.special_date)
        .all()
    )

    result = []
    for record in records:
        slots = (
            db.query(RestaurantHourSlot)
            .filter(RestaurantHourSlot.special_hours_id == record.id)
            .order_by(RestaurantHourSlot.start_time)
            .all()
        )
        result.append({
            "id": record.id,
            "special_date": record.special_date,
            "is_closed": record.is_closed,
            "note": record.note,
            "slots": [_slot_response(slot) for slot in slots],
        })

    return result


def create_special_hours(
    db: Session,
    restaurant_id: UUID,
    payload,
):
    existing = (
        db.query(RestaurantSpecialHours)
        .filter(
            RestaurantSpecialHours.restaurant_id == restaurant_id,
            RestaurantSpecialHours.special_date == payload.special_date,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A special schedule already exists for this date",
        )

    try:
        record = RestaurantSpecialHours(
            restaurant_id=restaurant_id,
            special_date=payload.special_date,
            is_closed=payload.is_closed,
            note=payload.note,
        )
        db.add(record)
        db.flush()

        if not payload.is_closed:
            _save_slots(
                db,
                special_hours_id=record.id,
                slots=payload.slots,
            )

        db.commit()
        db.refresh(record)
        return record.id
    except Exception:
        db.rollback()
        raise


def update_special_hours(
    db: Session,
    restaurant_id: UUID,
    special_hours_id: UUID,
    payload,
):
    record = (
        db.query(RestaurantSpecialHours)
        .filter(
            RestaurantSpecialHours.id == special_hours_id,
            RestaurantSpecialHours.restaurant_id == restaurant_id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Special schedule not found")

    duplicate = (
        db.query(RestaurantSpecialHours)
        .filter(
            RestaurantSpecialHours.restaurant_id == restaurant_id,
            RestaurantSpecialHours.special_date == payload.special_date,
            RestaurantSpecialHours.id != record.id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="A special schedule already exists for this date",
        )

    try:
        record.special_date = payload.special_date
        record.is_closed = payload.is_closed
        record.note = payload.note

        db.query(RestaurantHourSlot).filter(
            RestaurantHourSlot.special_hours_id == record.id
        ).delete(synchronize_session=False)

        if not payload.is_closed:
            _save_slots(
                db,
                special_hours_id=record.id,
                slots=payload.slots,
            )

        db.commit()
        return record.id
    except Exception:
        db.rollback()
        raise


def delete_special_hours(
    db: Session,
    restaurant_id: UUID,
    special_hours_id: UUID,
):
    record = (
        db.query(RestaurantSpecialHours)
        .filter(
            RestaurantSpecialHours.id == special_hours_id,
            RestaurantSpecialHours.restaurant_id == restaurant_id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Special schedule not found")

    db.delete(record)
    db.commit()
    return {"message": "Special schedule deleted successfully"}


def get_order_settings(
    db: Session,
    restaurant_id: UUID,
    as_of: datetime | None = None,
):
    settings = (
        db.query(RestaurantOrderSettings)
        .filter(RestaurantOrderSettings.restaurant_id == restaurant_id)
        .first()
    )

    if settings is None:
        settings = RestaurantOrderSettings(restaurant_id=restaurant_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    ref_time = as_of if as_of is not None else datetime.now(TIMEZONE)
    if ref_time.tzinfo is None:
        ref_time = ref_time.replace(tzinfo=TIMEZONE)

    # An expired pause is treated as inactive.
    if settings.is_paused and settings.paused_until:
        paused_until = settings.paused_until
        if paused_until.tzinfo is None:
            paused_until = paused_until.replace(tzinfo=TIMEZONE)
        if paused_until <= ref_time:
            settings.is_paused = False
            settings.pause_reason = None
            settings.paused_until = None
            db.commit()
            db.refresh(settings)

    return settings




def pause_orders(
    db: Session,
    restaurant_id: UUID,
    reason: str | None,
    paused_until: datetime | None,
):
    if paused_until is not None:
        if paused_until.tzinfo is None:
            raise HTTPException(
                status_code=422,
                detail="paused_until must include a timezone offset",
            )
        if paused_until <= datetime.now(TIMEZONE):
            raise HTTPException(
                status_code=422,
                detail="paused_until must be in the future",
            )

    settings = get_order_settings(db, restaurant_id)
    settings.is_paused = True
    settings.pause_reason = reason
    settings.paused_until = paused_until
    db.commit()
    db.refresh(settings)
    return settings


def resume_orders(db: Session, restaurant_id: UUID):
    settings = get_order_settings(db, restaurant_id)
    settings.is_paused = False
    settings.pause_reason = None
    settings.paused_until = None
    db.commit()
    db.refresh(settings)
    return settings


def get_restaurant_availability(
    db: Session,
    restaurant_id: UUID,
    as_of: datetime | None = None,
) -> dict:
    if as_of is None:
        now = datetime.now(TIMEZONE)
    else:
        if as_of.tzinfo is None:
            now = as_of.replace(tzinfo=TIMEZONE)
        else:
            now = as_of.astimezone(TIMEZONE)

    settings = get_order_settings(db, restaurant_id, as_of=now)
    is_paused = settings.is_paused
    paused_until = settings.paused_until
    if paused_until is not None and paused_until.tzinfo is None:
        paused_until = paused_until.replace(tzinfo=TIMEZONE)
    # If simulated time or time beyond paused_until is passed, check expiration
    if is_paused and paused_until and paused_until <= now:
        is_paused = False


    def get_schedule_for_date(schedule_date: date):
        special = (
            db.query(RestaurantSpecialHours)
            .filter(
                RestaurantSpecialHours.restaurant_id == restaurant_id,
                RestaurantSpecialHours.special_date == schedule_date,
            )
            .first()
        )
        if special is not None:
            if special.is_closed:
                return {"is_override": True, "is_closed": True, "slots": []}
            slots = (
                db.query(RestaurantHourSlot)
                .filter(RestaurantHourSlot.special_hours_id == special.id)
                .order_by(RestaurantHourSlot.start_time)
                .all()
            )
            return {"is_override": True, "is_closed": False, "slots": slots}

        day_number = schedule_date.isoweekday()
        weekly = (
            db.query(RestaurantHours)
            .filter(
                RestaurantHours.restaurant_id == restaurant_id,
                RestaurantHours.day_of_week == day_number,
            )
            .first()
        )
        if weekly is None:
            return {"is_override": False, "is_closed": False, "slots": []}
        if weekly.is_closed:
            return {"is_override": False, "is_closed": True, "slots": []}
        slots = (
            db.query(RestaurantHourSlot)
            .filter(RestaurantHourSlot.weekly_hours_id == weekly.id)
            .order_by(RestaurantHourSlot.start_time)
            .all()
        )
        return {"is_override": False, "is_closed": False, "slots": slots}

    today_date = now.date()
    yesterday_date = today_date - timedelta(days=1)
    tomorrow_date = today_date + timedelta(days=1)

    today_sched = get_schedule_for_date(today_date)
    yesterday_sched = get_schedule_for_date(yesterday_date)
    tomorrow_sched = get_schedule_for_date(tomorrow_date)

    is_operating_now = False
    is_ordering_now = False

    # A special-date closure on today overrides everything for today.
    if not (today_sched["is_override"] and today_sched["is_closed"]):
        # 1. Check yesterday's overnight slots
        if not yesterday_sched["is_closed"]:
            for slot in yesterday_sched["slots"]:
                start = datetime.combine(yesterday_date, slot.start_time, tzinfo=TIMEZONE)
                end = datetime.combine(yesterday_date, slot.end_time, tzinfo=TIMEZONE)
                if end <= start:
                    end += timedelta(days=1)
                    if start <= now < end:
                        if slot.slot_type == "OPERATING":
                            is_operating_now = True
                        elif slot.slot_type == "ONLINE_ORDERING":
                            is_ordering_now = True

        # 2. Check today's slots (if today is not explicitly closed)
        if not today_sched["is_closed"]:
            for slot in today_sched["slots"]:
                start = datetime.combine(today_date, slot.start_time, tzinfo=TIMEZONE)
                end = datetime.combine(today_date, slot.end_time, tzinfo=TIMEZONE)
                if end <= start:
                    end += timedelta(days=1)
                if start <= now < end:
                    if slot.slot_type == "OPERATING":
                        is_operating_now = True
                    elif slot.slot_type == "ONLINE_ORDERING":
                        is_ordering_now = True

    is_accepting_orders_now = is_operating_now and is_ordering_now and not is_paused

    if is_paused:
        status = "PAUSED"
        reason = "TEMPORARILY_PAUSED"
    elif is_accepting_orders_now:
        status = "ONLINE"
        reason = "ACCEPTING_ORDERS"
    else:
        status = "OFFLINE"
        if today_sched["is_closed"]:
            reason = "CLOSED_TODAY"
        elif len(today_sched["slots"]) == 0 and not is_operating_now and not is_ordering_now:
            reason = "NO_SCHEDULE"
        elif is_operating_now and not is_ordering_now:
            reason = "OUTSIDE_ORDERING_HOURS"
        else:
            reason = "OUTSIDE_OPERATING_HOURS"

    # Compute next boundary change
    candidates: list[datetime] = []
    if is_paused and paused_until and paused_until > now:
        candidates.append(paused_until)

    # Check boundaries from yesterday's overnight slots
    if not yesterday_sched["is_closed"]:
        for slot in yesterday_sched["slots"]:
            start = datetime.combine(yesterday_date, slot.start_time, tzinfo=TIMEZONE)
            end = datetime.combine(yesterday_date, slot.end_time, tzinfo=TIMEZONE)
            if end <= start:
                end += timedelta(days=1)
                if end > now:
                    candidates.append(end)

    # Check boundaries from today's slots
    if not today_sched["is_closed"]:
        for slot in today_sched["slots"]:
            start = datetime.combine(today_date, slot.start_time, tzinfo=TIMEZONE)
            end = datetime.combine(today_date, slot.end_time, tzinfo=TIMEZONE)
            if end <= start:
                end += timedelta(days=1)
            if start > now:
                candidates.append(start)
            if end > now:
                candidates.append(end)

    # Check boundaries from tomorrow's slots (next opening)
    if not tomorrow_sched["is_closed"]:
        for slot in tomorrow_sched["slots"]:
            start = datetime.combine(tomorrow_date, slot.start_time, tzinfo=TIMEZONE)
            if start > now:
                candidates.append(start)

    next_change_at = min(candidates) if candidates else None

    return {
        "is_operating_now": is_operating_now,
        "is_ordering_now": is_ordering_now,
        "is_paused": is_paused,
        "is_accepting_orders": is_accepting_orders_now,
        "status": status,
        "reason": reason,
        "paused_until": paused_until if is_paused else None,
        "next_change_at": next_change_at,
    }


def is_accepting_orders(
    db: Session,
    restaurant_id: UUID,
    as_of: datetime | None = None,
) -> bool:
    availability = get_restaurant_availability(db, restaurant_id, as_of=as_of)
    return availability["is_accepting_orders"]

