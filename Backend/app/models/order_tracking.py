
import uuid

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.orm import relationship, synonym

from app.db.database import Base


class OrderTracking(Base):
    __tablename__ = "vgf_order_tracking"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        nullable=False,
    )

    order_id = Column(
        String,
        ForeignKey("vgf_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    rider_id = Column(BigInteger, nullable=True, index=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    status_update = Column(String, nullable=False)

    recorded_at = Column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
    )

    event_type = synonym("status_update")
    event_time = synonym("recorded_at")

    order = relationship("Order", back_populates="tracking_events")
