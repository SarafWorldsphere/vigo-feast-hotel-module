
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


RefundDestination = Literal[
    "ORIGINAL_PAYMENT_METHOD",
    "UPI",
    "BANK_ACCOUNT",
]

RefundStatus = Literal[
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
]


class RefundCreate(BaseModel):
    amount: Decimal = Field(
        gt=0,
        max_digits=10,
        decimal_places=2,
    )
    reason: str = Field(
        min_length=1,
        max_length=255,
    )
    destination_method: RefundDestination
    idempotency_key: UUID


class RefundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    refund_id: int
    order_id: int
    complaint_id: Optional[int] = None
    initiated_by_owner_id: Optional[UUID] = None

    amount: Decimal
    status: RefundStatus
    reason: Optional[str] = None
    destination_method: Optional[RefundDestination] = None

    execution_reference: Optional[str] = None
    failure_reason: Optional[str] = None

    idempotency_key: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class RefundListResponse(BaseModel):
    items: list[RefundResponse]
    total: int
