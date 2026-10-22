
import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    String,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class RestaurantHourSlot(Base):
    __tablename__ = "vgf_restaurant_hour_slots"

    __table_args__ = (
        CheckConstraint(
            "slot_type IN ('OPERATING', 'ONLINE_ORDERING')",
            name="ck_hour_slot_type",
        ),
        CheckConstraint(
            """
            (weekly_hours_id IS NOT NULL)
            <>
            (special_hours_id IS NOT NULL)
            """,
            name="ck_hour_slot_parent",
        ),
        CheckConstraint(
            "start_time <> end_time",
            name="ck_hour_slot_times",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    weekly_hours_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "vgf_restaurant_hours.id",
            ondelete="CASCADE",
        ),
        nullable=True,
    )

    special_hours_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "vgf_restaurant_special_hours.id",
            ondelete="CASCADE",
        ),
        nullable=True,
    )

    slot_type = Column(String(30), nullable=False)

    # Local wall-clock times interpreted using Asia/Kolkata.
    # Overnight slots are supported, e.g. 18:00 to 02:00.
    start_time = Column(Time(timezone=False), nullable=False)
    end_time = Column(Time(timezone=False), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
