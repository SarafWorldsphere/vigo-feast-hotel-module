
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class EarningsSummary(BaseModel):
    currency: str = "INR"

    gross_sales: Decimal
    restaurant_discounts: Decimal
    commission: Decimal
    commission_tax: Decimal
    other_fees: Decimal
    refunds: Decimal
    adjustments: Decimal
    net_earnings: Decimal

    delivered_orders: int
    unfinalized_delivered_orders: int


class EarningsResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    summary: EarningsSummary
