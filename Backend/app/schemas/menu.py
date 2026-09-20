from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from decimal import Decimal
from typing import Literal
class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Category name must be a string")
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Category name must not be empty")
        return trimmed


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    display_order: int
    is_active: bool

    class Config:
        from_attributes = True

class MenuItemCreateRequest(BaseModel):
    category_id: UUID | None = None
    category_name: str | None = None
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    image_url: str | None = None
    base_price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    food_type: Literal["VEG", "NON_VEG", "EGG"] = "VEG"
    preparation_time_minutes: int = Field(default=10, ge=0)
    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v):
        if not isinstance(v, str):
            raise ValueError("Item name must be a string")

        trimmed = v.strip()

        if not trimmed:
            raise ValueError("Item name must not be empty")

        return trimmed

    @field_validator("food_type", mode="before")
    @classmethod
    def validate_food_type(cls, v):
        if isinstance(v, str):
            v_upper = v.strip().upper()
            if v_upper in ("VEG", "NON_VEG", "EGG"):
                return v_upper
            if v_upper == "NON-VEG":
                return "NON_VEG"
        return v

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, v):
        if v is None:
            return None

        if not isinstance(v, str):
            raise ValueError("Description must be a string")

        trimmed = v.strip()

        return trimmed if trimmed else None


class MenuItemResponse(BaseModel):
    id: UUID
    category_id: UUID
    name: str
    description: str | None
    image_url: str | None
    base_price: Decimal
    food_type: str
    preparation_time_minutes: int
    availability_status: str
    display_order: int
    is_active: bool

    class Config:
        from_attributes = True

class MenuItemAvailabilityUpdateRequest(BaseModel):
    availability_status: Literal[
        "AVAILABLE",
        "TEMP_UNAVAILABLE",
        "OUT_OF_STOCK",
    ]
