from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SettlementHistoryItem(BaseModel):
    batch_id: int
    period_start: date
    period_end: date
    settlement_date: date
    orders: int
    amount: Decimal
    status: str
    is_simulated: bool
    payout_reference: Optional[str] = None
    paid_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SettlementHistoryResponse(BaseModel):
    settlements: list[SettlementHistoryItem]
    total: int


class CurrentSettlementPeriodResponse(BaseModel):
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    settlement_date: date
    net_amount: str
    status: Optional[str] = None
    is_simulated: bool = True
