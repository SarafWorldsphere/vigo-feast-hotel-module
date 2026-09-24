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


class Order(Base):
    __tablename__ = "vgf_orders"

    order_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    customer_id = Column(
        BigInteger,
        nullable=False,
    )
    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vgf_restaurants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    rider_id = Column(
        BigInteger,
        nullable=True,
    )
    order_status = Column(
        String(50),
        nullable=False,
        default="ORDERED",
    )
    subtotal = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )
    gst_amount = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )
    delivery_charge = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )
    discount_amount = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )
    total_amount = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )
    cancellation_status = Column(
        String(50),
        nullable=True,
    )
    delivery_eta = Column(
        DateTime(timezone=True),
        nullable=True,
    )
    offer_id = Column(
        BigInteger,
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
    franchisee_id = Column(
        UUID(as_uuid=True),
        nullable=True,
    )
    added_by = Column(String(100), nullable=True)
    added_date = Column(Date, server_default=func.current_date(), nullable=True)
    added_time = Column(Time, server_default=func.current_time(), nullable=True)
    added_ip = Column(INET, nullable=True)
    last_updated_by = Column(String(100), nullable=True)
    last_updated_date = Column(Date, nullable=True)
    last_updated_time = Column(Time, nullable=True)
    last_updated_ip = Column(INET, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
