from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


class RestaurantOwner(Base):
    __tablename__ = "vgf_restaurant_owners"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    name = Column(String(150), nullable=False)

    email = Column(
        String(255),
        unique=True,
        nullable=False
    )

    phone = Column(
        String(20),
        unique=True,
        nullable=False
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    is_verified = Column(
        Boolean,
        nullable=False,
        default=False
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    is_deleted = Column(
        Boolean,
        nullable=False,
        default=False
    )

    @property
    def owner_id(self):
        return self.id


class RestaurantOwnerSession(Base):
    __tablename__ = "vgf_restaurant_owner_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    owner_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    refresh_token_hash = Column(
        String(255),
        nullable=False,
        unique=True
    )

    device_info = Column(String(255), nullable=True)
    ip_address = Column(String(100), nullable=True)

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False
    )

    revoked_at = Column(
        DateTime(timezone=True),
        nullable=True
    )