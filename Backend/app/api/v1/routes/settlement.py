
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.settlement_batch import SettlementBatch
from app.schemas.settlement import (
    CurrentSettlementPeriodResponse,
    SettlementHistoryResponse,
)
from app.services.restaurant import get_owner_restaurant
from app.services.settlements import get_settlement_history

REPORTING_TIMEZONE = ZoneInfo("Asia/Kolkata")

router = APIRouter(
    prefix="/restaurants/settlements",
    tags=["Settlements"],
)


@router.get(
    "/current-period",
    response_model=CurrentSettlementPeriodResponse,
)
def get_current_settlement_period(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    today = datetime.now(REPORTING_TIMEZONE).date()

    batch = (
        db.query(SettlementBatch)
        .filter(
            SettlementBatch.restaurant_id == restaurant.id,
            SettlementBatch.settlement_date == today,
        )
        .order_by(SettlementBatch.batch_id.desc())
        .first()
    )

    if batch is None:
        return {
            "period_start": None,
            "period_end": None,
            "settlement_date": today,
            "net_amount": "0.00",
            "status": None,
            "is_simulated": True,
        }

    return {
        "period_start": batch.period_start,
        "period_end": batch.period_end,
        "settlement_date": batch.settlement_date,
        "net_amount": str(batch.net_amount),
        "status": batch.status,
        "is_simulated": batch.is_simulated,
    }


@router.get("", response_model=SettlementHistoryResponse)
def settlement_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    return get_settlement_history(
        db=db,
        restaurant_id=restaurant.id,
        limit=limit,
        offset=offset,
    )
