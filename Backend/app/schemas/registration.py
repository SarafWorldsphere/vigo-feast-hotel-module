from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.business_details import BusinessDetailsCreateRequest
from app.schemas.document import RestaurantDocumentCreateRequest
from app.schemas.restaurant import RestaurantCreateRequest


class RegistrationSubmitRequest(BaseModel):
    """The complete, final payload from the owner registration wizard."""

    restaurant: RestaurantCreateRequest
    business_details: BusinessDetailsCreateRequest
    cuisine_ids: list[UUID] = Field(min_length=1)
    documents: list[RestaurantDocumentCreateRequest] = Field(default_factory=list)


class RegistrationSubmitResponse(BaseModel):
    message: str
    restaurant_id: UUID
    application_id: UUID
    status: str

class RegistrationStatusResponse(BaseModel):
    application_id: str
    restaurant_id: str
    restaurant_name: str
    status: str
    submitted_at: datetime | None
    reviewed_at: datetime | None
    rejection_reason: str | None
