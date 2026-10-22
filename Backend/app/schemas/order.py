from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class OrderItemResponse(BaseModel):
    order_item_id: int
    menu_item_id: UUID
    name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    order_id: int
    customer_id: int
    restaurant_id: Optional[UUID] = None
    rider_id: Optional[int] = None
    order_status: str
    subtotal: Decimal
    gst_amount: Decimal
    delivery_charge: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    cancellation_status: Optional[str] = None
    delivery_eta: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    orders: List[OrderResponse] = []
    total: int = 0

    class Config:
        from_attributes = True


class OrderItemCreate(BaseModel):
    menu_item_id: UUID
    quantity: int = 1
    unit_price: Optional[Decimal] = None


class OrderCreate(BaseModel):
    customer_id: int
    restaurant_id: UUID
    items: List[OrderItemCreate] = []
    subtotal: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = None
    delivery_charge: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    delivery_eta: Optional[datetime] = None

