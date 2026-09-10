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
