
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.services.financial_reporting import get_financial_summary


REPORTING_TIMEZONE = ZoneInfo("Asia/Kolkata")


def get_earnings(
    db: Session,
    restaurant_id,
    period: str = "today",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    today = datetime.now(REPORTING_TIMEZONE).date()

    if start_date is not None or end_date is not None:
        if start_date is None or end_date is None:
            raise ValueError(
                "Both start_date and end_date are required."
            )

        if end_date < start_date:
            raise ValueError(
                "end_date must be on or after start_date."
            )

        effective_start = start_date
        effective_end = end_date + timedelta(days=1)
        period_label = "custom"

    elif period == "today":
        effective_start = today
        effective_end = today + timedelta(days=1)
        period_label = "today"

    elif period == "week":
        effective_start = today - timedelta(days=today.weekday())
        effective_end = effective_start + timedelta(days=7)
        period_label = "week"

    elif period == "month":
        effective_start = today.replace(day=1)

        if today.month == 12:
            effective_end = date(today.year + 1, 1, 1)
        else:
            effective_end = date(today.year, today.month + 1, 1)

        period_label = "month"

    else:
        raise ValueError(
            "period must be today, week, or month."
        )

    start_datetime = datetime.combine(
        effective_start,
        time.min,
        tzinfo=REPORTING_TIMEZONE,
    )

    end_datetime = datetime.combine(
        effective_end,
        time.min,
        tzinfo=REPORTING_TIMEZONE,
    )

    summary = get_financial_summary(
        db=db,
        restaurant_id=restaurant_id,
        start=start_datetime,
        end=end_datetime,
    )

    return {
        "period": period_label,
        "start_date": effective_start,
        "end_date": effective_end - timedelta(days=1),
        "summary": summary,
    }
