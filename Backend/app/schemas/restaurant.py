from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RestaurantCreateRequest(BaseModel):


    name: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None

    phone: Optional[str] = Field(
        default=None,
        min_length=10,
        max_length=20
    )

    email: Optional[str] = None

    address_line1: str = Field(min_length=1, max_length=255)
    address_line2: Optional[str] = None

    city: str = Field(min_length=1, max_length=100)
    state: Optional[str] = None
    postal_code: str = Field(min_length=4, max_length=20)

    latitude: Optional[float] = None
    longitude: Optional[float] = None

class RestaurantCreateResponse(BaseModel):
    message: str
    restaurant_id: UUID