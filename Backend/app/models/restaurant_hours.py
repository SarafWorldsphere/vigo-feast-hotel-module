
import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    SmallInteger,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RestaurantHours(Base):
    __tablename__ = "vgf_restaurant_hours"

    __table_args__ = (
        UniqueConstraint(
            "restaurant_id",
            "day_of_week",
            name="uq_restaurant_weekday",
        ),
        CheckConstraint(
            "day_of_week BETWEEN 1 AND 7",
            name="ck_restaurant_hours_day_of_week",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ISO weekday: Monday = 1, Sunday = 7
    day_of_week = Column(SmallInteger, nullable=False)

    is_closed = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
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
