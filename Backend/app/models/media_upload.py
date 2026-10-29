import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class MediaUpload(Base):
    __tablename__ = "vgf_media_uploads"

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'CONFIRMED', "
            "'DELETION_PENDING', 'DELETED')",
            name="ck_vgf_media_uploads_status",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )
    object_key = Column(Text, nullable=False, unique=True)
    media_type = Column(String(30), nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger)
    status = Column(String(30), nullable=False, server_default="PENDING")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    confirmed_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))
