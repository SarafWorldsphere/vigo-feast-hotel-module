import uuid

from sqlalchemy import Column, DateTime, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RestaurantDocument(Base):
    __tablename__ = "nfd_restaurant_documents"
    __table_args__ = (
        UniqueConstraint("restaurant_id", "document_type", name="uq_restaurant_document_type"),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    document_type = Column(
        String(30),
        nullable=False
    )

    file_url = Column(
        Text,
        nullable=False
    )

    file_name = Column(
        String(255),
        nullable=True
    )

    mime_type = Column(
        String(100),
        nullable=True
    )

    verification_status = Column(
        String(20),
        nullable=False,
        default="UPLOADED"
    )

    rejection_reason = Column(
        Text,
        nullable=True
    )

    verified_at = Column(
        DateTime(timezone=True),
        nullable=True
    )
