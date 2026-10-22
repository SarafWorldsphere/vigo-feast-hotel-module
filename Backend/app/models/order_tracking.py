
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class OrderTracking(Base):
    __tablename__ = "vgf_order_tracking"

    tracking_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    order_id = Column(
        BigInteger,
        ForeignKey("vgf_orders.order_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    rider_id = Column(BigInteger, nullable=True, index=True)

    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)

    event_type = Column(String(100), nullable=False)

    event_time = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    franchisee_id = Column(UUID(as_uuid=True), nullable=True)

    added_by = Column(String(100), nullable=True)
    added_date = Column(
        Date,
        server_default=func.current_date(),
        nullable=True,
    )
    added_time = Column(
        Time,
        server_default=func.current_time(),
        nullable=True,
    )
    added_ip = Column(INET, nullable=True)

    last_updated_by = Column(String(100), nullable=True)
    last_updated_date = Column(Date, nullable=True)
    last_updated_time = Column(Time, nullable=True)
    last_updated_ip = Column(INET, nullable=True)

    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    order = relationship("Order", back_populates="tracking_events")
