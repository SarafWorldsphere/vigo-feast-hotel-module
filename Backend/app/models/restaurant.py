import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Restaurant(Base):
    __tablename__ = "vgf_restaurants"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    owner_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    name = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    logo_url = Column(
        Text,
        nullable=True
    )

    cover_image_url = Column(
        Text,
        nullable=True
    )

    phone = Column(
        String(20),
        nullable=True
    )

    email = Column(
        String(255),
        nullable=True
    )

    address_line1 = Column(
        String(255),
        nullable=False
    )

    address_line2 = Column(
        String(255),
        nullable=True
    )

    city = Column(
        String(100),
        nullable=False
    )

    state = Column(
        String(100),
        nullable=True
    )

    postal_code = Column(
        String(20),
        nullable=False
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="OFFLINE"
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    is_deleted = Column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=True
    )