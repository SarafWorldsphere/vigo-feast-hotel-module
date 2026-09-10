from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class OwnerRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


class OwnerRegisterResponse(BaseModel):
    message: str
    owner_id: UUID
    access_token: str | None = None


class OwnerLoginRequest(BaseModel):
    email: EmailStr
    password: str


class OwnerLoginResponse(BaseModel):
    message: str
    owner_id: str
    access_token: str | None = None