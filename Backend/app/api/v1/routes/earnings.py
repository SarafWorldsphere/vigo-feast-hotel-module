
from datetime import date, datetime, time, timedelta
from io import BytesIO
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.schemas.earnings import EarningsResponse
from app.services.earnings import get_earnings
from app.services.financial_reporting import export_earnings_csv
from app.services.restaurant import get_owner_restaurant


router = APIRouter(
    prefix="/restaurants/earnings",
    tags=["Earnings"],
)


@router.get("", response_model=EarningsResponse)
def earnings(
    period: Optional[str] = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    try:
        return get_earnings(
            db=db,
            restaurant_id=restaurant.id,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@router.get("/export")
def export_earnings(
    period: Optional[str] = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    try:
        earnings_data = get_earnings(
            db=db,
            restaurant_id=restaurant.id,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    timezone = ZoneInfo("Asia/Kolkata")

    start_datetime = datetime.combine(
        earnings_data["start_date"],
        time.min,
        tzinfo=timezone,
    )
    end_datetime = datetime.combine(
        earnings_data["end_date"] + timedelta(days=1),
        time.min,
        tzinfo=timezone,
    )

    csv_content = export_earnings_csv(
        db=db,
        restaurant_id=restaurant.id,
        start=start_datetime,
        end=end_datetime,
    )

    filename = (
        f"earnings_{earnings_data['start_date']}_"
        f"{earnings_data['end_date']}.csv"
    )

    return StreamingResponse(
        BytesIO(csv_content.encode("utf-8-sig")),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )

