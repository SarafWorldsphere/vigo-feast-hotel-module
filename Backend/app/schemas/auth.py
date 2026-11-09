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


class OwnerOtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    language: str = Field(default="en", pattern="^(en|hi|te)$")


class OwnerOtpRequestResponse(BaseModel):
    message: str
    request_id: str


class OwnerOtpVerifyRequest(BaseModel):
    request_id: str
    phone: str = Field(min_length=10, max_length=20)
    otp: str = Field(pattern=r"^\d{6}$")


class OwnerOtpVerifyResponse(BaseModel):
    message: str
    owner_id: str
    access_token: str


class ForgotPasswordOtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    language: str = Field(default="en", pattern="^(en|hi|te)$")


class ForgotPasswordOtpRequestResponse(BaseModel):
    message: str
    request_id: str


class ForgotPasswordOtpVerifyRequest(BaseModel):
    phone: str
    request_id: str
    otp: str = Field(min_length=6, max_length=6)


class ForgotPasswordOtpVerifyResponse(BaseModel):
    message: str
    reset_token: str
    expires_in: int


class ForgotPasswordResetRequest(BaseModel):
    reset_token: str
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class ForgotPasswordResetResponse(BaseModel):
    message: str