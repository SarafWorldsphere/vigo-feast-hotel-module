from uuid import UUID

from pydantic import BaseModel, Field, field_validator


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
