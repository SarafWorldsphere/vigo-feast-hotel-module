
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
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import relationship

from app.db.database import Base


class Payment(Base):
    __tablename__ = "vgf_payments"

    payment_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    order_id = Column(
        BigInteger,
        ForeignKey("vgf_orders.order_id"),
        nullable=False,
        index=True,
    )

    method = Column(String, nullable=False)
    amount = Column(Numeric, nullable=False)

    transaction_ref = Column(String, nullable=True)

    payment_status = Column(
        String,
        nullable=False,
        default="PENDING",
        server_default="PENDING",
    )

    gateway_name = Column(String, nullable=True)
    gateway_order_ref = Column(String, nullable=True)

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
        postgresql_UUID := __import__(
            "sqlalchemy.dialects.postgresql",
            fromlist=["UUID"],
        ).UUID(as_uuid=True),
        nullable=True,
    )

    added_by = Column(String, nullable=True)
    added_date = Column(Date, server_default=func.current_date())
    added_time = Column(Time, server_default=func.current_time())
    added_ip = Column(INET, nullable=True)

    last_updated_by = Column(String, nullable=True)
    last_updated_date = Column(Date, nullable=True)
    last_updated_time = Column(Time, nullable=True)
    last_updated_ip = Column(INET, nullable=True)

    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    order = relationship("Order")
