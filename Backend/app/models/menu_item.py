import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class MenuItem(Base):
    __tablename__ = "vgf_menu_items"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "vgf_menu_categories.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    name = Column(
        String(200),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    image_url = Column(
        Text,
        nullable=True,
    )

    base_price = Column(
        Numeric(10, 2),
        nullable=False,
    )

    food_type = Column(
        String(20),
        nullable=False,
    )

    preparation_time_minutes = Column(
        Integer,
        nullable=False,
    )

    availability_status = Column(
        String(20),
        nullable=False,
        default="AVAILABLE",
    )

    display_order = Column(
        Integer,
        nullable=False,
        default=0,
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