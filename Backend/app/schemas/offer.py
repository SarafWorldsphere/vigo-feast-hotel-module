from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class CreateOfferRequest(BaseModel):
    offer_code: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    offer_name: str = Field(
        min_length=1,
        max_length=150,
    )

    discount_type: str = Field(
        min_length=1,
        max_length=20,
    )

    discount_value: Decimal = Field(
        gt=0,
    )

    min_order_amount: Decimal = Field(
        default=Decimal("0"),
        ge=0,
    )

    max_discount_amount: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    valid_from: datetime

    valid_to: datetime

    category_ids: List[UUID] = Field(
        default_factory=list,
    )

    menu_item_ids: List[UUID] = Field(
        default_factory=list,
    )


class UpdateOfferRequest(BaseModel):
    offer_code: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    offer_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    discount_type: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=20,
    )

    discount_value: Optional[Decimal] = Field(
        default=None,
        gt=0,
    )

    min_order_amount: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    max_discount_amount: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    valid_from: Optional[datetime] = None

    valid_to: Optional[datetime] = None

    category_ids: Optional[List[UUID]] = None

    menu_item_ids: Optional[List[UUID]] = None


class ToggleOfferRequest(BaseModel):
    is_active: bool


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    offer_id: int
    offer_code: Optional[str]
    offer_name: str
    discount_type: str
    discount_value: Decimal
    min_order_amount: Decimal
    max_discount_amount: Optional[Decimal]

    valid_from: datetime
    valid_to: datetime

    status: str
    is_active: bool

    category_ids: List[UUID] = Field(
        default_factory=list,
    )

    menu_item_ids: List[UUID] = Field(
        default_factory=list,
    )

    times_used: int = 0
    discount_given: Decimal = Decimal("0")


class OfferListResponse(BaseModel):
    offers: List[OfferResponse]
    total: int