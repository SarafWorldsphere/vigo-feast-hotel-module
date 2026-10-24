from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class OwnerProfileResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_verified: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class OwnerProfileUpdate(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150,
    )
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(
        default=None,
        max_length=20,
    )

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("phone", mode="before")
    @classmethod
    def empty_phone_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v):
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v
