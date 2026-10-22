
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RestaurantOrderSettings(Base):
    __tablename__ = "vgf_restaurant_order_settings"

    __table_args__ = (
        UniqueConstraint(
            "restaurant_id",
            name="uq_restaurant_order_settings",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "vgf_restaurants.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    is_paused = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    pause_reason = Column(Text, nullable=True)

    paused_until = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
