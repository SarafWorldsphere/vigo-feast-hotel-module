import uuid

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RestaurantRegistrationApplication(Base):
    __tablename__ = "nfd_restaurant_registration_applications"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="SUBMITTED"
    )

    submitted_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    reviewed_by = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    rejection_reason = Column(
        Text,
        nullable=True
    )
