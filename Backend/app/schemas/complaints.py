from datetime import datetime
from typing import Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


ComplaintCategory = Literal[
    "MISSING_ITEM",
    "WRONG_ITEM",
    "FOOD_QUALITY",
    "PACKAGING",
    "TEMPERATURE",
    "OTHER",
]

ComplaintStatus = Literal[
    "OPEN",
    "UNDER_REVIEW",
    "RESOLVED",
    "REJECTED",
]

ComplaintPriority = Literal[
    "NORMAL",
    "HIGH",
    "URGENT",
]


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    complaint_id: int
    order_id: int
    customer_id: int
    restaurant_id: Union[UUID, str]

    category: ComplaintCategory
    description: str
    status: ComplaintStatus
    priority: ComplaintPriority

    resolution_note: Optional[str] = None
    rejection_reason: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None


class ComplaintListResponse(BaseModel):
    items: list[ComplaintResponse]
    total: int
    limit: int
    offset: int


class ComplaintStatusUpdate(BaseModel):
    status: Literal[
        "UNDER_REVIEW",
        "RESOLVED",
        "REJECTED",
    ]

    note: Optional[str] = Field(
        default=None,
        max_length=2000,
    )
