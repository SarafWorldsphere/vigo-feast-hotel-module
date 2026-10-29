from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


ALLOWED_DOCUMENT_TYPES = {
    "FSSAI_CERTIFICATE",
    "PAN_CARD",
    "BANK_PROOF",
    "RESTAURANT_PHOTO",
}


class RestaurantDocumentCreateRequest(BaseModel):
    document_type: str = Field(
        min_length=1,
        max_length=30
    )

    file_url: str = Field(
        min_length=1
    )

    file_name: str | None = Field(
        default=None,
        max_length=255
    )

    mime_type: str | None = Field(
        default=None,
        max_length=100
    )


class RestaurantDocumentCreateResponse(BaseModel):
    message: str
    document_id: UUID


class RegistrationDocumentUploadRequest(BaseModel):
    document_type: Literal[
        "FSSAI_CERTIFICATE",
        "PAN_CARD",
        "BANK_PROOF",
        "RESTAURANT_PHOTO",
    ]
    file_name: str = Field(min_length=1, max_length=255)
    content_type: Literal[
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ]
    file_size_bytes: int = Field(gt=0, le=10 * 1024 * 1024)


class RegistrationDocumentConfirmRequest(BaseModel):
    object_key: str = Field(min_length=1, max_length=1024)
