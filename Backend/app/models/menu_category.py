import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class MenuCategory(Base):
    __tablename__ = "nfd_menu_categories"

    category_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    id = Column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        nullable=False,
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("nfd_restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    category_name = Column(
        String(100),
        nullable=True,
    )

    display_order = Column(
        Integer,
        nullable=False,
        default=1,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    is_deleted = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    status = Column(
        String(50),
        nullable=False,
        default="ACTIVE",
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

