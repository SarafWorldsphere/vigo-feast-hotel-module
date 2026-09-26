from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.schemas.order import OrderResponse


class DeliveryPartnerInfo(BaseModel):
    partner_id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    rating: float = 4.8
    photo: Optional[str] = None


class CustomerInfo(BaseModel):
    customer_id: int
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None


class AssignmentInfo(BaseModel):
    assignment_id: Optional[int] = None
    partner_id: Optional[int] = None
    order_id: int
    assignment_status: Optional[str] = None
    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    arrived_at_restaurant: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    arrived_at_customer: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


class DeliveryResponse(BaseModel):
    id: str
    short_id: str
    order_id: int
    order_short_id: str
    stage: str
    order: OrderResponse
    customer: CustomerInfo
    delivery_partner: Optional[DeliveryPartnerInfo] = None
    assignment: Optional[AssignmentInfo] = None
    delivery_status: str


class DeliveryListResponse(BaseModel):
    deliveries: List[DeliveryResponse] = []
    total: int = 0
