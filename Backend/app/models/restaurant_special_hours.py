
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RestaurantSpecialHours(Base):
    __tablename__ = "vgf_restaurant_special_hours"

    __table_args__ = (
        UniqueConstraint(
            "restaurant_id",
            "special_date",
            name="uq_restaurant_special_date",
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

    special_date = Column(Date, nullable=False)

    is_closed = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    note = Column(Text, nullable=True)

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
