import uuid

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RegistrationDocumentUpload(Base):
    __tablename__ = "vgf_registration_document_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurant_owners.id", ondelete="CASCADE"),
        nullable=False,
    )

    object_key = Column(Text, nullable=False, unique=True)
    document_type = Column(String(30), nullable=False)
    file_name = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)

    status = Column(String(20), nullable=False, default="PENDING")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
