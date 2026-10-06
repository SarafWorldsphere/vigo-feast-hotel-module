from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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


class RestaurantProfileUpdate(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    description: Optional[str] = Field(
        default=None,
        max_length=1000
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=30
    )

    email: Optional[EmailStr] = None

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v


class RestaurantImagesResponse(BaseModel):
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RestaurantAddressResponse(BaseModel):
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RestaurantRatingResponse(BaseModel):
    average: float = 0.0
    total_reviews: int = 0

    model_config = ConfigDict(from_attributes=True)


class RestaurantProfileResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    images: RestaurantImagesResponse
    address: RestaurantAddressResponse
    rating: RestaurantRatingResponse

    model_config = ConfigDict(from_attributes=True)


class RestaurantAddressUpdate(BaseModel):
    address_line1: Optional[str] = Field(
        default=None,
        max_length=255,
    )
    address_line2: Optional[str] = Field(
        default=None,
        max_length=255,
    )
    city: Optional[str] = Field(
        default=None,
        max_length=100,
    )
    state: Optional[str] = Field(
        default=None,
        max_length=100,
    )
    postal_code: Optional[str] = Field(
        default=None,
        max_length=20,
    )



